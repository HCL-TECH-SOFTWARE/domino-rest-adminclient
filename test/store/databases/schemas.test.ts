/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Dispatch } from 'redux';
import {
  addSchema,
  addSchemas,
  deleteSchema,
  fetchSchema,
  updateSchema,
} from '../../../src/store/databases/action';
import {
  ADD_NEW_SCHEMA_TO_STATE,
  ADD_SCHEMA,
  DELETE_SCHEMA,
  UPDATE_ERROR,
} from '../../../src/store/databases/types';
import { SET_API_LOADING } from '../../../src/store/dialog/types';
import { TOGGLE_ALERT } from '../../../src/store/alerts/types';
import { Level, Logger } from '../../../src/services/log-service';
// apiRequestWithRetry notifies through a <keep-alert> on its error paths.
import '../../../src/components/keep-elements/keep-alert';

/**
 * #690 — the **schemas** concern of `databases/action.ts`, the first slice of a 2,885-line
 * file at 6 % coverage. `#711` splits this file by concern; these tests are the parity net
 * that split needs, so they are organised the way the split will be.
 *
 * The recurring defect is a stranded loading flag. `state.dialog.loading` is read by eight
 * screens, and `setApiLoading(true)` is dispatched on entry — but `addSchema` and
 * `updateSchema` only clear it on their success paths. Any failed save left those screens
 * loading until reload. `deleteSchema` does the same when its arguments are incomplete: it
 * sets the flag, finds no `nsfPath`, and returns without clearing it or telling anyone.
 *
 * Compounding it, the shared `JSON.parse(e.toString()…)` idiom in these catch blocks throws
 * on any non-JSON error, so the handler that was supposed to clear the flag threw instead.
 */

const response = (init: { ok: boolean; status?: number; body?: unknown }) =>
  ({
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    statusText: 'stubbed',
    headers: { get: () => 'application/json' },
    json: async () => init.body ?? {},
  }) as unknown as Response;

describe('databases — schemas', () => {
  let dispatch: Dispatch & { mock: { calls: unknown[][] } };
  let previousLevel: number;

  const actions = () => dispatch.mock.calls.map((call) => call[0] as any);
  const types = () => actions().map((a) => a?.type);
  const alerts = () =>
    actions().filter((a) => a?.type === TOGGLE_ALERT).map((a) => a.payload as string);

  /** Every SET_API_LOADING payload, in order — the flag's whole life in one thunk run. */
  const loadingSequence = () =>
    actions().filter((a) => a?.type === SET_API_LOADING).map((a) => a.payload);

  /** The flag must not be left on. */
  const expectLoadingCleared = () => {
    const seq = loadingSequence();
    expect(seq.length, 'no SET_API_LOADING dispatched at all').toBeGreaterThan(0);
    expect(seq[seq.length - 1], `loading left as ${seq[seq.length - 1]}`).toBe(false);
  };

  const schema = { nsfPath: 'db.nsf', schemaName: 'demo' };

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
  const returns = (body: unknown, status = 200) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, status, body })));

  describe('addSchemas (plain action)', () => {
    it('carries the database as its payload', () => {
      const db = { nsfPath: 'db.nsf', schemaName: 'demo' } as any;
      expect(addSchemas(db)).toEqual({ type: ADD_SCHEMA, payload: db });
    });
  });

  describe('fetchSchema', () => {
    it('hands the schema to the caller', async () => {
      const setSchemaData = vi.fn();
      returns(schema);

      await fetchSchema('db.nsf', 'demo', setSchemaData)(dispatch);

      expect(setSchemaData).toHaveBeenCalledWith(schema);
    });

    it('does not hand over an error body as though it were a schema', async () => {
      const setSchemaData = vi.fn();
      refuses();

      await fetchSchema('db.nsf', 'demo', setSchemaData)(dispatch);

      expect(setSchemaData).not.toHaveBeenCalled();
    });

    it('does not throw out of the thunk when the request never completes', async () => {
      const setSchemaData = vi.fn();
      offline();

      // The unguarded JSON.parse in the catch used to reject here.
      await expect(fetchSchema('db.nsf', 'demo', setSchemaData)(dispatch)).resolves.not.toThrow();
      expect(setSchemaData).not.toHaveBeenCalled();
    });
  });

  describe('addSchema', () => {
    it('creates the schema and clears the loading flag', async () => {
      returns(schema);

      await addSchema(schema)(dispatch);

      expect(types()).toContain(ADD_SCHEMA);
      expect(types()).toContain(ADD_NEW_SCHEMA_TO_STATE);
      expect(alerts().join()).toMatch(/successfully created/i);
      expectLoadingCleared();
    });

    it('runs the reset callback only on a 200', async () => {
      const reset = vi.fn();
      returns(schema, 202);

      await addSchema(schema, reset)(dispatch);

      expect(reset).not.toHaveBeenCalled();
    });

    it('clears the loading flag when the API refuses', async () => {
      refuses();

      await addSchema(schema)(dispatch);

      expect(types()).not.toContain(ADD_NEW_SCHEMA_TO_STATE);
      expect(alerts().join()).toMatch(/unable to create/i);
      expectLoadingCleared();
    });

    it('clears the loading flag when the request never completes', async () => {
      offline();

      await expect(addSchema(schema)(dispatch)).resolves.not.toThrow();
      expectLoadingCleared();
    });
  });

  describe('updateSchema', () => {
    it('updates the schema and clears the loading flag', async () => {
      const setSchemaData = vi.fn();
      returns(schema);

      await updateSchema(schema, setSchemaData)(dispatch);

      expect(setSchemaData).toHaveBeenCalledWith(schema);
      expect(types()).toContain(ADD_NEW_SCHEMA_TO_STATE);
      expect(alerts().join()).toMatch(/successfully updated/i);
      expectLoadingCleared();
    });

    it('flags the error and clears the loading flag when the API refuses', async () => {
      refuses();

      await updateSchema(schema)(dispatch);

      expect(actions()).toContainEqual({ type: UPDATE_ERROR, payload: true });
      expect(alerts().join()).toMatch(/update schema failed/i);
      expectLoadingCleared();
    });

    it('clears the loading flag when the request never completes', async () => {
      offline();

      await expect(updateSchema(schema)(dispatch)).resolves.not.toThrow();
      expectLoadingCleared();
    });
  });

  describe('deleteSchema', () => {
    it('deletes the schema and clears the loading flag', async () => {
      returns({});

      await deleteSchema(schema)(dispatch);

      expect(types()).toContain(DELETE_SCHEMA);
      expect(alerts().join()).toMatch(/successfully deleted/i);
      expectLoadingCleared();
    });

    it('clears the loading flag when the API refuses', async () => {
      refuses();

      await deleteSchema(schema)(dispatch);

      expect(types()).not.toContain(DELETE_SCHEMA);
      expectLoadingCleared();
    });

    // It sets the flag before validating, then returns without clearing it.
    it('clears the loading flag when the arguments are incomplete', async () => {
      returns({});

      await deleteSchema({ nsfPath: '', schemaName: '' })(dispatch);

      expect(types()).not.toContain(DELETE_SCHEMA);
      expectLoadingCleared();
    });
  });
});
