import { defEnsure } from '@thi.ng/errors';
import * as msgpack from 'notepack.io'

interface ProofResponseObject {
  readonly dummy?: string; // TODO define proofResponse object fields here
}

const ensureDummy = defEnsure((x: any) => typeof x === 'undefined' || (typeof x === 'string'), 'dummy?:string(*)');

class ProofResponse implements ProofResponseObject {
  public readonly dummy?: string;

  constructor(partialProofResponseObject?: Partial<ProofResponseObject>) {
    this.dummy = partialProofResponseObject?.dummy ?? undefined;
    ensureDummy(this.dummy ?? '', 'dummy=string');
  }

  public toCompactBuffer(): Uint8Array {
    const proofResponseObject: ProofResponseObject = Object.fromEntries(Object.entries(this));
    return msgpack.encode(proofResponseObject);
  }

  public static fromCompactBuffer(buffer: Uint8Array): ProofResponse {
    const proofResponseObject = msgpack.decode(buffer);
    return new ProofResponse(proofResponseObject);
  }
}

export const ensureProofResponse = defEnsure((x: any) => x instanceof ProofResponse, 'ProofResponse');
export default ProofResponse;