/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import peopleReducer from '../../../src/store/people/reducer';
import {
  FETCH_ALL_USERS,
  ADD_USER,
  UPDATE_USER,
  DELETE_USER,
  TOGGLE_DELETE_DIALOG,
  CLEAR_PEOPLE_ERROR,
  PeopleState,
} from '../../../src/store/people/types';

const initial: PeopleState = {
  peoples: [],
  peopleError: false,
  peopleErrorMessage: '',
  drawerOpen: false,
  deleteDialogOpen: false,
};

describe('peopleReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(peopleReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('FETCH_ALL_USERS replaces peoples with the payload', () => {
    const peoples = [{ id: '1', firstName: 'Ada' }];
    expect(peopleReducer(initial, { type: FETCH_ALL_USERS, payload: peoples }).peoples).toEqual(
      peoples,
    );
  });

  it('ADD_USER appends the payload to peoples', () => {
    const next = peopleReducer(initial, {
      type: ADD_USER,
      payload: { id: '1', firstName: 'Ada' },
    });
    expect(next.peoples).toHaveLength(1);
    expect(next.peoples[0]).toEqual({ id: '1', firstName: 'Ada' });
  });

  it('UPDATE_USER replaces the person with the matching id', () => {
    const seeded: PeopleState = {
      ...initial,
      peoples: [
        { id: '1', firstName: 'Ada' },
        { id: '2', firstName: 'Bob' },
      ],
    };
    const next = peopleReducer(seeded, {
      type: UPDATE_USER,
      payload: { id: '2', firstName: 'Bobby' },
    });
    expect(next.peoples[1]).toEqual({ id: '2', firstName: 'Bobby' });
    expect(next.peoples[0]).toEqual({ id: '1', firstName: 'Ada' });
  });

  it('DELETE_USER removes the person with the matching id', () => {
    const seeded: PeopleState = {
      ...initial,
      peoples: [
        { id: '1', firstName: 'Ada' },
        { id: '2', firstName: 'Bob' },
      ],
    };
    const next = peopleReducer(seeded, { type: DELETE_USER, payload: '1' });
    expect(next.peoples).toHaveLength(1);
    expect(next.peoples[0]).toEqual({ id: '2', firstName: 'Bob' });
  });

  it('TOGGLE_DELETE_DIALOG flips deleteDialogOpen on each dispatch', () => {
    const once = peopleReducer(initial, { type: TOGGLE_DELETE_DIALOG });
    expect(once.deleteDialogOpen).toBe(true);
    expect(peopleReducer(once, { type: TOGGLE_DELETE_DIALOG }).deleteDialogOpen).toBe(false);
  });

  it('CLEAR_PEOPLE_ERROR resets peopleError and peopleErrorMessage', () => {
    const dirty: PeopleState = {
      ...initial,
      peopleError: true,
      peopleErrorMessage: 'boom',
    };
    const next = peopleReducer(dirty, { type: CLEAR_PEOPLE_ERROR });
    expect(next).toMatchObject({ peopleError: false, peopleErrorMessage: '' });
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() =>
      peopleReducer(frozen, { type: ADD_USER, payload: { id: '1', firstName: 'Ada' } }),
    ).not.toThrow();
    const next = peopleReducer(frozen, {
      type: ADD_USER,
      payload: { id: '1', firstName: 'Ada' },
    });
    expect(next).not.toBe(frozen);
    expect(frozen.peoples).toHaveLength(0);
  });
});
