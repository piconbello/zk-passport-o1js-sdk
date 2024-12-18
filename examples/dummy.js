import { ProofRequestQuery, ProofRequest, ProofResponse, ProofResponseData } from '../build/src/index.js';

const query = new ProofRequestQuery({
  type: 'dummy',
  dummy: 'potato'
});

console.log('Created query:', JSON.stringify(query), '\n');

const proofRequest = new ProofRequest({ query });
console.log('Created request:', JSON.stringify(proofRequest), '\n');

const proofRequestQRData = proofRequest.toQRFriendlyString();
console.log('Proof request QR data:', proofRequestQRData, '\n');

const proofRequestFromQR = ProofRequest.fromQRFriendlyString(proofRequestQRData);
console.log('Parsed request from QR:', JSON.stringify(proofRequestFromQR), '\n');

const proofResponseData = new ProofResponseData({
  type: 'dummy',
  dummy: 'tomato'
});
console.log('Created response:', JSON.stringify(proofResponseData), '\n');

const proofResponse = new ProofResponse({
  proofRequest,
  data: proofResponseData
});
console.log('Created response:', JSON.stringify(proofResponse), '\n');

const encryptedProofResponse = proofResponse.toEncryptedBuffer();
console.log('Encrypted response:', encryptedProofResponse, '\n');

const decryptedProofResponse = ProofResponse.fromEncryptedBuffer(encryptedProofResponse);
console.log('Decrypted response:', JSON.stringify(decryptedProofResponse), '\n');
