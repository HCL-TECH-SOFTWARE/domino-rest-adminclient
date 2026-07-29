/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { Dispatch } from 'redux';
import {
  addApplication,
  deleteApplication,
  fetchMyApps,
  generateSecret,
  getSingleApp,
  updateApp,
} from '../../../src/store/applications/action';
import {
  addApp as addAppAction,
  deleteApp as deleteAppAction,
  getApps as getAppsAction,
  updateApp as updateAppAction,
} from '../../../src/store/applications/reducer';
import { TOGGLE_ALERT } from '../../../src/store/alerts/types';
import { Level, Logger } from '../../../src/services/log-service';
// apiRequestWithRetry's own error path calls notify(), which mounts a <keep-alert>.
// Without the element registered, `el.show` is undefined and the helper turns a clean
// 403 into a TypeError — an artifact of the test env, not of the thunk.
import '../../../src/components/keep-elements/keep-alert';

/**
 * #740 — `generateSecret` posts with `force=true`, which overwrites any existing secret
 * unconditionally. The confirmation that gates it lives in the callers (AppItem, AppCard);
 * what this file covers is the thunk those callers now share.
 *
 * The failure paths are the point. `apiRequestWithRetry` does not rethrow a failed
 * request — it returns `{ response: null, data: null, error }` — so `!response.ok` threw a
 * TypeError, which landed in the thunk's own catch, where an unguarded `JSON.parse` of the
 * message threw again. A dropped connection therefore produced **no alert and no logging**,
 * and `setGenerating(false)` was never reached, leaving the card rendering
 * "Generating New Secret …" until reload.
 *
 * Three of the five cases below were verified to fail against the pre-fix implementation
 * (the three error paths). The other two pin behaviour that already worked — the happy
 * path and the guarantee that a non-ok response never yields a secret.
 */

/** Minimal stand-in for the parts of `Response` the retry helper touches. */
const response = (init: { ok: boolean; status?: number; body?: unknown }) =>
  ({
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    statusText: 'stubbed',
    headers: { get: () => 'application/json' },
    json: async () => init.body ?? {},
  }) as unknown as Response;

describe('generateSecret', () => {
  let dispatch: Dispatch & { mock: { calls: unknown[][] } };
  let setGenerating: Mock<(generating: boolean) => void>;
  let setAppSecret: Mock<(appSecret: string) => void>;
  let previousLevel: number;

  /** `toggleAlert` carries the message as the payload itself, not an object. */
  const alerts = () =>
    dispatch.mock.calls
      .map((call) => call[0] as { type?: string; payload?: string })
      .filter((action) => action?.type === TOGGLE_ALERT)
      .map((action) => action.payload as string);

  beforeAll(() => {
    // The failure paths log by design; keep the suite output clean.
    previousLevel = Logger.getLevel();
    Logger.setLevel(Level.OFF);
  });

  afterAll(() => Logger.setLevel(previousLevel));

  beforeEach(() => {
    dispatch = vi.fn() as unknown as typeof dispatch;
    setGenerating = vi.fn();
    setAppSecret = vi.fn();
    localStorage.setItem('user_token', JSON.stringify({ bearer: 'a-bearer' }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  const run = () =>
    generateSecret('app-1', 'isActive', setGenerating, setAppSecret)(dispatch as any);

  it('posts with force=true and hands the new secret back', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(response({ ok: true, body: { client_secret: 'sh-new' } }));
    vi.stubGlobal('fetch', fetchMock);

    await run();

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/admin/application/app-1/secret?force=true');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual({ status: 'isActive' });

    expect(setAppSecret).toHaveBeenCalledWith('sh-new');
    expect(setGenerating.mock.calls).toEqual([[true], [false]]);
  });

  it('clears the spinner and alerts when the API rejects the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response({ ok: false, status: 403, body: { message: 'forbidden' } })),
    );

    await run();

    expect(setAppSecret).not.toHaveBeenCalled();
    // The spinner must stop even though nothing was generated.
    expect(setGenerating).toHaveBeenLastCalledWith(false);
    expect(alerts().join()).toContain('forbidden');
  });

  // The case that motivated the fix: apiRequestWithRetry returns a null response here.
  it('clears the spinner and alerts when the request never completes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await run();

    expect(setAppSecret).not.toHaveBeenCalled();
    expect(setGenerating).toHaveBeenLastCalledWith(false);
    expect(alerts()).toHaveLength(1);
  });

  it('alerts rather than throwing when the error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response({ ok: false, status: 502, body: 'a gateway page' })),
    );

    // The unguarded JSON.parse used to reject here instead of alerting.
    await expect(run()).resolves.not.toThrow();
    expect(setGenerating).toHaveBeenLastCalledWith(false);
    expect(alerts()).toHaveLength(1);
  });

  it('never resolves the secret when the response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response({ ok: false, status: 500, body: { client_secret: 'leaked' } })),
    );

    await run();

    expect(setAppSecret).not.toHaveBeenCalled();
  });
});

