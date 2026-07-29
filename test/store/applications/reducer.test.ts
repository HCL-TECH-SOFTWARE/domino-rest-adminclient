/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import appsReducer, {
  executing,
  getApps,
  addApp,
  dropUpdate,
  updateApp,
  deleteApp,
  setPulledApp,
} from '../../../src/store/applications/reducer';
import { toggleDeleteDialog } from '../../../src/store/dialog/action';
import { clearDBError, setDBError } from '../../../src/store/databases/shared';
import { SET_APP_ERROR, CLEAR_APP_ERROR, INIT_STATE, ApplicationStates, AppProp } from '../../../src/store/applications/types';

const initial: ApplicationStates = {
  apps: [],
  status: false,
  appPull: false,
  appError: false,
  appErrorMessage: '',
  deleteDialogOpen: false,
};

/**
 * A complete `AppProp`, so a case names only the fields it asserts on.
 *
 * These fixtures used to be one- and two-field object literals. That compiled while the
 * reducer was hand-written and took `AnyAction`, and stopped when #710 converted this
 * slice — `createSlice` types each action creator's payload, so `addApp({ appId })` is now
 * a type error rather than a silent `any`. The state fixtures below still use literals
 * because `ApplicationStates['apps']` is `Array<any>`; only the payloads are checked.
 */
const makeApp = (overrides: Partial<AppProp> = {}): AppProp => ({
  appName: '',
  appDescription: '',
  appCallbackUrls: [],
  appContacts: [],
  appIcon: '',
  appId: '',
  appScope: '',
  appHasSecret: false,
  appSecret: '',
  appStartPage: '',
  appStatus: '',
  usePkce: false,
  ...overrides,
});

describe('appsReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(appsReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('executing sets status from the payload', () => {
    expect(appsReducer(initial, executing(true)).status).toBe(true);
  });

  it('getApps replaces apps from the payload', () => {
    const apps = [makeApp({ appId: 'a1' }), makeApp({ appId: 'a2' })];
    expect(appsReducer(initial, getApps(apps)).apps).toEqual(apps);
  });

  it('addApp appends the payload to apps', () => {
    const app = makeApp({ appId: 'a1', appName: 'First' });
    const next = appsReducer(initial, addApp(app));
    expect(next.apps).toHaveLength(1);
    expect(next.apps[0]).toEqual(app);
  });

  it('dropUpdate remaps the dropped app status from the droppableId index', () => {
    const base: ApplicationStates = {
      ...initial,
      apps: [{ appId: 'a1', appStatus: 'Requested' }],
    };
    const next = appsReducer(
      base,
      dropUpdate({ appId: 'a1', destination: { droppableId: 1, index: 0, data: {} } } as any),
    );
    // status = ['Requested', 'Active', 'Approved', 'Inactive']; index 1 -> 'Active'
    expect(next.apps[0].appStatus).toBe('Active');
  });

  it('updateApp replaces the matching app with the payload', () => {
    const base: ApplicationStates = {
      ...initial,
      apps: [{ appId: 'a1', appName: 'Old' }],
    };
    const updated = makeApp({ appId: 'a1', appName: 'New' });
    const next = appsReducer(base, updateApp(updated));
    expect(next.apps[0]).toEqual(updated);
  });

  it('deleteApp removes the app matching the payload id', () => {
    const base: ApplicationStates = {
      ...initial,
      apps: [{ appId: 'a1' }, { appId: 'a2' }],
    };
    const next = appsReducer(base, deleteApp('a1'));
    expect(next.apps).toHaveLength(1);
    expect(next.apps[0].appId).toBe('a2');
  });

  it('setPulledApp sets appPull from the payload', () => {
    expect(appsReducer(initial, setPulledApp(true)).appPull).toBe(true);
  });

  it('TOGGLE_DELETE_DIALOG flips deleteDialogOpen on each dispatch', () => {
    const once = appsReducer(initial, toggleDeleteDialog());
    expect(once.deleteDialogOpen).toBe(true);
    expect(appsReducer(once, toggleDeleteDialog()).deleteDialogOpen).toBe(false);
  });

  it('SET_APP_ERROR sets appError true and stores the message', () => {
    const next = appsReducer(initial, { type: SET_APP_ERROR, payload: 'boom' });
    expect(next).toMatchObject({ appError: true, appErrorMessage: 'boom' });
  });

  it('CLEAR_APP_ERROR clears appError and the message', () => {
    const errored: ApplicationStates = {
      ...initial,
      appError: true,
      appErrorMessage: 'boom',
    };
    const next = appsReducer(errored, { type: CLEAR_APP_ERROR });
    expect(next).toMatchObject({ appError: false, appErrorMessage: '' });
  });

  it('INIT_STATE resets to the initial state', () => {
    const dirty: ApplicationStates = {
      ...initial,
      status: true,
      apps: [{ appId: 'a1' }],
      deleteDialogOpen: true,
    };
    expect(appsReducer(dirty, { type: INIT_STATE })).toEqual(initial);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() => appsReducer(frozen, executing(true))).not.toThrow();
  });
});

