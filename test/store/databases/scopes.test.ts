/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dispatch } from '@reduxjs/toolkit';
import { changeScope, deleteScope, fetchScopes } from '../../../src/store/databases/action';
import { SET_DB_ERROR } from '../../../src/store/databases/types';
import {
  addScope as addScopeAction,
  deleteScope as deleteScopeAction,
  fetchKeepScopes as fetchKeepScopesAction,
  setPullScope as setPullScopeAction,
  updateScope as updateScopeAction,
} from '../../../src/store/databases/reducer';
import { setApiLoading, toggleDeleteDialog, toggleErrorDialog } from '../../../src/store/dialog/action';
import { toggleDrawer } from '../../../src/store/drawer/action';
import { toggleAlert } from '../../../src/store/alerts/action';
import { Level, Logger } from '../../../src/services/log-service';
// apiRequestWithRetry notifies through a <keep-alert> on its error paths.
import '../../../src/components/keep-elements/keep-alert';

/**
 * #801 — the **scopes** concern of `databases/action.ts`. Three thunks, following
 * `schemas.test.ts` from #690 and organised the way #711 will split the file, so
 * these move to `store/databases/scopes.ts` unchanged. There were four until #853
 * deleted `updateScope`, which had no callers — see the note at the foot of the file.
 *
 * Two defect classes carried over from #690, and both are present here:
 *
 * - **Stranded loading flag.** `setApiLoading(true)` on entry, `setApiLoading(false)`
 *   only on the success path. `state.dialog.loading` is read by eight screens, so a
 *   failed call leaves them loading until reload. `changeScope` does this.
 * - **Unguarded `JSON.parse` in the catch.** The shared
 *   `JSON.parse(e.toString().replace(…))` idiom throws on any non-JSON error, so the
 *   handler that was supposed to clear the flag throws instead — a second exception
 *   raised by the error handler itself.
 *
 * `fetchScopes` has a third, all its own: its catch rethrows unconditionally, which
 * makes the dispatch below it unreachable. See that describe block.
 */

const response = (init: { ok: boolean; status?: number; body?: unknown }) =>
  ({
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    statusText: 'stubbed',
    headers: { get: () => 'application/json' },
    json: async () => init.body ?? {},
  }) as unknown as Response;

