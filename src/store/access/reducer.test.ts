import { describe, it, expect } from 'vitest';
import usersReducer from './reducer';
import { SET_USERS, INIT_STATE, UserState } from './types';

const initial: UserState = {
  users: null,
};

describe('usersReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(usersReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('SET_USERS stores the payload on the users field', () => {
    const users = [{ user1: {} as any }];
    const next = usersReducer(initial, { type: SET_USERS, payload: users });
    expect(next.users).toBe(users);
  });

  it('INIT_STATE resets to the initial state', () => {
    const dirty: UserState = { users: [{ user1: {} as any }] };
    expect(usersReducer(dirty, { type: INIT_STATE })).toEqual(initial);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() =>
      usersReducer(frozen, { type: SET_USERS, payload: [{ u: {} as any }] })
    ).not.toThrow();
  });
});
