import { io, Socket } from "socket.io-client";
import * as msgpack from 'notepack.io';
import customSocketIOParser from 'socket.io-msgpack-parser';

import Manager from "./index.js";
import { socketIOClientOptions } from "./constants.js";

class SocketIOClient {
  private manager: Manager;
  private serverName: string;
  private addresses: string[];
  private sockets: Set<Socket>;
  private unregisterSelf: () => void;

  public constructor(manager: Manager, serverName: string, addresses: string[], unregisterSelf: () => void) {
    this.serverName = serverName;
    this.manager = manager;
    this.addresses = addresses;
    this.unregisterSelf = unregisterSelf;
    // LET'S USE A GUERILLA STRATEGY TO TRY TO CONNECT ALL ADDRESSES
    this.sockets = new Set<Socket>();
    const opts = {
      ...socketIOClientOptions,
      parser: customSocketIOParser,
      auth: (cb: any) => cb({
        token: this.authSelf()
      })
    };
    this.addresses.forEach((addr) => {
      const socket = io(`ws://${addr}`, opts);
      this.sockets.add(socket);
      socket.on('connect', () => this.onConnect(socket));
      socket.on('connect_error', (err) => this.onConnectError(socket, err));
      socket.on('disconnect', (reason, detail) => this.onDisconnect(socket, reason, detail));
      socket.on('log', (msg) => this.onLog(socket, msg));
      socket.on('intentProofReady', (encryptedResponse, cb) => this.onIntentProofReady(socket, encryptedResponse, cb) )
      socket.io.on('reconnect_failed', () => this.onReconnectFailed(socket));
    });
  }

  public _destructor = async() => {
    this.sockets.forEach(socket => {
      socket.disconnect();
    })
  }

  private onIntentProofReady = (socket: Socket, encryptedResponse: Uint8Array, cb: any) => {
    try {
      this.manager.handleEncryptedProofResponse(encryptedResponse);
      cb?.(null);
    } catch (error) {
      console.log(error);
      cb?.(error);
    }
  }

  private onLog = (socket: Socket, msg: string) => {
    console.log(`[SocketIOClient] ${msg}`);
  }

  private unregisterSocket = (socket: Socket) => {
    // TODO should we try to recover buffered messages in socket?
    socket.disconnect();
    this.sockets.delete(socket);
    if (this.sockets.size === 0) {
      this.unregisterSelf();
    }
  }

  private onConnect = (socket: Socket) => {
    console.log('Connected to server');
    if (socket.recovered) {
      // any event missed during the disconnection period will be received now
    } else {
      // new or unrecoverable session
    }
  }

  private onDisconnect = (socket: Socket, reason: string, details: any) => {
    if (socket.active) {
      console.log(`Disconnected from server (will reconnect): ${reason}`);
      // temporary disconnection, the socket will automatically try to reconnect
    } else {
      // the connection was forcefully closed by the server or the client itself
      // in that case, `socket.connect()` must be manually called in order to reconnect
      // console.log(reason);
      console.log(`Disconnected from server (will not reconnect): ${reason}`);
      this.unregisterSocket(socket);
    }
  }

  private onConnectError = (socket: Socket, error: Error) => {
    if (socket.active) {
      console.log(`Error connecting to server (will reconnect): ${error.message}`);
      // temporary failure, the socket will automatically try to reconnect
    } else {
      // the connection was denied by the server
      // in that case, `socket.connect()` must be manually called in order to reconnect
      // console.log(error.message);
      console.log(`Error connecting to server (will not reconnect): ${error.message}`);
      this.unregisterSocket(socket);
    }
  }

  private onReconnectFailed = (socket: Socket) => {
    console.log('Failed to reconnect');
    // Fired when couldn't reconnect within reconnectionAttempts.
    this.unregisterSocket(socket);
  }

  private authSelf = () => {
    const timestamp = Date.now();
    const publicKey = new Uint8Array(this.manager.nkey.ed25519pub);
    const [clientOrigin, clientName] = this.manager.getTitle();
    const payload = { timestamp, serverName: this.serverName, clientName, clientOrigin };
    const payloadBufffer = new Uint8Array(msgpack.encode(payload));
    const signature = new Uint8Array(this.manager.nkey.sign(payloadBufffer));

    return ['SDK', publicKey, payloadBufffer, signature];
  }
}

export default SocketIOClient;