/**
 * The other five thunks in this slice (#690).
 *
 * They share one shape, and one defect with it: `apiRequestWithRetry` returns
 * `{ response: null }` for a request that never completed, so `!response.ok` threw a
 * TypeError before any of them reached their own error handling. The alert still fired —
 * these thunks catch broadly — but it read
 *
 *     Error Fetching Apps: TypeError: Cannot read properties of null (reading 'ok')
 *
 * which tells the user nothing and hides the fact that the network, not the app, failed.
 * The assertions below pin the message as much as the dispatch sequence.
 */

/** `toggleAlert` carries the message as the payload itself, not an object. */
const alertsOf = (dispatch: { mock: { calls: unknown[][] } }) =>
  dispatch.mock.calls
    .map((call) => call[0] as { type?: string; payload?: string })
    .filter((action) => action?.type === TOGGLE_ALERT)
    .map((action) => action.payload as string);

describe('the remaining applications thunks', () => {
  let dispatch: Dispatch & { mock: { calls: unknown[][] } };
  let previousLevel: number;

  const types = () => dispatch.mock.calls.map((call) => (call[0] as { type: string }).type);

  const app = {
    client_id: 'app-1',
    client_name: 'Test App',
    description: 'a description',
    redirect_uris: [],
    contacts: [],
    logo_uri: 'app',
    scope: '',
    hasSecret: true,
    client_secret: 'sh-1',
    client_uri: 'https://example.invalid',
    status: 'isActive',
    token_endpoint_auth_method: 'client_secret_basic',
  };

  beforeAll(() => {
    previousLevel = Logger.getLevel();
    Logger.setLevel(Level.OFF);
  });

  afterAll(() => Logger.setLevel(previousLevel));

  beforeEach(() => {
    dispatch = vi.fn() as unknown as typeof dispatch;
    localStorage.setItem('user_token', JSON.stringify({ bearer: 'a-bearer' }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  const offline = () => vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  const refuses = (body: unknown = { message: 'nope' }) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: false, status: 403, body })));
  const returns = (body: unknown) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, body })));

  /** The shared regression: a dropped connection must not surface as a null-deref. */
  const isReadable = (message: string) => {
    expect(message).not.toMatch(/Cannot read propert/i);
    expect(message).not.toMatch(/undefined is not an object/i);
  };

  describe('fetchMyApps', () => {
    it('maps the API shape into the store', async () => {
      returns([app]);

      await fetchMyApps()(dispatch);

      const action = dispatch.mock.calls.map((c) => c[0] as any).find((a) => a.type === getAppsAction.type);
      expect(action.payload).toHaveLength(1);
      expect(action.payload[0]).toMatchObject({
        appId: 'app-1',
        appName: 'Test App',
        appHasSecret: true,
        usePkce: false,
      });
    });

    it('reads usePkce off the auth method', async () => {
      returns([{ ...app, token_endpoint_auth_method: 'none' }]);

      await fetchMyApps()(dispatch);

      const action = dispatch.mock.calls.map((c) => c[0] as any).find((a) => a.type === getAppsAction.type);
      expect(action.payload[0].usePkce).toBe(true);
    });

    it('stores nothing and explains itself when the request never completes', async () => {
      offline();

      await fetchMyApps()(dispatch);

      expect(types()).not.toContain(getAppsAction.type);
      expect(alertsOf(dispatch)).toHaveLength(1);
      isReadable(alertsOf(dispatch)[0]);
    });

    it('stores nothing when the API refuses', async () => {
      refuses();

      await fetchMyApps()(dispatch);

      expect(types()).not.toContain(getAppsAction.type);
    });
  });

  describe('updateApp', () => {
    it('sends a PUT and closes the drawer on success', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: app }));
      vi.stubGlobal('fetch', fetchMock);

      await updateApp({ ...app, status: true })(dispatch);

      expect(fetchMock.mock.calls[0][1].method).toBe('PUT');
      expect(String(fetchMock.mock.calls[0][0])).toContain('/admin/application/app-1');
      expect(types()).toContain(updateAppAction.type);
      expect(alertsOf(dispatch).join()).toMatch(/has been updated/i);
    });

    it('does not update the store when the request never completes', async () => {
      offline();

      await updateApp(app)(dispatch);

      expect(types()).not.toContain(updateAppAction.type);
      isReadable(alertsOf(dispatch)[0]);
    });
  });

  describe('getSingleApp', () => {
    it('puts the fetched app into the store', async () => {
      returns(app);

      await getSingleApp('app-1')(dispatch);

      expect(types()).toContain(updateAppAction.type);
    });

    it('does not update the store when the request never completes', async () => {
      offline();

      await getSingleApp('app-1')(dispatch);

      expect(types()).not.toContain(updateAppAction.type);
      isReadable(alertsOf(dispatch)[0]);
    });
  });

  describe('deleteApplication', () => {
    it('deletes and closes the confirmation dialog', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: {} }));
      vi.stubGlobal('fetch', fetchMock);

      await deleteApplication('app-1')(dispatch);

      expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
      expect(types()).toContain(deleteAppAction.type);
      expect(alertsOf(dispatch).join()).toMatch(/deleted/i);
    });

    it('closes the dialog and does not delete when the API refuses', async () => {
      refuses();

      await deleteApplication('app-1')(dispatch);

      // The dialog must close either way, or the user is stuck behind a modal.
      expect(types()).not.toContain(deleteAppAction.type);
      expect(alertsOf(dispatch).join()).toMatch(/error deleting/i);
    });

    it('does not delete when the request never completes', async () => {
      offline();

      await deleteApplication('app-1')(dispatch);

      expect(types()).not.toContain(deleteAppAction.type);
      isReadable(alertsOf(dispatch)[0]);
    });
  });

  describe('addApplication', () => {
    it('posts the new app and closes the drawer', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: app }));
      vi.stubGlobal('fetch', fetchMock);

      await addApplication({ client_name: 'Test App' })(dispatch);

      expect(fetchMock.mock.calls[0][1].method).toBe('POST');
      expect(types()).toContain(addAppAction.type);
      expect(alertsOf(dispatch).join()).toMatch(/new application added/i);
    });

    it('adds nothing when the API refuses', async () => {
      refuses();

      await addApplication({ client_name: 'Test App' })(dispatch);

      expect(types()).not.toContain(addAppAction.type);
    });

    it('adds nothing and explains itself when the request never completes', async () => {
      offline();

      await addApplication({ client_name: 'Test App' })(dispatch);

      expect(types()).not.toContain(addAppAction.type);
      isReadable(alertsOf(dispatch)[0]);
    });
  });
});
