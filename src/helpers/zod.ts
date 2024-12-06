import { z } from 'zod';

export const isOfType = <T>(ClassConstructor: new (...args: any[]) => T) => z.custom<T>(
  (data) => data instanceof ClassConstructor,
  (data) => {
    const expected = ClassConstructor.name;
    const received = data?.constructor?.name || typeof data;
    const message = `Expected ${expected}, received ${received}`;
    return {
      message,
      params: { expected, received },
    }
  }
);

export const isUint8Array = isOfType<Uint8Array>(Uint8Array);

export const isUint8ArrayOfLength = (length: number) => isUint8Array.refine(
  (data) => data.length === length,
  (data) => {
    const expectedLength = length;
    const receivedLength = data.length;
    const message = `Uint8Array size must be ${expectedLength} but is ${receivedLength}`;
    return {
      message,
      params: { expectedLength, receivedLength },
    }
  }
)

export const isUint8ArrayOfLength32 = isUint8ArrayOfLength(32);
export const isUint8ArrayOfLength64 = isUint8ArrayOfLength(64);
