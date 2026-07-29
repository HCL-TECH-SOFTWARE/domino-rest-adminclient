/* ========================================================================== *
 * Copyright (C) 2025, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * A one-shot channel between whoever obtains a bearer token and whoever is waiting
 * for one.
 *
 * This used to extend Node's `EventEmitter`, which meant a Node-shaped shim in
 * browser code and a runtime dependency carried for this one file. `EventTarget` is
 * native everywhere this app runs and covers the two calls that were actually used —
 * `emit`/`once` map onto `dispatchEvent` and `addEventListener(…, { once: true })`
 * (#826).
 */
const tokenEmitter = new EventTarget();

const TOKEN_AVAILABLE = 'tokenAvailable';

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
  tokenEmitter.dispatchEvent(new CustomEvent(TOKEN_AVAILABLE, { detail: bearer }));
};

/**
 * Resolves with the bearer string from the next {@link emitTokenEvent}.
 *
 * `{ once: true }`, so an emit with no waiter is dropped rather than queued — a
 * waiter only ever sees a login that happens after it started listening. Each call
 * registers its own listener, so a single emit resolves every waiter.
 */
export const waitForToken = (): Promise<string> => {
  return new Promise((resolve) => {
    tokenEmitter.addEventListener(
      TOKEN_AVAILABLE,
      (event) => {
        resolve((event as CustomEvent<string>).detail);
      },
      { once: true },
    );
  });
};
