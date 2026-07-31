/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import loadingReducer, { setLoading, toggleDetailsLoading, toggleConsentsLoading, toggleUsersLoading } from '../../../src/store/loading/reducer';
import { LoadingState } from '../../../src/store/loading/types';

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

  it('setLoading replaces loading with the payload', () => {
    const payload = { status: true, data: { message: 'Loading users' } };
    const next = loadingReducer(initial, setLoading(payload));
    expect(next.loading).toEqual(payload);
  });

  it('toggleDetailsLoading flips detailsLoading on each dispatch', () => {
    const once = loadingReducer(initial, toggleDetailsLoading());
    expect(once.detailsLoading).toBe(true);
    expect(loadingReducer(once, toggleDetailsLoading()).detailsLoading).toBe(false);
  });

  it('toggleConsentsLoading flips consentsLoading', () => {
    expect(loadingReducer(initial, toggleConsentsLoading()).consentsLoading).toBe(true);
  });

  it('toggleUsersLoading flips usersLoading', () => {
    expect(loadingReducer(initial, toggleUsersLoading()).usersLoading).toBe(true);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() => loadingReducer(frozen, toggleDetailsLoading())).not.toThrow();
    expect(loadingReducer(frozen, toggleDetailsLoading())).not.toBe(frozen);
  });
});