/**
 * This slice deliberately answers one action from another slice, and deliberately no
 * longer answers two others.
 *
 * **Kept:** the delete dialog lives in the dialog slice, and this reducer follows its
 * generated action *object*. #840 broke that by converting the dialog slice while
 * `TOGGLE_DELETE_DIALOG` was declared identically in both — no type error, no failing
 * test, just a dialog that stopped opening. The duplicate declaration is gone (#866);
 * this test is what holds the intentional half.
 *
 * **Removed:** `databases/types.ts` used to declare `SET_DB_ERROR = 'SET_APP_ERROR'`, so
 * every database error also wrote `appError`. #866 namespaced it. The tests that pinned
 * that behaviour are inverted below rather than deleted.
 */
/**
 * Three reducers look up an app by id, and the classic implementation used the
 * result of `findIndex` without checking it. On a miss that is -1, and:
 *
 *   draft.apps.splice(-1, 1)      removes the *last* app
 *   draft.apps[-1] = payload      writes a "-1" property onto the array
 *
 * The createSlice versions guard the lookup, so a stale or unknown id is now a
 * no-op. That is a behaviour change and the only one in #710 — hence these tests
 * rather than a silent fix.
 */
describe('appsReducer — lookups that miss', () => {
  const base: ApplicationStates = {
    apps: [{ appId: 'a1', appName: 'First' }, { appId: 'a2', appName: 'Second' }],
    status: false,
    appPull: false,
    appError: false,
    appErrorMessage: '',
    deleteDialogOpen: false,
  } as ApplicationStates;

  it('deleteApp leaves the list alone for an unknown id', () => {
    // Previously splice(-1, 1), which deleted 'a2'.
    const next = appsReducer(base, deleteApp('nosuchapp'));
    expect(next.apps.map((a: any) => a.appId)).toEqual(['a1', 'a2']);
  });

  it('updateApp leaves the list alone for an unknown id', () => {
    const next = appsReducer(base, updateApp({ appId: 'nosuchapp', appName: 'Ghost' } as any));
    expect(next.apps).toEqual(base.apps);
  });

  it('dropUpdate leaves the list alone for an unknown id', () => {
    const next = appsReducer(
      base,
      dropUpdate({ appId: 'nosuchapp', destination: { droppableId: 1, index: 0, data: {} } } as any),
    );
    expect(next.apps).toEqual(base.apps);
  });
});

describe('appsReducer — actions shared with other slices', () => {
  const initial: ApplicationStates = {
    apps: [],
    status: false,
    appPull: false,
    appError: false,
    appErrorMessage: '',
    deleteDialogOpen: false,
  };

  it("opens on the dialog slice's toggleDeleteDialog", () => {
    expect(appsReducer(initial, toggleDeleteDialog()).deleteDialogOpen).toBe(true);
  });

  it("ignores a database error raised through databases' setDBError", () => {
    // It used to record it: AppForm.tsx renders `appError && appErrorMessage` under the
    // title "Error: Unable to save application", so a failed *database* call put a
    // database message behind an application heading (#866).
    const next = appsReducer(initial, setDBError('schema locked') as any);
    expect(next).toMatchObject({ appError: false, appErrorMessage: '' });
  });

  it("does not have its error cleared by databases' clearDBError", () => {
    const dirty = { ...initial, appError: true, appErrorMessage: 'an application problem' };
    expect(appsReducer(dirty, clearDBError() as any)).toMatchObject({
      appError: true,
      appErrorMessage: 'an application problem',
    });
  });
});
