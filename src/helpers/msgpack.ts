import * as msgpack from 'msgpack-lite'

export const encode = (data: any): Uint8Array => {
  return msgpack.encode(data);
}

export const decode = (buffer: Uint8Array): any => {
  return msgpack.decode(buffer);
}