/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { Dispatch } from 'redux';
import { generateSecret } from '../../../src/store/applications/action';
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
