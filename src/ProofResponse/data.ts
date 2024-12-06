import { z } from "zod";
import * as msgpack from 'notepack.io'

export const ProofResponseDataOptionsSchema = z.object({
  // TODO define proofResponseData object fields here
  dummy: z.string().optional(), // optional string
});

export type ProofResponseDataOptions = z.infer<typeof ProofResponseDataOptionsSchema>;

export class ProofResponseData {
  public readonly dummy?: string;

  constructor(options: ProofResponseDataOptions) {
    options = ProofResponseDataOptionsSchema.parse(options);
    this.dummy = options.dummy ?? undefined;
  }

  public toCompactBuffer(): Uint8Array {
    const proofResponseDataObject: ProofResponseDataOptions = Object.fromEntries(Object.entries(this));
    return msgpack.encode(proofResponseDataObject);
  }

  public static fromCompactBuffer(buffer: Uint8Array): ProofResponseData {
    const proofResponseDataObject = msgpack.decode(buffer);
    return new ProofResponseData(proofResponseDataObject);
  }
}
