import { bytesToHex } from '@noble/curves/abstract/utils';
import { io, Socket } from "socket.io-client";
// import customSocketIOParser from 'socket.io-msgpack-parser';

import { ProofRequest } from '../ProofRequest/index.js';
import { ProofResponse, ProofResponseLookup } from '../ProofResponse/index.js';
import { NKeyPrivate, NKeyPrivateLookup } from '../NKey/index.js';
import * as msgpack from '../helpers/msgpack.js';

import { socketIOClientOptions, DEFAULT_PORT, PORT_RANGE } from "./constants.js";

export * from './constants.js';

export class SocketIOConnection {
  public readonly proofRequest: ProofRequest
  public readonly proofResponsePromise: Promise<ProofResponse>;
  public get destructed() {
    return this.sockets.size === 0;
  }

  private sockets: Set<Socket> = new Set();
  private pageTitle: string;
  private nKeyPrivate: NKeyPrivate;

  public constructor(proofRequest: ProofRequest, pageTitle?: string) {
    this.proofRequest = proofRequest;
    this.pageTitle = `${pageTitle || ''}`;
    const nKeyPrivate =  NKeyPrivateLookup.getInstance().lookup(this.proofRequest.nkeyUUID);
    if (!nKeyPrivate) {
      throw new Error('Proof request is missing private key');
    }
    this.nKeyPrivate = nKeyPrivate;
    this.proofResponsePromise = ProofResponseLookup.getInstance().waitFor(this.proofRequest.uuid);
    // make sure to destruct on completion of the promise (aka, we received proof response from somewhere)
    this.proofResponsePromise.finally(this.destructor);
    const opts = {
      ...socketIOClientOptions,
      transports: ['websocket'],
      withCredentials: true,
      // parser: customSocketIOParser,
      auth: (cb: any) => cb({
        token: this.authSelf()
      })
    }
    // LET'S USE A GUERILLA STRATEGY TO TRY TO CONNECT ALL PORTS
    for (let portIndex = 0; portIndex < PORT_RANGE; portIndex++) {
      const socket = io(`ws://${proofRequest.uuid}.local:${DEFAULT_PORT + portIndex}`, opts);
      this.sockets.add(socket);
      socket.on('connect', () => this.onConnect(socket));
      socket.on('connect_error', (err) => this.onConnectError(socket, err));
      socket.on('disconnect', (reason, detail) => this.onDisconnect(socket, reason, detail));
      socket.on('log', (msg) => this.onLog(socket, msg));
      socket.on('proofResponse', (encryptedResponse, cb) => this.onProofResponse(socket, encryptedResponse, cb) )
      socket.io.on('reconnect_failed', () => this.onReconnectFailed(socket));
    }
  }

  public destructor = async() => {
    this.sockets.forEach(socket => {
      socket.disconnect();
    })
    console.log('[SocketIOClient] Destructed successfully.');
  }

  private onProofResponse = (socket: Socket, encryptedResponse: Uint8Array, cb: any) => {
    try {
      // this would automatically trigger completion of the promise.
      const proofResponse = ProofResponse.fromEncryptedBuffer(encryptedResponse);
      cb?.(null);
      // mission completed, destructor is called as a result of the completed promise.
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
      // console.log(`Error connecting to server (will reconnect): ${error.message}`);
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

  public static getTitle(pageTitle: string): [string,string] {
    const result: [string,string] = ['',pageTitle];
    if (typeof document !== 'undefined' && document.title && !result[1]) {
      result[1] = document.title;
    }
    if (typeof process !== 'undefined') {
      result[0] = process.title;
      if (!result[1]) result[1] = result[0];
    }
    if (typeof window !== 'undefined') {
      result[0] = window?.location?.href || 'Unknown';
      if (!result[1]) result[1] = window?.location?.host || result[0];
    }
    return result;
  }

  private authSelf = () => {
    const timestamp = Date.now();
    const publicKey = this.proofRequest.ed25519pub;
    const [clientOrigin, clientName] = SocketIOConnection.getTitle(this.pageTitle);
    const payload = { timestamp, serverName: this.proofRequest.uuid, clientName, clientOrigin };
    const payloadBufffer = new Uint8Array(msgpack.encode(payload));
    const signature = new Uint8Array(this.nKeyPrivate.sign(payloadBufffer));

    const tokenBuffer = msgpack.encode([publicKey, payloadBufffer, signature]);
    const token = bytesToHex(tokenBuffer);

    return `SDK ${token}`;
    // return ['SDK', publicKey, payloadBufffer, signature];
  }
}
