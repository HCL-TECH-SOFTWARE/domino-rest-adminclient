/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc                                   *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * type.ts provides action types for the People Selector page
 *
 * @author Roopa HS
 * @author Mallisetty Subbaiah
 * @author Sudula Prakash
 */
// Action Name Constants
export const ADD_MEMBER = 'ADD_MEMBER';
export const REMOVE_MEMBER = 'REMOVE_MEMBER';
export const REMOVE_ALL_MEMBERS = 'REMOVE_ALL_MEMBERS';
export const FETCH_ALL_MEMBERS = 'FETCH_ALL_MEMBERS';
export const CLEAR_MEMBER_ERROR = 'CLEAR_MEMBER_ERROR';
export const TOGGLE_DELETE_DIALOG = 'TOGGLE_DELETE_DIALOG';

/**
 * Member state layout in Redux
 */
export interface MembersState {
  members: Array<any>;
  memeberError: boolean;
  memeberErrorMessage: string;
  drawerOpen: boolean;
  deleteDialogOpen: boolean;
}
export interface MemberRedux {
  id: string;
  fullName: string;
}
/**
 * Add as group member
 */
interface AddMember {
  type: typeof ADD_MEMBER;
  payload: object;
}
/**
 * Remove a member from group
 */
interface RemoveMember {
  type: typeof REMOVE_MEMBER;
  payload: string;
}
/**
 * Remove all members from group
 */
interface RemoveAllMembers {
  type: typeof REMOVE_ALL_MEMBERS;
  payload: any;
}

/**
 * Fetch a list of group members
 */
interface FetchAllMembers {
  type: typeof FETCH_ALL_MEMBERS;
  payload: any;
}
/**
 * After the Member list has been fetched from Keep, SaveMembersList
is called to update the Members state
 */
interface SaveMembersList {
  type: typeof FETCH_ALL_MEMBERS;
  payload: any;
}
/**
 * Delete dialog
 */
interface ToogleDeleteDialog {
  type: typeof TOGGLE_DELETE_DIALOG;
}

/**
 * Clear group member error
 */
interface ClearMemberError {
  type: typeof CLEAR_MEMBER_ERROR;
}

// Export Actions
export type GroupMembersActionTypes =
  | AddMember
  | RemoveMember
  | RemoveAllMembers
  | FetchAllMembers
  | SaveMembersList
  | ToogleDeleteDialog
  | ClearMemberError;
