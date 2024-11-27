import { equalBytes } from '@noble/curves/abstract/utils';
import { ed25519, x25519, edwardsToMontgomeryPub, edwardsToMontgomeryPriv } from '@noble/curves/ed25519';
import { BASE36 } from '@thi.ng/base-n';
import * as msgpack from 'notepack.io';
import { toDataURL as createQRDataURL, toString as createQRString, type QRCodeSegment } from 'qrcode';
import { assert, defEnsure } from '@thi.ng/errors';

import Intent from '../Intent/index.js';
import ProofResponse from '../ProofResponse/index.js';
import SocketIOClient from './socketIOClient.js';
import BonjourFinder from './bonjourFinder.js';
import { decryptBuffer } from '../helpers/security.js';
import { AdvancedPromise, createAdvancedPromise } from '../helpers/createAdvancedPromise.js';

const ensureEd25519priv = defEnsure((x: any) => x instanceof Uint8Array && x.length === 32, 'ed25519priv:Uint(32)');

class NKey {
  public readonly ed25519priv: Uint8Array
  public readonly ed25519pub: Uint8Array
  public readonly x25519priv: Uint8Array
  public readonly x25519pub: Uint8Array
  constructor(keyData?: NKey | Uint8Array) {
    this.ed25519priv = (keyData instanceof NKey) ? keyData.ed25519priv : (keyData ?? ed25519.utils.randomPrivateKey());
    ensureEd25519priv(this.ed25519priv);
    this.ed25519pub = ed25519.getPublicKey(this.ed25519priv);
    this.x25519priv = edwardsToMontgomeryPriv(this.ed25519priv);
    this.x25519pub = edwardsToMontgomeryPub(this.ed25519pub);
    assert(equalBytes(
      x25519.getPublicKey(this.x25519priv),
      this.x25519pub
    ), 'Invalid X25519 key pair');
  }
  public sign(data: Uint8Array): Uint8Array {
    return ed25519.sign(data, this.ed25519priv);
  }
  public getSharedSecret(otherEd25519pub: Uint8Array): Uint8Array {
    if (otherEd25519pub.length !== 32) {
      throw new Error('Invalid public key');
    }
    const otherX25519pub = edwardsToMontgomeryPub(otherEd25519pub);
    const sharedSecret = x25519.getSharedSecret(this.x25519priv, otherX25519pub);
    return sharedSecret;
  }
}

export type ManagerOptions = {
  readonly nkey?: NKey | Uint8Array;
  readonly mobileAppProtocol?: string; // protocol identifier in deep linking, (app.json:expo:schema prefixed with exp+, defaults to 'exp+zk-passport-o1js')
  readonly autoConnect?: boolean; // automatically discover and connect to the mobile app
  readonly pageTitle?: string; // some title to possibly show in the mobile app
}

const ensureNKey = defEnsure((x: any) => x instanceof NKey, 'NKey');
const ensureMobileAppProtocol = defEnsure((x: any) => typeof x ==='string', 'mobileAppProtocol:string');
const ensureAutoConnect = defEnsure((x: any) => typeof x === 'boolean', 'autoConnect:boolean');
const ensurePageTitle = defEnsure((x: any) => typeof x ==='string', 'pageTitle:string');

type IntentPromiseWrapper = {
  intent: Intent;
  promise: AdvancedPromise<ProofResponse>;
}

class Manager {
  public readonly nkey: NKey;
  public readonly mobileAppProtocol: string;
  public readonly autoConnect: boolean;
  public readonly pageTitle: string;

  private intentMap: Map<string, IntentPromiseWrapper> = new Map();
  private socketClients: Map<string, SocketIOClient> = new Map();
  private bonjourFinder?: BonjourFinder;

  constructor(opts?: ManagerOptions) {
    this.nkey = new NKey(opts?.nkey);
    ensureNKey(this.nkey);
    this.mobileAppProtocol = opts?.mobileAppProtocol ?? 'exp+zk-passport-o1js';
    ensureMobileAppProtocol(this.mobileAppProtocol);
    this.autoConnect = opts?.autoConnect ?? true;
    ensureAutoConnect(this.autoConnect);
    this.pageTitle = opts?.pageTitle?? '';
    ensurePageTitle(this.pageTitle);
    if (this.autoConnect) {
      this.bonjourFinder = new BonjourFinder(this.onServerDiscovered, this.onServerLost);
    }
  }

  private onServerDiscovered = (serverName: string, addresses: string[]): void => {
    console.log('discovered server:', serverName, addresses);
    const socketClient = new SocketIOClient(this, serverName, addresses, () => {
      this.socketClients.delete(serverName);
    });
    this.socketClients.set(serverName, socketClient);
  }

