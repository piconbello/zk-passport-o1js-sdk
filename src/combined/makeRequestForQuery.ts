import { z } from "zod";

import { ProofRequest, ProofRequestQueryOptions } from "../ProofRequest/index.js";
import { ProofResponseLookup } from "../ProofResponse/lookup.js";
import { SocketIOConnection } from "../SocketIOConnection/index.js";

export const MakeRequestForQueryOptionsSchema = z.object({
  autoConnect: z.boolean().default(true), // used for directly obtaining response from mobile.
  qrMode: z.enum(['svg', 'png', 'text']).default('text'), // mode for QR code generation
  mobileAppProtocol: z.string().default('exp+zk-passport-o1js'), // protocol to be used for mobile app (exp+zk-passport-o1js)
  pageTitle: z.string().optional(), // title for the webpage (optional)
}).required();

export type MakeRequestForQueryOptions = z.infer<typeof MakeRequestForQueryOptionsSchema>;

export const makeRequestForQuery = async (query: ProofRequestQueryOptions, options?: MakeRequestForQueryOptions) => {
  options = MakeRequestForQueryOptionsSchema.parse(options || {});
  const proofRequest = new ProofRequest({
    query
  });
  const qr = await proofRequest.createQRCode(options.qrMode, options.mobileAppProtocol);
  let socketIOConnection = null;
  if (options.autoConnect) {
    socketIOConnection = new SocketIOConnection(proofRequest, options.pageTitle);
  }
  const responsePromise = ProofResponseLookup.getInstance().waitFor(proofRequest.uuid);
  const responseDataPromise = responsePromise.then((response) => response.data);

  return {
    qr,
    proofRequest,
    socketIOConnection,
    responsePromise,
    responseDataPromise
  };
}