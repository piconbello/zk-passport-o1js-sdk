// Use below command to compile
// npx esbuild --bundle examples/browser/QRDummy/script.mjs --outfile=examples/browser/QRDummy/script.cjs

import { ProofRequestQuery, ProofRequest, ProofResponse, ProofResponseData, SocketIOConnection, ProofResponseLookup } from '../../../build/src/index.js';

const query = new ProofRequestQuery({
  type: 'dummy',
  dummy: Math.floor(Math.random() * 10000000).toString(16)
});

console.log('Created query:', JSON.stringify(query), '\n');

const proofRequest = new ProofRequest({ query });
console.log('Created request:', JSON.stringify(proofRequest), '\n');
document.querySelector('#proofRequest > pre').innerText = JSON.stringify(
  proofRequest, null, 2
);

proofRequest.createQRCode('svg').then(svg => {
  document.querySelector('#qrRegion').innerHTML = svg;
  console.log('QR code generated.');
});

const connection = new SocketIOConnection(proofRequest, 'qrWithConnect');
console.log('Waiting for proof response from socket.io connection...');

ProofResponseLookup.getInstance().waitFor(proofRequest.uuid).then(
  (proofResponse) => {
    console.log('Proof response:', JSON.stringify(proofResponse), '\n');
    document.querySelector('#proofResponse > pre').innerText = JSON.stringify(
      proofResponse, null, 2
    );
  })


document.querySelector('#proofResponseFile').addEventListener('change', (ev) => {
  if (this.files?.length > 0) {
    console.log('Reading from file upload');
    var reader = new FileReader();
    reader.onload = function() {
      buffer = new Uint8Array(this.result);
      console.log("Decrypting file");
      try {
        const proofResponse = ProofResponse.fromEncryptedBuffer(buffer);
        console.log('Successfully imported proof response from file');
      } catch (err) {
        console.error('Failed to import proof response from file:', err);
      }
    }
    reader.readAsArrayBuffer(this.files[0]);
  }
});

document.querySelector('#clipboardImportButton').addEventListener('click', async (ev) => {
  try {
    console.log('Reading from clipboard');
    const fileInHex = await navigator.clipboard.readText();
    if (fileInHex.length % 2 !== 0) {
      throw new Error('Clipboard contents must be a valid hexadecimal string');
    };
    console.log('Converting hex to binary');
    const buffer = new Uint8Array(fileInHex.length / 2);
    for (let i = 0; i < buffer.length; i++) {
      const hex = fileInHex.substr(i * 2, 2);
      buffer[i] = parseInt(hex, 16);
    }
    console.log("Decrypting clipboard contents");
    const proofResponse = ProofResponse.fromEncryptedBuffer(buffer);
    console.log('Successfully imported proof response from clipboard');
  } catch(err) {
    console.error('Failed to import proof response from clipboard:', err);
  }
});

document.querySelector('#clipboardExportButton').addEventListener('click', async (ev) => {
  try {
    const dummyResponseData = new ProofResponseData({ type: 'dummy', dummy: 'clipboard-export' });
    const dummyResponse = new ProofResponse({ data: dummyResponseData, proofRequest });
    console.log('Generated dummy proof response:', JSON.stringify(dummyResponse), '\n');
    const encryptedBuffer = dummyResponse.toEncryptedBuffer();
    console.log('Converting binary to hex');
    const fileInHex = Array.from(encryptedBuffer, (byte) => ('00' + byte.toString(16)).slice(-2)).join('');
    console.log('Writing to clipboard');
    await navigator.clipboard.writeText(fileInHex);
    console.log('Proof response exported to clipboard');
  } catch(err) {
    console.error('Failed to export proof response to clipboard:', err);
  }
});