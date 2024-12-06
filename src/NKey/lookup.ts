import { NKeyPrivate, NKeyPrivateSchema } from "./index.js";

// Singleton class for keeping track of issued private keys
export class NKeyPrivateLookup {
  private static instance: NKeyPrivateLookup;
  private readonly lookupMap: Map<string, NKeyPrivate> = new Map();
  private constructor() {}

  public register(nKeyPrivate: NKeyPrivate): void {
    this.lookupMap.set(
      nKeyPrivate.uuid, 
      NKeyPrivateSchema.parse(nKeyPrivate)
    );
  }

  public lookup(uuid: string): NKeyPrivate | undefined {
    return this.lookupMap.get(uuid);
  }

  public static getInstance(): NKeyPrivateLookup {
    if (!NKeyPrivateLookup.instance) {
      NKeyPrivateLookup.instance = new NKeyPrivateLookup();
    }
    return NKeyPrivateLookup.instance;
  }
}