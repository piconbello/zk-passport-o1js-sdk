import { bytesToNumberBE, numberToBytesBE } from '@noble/curves/abstract/utils';
import { randomBytes } from '@noble/hashes/utils';
import { defEnsure } from '@thi.ng/errors';
import { BASE64 } from '@thi.ng/base-n';

import ProofRequest, { ensureProofRequest } from '../ProofRequest/index.js';

interface IntentObject {
  readonly randomId: Uint8Array; // 10byte
  readonly timestamp: number; // 6byte (Date.now() as integer)
  readonly proofRequest: ProofRequest; // variable length
}

const ensureRandomId = defEnsure((x: any) => x instanceof Uint8Array && x.length === 10, 'randomId:Uint8Array(10)');
const ensureTimestamp = defEnsure((x: any) => typeof x === 'number' && parseInt(`${x}`)===x, 'timestamp:integer(6byte)');

class Intent implements IntentObject {
  public readonly randomId: Uint8Array; // 10byte
  public readonly timestamp: number; // encoded as 6byte
  public readonly proofRequest: ProofRequest; // TODO define your request object
  private readonly _uuid: string; // generated UUID based on randomId and timestamp

  constructor(partialIntentObject?: Partial<IntentObject>) {
    if(!partialIntentObject) partialIntentObject = {};
    this.randomId = partialIntentObject.randomId || randomBytes(10);
    ensureRandomId(this.randomId);
    this.timestamp = partialIntentObject.timestamp || Date.now();
    ensureTimestamp(this.timestamp);
    this.proofRequest = new ProofRequest(partialIntentObject.proofRequest);
    ensureProofRequest(this.proofRequest);
    const _uuid = `${BASE64.encodeBytes(this.randomId)}~${BASE64.encode(this.timestamp)}`;
    Object.defineProperty(this, '_uuid', { value: _uuid, enumerable: false, writable: false });
  }

  get uuid(): string {
    return this._uuid;
  }

  public toCompactBuffer(): Uint8Array {
    const proofRequestBuffer = this.proofRequest.toCompactBuffer();

    const buffer = new Uint8Array(16 + proofRequestBuffer.length);
    buffer.set(this.randomId, 0);
    buffer.set(numberToBytesBE(this.timestamp, 6), 10);
    buffer.set(proofRequestBuffer, 16);
    return buffer;
  }
  public static fromCompactBuffer(buffer: Uint8Array): Intent {
    const proofRequest = ProofRequest.fromCompactBuffer(buffer.subarray(16));
    return new Intent({ 
      randomId: buffer.subarray(0, 10), 
      timestamp: Number(bytesToNumberBE(buffer.subarray(10, 16))),
      proofRequest
    });
  }
}

export const ensureIntent = defEnsure((x: any) => x instanceof Intent, 'Intent');
export default Intent;