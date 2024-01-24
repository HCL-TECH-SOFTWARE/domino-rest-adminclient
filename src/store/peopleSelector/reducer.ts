/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc                                   *
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
        draft.members.splice(memberIndex, 1);
      });
    // Remove All Members
    case REMOVE_ALL_MEMBERS:
      return produce(state, (draft: MembersState) => {
        const memberIndex = state.members.findIndex(
          (members) => members.id === action.payload
        );
        draft.members.splice(memberIndex, 1);
      });
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
