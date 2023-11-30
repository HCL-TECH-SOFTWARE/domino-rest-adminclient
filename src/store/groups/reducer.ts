/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import produce from 'immer';
import {
  GroupsActionTypes,
  GroupsState,
  FETCH_GROUPS,
  CREATE_GROUP,
  UPDATE_GROUP,
  DELETE_GROUP,
} from './types';

/**
 * reducer.ts is the Redux reducer for the Groups page
 *
 * @author Neil Schultz
 */

// Initial Groups state
const initialState: GroupsState = {
  groups: [],
  groupsError: false,
  groupsErrorMessage: '',
  drawerOpen: false,
};

/**
 * groupsReducer manages the state of the Groups page
 */
export default function groupsReducer(
  state = initialState,
  action: GroupsActionTypes
): GroupsState {
  switch (action.type) {
    // Fetch the list of groups
    case FETCH_GROUPS:
      return {
        ...state,
        groups: action.payload,
      };

    // Create a new Group
    case CREATE_GROUP:
      return produce(state, (draft: GroupsState) => {
        draft.groups.push(action.payload);
      });

    // Update a Group
    case UPDATE_GROUP:
      return produce(state, (draft: GroupsState) => {
        const groupId = action.payload.id;
        const groupIndex = state.groups.findIndex(
          (group) => group.id === groupId
        );
        draft.groups[groupIndex] = action.payload;
      });

    // Delete a Group
    case DELETE_GROUP:
      return produce(state, (draft: GroupsState) => {
        const groupIndex = state.groups.findIndex(
          (group) => group.id === action.payload
        );
        draft.groups.splice(groupIndex, 1);
      });

    default:
      return state;
  }
}
