import { describe, it, expect } from 'vitest';
import appsReducer from './reducer';
import {
  EXECUTING,
  GET_APPS,
  ADD_APP,
  DROP_UPDATE,
  UPDATE_APP,
  DELETE_APP,
  SET_PULLED_APP,
  TOGGLE_DELETE_DIALOG,
  SET_APP_ERROR,
  CLEAR_APP_ERROR,
  INIT_STATE,
  ApplicationStates,
} from './types';

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

  it('EXECUTING sets status from the payload', () => {
    expect(appsReducer(initial, { type: EXECUTING, payload: true }).status).toBe(true);
  });

  it('GET_APPS replaces apps from the payload', () => {
    const apps = [{ appId: 'a1' }, { appId: 'a2' }];
    expect(appsReducer(initial, { type: GET_APPS, payload: apps }).apps).toEqual(apps);
  });

  it('ADD_APP appends the payload to apps', () => {
    const app = { appId: 'a1', appName: 'First' };
    const next = appsReducer(initial, { type: ADD_APP, payload: app });
    expect(next.apps).toHaveLength(1);
    expect(next.apps[0]).toEqual(app);
  });

  it('DROP_UPDATE remaps the dropped app status from the droppableId index', () => {
    const base: ApplicationStates = {
      ...initial,
      apps: [{ appId: 'a1', appStatus: 'Requested' }],
    };
    const next = appsReducer(base, {
      type: DROP_UPDATE,
      payload: {
        appId: 'a1',
        destination: { droppableId: 1, index: 0, data: {} },
      },
    });
    // status = ['Requested', 'Active', 'Approved', 'Inactive']; index 1 -> 'Active'
    expect(next.apps[0].appStatus).toBe('Active');
  });

  it('UPDATE_APP replaces the matching app with the payload', () => {
    const base: ApplicationStates = {
      ...initial,
      apps: [{ appId: 'a1', appName: 'Old' }],
    };
    const updated = { appId: 'a1', appName: 'New' };
    const next = appsReducer(base, { type: UPDATE_APP, payload: updated });
    expect(next.apps[0]).toEqual(updated);
  });

  it('DELETE_APP removes the app matching the payload id', () => {
    const base: ApplicationStates = {
      ...initial,
      apps: [{ appId: 'a1' }, { appId: 'a2' }],
    };
    const next = appsReducer(base, { type: DELETE_APP, payload: 'a1' });
    expect(next.apps).toHaveLength(1);
    expect(next.apps[0].appId).toBe('a2');
  });

  it('SET_PULLED_APP sets appPull from the payload', () => {
    expect(appsReducer(initial, { type: SET_PULLED_APP, payload: true }).appPull).toBe(true);
  });

  it('TOGGLE_DELETE_DIALOG flips deleteDialogOpen on each dispatch', () => {
    const once = appsReducer(initial, { type: TOGGLE_DELETE_DIALOG });
    expect(once.deleteDialogOpen).toBe(true);
    expect(appsReducer(once, { type: TOGGLE_DELETE_DIALOG }).deleteDialogOpen).toBe(false);
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
    expect(() => appsReducer(frozen, { type: EXECUTING, payload: true })).not.toThrow();
  });
});
