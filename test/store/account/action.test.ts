/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dispatch } from 'redux';
import {
  bearerOf,
  getToken,
  login,
  loginWithPkce,
  renewToken,
  showPages,
} from '../../../src/store/account/action';
import { REMOVE_AUTH } from '../../../src/store/account/types';
import { Level, Logger } from '../../../src/services/log-service';
import { waitForToken } from '../../../src/utils/token-emitter';

/** Minimal stand-in for the parts of `Response` that `checkForResponse` touches. */
const response = (init: { ok: boolean; status?: number; contentType?: string; body?: unknown }) =>
  ({
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    statusText: 'stubbed',
    headers: { get: () => init.contentType ?? 'application/json' },
    json: async () => {
      if (init.body === undefined) throw new SyntaxError('Unexpected token < in JSON');
      return init.body;
    },
  }) as unknown as Response;

/**
 * `renewToken` used to `await response.json()` with no status check, so a 4xx, a
 * 5xx, an HTML error page or a dropped connection all ended with either an
 * exception escaping the thunk or a renewal action carrying `undefined`. The store
 * then held a broken session that looked authenticated.
 *
 * Since #727 the credential lives only in local storage — `account.token` is gone — so
 * the success path dispatches nothing at all and these assertions are on local storage
 * and on the sign-out actions.
 *
 * Every one of those paths must now end at `removeAuth()`, so they are enumerated
 * here rather than covered by a single happy-path test.
 */
