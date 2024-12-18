import { AdvancedPromise, createAdvancedPromise } from "../helpers/createAdvancedPromise.js";

import { ProofResponse, ProofResponseSchema } from "./index.js";

export class ProofResponseLookup {
  private static instance: ProofResponseLookup;
  private readonly lookupMap: Map<string, ProofResponse> = new Map();
  private readonly lookupMapPromise: Map<string, AdvancedPromise<ProofResponse>> = new Map();
  private constructor() {}

  public register(proofResponse: ProofResponse): void {
    this.lookupMap.set(
      proofResponse.proofRequest.uuid, 
      ProofResponseSchema.parse(proofResponse)
    );
    if (this.lookupMapPromise.has(proofResponse.proofRequest.uuid)) {
      this.lookupMapPromise.get(proofResponse.proofRequest.uuid)!.resolve(proofResponse);
    }
  }

  public lookup(uuid: string): ProofResponse | undefined {
    return this.lookupMap.get(uuid);
  }

  public waitFor(uuid: string): AdvancedPromise<ProofResponse> {
    if (this.lookupMapPromise.has(uuid)) {
      return this.lookupMapPromise.get(uuid)!;
    }
    const promise = createAdvancedPromise<ProofResponse>();
    this.lookupMapPromise.set(uuid, promise);
    if (this.lookupMap.has(uuid)) {
      promise.resolve(this.lookupMap.get(uuid)!);
    }
    return promise;
  }

  public static getInstance(): ProofResponseLookup {
    if (!ProofResponseLookup.instance) {
      ProofResponseLookup.instance = new ProofResponseLookup();
    }
    return ProofResponseLookup.instance;
  }
}