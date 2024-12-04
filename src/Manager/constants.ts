import type { ManagerOptions, SocketOptions } from "socket.io-client";

export const BonjourType = 'zk-pass-o1js';

export const socketIOClientOptions: Partial<ManagerOptions & SocketOptions> = {
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 20000, // connection timeout
  forceNew: true,
  ackTimeout: 10000, // message acknowledgement timeout
  retries: 3, // nof. messages retries
}
  