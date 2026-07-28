/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import groupsReducer from '../../../src/store/groups/reducer';
import {
  FETCH_GROUPS,
  CREATE_GROUP,
  UPDATE_GROUP,
  DELETE_GROUP,
  GroupsState,
} from '../../../src/store/groups/types';

const initial: GroupsState = {
  groups: [],
  groupsError: false,
  groupsErrorMessage: '',
  drawerOpen: false,
};

describe('groupsReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(groupsReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('FETCH_GROUPS replaces groups with the payload', () => {
    const groups = [{ id: '1', groupName: 'Admins' }];
    expect(groupsReducer(initial, { type: FETCH_GROUPS, payload: groups }).groups).toEqual(groups);
  });

  it('CREATE_GROUP appends the payload to groups', () => {
    const next = groupsReducer(initial, {
      type: CREATE_GROUP,
      payload: { id: '1', groupName: 'Admins' },
    });
    expect(next.groups).toHaveLength(1);
    expect(next.groups[0]).toEqual({ id: '1', groupName: 'Admins' });
  });

  it('UPDATE_GROUP replaces the group with the matching id', () => {
    const seeded: GroupsState = {
      ...initial,
      groups: [
        { id: '1', groupName: 'Admins' },
        { id: '2', groupName: 'Users' },
      ],
    };
    const next = groupsReducer(seeded, {
      type: UPDATE_GROUP,
      payload: { id: '2', groupName: 'Renamed' },
    });
    expect(next.groups[1]).toEqual({ id: '2', groupName: 'Renamed' });
    expect(next.groups[0]).toEqual({ id: '1', groupName: 'Admins' });
  });

  it('DELETE_GROUP removes the group with the matching id', () => {
    const seeded: GroupsState = {
      ...initial,
      groups: [
        { id: '1', groupName: 'Admins' },
        { id: '2', groupName: 'Users' },
      ],
    };
    const next = groupsReducer(seeded, { type: DELETE_GROUP, payload: '1' });
    expect(next.groups).toHaveLength(1);
    expect(next.groups[0]).toEqual({ id: '2', groupName: 'Users' });
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() =>
      groupsReducer(frozen, { type: CREATE_GROUP, payload: { id: '1', groupName: 'Admins' } }),
    ).not.toThrow();
    const next = groupsReducer(frozen, {
      type: CREATE_GROUP,
      payload: { id: '1', groupName: 'Admins' },
    });
    expect(next).not.toBe(frozen);
    expect(frozen.groups).toHaveLength(0);
  });
});
