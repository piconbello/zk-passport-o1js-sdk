import { ProofRequest, ProofRequestSchema } from "./index.js";

// Singleton class for keeping track of ISSUED proof requests
export class ProofRequestLookup {
  private static instance: ProofRequestLookup;
  private readonly lookupMap: Map<string, ProofRequest> = new Map();
  private constructor() {}

  public register(proofRequest: ProofRequest): void {
    this.lookupMap.set(
      proofRequest.uuid, 
      ProofRequestSchema.parse(proofRequest)
    );
  }

  public lookup(uuid: string): ProofRequest | undefined {
    return this.lookupMap.get(uuid);
  }

  public static getInstance(): ProofRequestLookup {
    if (!ProofRequestLookup.instance) {
      ProofRequestLookup.instance = new ProofRequestLookup();
    }
    return ProofRequestLookup.instance;
  }
}