describe('renewToken', () => {
  const STORED = JSON.stringify({ bearer: 'old-bearer' });
  let dispatch: Dispatch & { mock: { calls: unknown[][] } };
  let previousLevel: number;

  const types = () => dispatch.mock.calls.map((call) => (call[0] as { type: string }).type);

  beforeAll(() => {
    // The failure paths log by design; keep the suite output clean.
    previousLevel = Logger.getLevel();
    Logger.setLevel(Level.OFF);
  });

  afterAll(() => Logger.setLevel(previousLevel));

  beforeEach(() => {
    dispatch = vi.fn() as unknown as typeof dispatch;
    localStorage.setItem('user_token', STORED);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('stores the renewed token when the API returns one', async () => {
    const renewed = { bearer: 'new-bearer', expSeconds: 3600 };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, body: renewed })));

    await renewToken()(dispatch);

    // Nothing is dispatched on success: the renewed credential goes to local storage,
    // which is now its only home.
    expect(types()).toEqual([]);
    expect(JSON.parse(localStorage.getItem('user_token')!)).toEqual(renewed);
  });

  it('calls /auth/extend with the current bearer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: { bearer: 'new-bearer' } }));
    vi.stubGlobal('fetch', fetchMock);

    await renewToken()(dispatch);

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/auth/extend');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer old-bearer');
  });

  it('signs out when the API rejects the renewal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response({ ok: false, status: 401, body: { message: 'expired' } })),
    );

    await renewToken()(dispatch);

    expect(types()).toEqual([REMOVE_AUTH]);
    expect(localStorage.getItem('user_token')).toBeNull();
  });

  // The case that motivated the fix: a proxy or gateway returning an HTML error page.
  it('signs out when the body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response({ ok: false, status: 502, contentType: 'text/html' })),
    );

    await renewToken()(dispatch);

    expect(types()).toEqual([REMOVE_AUTH]);
  });

  it('signs out when a 200 carries an unparseable body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true })));

    await renewToken()(dispatch);

    expect(types()).toEqual([REMOVE_AUTH]);
  });

  it('signs out when the request never completes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await renewToken()(dispatch);

    expect(types()).toEqual([REMOVE_AUTH]);
  });

  // A 200 whose payload is missing `bearer` previously dispatched RENEW_TOKEN with
  // `undefined`, leaving the app authenticated with no usable credential.
  it('signs out when a 200 carries no bearer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, body: { expSeconds: 3600 } })));

    await renewToken()(dispatch);

    expect(types()).toEqual([REMOVE_AUTH]);
  });

  /**
   * The defect #727 describes, as a sequence rather than a unit.
   *
   * `login()` wrote a token *object* into `account.token`, and the field was typed
   * `string`. The next `renewToken()` therefore ran `JSON.parse('[object Object]')`,
   * threw a SyntaxError, and dispatched `removeAuth()` — the user was signed out by
   * their own successful login. It only stayed hidden because `renewToken` had exactly
   * one caller, eight lines after the one dispatch that wrote the readable shape.
   *
   * `renewToken` no longer consults the store, so the order of these two no longer
   * matters. This test would have failed before the field was removed.
   */
  it('renews after a login in the same session', async () => {
    const issued = { bearer: 'issued-by-login', expSeconds: 3600 };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, body: issued })));
    await login({ username: 'u', password: 'p' } as never, () => {})(dispatch);

    const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: { bearer: 'renewed' } }));
    vi.stubGlobal('fetch', fetchMock);
    await renewToken()(dispatch);

    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer issued-by-login');
    expect(types()).not.toContain(REMOVE_AUTH);
  });

  it('signs out without calling the API when the stored token is corrupt', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    localStorage.setItem('user_token', 'not-json');

    await renewToken()(dispatch);

    expect(types()).toEqual([REMOVE_AUTH]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

/**
 * All three producers used to hand `emitTokenEvent` the token *object* while it was
 * declared `(token: string)` — it type-checked only because the locals were `any`.
 * The sole consumer, `showPages()`, interpolates what it receives straight into
 * `Authorization: Bearer ${token}`, so a waiter sent `Bearer [object Object]`.
 *
 * The contract asserted here is that the emitted value is interchangeable with
 * `getToken()`: a bearer string, whichever of the two token shapes produced it.
 */
describe('token event', () => {
  let dispatch: Dispatch & { mock: { calls: unknown[][] } };
  let previousLevel: number;

  beforeAll(() => {
    previousLevel = Logger.getLevel();
    Logger.setLevel(Level.OFF);
  });

  afterAll(() => Logger.setLevel(previousLevel));

  beforeEach(() => {
    dispatch = vi.fn() as unknown as typeof dispatch;
    // No stored token, so `showPages()` takes the `waitForToken()` branch.
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('resolves a waiter with the renewed bearer as a string', async () => {
    localStorage.setItem('user_token', JSON.stringify({ bearer: 'old-bearer' }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, body: { bearer: 'new-bearer' } })));

    const pending = waitForToken();
    await renewToken()(dispatch);

    await expect(pending).resolves.toBe('new-bearer');
  });

  it('resolves a waiter with the bearer of a Keep native login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, body: { bearer: 'login-bearer' } })));

    const pending = waitForToken();
    await login({ username: 'u', password: 'p' }, () => {})(dispatch);

    await expect(pending).resolves.toBe('login-bearer');
  });

  it('resolves a waiter with the access token of an IdP/PKCE login', async () => {
    // The PKCE flow stores `access_token` rather than `bearer`; `getToken()` prefers
    // it, so the emitted value has to follow the same rule.
    const pending = waitForToken();
    await loginWithPkce({ access_token: 'pkce-access' })(dispatch);

    expect(getToken()).toBe('pkce-access');
    await expect(pending).resolves.toBe('pkce-access');
  });

  // The end-to-end assertion the fix exists for: what a waiter receives is what goes
  // into the header. Before the fix this read `Bearer [object Object]`.
  it('puts the emitted bearer in the showPages Authorization header', async () => {
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
      String(url).includes('/adminui.json')
        ? response({ ok: true, body: { apps: false } })
        : response({ ok: true, body: { bearer: 'login-bearer' } })
    );
    vi.stubGlobal('fetch', fetchMock);

    // `showPages()` parks on `waitForToken()`; the listener is registered
    // synchronously, so the login below is guaranteed to reach it.
    const pages = showPages()(dispatch);
    await login({ username: 'u', password: 'p' }, () => {})(dispatch);
    await pages;

    const call = fetchMock.mock.calls.find(([url]) => String(url).includes('/adminui.json'));
    expect(call, 'showPages never issued its request').toBeDefined();
    expect(call![1]?.headers).toMatchObject({ Authorization: 'Bearer login-bearer' });
  });

  it('publishes nothing when the login response carries no bearer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, body: { expSeconds: 3600 } })));

    let published: unknown;
    waitForToken().then((bearer) => {
      published = bearer;
    });
    await login({ username: 'u', password: 'p' }, () => {})(dispatch);
    await Promise.resolve();

    // A parked waiter is recoverable; `Bearer undefined` on the wire is not.
    expect(published).toBeUndefined();
  });

  describe('bearerOf', () => {
    it('reads the bearer of a Keep native token', () => {
      expect(bearerOf({ bearer: 'b', expSeconds: 3600 })).toBe('b');
    });

    it('prefers access_token, which only IdP tokens carry', () => {
      expect(bearerOf({ access_token: 'a', bearer: 'b' })).toBe('a');
    });

    it('returns null for a token carrying neither', () => {
      expect(bearerOf({ expSeconds: 3600 })).toBeNull();
      expect(bearerOf(null)).toBeNull();
      expect(bearerOf(undefined)).toBeNull();
    });
  });
});
