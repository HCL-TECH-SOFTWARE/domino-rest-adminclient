/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import databaseReducer from '../../../src/store/databases/reducer';
import appsReducer from '../../../src/store/applications/reducer';
import {
  AGENTS_ERROR,
  CLEAR_DB_ERROR,
  FETCH_AVAILABLE_DATABASES,
  INIT_STATE,
  SAVE_DELETE_RESULT,
  SAVE_LOAD_RESULT,
  SAVE_READ_RESULT,
  SAVE_SAVE_RESULT,
  SAVE_WRITE_RESULT,
  SET_ACTIVEAGENTS,
  SET_ACTIVEVIEWS,
  SET_DB_ERROR,
  VIEWS_ERROR,
} from '../../../src/store/databases/types';

/**
 * #710 converted `databases/reducer.ts` from a 60-case switch to `createSlice`.
 * Forty-seven of those actions became generated creators, namespaced `databases/…`.
 * **Thirteen could not**, because something outside `store/databases/` dispatches
 * them as bare strings, and namespacing would break that silently — no type error,
 * no failing test, because the string is untyped the whole way through.
 *
 * This file is the guard for those thirteen. It deliberately dispatches raw action
 * objects rather than creators: that is exactly what the outside callers do, and
 * asserting through a creator would test the wrong thing.
 *
 * If one of these fails, someone moved a case out of `extraReducers`.
 */
describe('databases reducer — action types dispatched from outside the slice', () => {
  const dispatch = (type: string, payload?: unknown) =>
    databaseReducer(undefined, { type, payload } as any);

  describe('the five formula results, whose type is chosen at runtime', () => {
    // saveResult(formulaType, result) uses its *argument* as the action type, and
    // components/access/TabsAccess.tsx hard-codes these five strings.
    const cases: Array<[string, keyof ReturnType<typeof dispatch>, keyof ReturnType<typeof dispatch>]> = [
      [SAVE_READ_RESULT, 'displayReadResults', 'readFormulaResults'],
      [SAVE_WRITE_RESULT, 'displayWriteResults', 'writeFormulaResults'],
      [SAVE_DELETE_RESULT, 'displayDeleteResults', 'deleteFormulaResults'],
      [SAVE_LOAD_RESULT, 'displayLoadResults', 'loadFormulaResults'],
      [SAVE_SAVE_RESULT, 'displaySaveResults', 'saveFormulaResults'],
    ];

    it.each(cases)('%s stores its result and opens the panel', (type, display, results) => {
      const next = dispatch(type, 'formula output');
      expect(next.displayTestResults, `${type} did not open the results panel`).toBe(true);
      expect(next[display], `${type} did not set ${String(display)}`).toBe(true);
      expect(next[results]).toBe('formula output');
    });
  });

  describe('the five dispatched raw from components', () => {
    it('VIEWS_ERROR — ActivateSwitch.tsx', () => {
      expect(dispatch(VIEWS_ERROR, true).updateViewError).toBe(true);
    });

    it('AGENTS_ERROR — ActivateSwitch.tsx', () => {
      expect(dispatch(AGENTS_ERROR, true).updateAgentError).toBe(true);
    });

    it('FETCH_AVAILABLE_DATABASES — ScopeLists.tsx', () => {
      const dbs = [{ nsfpath: 'db.nsf', apinames: [] }];
      expect(dispatch(FETCH_AVAILABLE_DATABASES, dbs).availableDatabases).toEqual(dbs);
    });

    it('SET_ACTIVEVIEWS — FormsContainer.tsx, EditView.tsx', () => {
      const views = [{ viewUnid: 'v1' }];
      expect(dispatch(SET_ACTIVEVIEWS, { db: 'demo', activeViews: views }).activeViews).toEqual(views);
    });

    it('SET_ACTIVEAGENTS — FormsContainer.tsx', () => {
      const agents = [{ agentUnid: 'a1' }];
      expect(dispatch(SET_ACTIVEAGENTS, { db: 'demo', activeAgents: agents }).activeAgents).toEqual(agents);
    });
  });

  describe('the three shared with another slice', () => {
    // SET_DB_ERROR is declared as 'SET_APP_ERROR' and CLEAR_DB_ERROR as
    // 'CLEAR_APP_ERROR' — the same values the applications slice uses. One dispatch
    // drives both reducers, and #840 showed what happens when that pairing breaks.
    it('SET_DB_ERROR reaches the databases slice', () => {
      expect(dispatch(SET_DB_ERROR, 'schema locked')).toMatchObject({
        dbError: true,
        dbErrorMessage: 'schema locked',
      });
    });

    it('SET_DB_ERROR reaches the applications slice too, under its own name', () => {
      expect(appsReducer(undefined, { type: SET_DB_ERROR, payload: 'schema locked' } as any)).toMatchObject({
        appError: true,
        appErrorMessage: 'schema locked',
      });
    });

    it('CLEAR_DB_ERROR clears both', () => {
      expect(dispatch(CLEAR_DB_ERROR)).toMatchObject({ dbError: false, dbErrorMessage: '' });
      expect(appsReducer(undefined, { type: CLEAR_DB_ERROR } as any)).toMatchObject({ appError: false });
    });

    it('INIT_STATE resets, and is not this slice’s own action', () => {
      const dirty = databaseReducer(undefined, { type: SET_DB_ERROR, payload: 'x' } as any);
      expect(databaseReducer(dirty, { type: INIT_STATE } as any).dbError).toBe(false);
    });
  });
});
