/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchFolders, setFolders } from '../../../src/store/databases/action';
import {
  setFolders as setFoldersAction,
} from '../../../src/store/databases/reducer';
import { Level, Logger } from '../../../src/services/log-service';
// apiRequestWithRetry notifies through a <keep-alert> on its error paths.
import '../../../src/components/keep-elements/keep-alert';

/**
 * #805 part 2a — the **folders** group: two thunks, and the smallest of the three
 * modules this branch proposes for the ten #711's split leaves homeless.
 *
 * Worth knowing before the split: folders are stored in the *view* shape.
 * `fetchFolders` maps `@name`/`@alias`/`@unid` onto `viewName`/`viewAlias`/`viewUnid`,
 * and `handleDatabaseViews` takes a `folderNames` argument to tell the two apart
 * again. So `folders.ts` and `views.ts` are coupled by that shape, whatever the file
 * boundary says.
 */

const response = (init: { ok: boolean; status?: number; body?: unknown }) =>
  ({
    ok: init.ok,
    status: init.status ?? (init.ok ? 200 : 500),
    statusText: 'stubbed',
    headers: { get: () => 'application/json' },
    json: async () => init.body ?? {},
  }) as unknown as Response;

describe('databases — folders', () => {
  let dispatch: any;
  let previousLevel: number;

  const actions = () => dispatch.mock.calls.map((c: any[]) => c[0]).filter((a: any) => typeof a !== 'function');
  const types = () => actions().map((a: any) => a?.type);

  beforeAll(() => {
    previousLevel = Logger.getLevel();
    Logger.setLevel(Level.OFF);
  });

  afterAll(() => Logger.setLevel(previousLevel));

  beforeEach(() => {
    // fetchFolders dispatches setFolders, a thunk, so the stub has to run it.
    const recorded: any[] = [];
    const d: any = vi.fn((action: any) => (typeof action === 'function' ? action(d) : action));
    d.recorded = recorded;
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

  describe('setFolders', () => {
    it('carries the database and its folders', async () => {
      await setFolders('demo', [{ viewName: 'Inbox' }])(dispatch);

      expect(actions()[0]).toEqual({
        type: setFoldersAction.type,
        payload: { db: 'demo', folders: [{ viewName: 'Inbox' }] },
      });
    });
  });

  describe('fetchFolders', () => {
    it('stores folders under the view shape, not a folder shape', async () => {
      returns({
        folders: [{ '@name': 'Inbox', '@unid': 'f1', '@alias': 'In', columns: [1] }],
      });

      await fetchFolders('demo', 'db.nsf')(dispatch);

      const stored = actions().find((a: any) => a?.type === setFoldersAction.type).payload.folders;
      expect(stored).toEqual([
        { viewName: 'Inbox', viewAlias: ['In'], viewUnid: 'f1', viewUpdated: true },
      ]);
    });

    it('normalises a single alias and an absent alias to an array', async () => {
      returns({
        folders: [
          { '@name': 'One', '@unid': 'f1', '@alias': 'solo' },
          { '@name': 'Two', '@unid': 'f2' },
          { '@name': 'Three', '@unid': 'f3', '@alias': ['a', 'b'] },
        ],
      });

      await fetchFolders('demo', 'db.nsf')(dispatch);

      const stored = actions().find((a: any) => a?.type === setFoldersAction.type).payload.folders;
      expect(stored.map((f: any) => f.viewAlias)).toEqual([['solo'], [], ['a', 'b']]);
    });

    it('marks a folder updated only when it carries columns', async () => {
      returns({ folders: [{ '@name': 'A', columns: [] }, { '@name': 'B', columns: [1] }] });

      await fetchFolders('demo', 'db.nsf')(dispatch);

      const stored = actions().find((a: any) => a?.type === setFoldersAction.type).payload.folders;
      expect(stored.map((f: any) => f.viewUpdated)).toEqual([false, true]);
    });

    it('stores nothing when the API refuses', async () => {
      refuses();

      await fetchFolders('demo', 'db.nsf')(dispatch);

      expect(types()).not.toContain(setFoldersAction.type);
    });

    it('does not throw out of the thunk when the request never completes', async () => {
      offline();

      await expect(fetchFolders('demo', 'db.nsf')(dispatch)).resolves.not.toThrow();
      expect(types()).not.toContain(setFoldersAction.type);
    });
  });
});
