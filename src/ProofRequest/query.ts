import { z } from "zod";
import * as msgpack from 'notepack.io'

export const ProofRequestQueryOptionsSchema = z.object({
  // TODO define proofRequestQuery object fields here
  dummy: z.string().optional(), // optional string
});

export type ProofRequestQueryOptions = z.infer<typeof ProofRequestQueryOptionsSchema>;

export class ProofRequestQuery {
  public readonly dummy?: string;

  constructor(options: ProofRequestQueryOptions) {
    options = ProofRequestQueryOptionsSchema.parse(options);
    this.dummy = options.dummy ?? undefined;
  }

  public toCompactBuffer(): Uint8Array {
    const proofRequestQueryObject: ProofRequestQueryOptions = Object.fromEntries(Object.entries(this));
    return msgpack.encode(proofRequestQueryObject);
  }

  public static fromCompactBuffer(buffer: Uint8Array): ProofRequestQuery {
    const proofRequestQueryObject = msgpack.decode(buffer);
    return new ProofRequestQuery(proofRequestQueryObject);
  }
}
