import { gcm } from '@noble/ciphers/aes';
import { randomBytes } from '@noble/hashes/utils';

export const encryptBuffer = (buffer: Uint8Array, key: Uint8Array): Uint8Array => {
  if (key.length !== 32) {
    throw new Error('Key must be 32 bytes long');
  }
  const nonce = randomBytes(24);
  const aes = gcm(key, nonce);
  const encrypted = aes.encrypt(buffer);
  const res = new Uint8Array(nonce.length + encrypted.length);
  res.set(nonce, 0);
  res.set(encrypted, nonce.length);
  return res;
};

export const decryptBuffer = (encryptedBuffer: Uint8Array, key: Uint8Array): Uint8Array => {
  if (key.length !== 32) {
    throw new Error('Key must be 32 bytes long');
  }
  const nonce = encryptedBuffer.subarray(0, 24);
  const encrypted = encryptedBuffer.subarray(24);
  const aes = gcm(key, nonce);
  return aes.decrypt(encrypted);
}
