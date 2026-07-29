/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import usersReducer, { setUsers } from '../../../src/store/access/reducer';
import { INIT_STATE, UserState } from '../../../src/store/access/types';

const initial: UserState = {
  users: null,
};

describe('usersReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(usersReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('setUsers stores the payload on the users field', () => {
    const users = [{ user1: {} as any }];
    const next = usersReducer(initial, setUsers(users));
    expect(next.users).toBe(users);
  });

  it('INIT_STATE still resets, though it is not this slice\'s action', () => {
    // The cross-slice reset broadcast. createSlice namespaces its own actions as
    // `users/…`, so this only keeps working because the slice matches the literal
    // type in extraReducers. If that goes, this is the test that catches it.
    const dirty: UserState = { users: [{ user1: {} as any }] };
    expect(usersReducer(dirty, { type: INIT_STATE })).toEqual(initial);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() =>
      usersReducer(frozen, setUsers([{ u: {} as any }]))
    ).not.toThrow();
  });
});
