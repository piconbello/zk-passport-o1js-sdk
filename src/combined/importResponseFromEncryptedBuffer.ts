import { ProofResponse } from "../ProofResponse/index.js";

/**
 * Use this function to import a ProofResponse from an encrypted file. 
 * You should read the file yourself and provide it as an Uint8Array.
 * @param buffer 
 * @returns ProofResponse
 */
export const importResponseFromEncryptedBuffer = (buffer: Uint8Array): ProofResponse => {
  return ProofResponse.fromEncryptedBuffer(buffer);
}