/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearFormulaResults, saveResult, testFormula } from '../../../src/store/databases/action';
import {
  clearFormulaResults as clearFormulaResultsAction,
} from '../../../src/store/databases/reducer';
import { Level, Logger } from '../../../src/services/log-service';
// apiRequestWithRetry notifies through a <keep-alert> on its error paths.
import '../../../src/components/keep-elements/keep-alert';

/**
 * #802 part 3 — the **formulas** concern, which is `testFormula` and its two
 * helpers. Small, but it is the whole of #711's `formulas.ts`, so it gets the file
 * the split will keep.
 *
 * `saveResult` is unusual and worth knowing about before touching this: it uses its
 * `formulaType` argument **as the action type**, so the reducer case is chosen by a
 * string the caller passes in. That is why the tests below assert on the type they
 * supplied rather than on a constant.
 *
 * The thunk reads `data.result[0].result[0]` with no guard, and its catch parses the
 * error message as JSON. Both are exercised here — a success body of an unexpected
 * shape lands in the catch, whose `JSON.parse` then fails on a `TypeError` message.
 */

const response = (init: { ok: boolean; status?: number; body?: unknown }) =>
  ({
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    statusText: 'stubbed',
    headers: { get: () => 'application/json' },
    json: async () => init.body ?? {},
  }) as unknown as Response;

describe('databases — formulas', () => {
  let dispatch: any;
  let previousLevel: number;

  const actions = () => dispatch.mock.calls.map((call: any[]) => call[0]);

  const FORMULA_TYPE = 'SET_READ_FORMULA_RESULT';
  const formulaData = { formula: '@All', formulaType: 'domino' };

  beforeAll(() => {
    previousLevel = Logger.getLevel();
    Logger.setLevel(Level.OFF);
  });

  afterAll(() => Logger.setLevel(previousLevel));

  beforeEach(() => {
    dispatch = vi.fn();
    localStorage.setItem('user_token', JSON.stringify({ bearer: 'a-bearer' }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  const offline = () =>
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
  const refuses = (body: unknown = { message: 'bad formula' }) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: false, status: 400, body })));
  const returns = (body: unknown) =>
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response({ ok: true, body })));

  /** The shape the Keep run/formula endpoint answers with. */
  const formulaResponse = (value: unknown) => ({ result: [{ result: [value] }] });

  describe('saveResult / clearFormulaResults (plain actions)', () => {
    it('saveResult uses its formulaType argument as the action type', () => {
      // Not a constant — the caller chooses which reducer case runs.
      expect(saveResult(FORMULA_TYPE, 'yes')).toEqual({ type: FORMULA_TYPE, payload: 'yes' });
    });

    it('clearFormulaResults carries no payload', () => {
      expect(clearFormulaResults()).toEqual({ type: clearFormulaResultsAction.type });
    });
  });

  describe('testFormula', () => {
    it('saves the first result under the requested formula type', async () => {
      returns(formulaResponse('true'));

      await testFormula('db.nsf', formulaData, FORMULA_TYPE)(dispatch);

      expect(actions()).toEqual([{ type: FORMULA_TYPE, payload: 'true' }]);
    });

    it('POSTs the formula against the data source it was given', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: formulaResponse('x') }));
      vi.stubGlobal('fetch', fetchMock);

      await testFormula('Orders.nsf', formulaData, FORMULA_TYPE)(dispatch);

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toContain('dataSource=Orders.nsf');
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual(formulaData);
    });

    it('reaches past both wrapper arrays rather than storing them', async () => {
      // data.result[0].result[0] — two levels, and only the first entry of each.
      returns({ result: [{ result: ['first', 'second'] }, { result: ['other'] }] });

      await testFormula('db.nsf', formulaData, FORMULA_TYPE)(dispatch);

      expect(actions()[0].payload).toBe('first');
    });

    it('stores the server message when the formula is rejected', async () => {
      refuses({ message: 'Invalid formula syntax' });

      await testFormula('db.nsf', formulaData, FORMULA_TYPE)(dispatch);

      // The failure is reported through the same channel as the result, so the
      // user sees it in the results panel rather than as a toast.
      expect(actions()).toEqual([{ type: FORMULA_TYPE, payload: 'Invalid formula syntax' }]);
    });

    it('stores the message when the request never completes', async () => {
      offline();

      await expect(testFormula('db.nsf', formulaData, FORMULA_TYPE)(dispatch)).resolves.not.toThrow();
      expect(actions()[0]).toEqual({ type: FORMULA_TYPE, payload: 'Failed to fetch' });
    });

    // `data.result[0].result[0]` is unguarded, so an ok response of any other shape
    // raises a TypeError inside the try. The catch then runs JSON.parse over that
    // TypeError's own message and throws a SyntaxError, which escapes the thunk.
    //
    // Pinned rather than fixed: the guard belongs with whoever owns the endpoint
    // contract, and inventing a placeholder result here would be worse than the
    // rejection — it would show the user a formula result that never came back.
    it('rejects when the response is missing the result wrapper', async () => {
      returns({ unexpected: true });

      await expect(testFormula('db.nsf', formulaData, FORMULA_TYPE)(dispatch)).rejects.toThrow(SyntaxError);
      expect(actions()).toEqual([]);
    });

    it('rejects when the result array is empty', async () => {
      returns({ result: [] });

      await expect(testFormula('db.nsf', formulaData, FORMULA_TYPE)(dispatch)).rejects.toThrow(SyntaxError);
    });
  });
});
