/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchViews,
  handleDatabaseViews,
  processViewsAgents,
  setActiveViews,
  setViews,
} from '../../../src/store/databases/action';
import {
  SET_ACTIVEAGENTS,
  SET_ACTIVEVIEWS,
  SET_VIEWS,
  UPDATE_AGENT,
  UPDATE_VIEW,
  VIEWS_ERROR,
} from '../../../src/store/databases/types';
import { setApiLoading } from '../../../src/store/dialog/action';
import { toggleAlert } from '../../../src/store/alerts/action';
import { Level, Logger } from '../../../src/services/log-service';
// apiRequestWithRetry notifies through a <keep-alert> on its error paths.
import '../../../src/components/keep-elements/keep-alert';

/**
 * #803 — the **views** concern of `databases/action.ts`. Five thunks, following
 * `schemas.test.ts` (#690) and `scopes.test.ts` (#801), organised the way #711 will
 * split the file.
 *
 * `handleDatabaseViews` and `processViewsAgents` dispatch further thunks, and
 * `handleDatabaseViews` does not await the one it starts. These therefore run on a
 * dispatch that both executes thunks and tracks the promises they return — without
 * that, the request half of both is still in flight when the assertions run and the
 * coverage is illusory.
 *
 * The finding here is `processViewsAgents`'s save branch, which could never have
 * worked: a shadowed `data` binding put the request body's own source in its
 * temporal dead zone. Fixed, with a regression guard in that describe block.
 */

const response = (init: { ok: boolean; status?: number; body?: unknown }) =>
  ({
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    statusText: 'stubbed',
    headers: { get: () => 'application/json' },
    json: async () => init.body ?? {},
  }) as unknown as Response;

/**
 * A dispatch that runs the thunks handed to it, recording every action and thunk
 * in order. `redux-thunk`'s behaviour, minus the store.
 */
function makeDispatch(getState: () => any = () => ({})) {
  const recorded: any[] = [];
  const pending: Promise<unknown>[] = [];
  const dispatch: any = (action: any) => {
    recorded.push(action);
    if (typeof action !== 'function') return action;
    const result = action(dispatch, getState);
    // handleDatabaseViews dispatches updateViews without awaiting it, so the
    // request half would otherwise still be in flight when the test asserts.
    if (result && typeof result.then === 'function') pending.push(result);
    return result;
  };
  dispatch.recorded = recorded;
  dispatch.settled = async () => {
    while (pending.length) await pending.shift();
  };
  return dispatch;
}

