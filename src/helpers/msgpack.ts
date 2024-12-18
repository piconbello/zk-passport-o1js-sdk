import * as msgpack from 'notepack.io'

export const encode = (data: any): Uint8Array => {
  return new Uint8Array(msgpack.encode(data));
}

export const decode = (buffer: Uint8Array): any => {
  if (typeof global !== 'undefined') {
    // we run in node.
    buffer = Buffer.from(buffer);
  }
  return msgpack.decode(buffer);
}