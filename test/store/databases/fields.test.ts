/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addActiveFields,
  fetchFields,
  getAllFieldsByNsf,
  setLoadedFields,
} from '../../../src/store/databases/action';
import {
  ADD_ACTIVEFIELDS,
  SET_ACTIVEFORM,
  SET_LOADEDFIELDS,
  SET_LOADEDFORM,
} from '../../../src/store/databases/types';
import { toggleErrorDialog } from '../../../src/store/dialog/action';
import { Level, Logger } from '../../../src/services/log-service';
// apiRequestWithRetry notifies through a <keep-alert> on its error paths.
import '../../../src/components/keep-elements/keep-alert';

/**
 * #805 part 1 — the **fields** group, and the largest of the ten thunks #711's
 * six-module split leaves without a home. #805 asks where they land; these tests are
 * written as `fields.ts`, which is the answer this branch proposes. See the PR.
 *
 * `fetchFields` is one of the six thunks that dispatch other thunks, so these run on
 * a dispatch that executes them.
 *
 * One live defect recorded here: `fetchFields`'s error dialog reads
 * `error.statusCode`, and the shaped error body carries `status`. Every failed field
 * fetch therefore opens a dialog titled "undefined: …". Same mistake as the
 * unreachable line in #818, but this one renders.
 */

const response = (init: { ok: boolean; status?: number; body?: unknown }) =>
  ({
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    statusText: 'stubbed',
    headers: { get: () => 'application/json' },
    json: async () => init.body ?? {},
  }) as unknown as Response;

/** Runs the thunks handed to it and tracks their promises. See #803. */
function makeDispatch(getState: () => any = () => ({})) {
  const recorded: any[] = [];
  const pending: Promise<unknown>[] = [];
  const dispatch: any = (action: any) => {
    recorded.push(action);
    if (typeof action !== 'function') return action;
    const result = action(dispatch, getState);
    if (result && typeof result.then === 'function') pending.push(result);
    return result;
  };
  dispatch.recorded = recorded;
  dispatch.settled = async () => {
    while (pending.length) await pending.shift();
  };
  return dispatch;
}

