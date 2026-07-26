import { describe, it, expect } from 'vitest';
import loadingReducer from '../../../src/store/loading/reducer';
import {
  SET_VALUE,
  TOGGLE_DETAILS_LOADING,
  TOGGLE_CONSENTS_LOADING,
  TOGGLE_USERS_LOADING,
  LoadingState,
} from '../../../src/store/loading/types';

const initial: LoadingState = {
  loading: {
    status: false,
    data: {
      message: 'Getting All Databases',
    },
  },
  detailsLoading: false,
  consentsLoading: false,
  usersLoading: false,
};

describe('loadingReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(loadingReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('SET_VALUE replaces loading with the payload', () => {
    const payload = { status: true, data: { message: 'Loading users' } };
    const next = loadingReducer(initial, { type: SET_VALUE, payload });
    expect(next.loading).toEqual(payload);
  });

  it('TOGGLE_DETAILS_LOADING flips detailsLoading on each dispatch', () => {
    const once = loadingReducer(initial, { type: TOGGLE_DETAILS_LOADING });
    expect(once.detailsLoading).toBe(true);
    expect(loadingReducer(once, { type: TOGGLE_DETAILS_LOADING }).detailsLoading).toBe(false);
  });

  it('TOGGLE_CONSENTS_LOADING flips consentsLoading', () => {
    expect(loadingReducer(initial, { type: TOGGLE_CONSENTS_LOADING }).consentsLoading).toBe(true);
  });

  it('TOGGLE_USERS_LOADING flips usersLoading', () => {
    expect(loadingReducer(initial, { type: TOGGLE_USERS_LOADING }).usersLoading).toBe(true);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() => loadingReducer(frozen, { type: TOGGLE_DETAILS_LOADING })).not.toThrow();
    expect(loadingReducer(frozen, { type: TOGGLE_DETAILS_LOADING })).not.toBe(frozen);
  });
});
