import { z } from "zod";
import * as msgpack from '../helpers/msgpack.js';

import { isOfType, isUint8Array } from "../helpers/zod.js";

export const ProvableConstraintsSchema = z.object({
  minimumAge: z.number().int().positive().optional(),
  nationality: z.string().min(3).max(3).optional(),
});

export type ProvableConstraints = z.infer<typeof ProvableConstraintsSchema>;

export const ProofRequestQueryOptionsRawPassportSchema = z.object({
  type: z.literal("rawPassport"),
});

export type ProofRequestQueryOptionsRawPassport = z.infer<typeof ProofRequestQueryOptionsRawPassportSchema>;

export const ProofRequestQueryOptionsProofInputsSchema = z.object({
  type: z.literal("proofInputs"),
  constraints: ProvableConstraintsSchema,
});

export type ProofRequestQueryOptionsProofInputs = z.infer<typeof ProofRequestQueryOptionsProofInputsSchema>;

export const ProofRequestQueryOptionsProofSchema = z.object({
  type: z.literal("proof"),
  constraints: ProvableConstraintsSchema,
  applicationId: isUint8Array.optional(),
  timestamp: z.number().int().positive().optional(),
});

export type ProofRequestQueryOptionsProof = z.infer<typeof ProofRequestQueryOptionsProofSchema>;

export const ProofRequestQueryOptionsDummySchema = z.object({
  type: z.literal("dummy"),
  dummy: z.string().optional(),
});

export type ProofRequestQueryDummy = z.infer<typeof ProofRequestQueryOptionsDummySchema>;

export const ProofRequestQueryOptionsSchema = z.discriminatedUnion("type", [
  ProofRequestQueryOptionsRawPassportSchema,
  ProofRequestQueryOptionsProofInputsSchema,
  ProofRequestQueryOptionsProofSchema,
  ProofRequestQueryOptionsDummySchema,
]);

export type ProofRequestQueryOptions = z.infer<typeof ProofRequestQueryOptionsSchema>;

export type ProofRequestQueryType = ProofRequestQueryOptions["type"];

// TODO Rewrite it as a factory and support a more compact buffer export/import rather than msgpack.

export class ProofRequestQuery {
  public readonly options: ProofRequestQueryOptions;
  public get type(): ProofRequestQueryType {
    return this.options.type;
  }
  public get constraints(): ProvableConstraints | undefined {
    if (this.options.type === "proofInputs" || this.options.type === "proof") {
      return this.options.constraints;
    }
    return undefined;
  }
  public get applicationId(): Uint8Array | undefined {
    if (this.options.type === "proof") {
      return this.options.applicationId;
    }
    return undefined;
  }
  public get timestamp(): number | undefined {
    if (this.options.type === "proof") {
      return this.options.timestamp;
    }
    return undefined;
  }
  public get dummy(): string | undefined {
    if (this.options.type === "dummy") {
      return this.options.dummy;
    }
    return undefined;
  }
  public constructor(options: ProofRequestQueryOptions) {
    this.options = ProofRequestQueryOptionsSchema.parse(options);
  }

  public toCompactBuffer(): Uint8Array {
    const encoded = msgpack.encode(this.options);
    return encoded;
  }

  public static fromCompactBuffer(buffer: Uint8Array): ProofRequestQuery {
    const proofRequestQueryObject = msgpack.decode(buffer);
    return new ProofRequestQuery(proofRequestQueryObject);
  }
}

export const ProofRequestQuerySchema = isOfType<ProofRequestQuery>(ProofRequestQuery);