/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc                                   *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * type.ts provides action types for the People page
 *
 * @author Roopa HS
 * @author Mallisetty Subbaiah
 * @author Sudula Prakash
 */
// Action Name Constants
export const ADD_USER = 'ADD_USER';
export const FETCH_ALL_USERS = 'FETCH_ALL_USERS';
export const DELETE_USER = 'DELETE_USER';
export const UPDATE_USER = 'UPDATE_USER';
export const CLEAR_PEOPLE_ERROR = 'CLEAR_PEOPLE_ERROR';
export const TOGGLE_DELETE_DIALOG = 'TOGGLE_DELETE_DIALOG';

/**
 * People state layout in Redux
 */
export interface PeopleState {
  peoples: Array<any>;
  peopleError: boolean;
  peopleErrorMessage: string;
  drawerOpen: boolean;
  deleteDialogOpen: boolean;
}

/**
 * People Database values
 */
export interface PeopleDB {
  Form: string;
  Type: string;
  FirstName: string;
  LastName: string;
  ShortName: string;
  password: string;
  CompanyName: string;
  PhoneNumber: string;
  InternetAddress: string;
  MailAddress: string;
  Owner: string;
}

export interface PeopleRedux {
  id: string;
  firstName: string;
  lastName: string;
  shortName: string;
  companyName: string;
  password: string;
  phoneNumber: string;
  internetAddress: string;
  mailAddress: string;
}

/**
 * Create a People
 */
interface AddUser {
  type: typeof ADD_USER;
  payload: object;
}
/**
 * Fetch a list of People
 */
interface FetchAvailableUsers {
  type: typeof FETCH_ALL_USERS;
  payload: any;
}
/**
 * Delete a People
 */
interface DeleteUser {
  type: typeof DELETE_USER;
  payload: string;
}
/**
 * Update a People
 */
interface UpdateUser {
  type: typeof UPDATE_USER;
  payload: any;
}
interface ToogleDeleteDialog {
  type: typeof TOGGLE_DELETE_DIALOG;
}
/**
 * After the People list has been fetched from Keep, SavePeoplesList
is called to update the People state
 */
interface SavePeoplesList {
  type: typeof FETCH_ALL_USERS;
  payload: any;
}

/**
 * Clear people error
 */
interface ClearPeopleError {
  type: typeof CLEAR_PEOPLE_ERROR;
}

// Export Actions
export type PeopleActionTypes =
  | AddUser
  | FetchAvailableUsers
  | DeleteUser
  | UpdateUser
  | ToogleDeleteDialog
  | ClearPeopleError
  | SavePeoplesList;
