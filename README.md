# Mina zkApp: Zk Passport O1js Sdk

This template uses TypeScript.

## How to build

```sh
npm run build
```

## How to run tests

```sh
npm run test
npm run testw # watch mode
```

## How to run coverage

```sh
npm run coverage
```

## License

[Apache-2.0](LICENSE)


## How to Use

ok for now combined folder contains some examples. remove them and instead document the flow properly.




If not initialized create a singleton Manager class instance. (use autoConnect true for socket connection)
Create a new ProofRequest.
Create a new Intent with the ProofRequest
Register Intent to Manager and get a Promise for ProofResult
Create a QRCode for ProofRequest via Communication
Scan QRCode with mobile-app 
(it will show connection if there's any matching).
create the proof, either export it as file or choose send directly (requires connected matching socket)
If received via connection, it will automatically cause Communication to resolve the promise for ProofResult
Otherwise, import the file and read it as binary, and call `handleEncryptedProofResponse` of the communication class.






## Backlog
- [ ] Maybe rename classes to better names
- [ ] Force Manager as a singleton? (Might prevent accidentally creating many of them)
- [ ] Replace console.logs and use debug package
- [ ] Add timestamp based security checks for connections, etc. (time-outs)
- [ ] Add detailed explanations on how to use.
- [ ] Actually implement proof request, response content and contracts...

