import { describe, it, expect } from 'vitest';
import memberReducer from './reducer';
import {
  ADD_MEMBER,
  REMOVE_MEMBER,
  REMOVE_ALL_MEMBERS,
  FETCH_ALL_MEMBERS,
  CLEAR_MEMBER_ERROR,
  TOGGLE_DELETE_DIALOG,
  MembersState,
} from './types';

const initial: MembersState = {
  members: [],
  memeberError: false,
  memeberErrorMessage: '',
  drawerOpen: false,
  deleteDialogOpen: false,
};

describe('memberReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(memberReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('ADD_MEMBER appends the payload member to the list', () => {
    const member = { id: 'a', fullName: 'Alice' };
    const next = memberReducer(initial, { type: ADD_MEMBER, payload: member });
    expect(next.members).toEqual([member]);
  });

  it('REMOVE_MEMBER removes the member whose id matches the payload', () => {
    const state: MembersState = {
      ...initial,
      members: [
        { id: 'a', fullName: 'Alice' },
        { id: 'b', fullName: 'Bob' },
      ],
    };
    const next = memberReducer(state, { type: REMOVE_MEMBER, payload: 'a' });
    expect(next.members).toEqual([{ id: 'b', fullName: 'Bob' }]);
  });

  it('REMOVE_ALL_MEMBERS clears the entire members list', () => {
    const state: MembersState = {
      ...initial,
      members: [
        { id: 'a', fullName: 'Alice' },
        { id: 'b', fullName: 'Bob' },
      ],
    };
    const next = memberReducer(state, { type: REMOVE_ALL_MEMBERS, payload: 'b' });
    expect(next.members).toEqual([]);
  });

  // Regression: findIndex returns -1 for an absent id, and splice(-1, 1) used to
  // delete the LAST member instead of leaving the list untouched.
  it('REMOVE_MEMBER leaves the list unchanged when the id is not present', () => {
    const members = [
      { id: 'a', fullName: 'Alice' },
      { id: 'b', fullName: 'Bob' },
    ];
    const state: MembersState = { ...initial, members };
    const next = memberReducer(state, { type: REMOVE_MEMBER, payload: 'missing' });
    expect(next.members).toEqual(members);
  });

  it('REMOVE_ALL_MEMBERS clears members regardless of the payload id', () => {
    const state: MembersState = {
      ...initial,
      members: [
        { id: 'a', fullName: 'Alice' },
        { id: 'b', fullName: 'Bob' },
      ],
    };
    const next = memberReducer(state, { type: REMOVE_ALL_MEMBERS, payload: 'missing' });
    expect(next.members).toEqual([]);
  });

  it('REMOVE_MEMBER on an empty list is a no-op', () => {
    const next = memberReducer(initial, { type: REMOVE_MEMBER, payload: 'a' });
    expect(next.members).toEqual([]);
  });

  it('FETCH_ALL_MEMBERS replaces the members list with the payload', () => {
    const list = [{ id: 'x', fullName: 'X' }];
    const next = memberReducer(initial, { type: FETCH_ALL_MEMBERS, payload: list });
    expect(next.members).toEqual(list);
  });

  it('CLEAR_MEMBER_ERROR clears the error flag and message', () => {
    const state: MembersState = {
      ...initial,
      memeberError: true,
      memeberErrorMessage: 'boom',
    };
    const next = memberReducer(state, { type: CLEAR_MEMBER_ERROR });
    expect(next).toMatchObject({ memeberError: false, memeberErrorMessage: '' });
  });

  it('TOGGLE_DELETE_DIALOG flips deleteDialogOpen on each dispatch', () => {
    const once = memberReducer(initial, { type: TOGGLE_DELETE_DIALOG });
    expect(once.deleteDialogOpen).toBe(true);
    expect(memberReducer(once, { type: TOGGLE_DELETE_DIALOG }).deleteDialogOpen).toBe(false);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() => memberReducer(frozen, { type: TOGGLE_DELETE_DIALOG })).not.toThrow();
  });
});
