import { Manager, ProofRequest, Intent, ProofResponse } from "./build/src/index.js"

const manager = new Manager({
  pageTitle: 'Zk Passport O1JS SDK Example'
});

const proofRequest = new ProofRequest({
  dummy: 'tomato'
});

const intent = new Intent({
  proofRequest
});

const proofResponsePromise = manager.registerIntent(intent);

proofResponsePromise.then((proofResponse) => {
  console.log('Proof response:', proofResponse);
}).catch((error) => {
  console.error('Proof response failed Error:', error);
});

const qrCode = await manager.createQRCodeForIntent(intent, "text");

console.log('QR Code:\n' + qrCode);

console.log('Waiting for proof');