import { z } from 'zod';
import { ed25519, x25519, edwardsToMontgomeryPub, edwardsToMontgomeryPriv } from '@noble/curves/ed25519';
import { bytesToHex, equalBytes } from '@noble/curves/abstract/utils';
import { isOfType, isUint8Array, isUint8ArrayOfLength32, isUint8ArrayOfLength64 } from '../helpers/zod.js';
import { NKeyPrivateLookup } from './lookup.js';

export * from './lookup.js';

export class NKeyPublic {
  public readonly ed25519pub: Uint8Array
  public readonly x25519pub: Uint8Array
  constructor(keyData: NKeyPublic | Uint8Array) {
    if (keyData instanceof NKeyPublic) {
      keyData = NKeyPublicSchema.parse(keyData).ed25519pub;
    }
    this.ed25519pub = isUint8ArrayOfLength32.parse(keyData);
    this.x25519pub = isUint8ArrayOfLength32.parse(
      edwardsToMontgomeryPub(this.ed25519pub)
    );
  }
  public get uuid(): string {
    return bytesToHex(this.ed25519pub);
  }
  public verify(signature: Uint8Array, data: Uint8Array): void {
    signature = isUint8ArrayOfLength64.parse(signature);
    data = isUint8Array.parse(data);
    if (!ed25519.verify(signature, data, this.ed25519pub)) {
      throw new Error('Invalid signature');
    }
  }
}

export const NKeyPublicSchema = isOfType<NKeyPublic>(NKeyPublic);

export class NKeyPrivate extends NKeyPublic {
  public readonly ed25519priv: Uint8Array
  public readonly x25519priv: Uint8Array
  constructor(keyData?: NKeyPrivate | Uint8Array) {
    if (!keyData) {
      keyData = ed25519.utils.randomPrivateKey();
    }
    if (keyData instanceof NKeyPrivate) {
      keyData = NKeyPrivateSchema.parse(keyData).ed25519priv;
    }
    const ed25519priv = isUint8ArrayOfLength32.parse(keyData);
    super(ed25519.getPublicKey(ed25519priv));
    this.ed25519priv = ed25519priv;
    this.x25519priv = isUint8ArrayOfLength32.parse(
      edwardsToMontgomeryPriv(ed25519priv)
    );
    if (!equalBytes(x25519.getPublicKey(this.x25519priv), this.x25519pub)) {
      throw new Error('Invalid X25519 key pair');
    }
    NKeyPrivateLookup.getInstance().register(this);
  }

  public sign(data: Uint8Array): Uint8Array {
    data = isUint8Array.parse(data);
    return ed25519.sign(data, this.ed25519priv);
  }

  public getSharedSecret(otherPub: NKeyPublic | Uint8Array): Uint8Array {
    if (!(otherPub instanceof NKeyPublic)) {
      otherPub = new NKeyPublic(otherPub);
    }
    return x25519.getSharedSecret(this.x25519priv, otherPub.x25519pub);
  }
}

export const NKeyPrivateSchema = isOfType<NKeyPrivate>(NKeyPrivate);