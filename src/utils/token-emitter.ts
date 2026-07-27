import EventEmitter from "events";

class TokenEmitter extends EventEmitter {}

const tokenEmitter = new TokenEmitter();

/**
 * Wakes anything parked on {@link waitForToken} once a credential exists.
 *
 * The payload is the *bearer string* — the same value `getToken()` returns — because
 * the only consumer, `showPages()`, drops it straight into `Authorization: Bearer
 * ${token}` in place of a `getToken()` that came back `null`. Anything else lands in
 * that header verbatim; passing the token object produced `Bearer [object Object]`.
 * Resolve a token object with `bearerOf()` in `store/account/action` before emitting.
 */
export const emitTokenEvent = (bearer: string) => {
  tokenEmitter.emit('tokenAvailable', bearer);
};

/**
 * Resolves with the bearer string from the next {@link emitTokenEvent}.
 *
 * `once`, so an emit with no waiter is dropped rather than queued — a waiter only
 * ever sees a login that happens after it started listening.
 */
export const waitForToken = (): Promise<string> => {
  return new Promise((resolve) => {
    tokenEmitter.once('tokenAvailable', (bearer: string) => {
      resolve(bearer);
    });
  });
};