describe('databases — fields', () => {
  let dispatch: ReturnType<typeof makeDispatch>;
  let previousLevel: number;

  const actions = () => dispatch.recorded.filter((a: any) => typeof a !== 'function');
  const types = () => actions().map((a: any) => a?.type);
  const byType = (t: string) => actions().find((a: any) => a?.type === t);

  beforeAll(() => {
    previousLevel = Logger.getLevel();
    Logger.setLevel(Level.OFF);
  });

  afterAll(() => Logger.setLevel(previousLevel));

  beforeEach(() => {
    dispatch = makeDispatch();
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

  describe('setLoadedFields / addActiveFields (plain dispatchers)', () => {
    it('setLoadedFields carries the form and its fields', async () => {
      await setLoadedFields('Order', [{ name: 'a' }])(dispatch);

      expect(actions()[0]).toEqual({
        type: SET_LOADEDFIELDS,
        payload: { formName: 'Order', fields: [{ name: 'a' }] },
      });
    });

    it('addActiveFields nests the form and fields under activeFields', async () => {
      await addActiveFields('Order', [{ name: 'a' }])(dispatch);

      expect(actions()[0]).toEqual({
        type: ADD_ACTIVEFIELDS,
        payload: { activeFields: { formName: 'Order', fields: [{ name: 'a' }] } },
      });
    });
  });

  describe('fetchFields', () => {
    // Keys beginning @ are design metadata; the rest are real fields. The first
    // three transformed entries are dropped by an `idx > 2` filter.
    const design = {
      '@name': 'Order',
      '@alias': 'O',
      '@hide': false,
      Customer: { type: 'TYPE_TEXT', kind: 'editable', allowmultivalues: false },
      Total: { type: 'TYPE_NUMBER', kind: 'readonly', allowmultivalues: false },
    };

    it('loads the fields into both the active and loaded panels', async () => {
      returns(design);

      await fetchFields('demo', 'db.nsf', 'Order', 'Order', 'forms')(dispatch);
      await dispatch.settled();

      expect(types()).toContain(SET_ACTIVEFORM);
      expect(types()).toContain(SET_LOADEDFORM);
      expect(types()).toContain(ADD_ACTIVEFIELDS);
      expect(types()).toContain(SET_LOADEDFIELDS);
    });

    it('drops the three design keys and keeps the real fields', async () => {
      returns(design);

      await fetchFields('demo', 'db.nsf', 'Order', 'Order', 'forms')(dispatch);
      await dispatch.settled();

      const fields = byType(ADD_ACTIVEFIELDS).payload.activeFields.fields;
      // The filter is positional -- `idx > 2` -- not by key, so it depends on the
      // three @-prefixed keys arriving first. They do, but only because the API
      // orders them that way.
      expect(fields.map((f: any) => f.content)).toEqual(['Customer', 'Total']);
    });

    it('gives real fields a content but no name, unlike the design keys', async () => {
      returns(design);

      await fetchFields('demo', 'db.nsf', 'Order', 'Order', 'forms')(dispatch);
      await dispatch.settled();

      // The two push sites disagree: the @-key branch sets both `content` and
      // `name`, the field branch sets `content` only. Pinned because consumers
      // read `content`, so "adding the missing name" would be a change, not a fix.
      const fields = byType(ADD_ACTIVEFIELDS).payload.activeFields.fields;
      expect(fields.every((f: any) => f.content)).toBe(true);
      expect(fields.every((f: any) => f.name === undefined)).toBe(true);
    });

    it('marks an editable field RW and a read-only one RO', async () => {
      returns(design);

      await fetchFields('demo', 'db.nsf', 'Order', 'Order', 'forms')(dispatch);
      await dispatch.settled();

      const fields = byType(ADD_ACTIVEFIELDS).payload.activeFields.fields;
      expect(fields.find((f: any) => f.content === 'Customer').fieldAccess).toBe('RW');
      expect(fields.find((f: any) => f.content === 'Total').fieldAccess).toBe('RO');
    });

    it('requests the design type and encoded form name it was given', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: design }));
      vi.stubGlobal('fetch', fetchMock);

      await fetchFields('demo', 'db.nsf', 'Order/Sub', 'Order', 'views')(dispatch);
      await dispatch.settled();

      expect(fetchMock.mock.calls[0][0]).toContain('/design/views/Order%2fSub');
    });

    it('loads nothing when the request is refused', async () => {
      refuses({ message: 'no such form' });

      await fetchFields('demo', 'db.nsf', 'Order', 'Order', 'forms')(dispatch);
      await dispatch.settled();

      expect(types()).not.toContain(ADD_ACTIVEFIELDS);
      expect(types()).toContain(toggleErrorDialog.type);
    });

    // The handler builds its title from `error.statusCode`, but checkForResponse and
    // #800's failure shape both use `status`. Nothing writes `statusCode`, so the
    // dialog always opens as "undefined: …". Pinned rather than fixed here: the same
    // mistake sits in #818's unreachable line and the two want one decision.
    it('titles the error dialog "undefined" because it reads the wrong key', async () => {
      refuses({ status: 400, message: 'no such form' });

      await fetchFields('demo', 'db.nsf', 'Order', 'Order', 'forms')(dispatch);
      await dispatch.settled();

      expect(byType(toggleErrorDialog.type).payload).toBe('undefined: no such form');
    });

    it('does not throw out of the thunk when the request never completes', async () => {
      offline();

      await expect(
        fetchFields('demo', 'db.nsf', 'Order', 'Order', 'forms')(dispatch),
      ).resolves.not.toThrow();
      expect(types()).not.toContain(ADD_ACTIVEFIELDS);
    });
  });

  describe('getAllFieldsByNsf', () => {
    const itemDefinitions = [
      { TYPE_TEXT: ['Customer'], TYPE_NUMBER: ['Total'], TYPE_TIME_RANGE: ['Window'] },
    ];

    it('stores the mapped fields under the internal all-fields form', async () => {
      returns(itemDefinitions);

      await getAllFieldsByNsf('db.nsf')(dispatch);
      await dispatch.settled();

      // A reserved form name, not a real one — the all-fields panel reads it.
      expect(byType(ADD_ACTIVEFIELDS).payload.activeFields.formName).toBe(
        'keep_internal_form_for_allFields',
      );
    });

    it('maps a number type to float and a time range to a multi-value date-time', async () => {
      returns(itemDefinitions);

      await getAllFieldsByNsf('db.nsf')(dispatch);
      await dispatch.settled();

      const fields = byType(ADD_ACTIVEFIELDS).payload.activeFields.fields;
      const number = fields.find((f: any) => f.format === 'float');
      expect(number.type).toBe('number');
      const range = fields.find((f: any) => f.format === 'date-time' && f.isMultiValue);
      expect(range.type).toBe('array');
    });

    it('always appends a $FILE field when the design does not carry one', async () => {
      returns(itemDefinitions);

      await getAllFieldsByNsf('db.nsf')(dispatch);
      await dispatch.settled();

      const fields = byType(ADD_ACTIVEFIELDS).payload.activeFields.fields;
      const file = fields.filter((f: any) => f.content === '$FILE');
      expect(file).toHaveLength(1);
      expect(file[0]).toMatchObject({ format: 'binary', type: 'object', fieldAccess: 'RW' });
    });

    it('stores nothing when the request is refused', async () => {
      refuses();

      await getAllFieldsByNsf('db.nsf')(dispatch);
      await dispatch.settled();

      expect(types()).not.toContain(ADD_ACTIVEFIELDS);
    });

    it('does not throw out of the thunk when the request never completes', async () => {
      offline();

      await expect(getAllFieldsByNsf('db.nsf')(dispatch)).resolves.not.toThrow();
      expect(types()).not.toContain(ADD_ACTIVEFIELDS);
    });
  });
});
