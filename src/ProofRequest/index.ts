import { defEnsure } from '@thi.ng/errors';
import * as msgpack from 'notepack.io'

interface ProofRequestObject {
  readonly dummy?: string; // TODO define proofRequest object fields here
}

const ensureDummy = defEnsure((x: any) => typeof x === 'undefined' || (typeof x === 'string'), 'dummy?:string(*)');

class ProofRequest implements ProofRequestObject {
  public readonly dummy?: string;

  constructor(partialProofRequestObject?: Partial<ProofRequestObject>) {
    this.dummy = partialProofRequestObject?.dummy ?? undefined;
    ensureDummy(this.dummy ?? '', 'dummy=string');
  }

  public toCompactBuffer(): Uint8Array {
    const proofRequestObject: ProofRequestObject = Object.fromEntries(Object.entries(this));
    return msgpack.encode(proofRequestObject);
  }

  public static fromCompactBuffer(buffer: Uint8Array): ProofRequest {
    const proofRequestObject = msgpack.decode(buffer);
    return new ProofRequest(proofRequestObject);
  }
}

export const ensureProofRequest = defEnsure((x: any) => x instanceof ProofRequest, 'ProofRequest');
export default ProofRequest;