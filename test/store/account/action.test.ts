import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dispatch } from 'redux';
import { renewToken } from '../../../src/store/account/action';
import { REMOVE_AUTH, RENEW_TOKEN } from '../../../src/store/account/types';
import type { AppState } from '../../../src/store';
import { Level, Logger } from '../../../src/services/log-service';

/**
 * `renewToken` used to `await response.json()` with no status check, so a 4xx, a
 * 5xx, an HTML error page or a dropped connection all ended with either an
 * exception escaping the thunk or `RENEW_TOKEN` carrying `undefined`. The store
 * then held a broken session that looked authenticated.
 *
 * Every one of those paths must now end at `removeAuth()`, so they are enumerated
 * here rather than covered by a single happy-path test.
 */
describe('renewToken', () => {
  const STORED = JSON.stringify({ bearer: 'old-bearer' });
  let dispatch: Dispatch & { mock: { calls: unknown[][] } };
  let previousLevel: number;

  const getState = () => ({ account: { token: STORED } }) as unknown as AppState;

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

    await renewToken()(dispatch, getState);

    expect(types()).toEqual([RENEW_TOKEN]);
    expect(dispatch.mock.calls[0][0]).toEqual({ type: RENEW_TOKEN, payload: 'new-bearer' });
    expect(JSON.parse(localStorage.getItem('user_token')!)).toEqual(renewed);
  });

  it('calls /auth/extend with the current bearer', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: { bearer: 'new-bearer' } }));
    vi.stubGlobal('fetch', fetchMock);

    await renewToken()(dispatch, getState);

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

    await renewToken()(dispatch, getState);

    expect(types()).toEqual([REMOVE_AUTH]);
    expect(localStorage.getItem('user_token')).toBeNull();
  });

  // The case that motivated the fix: a proxy or gateway returning an HTML error page.
  it('signs out when the body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response({ ok: false, status: 502, contentType: 'text/html' })),
    );

    await renewToken()(dispatch, getState);

    expect(types()).toEqual([REMOVE_AUTH]);
  });

  it('signs out when a 200 carries an unparseable body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true })));

    await renewToken()(dispatch, getState);

    expect(types()).toEqual([REMOVE_AUTH]);
  });

  it('signs out when the request never completes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await renewToken()(dispatch, getState);

    expect(types()).toEqual([REMOVE_AUTH]);
  });

  // A 200 whose payload is missing `bearer` previously dispatched RENEW_TOKEN with
  // `undefined`, leaving the app authenticated with no usable credential.
  it('signs out when a 200 carries no bearer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, body: { expSeconds: 3600 } })));

    await renewToken()(dispatch, getState);

    expect(types()).toEqual([REMOVE_AUTH]);
    expect(types()).not.toContain(RENEW_TOKEN);
  });

  it('signs out without calling the API when the stored token is corrupt', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const corrupt = () => ({ account: { token: 'not-json' } }) as unknown as AppState;

    await renewToken()(dispatch, corrupt);

    expect(types()).toEqual([REMOVE_AUTH]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
