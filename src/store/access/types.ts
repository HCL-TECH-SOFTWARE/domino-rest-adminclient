/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

// Describing the shape of the User State
export interface UserState {
  users: Array<UserObject> | null;
}

export interface UserObject {
  [key: string]: User
}

export interface User {
  "@unid": string,
  FirstName: Array<string>,
  FullName: Array<string>,
  InternetAddress: Array<string>,
  LastName: Array<string>,
  MailAddress: Array<string>,
  MailDomain: Array<string>,
  MailFile: Array<string>,
  MailServer: Array<string>,
  MailSystem: Array<string>,
  MiddleInitial: Array<string>,
  ShortName: Array<string>,
  Suffix: Array<string>,
  Title: Array<string>,
  preferredLanguage: Array<string>,
}

// Describing the different ACTION NAMES available
export const SET_USERS = 'SET_USERS';
export const INIT_STATE = 'INIT_STATE';

interface SetUsers {
  type: typeof SET_USERS;
  payload: Array<UserObject>
}

interface InitUsersState {
  type: typeof INIT_STATE;
}

export type UserActionTypes = SetUsers | InitUsersState;
