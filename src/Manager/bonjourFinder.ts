import { Bonjour, type Browser, type Service } from 'bonjour-service'
import { BonjourType } from './constants.js';

export type OnDiscovery = (name: string, addresses: string[]) => void;
export type OnDisconnect = (name: string) => void;

class BonjourFinder {
  private bonjourInstance: Bonjour;
  private appFinder: Browser;
  private _onDiscovery: OnDiscovery;
  private _onDisconnect: OnDisconnect;

  constructor(onDiscovery: OnDiscovery, onDisconnect: OnDisconnect) {
    this.bonjourInstance = new Bonjour({}, this.errorCallback);
    this.appFinder = this.bonjourInstance.find({
      type: BonjourType,
    });
    this._onDiscovery = onDiscovery;
    this._onDisconnect = onDisconnect;
    this.appFinder.on('up', this.onUp).on('down', this.onDown);
  }

  private errorCallback = (error: Error) => {
    console.error('Error in Bonjour:', error);
  }

  private onUp = (service: Service) => {
    const addresses = (service.addresses||[]).map((addr) => {
      if (/\:/g.test(addr) && !addr.startsWith('[')) {
        // is ipv6 address, we need to wrap it in square brackets
        addr = `[${addr}]`;
      }
      return `${addr}:${service.port}`;
    })
    this._onDiscovery(service.name, addresses);
  }
  private onDown = (service: Service) => {
    this._onDisconnect(service.name);
  }
}

export default BonjourFinder;