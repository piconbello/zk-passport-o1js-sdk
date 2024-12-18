import { z } from "zod";

import { isUint8Array } from "../helpers/zod.js";
import * as msgpack from '../helpers/msgpack.js';

// refer to https://regulaforensics.com/blog/rfid-verification/#what-information-does-an-rfid-chip-store-in-the-epassport-application
// for meaning of data groups.
export const ProofResponseDataOptionsRawPassportSchema = z.object({
  type: z.literal("rawPassport"),
  groups: z.object({
    DG1: isUint8Array, // MRZ
    DG2: isUint8Array, // PHOTO
    DG3: z.never(), // Fingerprints, requires terminal auth.
    DG4: z.never(), // Iris data, requires terminal auth.
    DG5: isUint8Array.optional(), // OPTIONAL PHOTO IN HIGHER QUALITY
    DG7: isUint8Array.optional(), // OPTIONAL image of hand-written signature.
    DG11: isUint8Array.optional(), // OPTIONAL additional details (full name in local lang, place of birth, residence address, etc.)
    DG12: isUint8Array.optional(), // OPTIONAL info on issuing body (where, when, etc.)
    DG13: isUint8Array.optional(), // OPTIONAL additional details reserved by nationals services
    DG14: isUint8Array.optional(), // OPTIONAL chip authentication key & algs.
    DG15: isUint8Array.optional(), // OPTIONAL active authentication key & algs.
    SOD: isUint8Array, // document security object (certificates etc.)
    COM: isUint8Array, // which data groups are stored in the passport
  })
});

export type ProofResponseDataOptionsRawPassport = z.infer<typeof ProofResponseDataOptionsRawPassportSchema>;

export const ProofResponseDataOptionsProofInputsSchema = z.object({
  type: z.literal("proofInputs"),
  // TODO define proofResponseData object fields for proof inputs here
});


export type ProofResponseDataOptionsProofInputs = z.infer<typeof ProofResponseDataOptionsProofInputsSchema>;

export const ProofResponseDataOptionsProofSchema = z.object({
  type: z.literal("proof"),
  // TODO define proofResponseData object fields for proof here
});

export type ProofResponseDataOptionsProof = z.infer<typeof ProofResponseDataOptionsProofSchema>;

export const ProofResponseDataOptionsDummySchema = z.object({
  type: z.literal("dummy"),
  dummy: z.string().optional(),  // Optional field for dummy proof response data type
});

export type ProofResponseDataOptionsDummy = z.infer<typeof ProofResponseDataOptionsDummySchema>;

export const ProofResponseDataOptionsSchema = z.discriminatedUnion("type", [
  ProofResponseDataOptionsRawPassportSchema,
  ProofResponseDataOptionsProofInputsSchema,
  ProofResponseDataOptionsProofSchema,
  ProofResponseDataOptionsDummySchema,
]);

export type ProofResponseDataOptions = z.infer<typeof ProofResponseDataOptionsSchema>;

export type ProofResponseDataType = ProofResponseDataOptions["type"];

export class ProofResponseData {
  public readonly options: ProofResponseDataOptions;
  public get type(): ProofResponseDataType {
    return this.options.type;
  }


  public constructor(options: ProofResponseDataOptions) {
    this.options = ProofResponseDataOptionsSchema.parse(options);
  }

  public toCompactBuffer(): Uint8Array {
    return msgpack.encode(this.options);
  }

  public static fromCompactBuffer(buffer: Uint8Array): ProofResponseData {
    const proofResponseDataObject = msgpack.decode(buffer);
    return new ProofResponseData(proofResponseDataObject);
  }
}
