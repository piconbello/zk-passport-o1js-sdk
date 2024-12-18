import type { ManagerOptions, SocketOptions } from "socket.io-client";

export const socketIOClientOptions: Partial<ManagerOptions & SocketOptions> = {
  reconnection: true,
  // reconnectionAttempts: 10, // defaults to infinity.
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000, // connection timeout
  forceNew: true,
  ackTimeout: 10000, // message acknowledgement timeout
  retries: 3, // nof. messages retries
}
  
export const DEFAULT_PORT = 38959;
export const PORT_RANGE = 10;