import { z } from "zod";
import { bytesToHex, bytesToNumberBE, equalBytes, numberToBytesBE } from '@noble/curves/abstract/utils';

import { isOfType, isUint8ArrayOfLength32, is6ByteUint } from "../helpers/zod.js";
import * as msgpack from '../helpers/msgpack.js';
import { decryptBuffer, encryptBuffer } from "../helpers/encryption.js";
import { NKeyPrivate, NKeyPublic, NKeyPrivateLookup } from "../NKey/index.js";
import { ProofRequest, ProofRequestOptionsSchema, ProofRequestLookup } from "../ProofRequest/index.js";

import { ProofResponseData, ProofResponseDataOptionsSchema } from "./data.js";
import { ProofResponseLookup } from "./lookup.js";

export * from "./data.js";
export * from "./lookup.js"

export const ProofResponseOptionsSchema = z.object({
  ed25519pub: isUint8ArrayOfLength32.optional(), // omit for new proof responses.
  timestamp: is6ByteUint.optional(), // 6byte (Date.now() as integer)
  data: ProofResponseDataOptionsSchema,
  proofRequest: ProofRequestOptionsSchema,
});

export type ProofResponseOptions = z.infer<typeof ProofResponseOptionsSchema>;

export class ProofResponse {
  private readonly _nkey: NKeyPublic | NKeyPrivate;
  
  public readonly timestamp: number; // encoded as 6byte
  public readonly data: ProofResponseData; // the actual provable data for the request
  public readonly proofRequest: ProofRequest; // the request that was used to create this response
  public get ed25519pub(): Uint8Array {
    return this._nkey.ed25519pub;
  }

  public get uuid(): string {
    return this.proofRequest.uuid;
  }
  public toJSON(): object {
    // used for easier debugging :)
    return { nkey: this._nkey, timestamp: this.timestamp, data: this.data, proofRequest: this.proofRequest };
  }

  public constructor(options: ProofResponseOptions) {
    options = ProofResponseOptionsSchema.parse(options);
    this.timestamp = options.timestamp?? Date.now();
    this.data = new ProofResponseData(options.data);
    this.proofRequest = new ProofRequest(options.proofRequest);
    if (options.ed25519pub) {
      this._nkey = new NKeyPublic(options.ed25519pub);
    } else {
      this._nkey = new NKeyPrivate();
    }
    ProofResponseLookup.getInstance().register(this);
  }

  public toCompactBuffer(): Uint8Array {
    const dataBuffer = this.data.toCompactBuffer();
    const proofRequestBuffer = this.proofRequest.toCompactBuffer();
    const nestedBuffer = msgpack.encode([dataBuffer, proofRequestBuffer]);
    const buffer = new Uint8Array(38 + nestedBuffer.length);
    buffer.set(this.proofRequest.ed25519pub, 0);
    buffer.set(numberToBytesBE(this.timestamp, 6), 32);
    buffer.set(nestedBuffer, 38);
    return buffer;
  }
  
  public static fromCompactBuffer(buffer: Uint8Array): ProofResponse {
    const [dataBuffer, proofRequestBuffer] = msgpack.decode(buffer.subarray(38));
    return new ProofResponse({
      ed25519pub: buffer.subarray(0, 32),
      timestamp: Number(bytesToNumberBE(buffer.subarray(32, 38))),
      data: ProofResponseData.fromCompactBuffer(dataBuffer).options,
      proofRequest: ProofRequest.fromCompactBuffer(proofRequestBuffer),
    });
  }

  public toEncryptedBuffer(): Uint8Array {
    if (!(this._nkey instanceof NKeyPrivate)) throw new Error('Private key required for encryption');
    const sharedSecret = this._nkey.getSharedSecret(this.proofRequest.ed25519pub);
    const rawData = this.toCompactBuffer();
    const encryptedBuffer = encryptBuffer(rawData, sharedSecret);
    const encryptedBufferWithPublicKeys = new Uint8Array(32 + 32 + encryptedBuffer.length);
    encryptedBufferWithPublicKeys.set(this.ed25519pub, 0);
    encryptedBufferWithPublicKeys.set(this.proofRequest.ed25519pub, 32);
    encryptedBufferWithPublicKeys.set(encryptedBuffer, 64);
    return encryptedBufferWithPublicKeys
  }

  public static fromEncryptedBuffer(buffer: Uint8Array): ProofResponse {
    if (buffer instanceof ArrayBuffer) {
      buffer = new Uint8Array(buffer);
    }
    const responseEd25519pub = isUint8ArrayOfLength32.parse(buffer.subarray(0, 32));
    const requestNKeyPublic = new NKeyPublic(
      buffer.subarray(32, 64)
    );
    const requestNKeyPrivate = NKeyPrivateLookup.getInstance().lookup(requestNKeyPublic.uuid);
    if (!requestNKeyPrivate) throw new Error('Request private key required for decryption');
    const sharedSecret = requestNKeyPrivate.getSharedSecret(responseEd25519pub);
    const decryptedBuffer = decryptBuffer(buffer.subarray(64), sharedSecret);
    const proofResponse = ProofResponse.fromCompactBuffer(decryptedBuffer);
    const issuedProofRequest = ProofRequestLookup.getInstance().lookup(proofResponse.proofRequest.uuid);
    if (!issuedProofRequest) throw new Error('Issued proof request not found');
    const proofRequestCompactBuffer = proofResponse.proofRequest.toCompactBuffer();
    const issuedProofRequestCompactBuffer = issuedProofRequest.toCompactBuffer();
    if (!equalBytes(proofRequestCompactBuffer, issuedProofRequestCompactBuffer)) {
      throw new Error('Proof request does not match the issued one');
    }
    return proofResponse;
  }
}

export const ProofResponseSchema = isOfType<ProofResponse>(ProofResponse);