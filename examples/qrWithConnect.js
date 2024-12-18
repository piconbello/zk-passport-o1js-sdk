import { ProofRequestQuery, ProofRequest, ProofResponse, ProofResponseData, SocketIOConnection, ProofResponseLookup } from '../build/src/index.js';

const query = new ProofRequestQuery({
  type: 'dummy',
  dummy: Math.floor(Math.random() * 10000000).toString(16)
});

console.log('Created query:', JSON.stringify(query), '\n');

const proofRequest = new ProofRequest({ query });
console.log('Created request:', JSON.stringify(proofRequest), '\n');

const proofRequestQR = await proofRequest.createQRCode('text');
console.log('Proof request QR:\n\n', proofRequestQR);

const connection = new SocketIOConnection(proofRequest, 'qrWithConnect');
console.log('Waiting for proof response from socket.io connection...');

const proofResponse = await ProofResponseLookup.getInstance().waitFor(proofRequest.uuid);
console.log('Proof response:', JSON.stringify(proofResponse), '\n');
