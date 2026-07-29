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
import { SET_APP_ERROR, CLEAR_APP_ERROR, INIT_STATE, ApplicationStates } from '../../../src/store/applications/types';

const initial: ApplicationStates = {
  apps: [],
  status: false,
  appPull: false,
  appError: false,
  appErrorMessage: '',
  deleteDialogOpen: false,
};

describe('appsReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(appsReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('executing sets status from the payload', () => {
    expect(appsReducer(initial, executing(true)).status).toBe(true);
  });

  it('getApps replaces apps from the payload', () => {
    const apps = [{ appId: 'a1' }, { appId: 'a2' }];
    expect(appsReducer(initial, getApps(apps)).apps).toEqual(apps);
  });

  it('addApp appends the payload to apps', () => {
    const app = { appId: 'a1', appName: 'First' };
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
    const updated = { appId: 'a1', appName: 'New' };
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
 * TOGGLE_DELETE_DIALOG, SET_APP_ERROR and CLEAR_APP_ERROR are declared in *two*
 * slices each with identical values, so one dispatch has always driven both
 * reducers. Namespacing either side breaks the pairing silently — no type error,
 * no failing test, just a dialog that stops opening.
 *
 * #840 did exactly that: converting the dialog slice left this one unable to see
 * `TOGGLE_DELETE_DIALOG`, so DeleteApplicationDialog could no longer open. These
 * are the tests that would have caught it, and that keep the pairing honest as the
 * last classic reducer (databases) is converted.
 */
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

  it("records a database error raised through databases' setDBError", () => {
    // databases/types.ts declares SET_DB_ERROR = 'SET_APP_ERROR'. Whether AppForm
    // should show database errors is a product question; this pins what it does.
    const next = appsReducer(initial, setDBError('schema locked') as any);
    expect(next).toMatchObject({ appError: true, appErrorMessage: 'schema locked' });
  });

  it("clears it again through databases' clearDBError", () => {
    const dirty = { ...initial, appError: true, appErrorMessage: 'schema locked' };
    expect(appsReducer(dirty, clearDBError() as any)).toMatchObject({
      appError: false,
      appErrorMessage: '',
    });
  });
});
