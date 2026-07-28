/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { produce } from 'immer';
import {
  ADD_MEMBER,
  REMOVE_MEMBER,
  REMOVE_ALL_MEMBERS,
  FETCH_ALL_MEMBERS,
  CLEAR_MEMBER_ERROR,
  TOGGLE_DELETE_DIALOG,
  MembersState,
  GroupMembersActionTypes,
} from './types';

/**
 * reducer.ts is the Redux reducer for the Group members
 *
 * @author Roopa HS
 * @author Mallisetty Subbaiah
 * @author Sudula Prakash
 */

// Initial Member state
const initialState: MembersState = {
  members: [],
  memeberError: false,
  memeberErrorMessage: '',
  drawerOpen: false,
  deleteDialogOpen: false,
};

/**
 * MemberReducer manages the state of group members
 */
export default function memberReducer(
  state = initialState,
  action: GroupMembersActionTypes
): MembersState {
  switch (action.type) {
    // Add new Member
    case ADD_MEMBER:
      return produce(state, (draft: MembersState) => {
        draft.members.push(action.payload);
      });
    // Remove Member
    case REMOVE_MEMBER:
      return produce(state, (draft: MembersState) => {
        const memberIndex = state.members.findIndex(
          (member) => member.id === action.payload
        );
        // Guard against findIndex returning -1 (id not present); splice(-1, 1)
        // would otherwise remove the LAST member instead of nothing.
        if (memberIndex !== -1) {
          draft.members.splice(memberIndex, 1);
        }
      });
    // Remove All Members: the group (and therefore all of its members) was
    // deleted, so drop every member. The payload (the group id) is used only by
    // the caller's API request, not by this reducer — hence no id matching here.
    case REMOVE_ALL_MEMBERS:
      return {
        ...state,
        members: [],
      };
    // Fetch the list of group members
    case FETCH_ALL_MEMBERS:
      return {
        ...state,
        members: action.payload,
      };
    // clear errors
    case CLEAR_MEMBER_ERROR:
      return {
        ...state,
        memeberError: false,
        memeberErrorMessage: '',
      };
    // Delete Dialog
    case TOGGLE_DELETE_DIALOG:
      return {
        ...state,
        deleteDialogOpen: !state.deleteDialogOpen,
      };
    default:
      return state;
  }
}
