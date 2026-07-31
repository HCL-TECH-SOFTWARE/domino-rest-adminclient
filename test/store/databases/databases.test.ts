/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDBConfig, fetchKeepPermissions, quickConfig } from '../../../src/store/databases/action';
import { SET_DB_ERROR } from '../../../src/store/databases/types';
import {
  addSchema as addSchemaAction,
  addScope as addScopeAction,
  fetchDbConfig as fetchDbConfigAction,
  fetchKeepPermissions as fetchKeepPermissionsAction,
} from '../../../src/store/databases/reducer';
import { setApiLoading } from '../../../src/store/dialog/action';
import { toggleAlert } from '../../../src/store/alerts/action';
import { Level, Logger } from '../../../src/services/log-service';
// apiRequestWithRetry notifies through a <keep-alert> on its error paths.
import '../../../src/components/keep-elements/keep-alert';

/**
 * #805 part 2b — the **databases** group: the database-level thunks that belong to
 * no single concern. `fetchKeepPermissions` is folded in here rather than given a
 * one-thunk `permissions.ts`; it fetches the permissions *of a database*, and a
 * module per thunk is the same problem as a `misc.ts` from the other direction.
 *
 * Two more stranded loading flags found here, both fixed: `fetchDBConfig` and
 * `quickConfig` each clear the flag on their success path only.
 */

const response = (init: { ok: boolean; status?: number; body?: unknown }) =>
  ({
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    statusText: 'stubbed',
    headers: { get: () => 'application/json' },
    json: async () => init.body ?? {},
  }) as unknown as Response;

describe('databases — database-level thunks', () => {
  let dispatch: any;
  let previousLevel: number;

  const actions = () =>
    dispatch.mock.calls.map((c: any[]) => c[0]).filter((a: any) => typeof a !== 'function');
  const types = () => actions().map((a: any) => a?.type);
  const alerts = () =>
    actions().filter((a: any) => a?.type === toggleAlert.type).map((a: any) => a.payload as string);
  const loadingSequence = () =>
    actions().filter((a: any) => a?.type === setApiLoading.type).map((a: any) => a.payload);

  const expectLoadingCleared = () => {
    const seq = loadingSequence();
    expect(seq.length, 'no setApiLoading.type dispatched at all').toBeGreaterThan(0);
    expect(seq[seq.length - 1], `loading left as ${seq[seq.length - 1]}`).toBe(false);
  };

  beforeAll(() => {
    previousLevel = Logger.getLevel();
    Logger.setLevel(Level.OFF);
  });

  afterAll(() => Logger.setLevel(previousLevel));

  beforeEach(() => {
    const d: any = vi.fn((action: any) => (typeof action === 'function' ? action(d) : action));
    dispatch = d;
    localStorage.setItem('user_token', JSON.stringify({ bearer: 'a-bearer' }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  const offline = () =>
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  const refuses = (body: unknown = { message: 'nope' }) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: false, status: 400, body })));
  const returns = (body: unknown) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, body })));

  describe('fetchKeepPermissions', () => {
    it('stores only the two mappings it cares about', async () => {
      returns({ CreateDbMapping: ['a'], DeleteDbMapping: ['b'], SomethingElse: ['c'] });

      await fetchKeepPermissions()(dispatch);

      expect(actions().find((a: any) => a?.type === fetchKeepPermissionsAction.type).payload).toEqual({
        createDbMapping: ['a'],
        deleteDbMapping: ['b'],
      });
    });

    it('stores nothing when the request is refused', async () => {
      refuses();

      await fetchKeepPermissions()(dispatch);

      expect(types()).not.toContain(fetchKeepPermissionsAction.type);
    });

    it('does not throw out of the thunk when the request never completes', async () => {
      offline();

      await expect(fetchKeepPermissions()(dispatch)).resolves.not.toThrow();
      expect(types()).not.toContain(fetchKeepPermissionsAction.type);
    });
  });

  describe('fetchDBConfig', () => {
    it('stores the config and clears the loading flag', async () => {
      returns({ apiName: 'demo', isActive: true });

      await fetchDBConfig('demo')(dispatch);

      expect(actions().find((a: any) => a?.type === fetchDbConfigAction.type).payload).toEqual({
        apiName: 'demo',
        isActive: true,
      });
      expectLoadingCleared();
    });

    it('asks for the scope by data source', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: {} }));
      vi.stubGlobal('fetch', fetchMock);

      await fetchDBConfig('Orders')(dispatch);

      expect(fetchMock.mock.calls[0][0]).toContain('dataSource=Orders');
    });

    it('clears the loading flag when the request is refused', async () => {
      refuses();

      await fetchDBConfig('demo')(dispatch);

      expect(types()).not.toContain(fetchDbConfigAction.type);
      // setApiLoading(false) sat on the success path; the catch only logged.
      expectLoadingCleared();
    });

    it('clears the loading flag when the request never completes', async () => {
      offline();

      await expect(fetchDBConfig('demo')(dispatch)).resolves.not.toThrow();
      expectLoadingCleared();
    });
  });

  describe('quickConfig', () => {
    const dbData = { nsfPath: 'db.nsf', schemaName: 'demo', scopeName: 'demoScope' };

    it('adds both the schema and the scope, and reports success', async () => {
      returns({ schemaName: 'demo', nsfPath: 'db.nsf', apiName: 'demoScope' });

      await quickConfig(dbData)(dispatch);

      expect(types()).toContain(addSchemaAction.type);
      expect(types()).toContain(addScopeAction.type);
      expect(alerts().join()).toMatch(/successfully created/i);
      expectLoadingCleared();
    });

    it('does not add anything when the request is refused', async () => {
      refuses({ message: 'name already in use' });

      await quickConfig(dbData)(dispatch);

      expect(types()).not.toContain(addSchemaAction.type);
      expect(types()).not.toContain(addScopeAction.type);
      expect(alerts().join()).not.toMatch(/successfully created/i);
      expect(types()).toContain(SET_DB_ERROR);
    });

    it('clears the loading flag when the request is refused', async () => {
      refuses({ message: 'name already in use' });

      await quickConfig(dbData)(dispatch);

      // As fetchDBConfig: cleared on the success path only.
      expectLoadingCleared();
    });

    it('clears the loading flag when the request never completes', async () => {
      offline();

      await expect(quickConfig(dbData)(dispatch)).resolves.not.toThrow();
      expectLoadingCleared();
    });
  });
});
