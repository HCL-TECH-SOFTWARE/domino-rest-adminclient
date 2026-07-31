/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dispatch } from '@reduxjs/toolkit';
import { fetchUsers } from '../../../src/store/access/action';
import { setUsers } from '../../../src/store/access/reducer';
import { toggleUsersLoading } from '../../../src/store/loading/action';
import { Level, Logger } from '../../../src/services/log-service';
// apiRequestWithRetry notifies through a <keep-alert> on its error paths; without the
// element registered `el.show` is undefined and a clean 4xx surfaces as a TypeError.
import '../../../src/components/keep-elements/keep-alert';

/**
 * #690 — `fetchUsers` is the whole of `store/access`, and it was untested.
 *
 * `usersLoading` is a **toggle**, not a set: the thunk flips it on entry and flips it
 * back on success. The error path never flipped it back, so any failure left the users
 * list spinning forever — and because the same `catch` then ran `JSON.parse` over an
 * arbitrary error string, a dropped connection threw *inside* the error handler and the
 * failure was never even logged.
 */

const response = (init: { ok: boolean; status?: number; body?: unknown }) =>
  ({
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    statusText: 'stubbed',
    headers: { get: () => 'application/json' },
    json: async () => init.body ?? {},
  }) as unknown as Response;

describe('fetchUsers', () => {
  let dispatch: Dispatch & { mock: { calls: unknown[][] } };
  let previousLevel: number;

  const types = () => dispatch.mock.calls.map((call) => (call[0] as { type: string }).type);
  const loadingToggles = () => types().filter((type) => type === toggleUsersLoading.type).length;

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

  it('stores the users it fetched', async () => {
    const users = [{ name: 'ada' }, { name: 'grace' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, body: users })));

    await fetchUsers()(dispatch);

    expect(dispatch.mock.calls.map((c) => c[0])).toContainEqual({
      type: setUsers.type,
      payload: users,
    });
  });

  it('leaves the loading flag as it found it on success', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, body: [] })));

    await fetchUsers()(dispatch);

    // Two flips — on and back off. An odd number strands the spinner.
    expect(loadingToggles()).toBe(2);
  });

  it('leaves the loading flag as it found it when the API rejects the request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(response({ ok: false, status: 403, body: { message: 'nope' } })),
    );

    await fetchUsers()(dispatch);

    expect(loadingToggles()).toBe(2);
    expect(types()).not.toContain(setUsers.type);
  });

  it('leaves the loading flag as it found it when the request never completes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await fetchUsers()(dispatch);

    expect(loadingToggles()).toBe(2);
  });

  it('does not throw out of the thunk when the error is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    // The unguarded JSON.parse in the catch used to reject here.
    await expect(fetchUsers()(dispatch)).resolves.not.toThrow();
  });

  it('asks the API to filter when given a prefix', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchUsers('ad')(dispatch);

    expect(String(fetchMock.mock.calls[0][0])).toContain('startsWith=ad');
  });

  it('asks for the unfiltered list when the prefix is empty', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchUsers('')(dispatch);

    expect(String(fetchMock.mock.calls[0][0])).not.toContain('startsWith');
  });
});