describe('databases — views', () => {
  let dispatch: ReturnType<typeof makeDispatch>;
  let previousLevel: number;

  const actions = () => dispatch.recorded.filter((a: any) => typeof a !== 'function');
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

  const schemaData = { nsfPath: 'db.nsf', schemaName: 'demo', forms: [], views: [] } as any;

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

  describe('setViews / setActiveViews (plain dispatchers)', () => {
    it('setViews carries the database and its views', async () => {
      await setViews('demo', [{ viewName: 'All' }])(dispatch);

      expect(actions()[0]).toEqual({
        type: SET_VIEWS,
        payload: { db: 'demo', views: [{ viewName: 'All' }] },
      });
    });

    it('setActiveViews carries the database and its active views', async () => {
      await setActiveViews('demo', [{ viewName: 'All' }])(dispatch);

      expect(actions()[0]).toEqual({
        type: SET_ACTIVEVIEWS,
        payload: { db: 'demo', activeViews: [{ viewName: 'All' }] },
      });
    });
  });

  describe('fetchViews', () => {
    it('maps the design list onto the store shape', async () => {
      returns({
        views: [
          { '@name': 'All', '@unid': 'u1', '@alias': 'a1', '@selectionformula': 'SELECT @All', columns: [1] },
        ],
      });

      await fetchViews('demo', 'db.nsf')(dispatch);

      expect(actions().find((a: any) => a?.type === SET_VIEWS).payload.views[0]).toEqual({
        viewName: 'All',
        viewAlias: ['a1'],
        viewUnid: 'u1',
        viewUpdated: true,
        viewSelectionFormula: 'SELECT @All',
      });
    });

    it('normalises a single alias and an absent alias to an array', async () => {
      returns({
        views: [
          { '@name': 'One', '@unid': 'u1', '@alias': 'solo' },
          { '@name': 'Two', '@unid': 'u2' },
          { '@name': 'Three', '@unid': 'u3', '@alias': ['a', 'b'] },
        ],
      });

      await fetchViews('demo', 'db.nsf')(dispatch);

      const views = actions().find((a: any) => a?.type === SET_VIEWS).payload.views;
      expect(views.map((v: any) => v.viewAlias)).toEqual([['solo'], [], ['a', 'b']]);
    });

    it('marks a view updated only when it carries columns', async () => {
      returns({ views: [{ '@name': 'A', columns: [] }, { '@name': 'B', columns: [1] }] });

      await fetchViews('demo', 'db.nsf')(dispatch);

      const views = actions().find((a: any) => a?.type === SET_VIEWS).payload.views;
      expect(views.map((v: any) => v.viewUpdated)).toEqual([false, true]);
    });

    it('stores nothing when the API refuses', async () => {
      refuses();

      await fetchViews('demo', 'db.nsf')(dispatch);

      expect(types()).not.toContain(SET_VIEWS);
    });

    it('does not throw out of the thunk when the request never completes', async () => {
      offline();

      await expect(fetchViews('demo', 'db.nsf')(dispatch)).resolves.not.toThrow();
      expect(types()).not.toContain(SET_VIEWS);
    });

    it('does not throw out of the thunk when the error body is not JSON', async () => {
      refusesWithProse();

      await expect(fetchViews('demo', 'db.nsf')(dispatch)).resolves.not.toThrow();
    });
  });

  describe('handleDatabaseViews', () => {
    const view = { viewName: 'All', viewUnid: 'u1', viewAlias: [], viewColumns: [], viewUpdated: false };

    it('saves the views and reports success', async () => {
      returns({ ...schemaData, views: [view] });

      await handleDatabaseViews([view], [], 'demo', schemaData, true, vi.fn(), [])(dispatch);
      await dispatch.settled();

      expect(alerts().join()).toMatch(/views have been successfully saved/i);
      expectLoadingCleared();
    });

    it('hands the saved schema back to its caller', async () => {
      const setSchemaData = vi.fn();
      returns({ views: [view] });

      await handleDatabaseViews([view], [], 'demo', schemaData, true, setSchemaData, [])(dispatch);
      await dispatch.settled();

      expect(setSchemaData).toHaveBeenCalledWith(
        expect.objectContaining({ nsfPath: 'db.nsf', schemaName: 'demo' }),
      );
    });

    it('marks the views in error and clears the flag when the save is refused', async () => {
      refuses({ message: 'schema locked' });

      await handleDatabaseViews([view], [], 'demo', schemaData, false, vi.fn(), [])(dispatch);
      await dispatch.settled();

      expect(types()).toContain(VIEWS_ERROR);
      expect(alerts().join()).toMatch(/update views failed/i);
      expectLoadingCleared();
    });

    it('does not throw out of the thunk when the request never completes', async () => {
      offline();

      await expect(
        handleDatabaseViews([view], [], 'demo', schemaData, false, vi.fn(), [])(dispatch),
      ).resolves.not.toThrow();
      await dispatch.settled();
      expectLoadingCleared();
    });

    it('keeps an already-active view out of the list a second time', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: { views: [] } }));
      vi.stubGlobal('fetch', fetchMock);
      const active = [view, { ...view, viewName: 'Other', viewUnid: 'u2' }];

      await handleDatabaseViews(active, active, 'demo', schemaData, true, vi.fn(), [])(dispatch);
      await dispatch.settled();

      // The POST to /schema is the last call; its body carries the final view list.
      const post = fetchMock.mock.calls.find((c: any) => c[1]?.method === 'POST');
      const names = JSON.parse(post[1].body).views.map((v: any) => v.name);
      expect(names).toEqual([...new Set(names)]);
    });
  });

  describe('processViewsAgents — init', () => {
    const saved = {
      availableViews: [{ name: 'All', alias: ['All'], unid: 'u1', columns: [1] }],
      agents: [{ name: 'Nightly', alias: ['other'], unid: 'a1' }],
    };

    it('stores the active views and agents it read back', async () => {
      returns(saved);

      await processViewsAgents('demo', 'db.nsf', 'init', 'views', [], [], [], [])(dispatch);

      expect(actions().find((a: any) => a?.type === SET_ACTIVEVIEWS).payload.activeViews).toEqual([
        { viewName: 'All', viewAlias: '', viewUnid: 'u1', viewActive: true, viewUpdated: true },
      ]);
      expect(actions().find((a: any) => a?.type === SET_ACTIVEAGENTS).payload.activeAgents).toEqual([
        { agentName: 'Nightly', agentAlias: 'other', agentUnid: 'a1', agentActive: true },
      ]);
    });

    it('suppresses an alias that merely repeats the name (LABS-1903)', async () => {
      returns(saved);

      await processViewsAgents('demo', 'db.nsf', 'init', 'views', [], [], [], [])(dispatch);

      // 'All' repeats the view name and is dropped; 'other' does not and survives.
      expect(actions().find((a: any) => a?.type === SET_ACTIVEVIEWS).payload.activeViews[0].viewAlias).toBe('');
      expect(actions().find((a: any) => a?.type === SET_ACTIVEAGENTS).payload.activeAgents[0].agentAlias).toBe('other');
    });

    it('marks the matching entries in the left-hand panels', async () => {
      returns(saved);
      const allViews = [
        { viewName: 'All', viewUnid: 'u1', viewAlias: '', viewUpdated: false },
        { viewName: 'Absent', viewUnid: 'zz', viewAlias: '', viewUpdated: false },
      ] as any;
      const allAgents = [{ agentName: 'Nightly', agentUnid: 'a1', agentAlias: '' }] as any;

      await processViewsAgents('demo', 'db.nsf', 'init', 'views', allViews, allAgents, [], [])(dispatch);

      const updated = actions().filter((a: any) => a?.type === UPDATE_VIEW);
      expect(updated).toHaveLength(1);
      expect(updated[0].payload.view.viewUnid).toBe('u1');
      expect(actions().filter((a: any) => a?.type === UPDATE_AGENT)).toHaveLength(1);
    });

    it('does not throw out of the thunk when the schema read is refused', async () => {
      refuses();

      await expect(
        processViewsAgents('demo', 'db.nsf', 'init', 'views', [], [], [], [])(dispatch),
      ).resolves.not.toThrow();
      expect(types()).not.toContain(SET_ACTIVEVIEWS);
    });
  });

  describe('processViewsAgents — save', () => {
    // Regression guard. The request body is built by `JSON.stringify(data)` inside
    // the callback handed to apiRequestWithRetry, while the surrounding statement
    // was itself declaring a `data`. That shadow put the name in its temporal dead
    // zone at the moment the callback ran, so every save raised "Cannot access
    // 'data' before initialization" — inside apiRequestWithRetry, which caught it
    // and returned a failure. The POST was never sent, the user was shown a toast
    // quoting a JavaScript error, and the thunk resolved as though the server had
    // simply refused. Renaming the binding is the whole fix; this test is what
    // stops it coming back.
    const saved = { availableViews: [{ name: 'Old' }], agents: [{ name: 'Old' }] };

    it('sends the activated views and reports success', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: saved }));
      vi.stubGlobal('fetch', fetchMock);

      await processViewsAgents('demo', 'db.nsf', 'save', 'views', [], [], [{ name: 'All' }], [])(dispatch);

      const post = fetchMock.mock.calls.find((c: any) => c[1]?.method === 'POST');
      expect(post, 'no POST was sent').toBeDefined();
      expect(JSON.parse(post[1].body).availableViews).toEqual([{ name: 'All' }]);
      expect(alerts().join()).toMatch(/activated views have been saved/i);
    });

    it('sends the activated agents and reports success', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: saved }));
      vi.stubGlobal('fetch', fetchMock);

      await processViewsAgents('demo', 'db.nsf', 'save', 'agents', [], [], [], [{ name: 'Nightly' }])(dispatch);

      const post = fetchMock.mock.calls.find((c: any) => c[1]?.method === 'POST');
      expect(JSON.parse(post[1].body).agents).toEqual([{ name: 'Nightly' }]);
      expect(alerts().join()).toMatch(/activated agents have been saved/i);
    });

    it('reports nothing and does not throw when the save is refused', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn()
          .mockResolvedValueOnce(response({ ok: true, body: saved }))
          .mockResolvedValueOnce(response({ ok: false, status: 400, body: { message: 'nope' } })),
      );

      await expect(
        processViewsAgents('demo', 'db.nsf', 'save', 'views', [], [], [{ name: 'All' }], [])(dispatch),
      ).resolves.not.toThrow();
      expect(alerts()).toEqual([]);
    });
  });
});
