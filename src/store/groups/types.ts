/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * type.ts provides action types for the Groups page
 *
 * @author Neil Schultz
 */

// Action Name Constants
export const FETCH_GROUPS = 'FETCH_GROUPS';
export const CREATE_GROUP = 'CREATE_GROUP';
export const UPDATE_GROUP = 'UPDATE_GROUP';
export const DELETE_GROUP = 'DELETE_GROUP';
export const CLEAR_GROUP_ERROR = 'CLEAR_PEOPLE_ERROR';

/**
 * Groups state layout in Redux
 */
export interface GroupsState {
  groups: Array<any>;
  groupsError: boolean;
  groupsErrorMessage: string;
  drawerOpen: boolean;
}

/**
 * Group form values
 */
export interface GroupProp {
  groupId: string;
  groupName: string;
  groupCategory: string;
  groupDescription: string;
  groupMembers: Array<string>;
}

/**
 * Group Database values
 */
export interface GroupDB {
  Form: string;
  Type: string;
  ListName: string;
  ListCategory?: string;
  ListDescription?: string;
  ListOwner: string;
  Members: Array<string>;
}

/**
 * Group Redux values
 */
export interface GroupRedux {
  id: string;
  groupName: string;
  groupCategory?: string;
  groupDescription?: string;
}

/**
 * Fetch a list of Groups
 */
interface FetchGroups {
  type: typeof FETCH_GROUPS;
  payload: any;
}

/**
 * Create a Group
 */
interface CreateGroup {
  type: typeof CREATE_GROUP;
  payload: object;
}

/**
 * Update a Group
 */
interface UpdateGroup {
  type: typeof UPDATE_GROUP;
  payload: any;
}

/**
 * Delete a Group
 */
interface DeleteGroup {
  type: typeof DELETE_GROUP;
  payload: string;
}

/**
 * After the Groups list has been fetched fron Keep, SaveGroupsList
 * is called to update the Groups state
 */
interface SaveGroupsList {
  type: typeof FETCH_GROUPS;
  payload: any;
}

/**
 * Clear group error
 */
interface ClearGroupError {
  type: typeof CLEAR_GROUP_ERROR;
}

// Export Actions
export type GroupsActionTypes =
  | FetchGroups
  | CreateGroup
  | UpdateGroup
  | DeleteGroup
  | SaveGroupsList
  | ClearGroupError;