describe('databases — scopes', () => {
  let dispatch: Dispatch & { mock: { calls: unknown[][] } };
  let previousLevel: number;

  const actions = () => dispatch.mock.calls.map((call) => call[0] as any);
  const types = () => actions().map((a) => a?.type);
  const alerts = () =>
    actions().filter((a) => a?.type === toggleAlert.type).map((a) => a.payload as string);

  /** Every setApiLoading.type payload, in order — the flag's whole life in one thunk run. */
  const loadingSequence = () =>
    actions().filter((a) => a?.type === setApiLoading.type).map((a) => a.payload);

  /** The flag must not be left on. */
  const expectLoadingCleared = () => {
    const seq = loadingSequence();
    expect(seq.length, 'no setApiLoading.type dispatched at all').toBeGreaterThan(0);
    expect(seq[seq.length - 1], `loading left as ${seq[seq.length - 1]}`).toBe(false);
  };

  const scope = { apiName: 'demo', schemaName: 'demoSchema', nsfPath: 'db.nsf', description: 'a scope' };

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

  const offline = () =>
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  const refuses = (body: unknown = { message: 'nope' }) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: false, status: 400, body })));
  const refusesWithProse = () =>
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        headers: { get: () => 'text/html' },
        json: async () => {
          throw new SyntaxError('Unexpected token <');
        },
      } as unknown as Response),
    );
  const returns = (body: unknown, status = 200) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, status, body })));

  describe('deleteScope', () => {
    it('removes the scope and closes the dialog and drawer', async () => {
      returns({});

      await deleteScope('demo')(dispatch);

      expect(types()).toContain(deleteScopeAction.type);
      expect(actions().find((a) => a?.type === deleteScopeAction.type).payload).toBe('demo');
      expect(types()).toContain(toggleDeleteDialog.type);
      expect(types()).toContain(toggleDrawer.type);
      expect(alerts().join()).toMatch(/successfully deleted/i);
      expectLoadingCleared();
    });

    it('clears the loading flag and reports failure when the API refuses', async () => {
      refuses({ message: 'scope in use' });

      await deleteScope('demo')(dispatch);

      expect(types()).not.toContain(deleteScopeAction.type);
      expect(alerts().join()).toMatch(/delete scope failed/i);
      expectLoadingCleared();
    });

    it('clears the loading flag when the request never completes', async () => {
      offline();

      // Before #800 this rejected: `response` was null, `response.ok` threw a
      // TypeError, and the catch's JSON.parse then threw on the TypeError's own
      // message — so setApiLoading(false) never ran and the screen span forever.
      await expect(deleteScope('demo')(dispatch)).resolves.not.toThrow();
      expect(alerts().join()).toMatch(/delete scope failed/i);
      expectLoadingCleared();
    });

    it('clears the loading flag when the error body is not JSON', async () => {
      refusesWithProse();

      await expect(deleteScope('demo')(dispatch)).resolves.not.toThrow();
      expectLoadingCleared();
    });
  });

  describe('fetchScopes', () => {
    it('stores the scopes it fetched', async () => {
      const scopes = [scope, { ...scope, apiName: 'other' }];
      returns(scopes);

      await fetchScopes()(dispatch);

      expect(types()).toContain(fetchKeepScopesAction.type);
      expect(actions().find((a) => a?.type === fetchKeepScopesAction.type).payload).toEqual(scopes);
    });

    it('marks the pull complete when there are no scopes', async () => {
      returns([]);

      await fetchScopes()(dispatch);

      expect(types()).toContain(setPullScopeAction.type);
      expect(types()).not.toContain(fetchKeepScopesAction.type);
    });

    it('skips keepconfig when building the schema summary', async () => {
      returns([scope, { ...scope, apiName: 'keepconfig' }]);

      await fetchScopes()(dispatch);

      // Both scopes still reach the store; only the derived schema list filters.
      expect(actions().find((a) => a?.type === fetchKeepScopesAction.type).payload).toHaveLength(2);
    });

    // These four replace the pair that pinned #818: the catch used to run
    // `if (err) throw err` before its own dispatch, so the error dialog was
    // unreachable and the thunk rejected instead. Both callers in Views.tsx
    // dispatch fire-and-forget, so that rejection surfaced as an unhandled
    // promise and the user saw nothing.
    it('opens the error dialog instead of rejecting when the API refuses', async () => {
      refuses({ status: 400, message: 'nope' });

      await expect(fetchScopes()(dispatch)).resolves.not.toThrow();
      expect(types()).toContain(toggleErrorDialog.type);
    });

    it('titles the dialog with the status, not the absent statusCode', async () => {
      refuses({ status: 400, message: 'nope' });

      await fetchScopes()(dispatch);

      // Was `${error.statusCode}: ...` — nothing writes statusCode, so it would
      // have read "undefined: nope" had it ever rendered.
      expect(actions().find((a) => a?.type === toggleErrorDialog.type).payload).toBe('400: nope');
    });

    it('reports the message when the request never completes', async () => {
      offline();

      await expect(fetchScopes()(dispatch)).resolves.not.toThrow();
      expect(actions().find((a) => a?.type === toggleErrorDialog.type).payload).toMatch(/failed to fetch/i);
    });

    it('reports a non-JSON error rather than throwing on the parse', async () => {
      refusesWithProse();

      await expect(fetchScopes()(dispatch)).resolves.not.toThrow();
      expect(types()).toContain(toggleErrorDialog.type);
    });
  });

  describe('changeScope', () => {
    it('adds the scope, closes the drawer and clears the loading flag', async () => {
      returns({ ...scope, '@noteid': 42, '@created': 'now' });

      await changeScope(scope)(dispatch);

      expect(types()).toContain(addScopeAction.type);
      expect(types()).toContain(toggleDrawer.type);
      expect(alerts().join()).toMatch(/successfully created/i);
      expectLoadingCleared();
    });

    it('updates rather than adds when told it is an edit', async () => {
      returns(scope);

      await changeScope(scope, true)(dispatch);

      expect(types()).toContain(updateScopeAction.type);
      expect(types()).not.toContain(addScopeAction.type);
      expect(alerts().join()).toMatch(/successfully updated/i);
    });

    it('strips the Domino @-metadata before it reaches the store', async () => {
      returns({
        ...scope,
        '@noteid': 42,
        '@created': 'now',
        '@lastmodified': 'now',
        '@revision': 1,
        '@lastaccessed': 'now',
        '@size': 10,
        '@unread': 0,
        '@etag': 'x',
        $UpdatedBy: 'someone',
      });

      await changeScope(scope)(dispatch);

      const payload = actions().find((a) => a?.type === addScopeAction.type).payload;
      expect(Object.keys(payload).filter((k) => k.startsWith('@') || k === '$UpdatedBy')).toEqual([]);
      expect(payload.apiName).toBe('demo');
    });

    it('reports the failure as a form error', async () => {
      refuses({ message: 'scope exists' });

      await changeScope(scope)(dispatch);

      expect(types()).toContain(SET_DB_ERROR);
      expect(types()).not.toContain(addScopeAction.type);
    });

    it('does not throw out of the thunk when the error body is not JSON', async () => {
      refusesWithProse();

      await expect(changeScope(scope)(dispatch)).resolves.not.toThrow();
      expect(types()).not.toContain(addScopeAction.type);
    });

    it('clears the loading flag on failure', async () => {
      refuses({ message: 'scope exists' });

      await changeScope(scope)(dispatch);

      // setApiLoading(false) sat on the success path only, so any refused save
      // left the eight screens reading state.dialog.loading spinning.
      expectLoadingCleared();
    });
  });

  // The `updateScope` thunk's seven tests were deleted with the thunk itself (#853).
  //
  // They are worth a note because they are how it stayed invisible: written in #801,
  // they exercised the thunk directly and passed, which made a dead export look like a
  // covered one. Coverage says a line ran, never that anything in the app runs it.
  // Whatever replaces this — a settings screen, or nothing — needs a caller before it
  // needs a test.
});