  private onServerLost = (serverName: string): void => {
    this.socketClients.get(serverName)?._destructor().catch((error) => {
      console.error(`Failed to destruct SocketIOClient for "${serverName}".`, error);
    })
    this.socketClients.delete(serverName);
  }

  public _destructor = async() => {
    try {
      const promises: Promise<void>[] = [];
      this.socketClients.forEach(socket => {
        promises.push(socket._destructor());
      })
      this.socketClients.clear();
      this.intentMap.forEach(promiseWrapper => {
        promiseWrapper.promise.cancel();
      });
      await Promise.all(promises);
    } catch (error) {
      console.error('Manager._destructor error:', error);
    }
  }

  public getTitle(): [string,string] {
    const result: [string,string] = ['',this.pageTitle];
    if (typeof document !== 'undefined' && document.title && !result[1]) {
      result[1] = document.title;
    }
    if (typeof process !== 'undefined') {
      result[0] = process.title;
      if (!result[1]) result[1] = result[0];
    }
    if (typeof window !== 'undefined') {
      result[0] = window?.location?.href || 'Unknown';
      if (!result[1]) result[1] = window?.location?.host || result[0];
    }
    return result;
  }

  // throws an error if the given proof response is not valid
  public handleEncryptedProofResponse(encryptedResponse: Uint8Array): { intent: Intent, proofResponse: ProofResponse } {
    const serverPublicKey = encryptedResponse.subarray(0, 32);
    const encryptedData = encryptedResponse.subarray(32);
    const sharedSecret = this.nkey.getSharedSecret(serverPublicKey);
    const [intentBuffer, proofResponseBuffer] = msgpack.decode(decryptBuffer(encryptedData, sharedSecret));
    const intent = Intent.fromCompactBuffer(intentBuffer);
    const proofResponse = ProofResponse.fromCompactBuffer(proofResponseBuffer);
    const promiseWrapper = this.intentMap.get(intent.uuid);
    if (!promiseWrapper) {
      throw new Error('Given proof response for an unknown intent');
    }
    if (!equalBytes(promiseWrapper.intent.toCompactBuffer(), intent.toCompactBuffer())) {
      throw new Error('Given proof response does not match the registered intent');
    }
    if (promiseWrapper) {
      promiseWrapper.promise.resolve(proofResponse);
      // delete it after 15 minutes, to prevent potential memory leaks
      // don't delete it immediately, as it might be still in use by the calling code
      setTimeout((intentMap, uuid) => {
        intentMap.delete(uuid);
      }, 15*60*1000, this.intentMap, intent.uuid); 
    }
    return {
      intent,
      proofResponse
    };
  }

  public registerIntent(intent: Intent): Promise<ProofResponse> {
    let promiseWrapper = this.intentMap.get(intent.uuid);
    if (!promiseWrapper) {
      promiseWrapper = { intent, promise: createAdvancedPromise<ProofResponse>() };
      this.intentMap.set(intent.uuid, promiseWrapper);
      promiseWrapper.promise.catch((error) => {
        console.log(`Intent: ${intent.uuid} failed to resolve: ${error}`);
      });
    }
    return promiseWrapper.promise;
  }

  // note: this method returns a dataURL (data:image/png;base64,...) for a QR code. 
  // each module is 1x1 pixel so when rendering in html you should add css { 'image-rendering': 'pixelated' }
  // Example: <img src={this.createQRCodeForIntent(intent)} style="image-rendering:pixelated;width:400px;" />
  public async createQRCodeForIntent(intent: Intent, mode: 'svg'|'png'|'text'='png'): Promise<string> {
    const intentBuffer = intent.toCompactBuffer();
    const signature = this.nkey.sign(intentBuffer);
    const alphanumericURL = `://I/${
      BASE36.encodeBytes(this.nkey.ed25519pub)
    }-${
      BASE36.encodeBytes(intentBuffer)
    }-${
      BASE36.encodeBytes(signature)
    }`;
    const segments: QRCodeSegment[] = [
      { data: new TextEncoder().encode(this.mobileAppProtocol), mode: 'byte' },
      { data: alphanumericURL, mode: 'alphanumeric' }
    ];
    // const segments: any = `${this.mobileAppProtocol}${alphanumericURL}`;
    const opts = {margin:0, scale: 1, type: 'image/png' };
    const createQRFunc: ((text: QRCodeSegment[], options: object, cb: (err:Error,data:string)=>void) => void) = mode !== 'png'? createQRString : createQRDataURL;
    if (mode === 'text') {
      opts.type = 'utf8';
    }
    if (mode === 'svg') {
      opts.type = 'svg'
    }
    return new Promise<string>((resolve, reject) => {
      createQRFunc(segments, opts, (err, qrData: string) => {
        err ? reject(err) : resolve(qrData);
      });
    });
  }

}

export default Manager;