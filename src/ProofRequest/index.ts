import { z } from "zod";
import { bytesToHex, bytesToNumberBE, numberToBytesBE } from '@noble/curves/abstract/utils';
import { BASE36 } from '@thi.ng/base-n';
import type { QRCodeSegment } from 'qrcode';
import * as QRCode from 'qrcode';

import { isOfType, isUint8ArrayOfLength32, isUint8ArrayOfLength64, is6ByteUint } from "../helpers/zod.js";
import { NKeyPrivate, NKeyPrivateSchema, NKeyPublic } from "../NKey/index.js";

import { ProofRequestQuery, ProofRequestQueryOptionsSchema, ProofRequestQuerySchema } from "./query.js";
import { ProofRequestLookup } from "./lookup.js";

export * from "./query.js";
export * from "./lookup.js"

export const ProofRequestOptionsSchema = z.object({
  ed25519pub: isUint8ArrayOfLength32.optional(), // omit for new proof requests.
  timestamp: is6ByteUint.optional(), // 6byte (Date.now() as integer)
  query: z.union([ProofRequestQueryOptionsSchema, ProofRequestQuerySchema]),
});

export type ProofRequestOptions = z.infer<typeof ProofRequestOptionsSchema>;

export class ProofRequest {
  private readonly _nkey: NKeyPublic | NKeyPrivate;
  private readonly _uuidBuffer: Uint8Array;

  public readonly timestamp: number; // encoded as 6byte
  public readonly query: ProofRequestQuery; // the actual query within the proof request
  public readonly uuid: string; // generated UUID based on ed25519pub and timestamp
  public get ed25519pub(): Uint8Array {
    return this._nkey.ed25519pub;
  }
  public get nkeyUUID(): string {
    return this._nkey.uuid;
  }
  public toJSON(): object {
    // used for easier debugging :)
    return { nkey: this._nkey, timestamp: this.timestamp, query: this.query, uuid: this.uuid };
  }
  
  public constructor(options: ProofRequestOptions) {
    options = ProofRequestOptionsSchema.parse(options);
    this.timestamp = options.timestamp ?? Date.now();
    if (options.query instanceof ProofRequestQuery) {
      this.query = options.query;
    } else {
      this.query = new ProofRequestQuery(options.query);
    }
    if (options.ed25519pub) {
      this._nkey = new NKeyPublic(options.ed25519pub);
    } else {
      this._nkey = new NKeyPrivate();
    }
    this._uuidBuffer = new Uint8Array(38);
    this._uuidBuffer.set(this.ed25519pub, 0);
    this._uuidBuffer.set(numberToBytesBE(this.timestamp, 6), 32);
    this.uuid = bytesToHex(this._uuidBuffer);
    if (this._nkey instanceof NKeyPrivate) { // NEW PROOF REQUEST ISSUED
      ProofRequestLookup.getInstance().register(this);
    }
  }

  public toCompactBuffer(): Uint8Array {
    const queryBuffer = this.query.toCompactBuffer();
    const buffer = new Uint8Array(38 + queryBuffer.length);
    buffer.set(this._uuidBuffer, 0);
    buffer.set(queryBuffer, 38);
    return buffer;
  }
  public static fromCompactBuffer(buffer: Uint8Array): ProofRequest {
    return new ProofRequest({
      ed25519pub: buffer.subarray(0, 32), 
      timestamp: Number(bytesToNumberBE(buffer.subarray(32, 38))),
      query: ProofRequestQuery.fromCompactBuffer(buffer.subarray(38)).options,
    })
  }
  
  public toSignedCompactBuffer(): Uint8Array {
    if (!(this._nkey instanceof NKeyPrivate)) throw new Error('Private key required for signing');
    const buffer = this.toCompactBuffer();
    const signature = isUint8ArrayOfLength64.parse(this._nkey.sign(buffer));
    const bufferWithSignature = new Uint8Array(buffer.length + 64);
    bufferWithSignature.set(signature, 0);
    bufferWithSignature.set(buffer, 64);
    return bufferWithSignature;
  }

  public static fromSignedCompactBuffer(bufferWithSignature: Uint8Array): ProofRequest {
    const signature = isUint8ArrayOfLength64.parse(bufferWithSignature.subarray(0, 64));
    const buffer = bufferWithSignature.subarray(64);
    const proofRequest = ProofRequest.fromCompactBuffer(buffer);
    proofRequest._nkey.verify(signature, buffer);
    return proofRequest;
  }

  public toQRFriendlyString(): string {
    const bufferWithSignature = this.toSignedCompactBuffer();
    const base36BufferSize = Math.ceil(
      bufferWithSignature.length * Math.log(256) / Math.log(36)
    );
    return BASE36.encodeBytes(bufferWithSignature, base36BufferSize);
  }
  
  public static fromQRFriendlyString(qrFriendlyString: string): ProofRequest {
    const bufferWithSignatureSize = Math.floor(
      qrFriendlyString.length * Math.log(36) / Math.log(256)
    );
    const bufferWithSignature = new Uint8Array(bufferWithSignatureSize);
    BASE36.decodeBytes(qrFriendlyString, bufferWithSignature);
    return ProofRequest.fromSignedCompactBuffer(bufferWithSignature);
  }

  // note: this method returns a dataURL (data:image/png;base64,...) for a QR code. 
  // each module is 1x1 pixel so when rendering in html you should add css { 'image-rendering': 'pixelated' }
  // Example: <img src={this.createQRCodeForIntent(intent)} style="image-rendering:pixelated;width:400px;" />
  public async createQRCode(mode: 'svg'|'png'|'text'='png', mobileAppProtocol:string = 'exp+zk-passport-o1js'): Promise<string> {
    const qrFriendlyString = this.toQRFriendlyString();
    const alphanumericURL = `://R/${qrFriendlyString}`; // R stands for request :)
    const segments: QRCodeSegment[] = [
      { data: new TextEncoder().encode(mobileAppProtocol), mode: 'byte' },
      { data: alphanumericURL, mode: 'alphanumeric' },
    ];
    // const segments: any = `${this.mobileAppProtocol}${alphanumericURL}`;
    const opts = {margin:0, scale: 1, type: 'image/png', errorCorrectionLevel: 'L' };
    const createQRFunc: ((text: QRCodeSegment[], options: object, cb: (err:Error,data:string)=>void) => void) = mode !== 'png'? QRCode.toString : QRCode.toDataURL;
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

export const ProofRequestSchema = isOfType<ProofRequest>(ProofRequest);