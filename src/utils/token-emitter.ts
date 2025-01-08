import EventEmitter from "events";

class TokenEmitter extends EventEmitter {}

const tokenEmitter = new TokenEmitter();

export const emitTokenEvent = (token: string) => {
  tokenEmitter.emit('tokenAvailable', token);
};

export const waitForToken = (): Promise<string> => {
  return new Promise((resolve) => {
    tokenEmitter.once('tokenAvailable', (token) => {
      resolve(token);
    });
  });
};