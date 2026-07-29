/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchAgents,
  handleDatabaseAgents,
  setActiveAgents,
  setAgents,
  updateAgents,
} from '../../../src/store/databases/action';
import {
  ADD_ACTIVEAGENT,
  DELETE_ACTIVEAGENT,
  SET_ACTIVEAGENTS,
  SET_AGENTS,
  UPDATE_AGENT,
} from '../../../src/store/databases/types';
import { SET_API_LOADING } from '../../../src/store/dialog/types';
import { TOGGLE_ALERT } from '../../../src/store/alerts/types';
import { Level, Logger } from '../../../src/services/log-service';
// apiRequestWithRetry notifies through a <keep-alert> on its error paths.
import '../../../src/components/keep-elements/keep-alert';

/**
 * #804 — the **agents** concern of `databases/action.ts`. Five thunks, following
 * `schemas.test.ts` (#690), `scopes.test.ts` (#801) and `views.test.ts` (#803), and
 * organised the way #711 will split the file.
 *
 * As in #803, `handleDatabaseAgents` dispatches `updateAgents` without awaiting it,
 * so these run on a dispatch that executes thunks *and* tracks the promises they
 * return. Without that the request is still in flight when the assertions run.
 *
 * This concern is the healthy one. `updateAgents` clears the loading flag on every
 * path and rolls the agent list back to `currentAgents` when the save fails — the
 * only thunk in the file that undoes its own optimistic update. Both behaviours are
 * pinned here so the #711 split cannot quietly drop them.
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

describe('databases — agents', () => {
  let dispatch: ReturnType<typeof makeDispatch>;
  let previousLevel: number;

  const actions = () => dispatch.recorded.filter((a: any) => typeof a !== 'function');
  const types = () => actions().map((a: any) => a?.type);
  const alerts = () =>
    actions().filter((a: any) => a?.type === TOGGLE_ALERT).map((a: any) => a.payload as string);
  const loadingSequence = () =>
    actions().filter((a: any) => a?.type === SET_API_LOADING).map((a: any) => a.payload);

  const expectLoadingCleared = () => {
    const seq = loadingSequence();
    expect(seq.length, 'no SET_API_LOADING dispatched at all').toBeGreaterThan(0);
    expect(seq[seq.length - 1], `loading left as ${seq[seq.length - 1]}`).toBe(false);
  };

  const schemaData = { nsfPath: 'db.nsf', schemaName: 'demo', forms: [], agents: [] } as any;
  const agent = { agentName: 'Nightly', agentUnid: 'a1', agentAlias: [], agentActive: true };

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

  describe('setAgents / setActiveAgents (plain dispatchers)', () => {
    it('setAgents carries the database and its agents', async () => {
      await setAgents('demo', [agent])(dispatch);

      expect(actions()[0]).toEqual({ type: SET_AGENTS, payload: { db: 'demo', agents: [agent] } });
    });

    it('setActiveAgents carries the database and its active agents', async () => {
      await setActiveAgents('demo', [agent])(dispatch);

      expect(actions()[0]).toEqual({
        type: SET_ACTIVEAGENTS,
        payload: { db: 'demo', activeAgents: [agent] },
      });
    });
  });

  describe('fetchAgents', () => {
    it('maps the design list onto the store shape', async () => {
      returns({ agents: [{ '@name': 'Nightly', '@unid': 'a1', '@alias': 'nite' }] });

      await fetchAgents('demo', 'db.nsf')(dispatch);

      expect(actions().find((a: any) => a?.type === SET_AGENTS).payload.agents).toEqual([
        { agentName: 'Nightly', agentAlias: ['nite'], agentUnid: 'a1' },
      ]);
    });

    it('normalises a single alias and an absent alias to an array', async () => {
      returns({
        agents: [
          { '@name': 'One', '@unid': 'a1', '@alias': 'solo' },
          { '@name': 'Two', '@unid': 'a2' },
          { '@name': 'Three', '@unid': 'a3', '@alias': ['x', 'y'] },
        ],
      });

      await fetchAgents('demo', 'db.nsf')(dispatch);

      const agents = actions().find((a: any) => a?.type === SET_AGENTS).payload.agents;
      expect(agents.map((a: any) => a.agentAlias)).toEqual([['solo'], [], ['x', 'y']]);
    });

    it('stores nothing when the API refuses', async () => {
      refuses();

      await fetchAgents('demo', 'db.nsf')(dispatch);

      expect(types()).not.toContain(SET_AGENTS);
    });

    it('does not throw out of the thunk when the request never completes', async () => {
      offline();

      await expect(fetchAgents('demo', 'db.nsf')(dispatch)).resolves.not.toThrow();
      expect(types()).not.toContain(SET_AGENTS);
    });

    it('does not throw out of the thunk when the error body is not JSON', async () => {
      refusesWithProse();

      await expect(fetchAgents('demo', 'db.nsf')(dispatch)).resolves.not.toThrow();
    });
  });

  describe('updateAgents', () => {
    it('saves the agents and reports success', async () => {
      returns(schemaData);

      await updateAgents(schemaData, [agent], 'demo', [])(dispatch);

      expect(alerts().join()).toMatch(/agents have been successfully saved/i);
      expectLoadingCleared();
    });

    it('sends only the forms that have modes', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: schemaData }));
      vi.stubGlobal('fetch', fetchMock);
      const withForms = {
        ...schemaData,
        forms: [
          { formName: 'Keep', formModes: [{ modeName: 'default' }], alias: [] },
          { formName: 'Drop', formModes: [], alias: [] },
        ],
      };

      await updateAgents(withForms, [agent], 'demo', [])(dispatch);

      const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(sent.forms.map((f: any) => f.formName)).toEqual(['Keep']);
    });

    it('rolls the agent list back to what it was when the save fails', async () => {
      refuses({ message: 'schema locked' });
      const before = [{ agentName: 'Previous', agentUnid: 'p1' }];

      await updateAgents(schemaData, [agent], 'demo', before)(dispatch);

      // The only thunk in this file that undoes its own optimistic update.
      const restored = actions().filter((a: any) => a?.type === SET_AGENTS);
      expect(restored).toHaveLength(1);
      expect(restored[0].payload.agents).toEqual(before);
      expect(alerts().join()).toMatch(/update agents failed/i);
      expectLoadingCleared();
    });

    it('rolls back and clears the flag when the request never completes', async () => {
      offline();
      const before = [{ agentName: 'Previous', agentUnid: 'p1' }];

      await expect(updateAgents(schemaData, [agent], 'demo', before)(dispatch)).resolves.not.toThrow();
      expect(actions().find((a: any) => a?.type === SET_AGENTS).payload.agents).toEqual(before);
      expectLoadingCleared();
    });

    it('clears the flag when the error body is not JSON', async () => {
      refusesWithProse();

      await expect(updateAgents(schemaData, [agent], 'demo', [])(dispatch)).resolves.not.toThrow();
      expectLoadingCleared();
    });
  });

  describe('handleDatabaseAgents', () => {
    it('marks the agent active in both panels and saves', async () => {
      returns(schemaData);

      await handleDatabaseAgents([agent], [], 'demo', schemaData, true, [])(dispatch);
      await dispatch.settled();

      expect(types()).toContain(UPDATE_AGENT);
      expect(types()).toContain(ADD_ACTIVEAGENT);
      expect(alerts().join()).toMatch(/agents have been successfully saved/i);
    });

    it('removes the agent from the active panel when deactivating', async () => {
      returns(schemaData);

      await handleDatabaseAgents([agent], [agent], 'demo', schemaData, false, [agent])(dispatch);
      await dispatch.settled();

      expect(types()).toContain(DELETE_ACTIVEAGENT);
      expect(types()).not.toContain(ADD_ACTIVEAGENT);
    });

    it('drops the deactivated agent from the list it sends', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: schemaData }));
      vi.stubGlobal('fetch', fetchMock);
      const other = { agentName: 'Other', agentUnid: 'a2', agentAlias: [] };

      // Deactivating 'Nightly' out of an active list holding both.
      await handleDatabaseAgents([agent], [agent, other], 'demo', schemaData, false, [])(dispatch);
      await dispatch.settled();

      const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(sent.agents.map((a: any) => a.name)).toEqual(['Other']);
    });

    it('does not add an already-active agent to the list twice', async () => {
      const fetchMock = vi.fn().mockResolvedValue(response({ ok: true, body: schemaData }));
      vi.stubGlobal('fetch', fetchMock);
      const other = { agentName: 'Other', agentUnid: 'a2', agentAlias: [] };

      await handleDatabaseAgents([agent, other], [agent], 'demo', schemaData, true, [])(dispatch);
      await dispatch.settled();

      const names = JSON.parse(fetchMock.mock.calls[0][1].body).agents.map((a: any) => a.name);
      expect(names).toEqual([...new Set(names)]);
      expect(names).toContain('Nightly');
      expect(names).toContain('Other');
    });

    it('does not throw out of the thunk when the save is refused', async () => {
      refuses();

      await expect(
        handleDatabaseAgents([agent], [], 'demo', schemaData, true, [])(dispatch),
      ).resolves.not.toThrow();
      await dispatch.settled();
      expectLoadingCleared();
    });
  });
});
