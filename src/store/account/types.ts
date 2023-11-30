/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

export interface Credentials {
  username: string;
  password: string;
}

export interface TokenProps {
  bearer?: string;
  claims?: {
    iss: string;
    sub: string;
    permissions: Array<any>;
  };
  leeway?: number;
  expSeconds: number;
  issueDate: number;
}

export interface AccountState {
  navitems: {
	  apps: boolean;
    databases: boolean;
    groups: boolean;
    users: boolean;
  };

  authenticated: boolean;
  error: boolean;
  error401: boolean;
  token: string;
}

 export interface PageListObj {
  apps: boolean;
  databases: boolean;
  groups: boolean;
  users: boolean;
}

export const LOGIN = 'LOGIN';
export const LOGOUT = 'LOGOUT';
export const AUTHENTICATE = 'AUTHENTICATE';
export const REMOVE_AUTH = 'REMOVE_AUTH';
export const SET_TOKEN = 'SET_TOKEN';
export const SET_LOGIN_ERROR = 'SET_LOGIN_ERROR';
export const SET_401_ERROR = 'SET_401_ERROR';
export const RENEW_TOKEN = 'RENEW_TOKEN';
export const NAVITEMS = 'NAVITEMS';

interface LogIn {
  type: typeof LOGIN;
  // payload: Credentials;
}

interface AddNavitems {
  type: typeof NAVITEMS;
  payload: any;
}

interface SetLoginError {
  type: typeof SET_LOGIN_ERROR;
  payload: boolean;
}

interface SetError401 {
  type: typeof SET_401_ERROR;
  payload: boolean;
}

interface LogOut {
  type: typeof LOGOUT;
}

interface Authenticate {
  type: typeof AUTHENTICATE;
}

interface RemoveAuth {
  type: typeof REMOVE_AUTH;
}

interface SetToken {
  type: typeof SET_TOKEN;
  payload: string;
}

interface RenewToken {
  type: typeof RENEW_TOKEN;
  payload: string;
}

export type AccountActionTypes =
  | LogIn
  | LogOut
  | AddNavitems
  | SetLoginError
  | SetError401
  | Authenticate
  | RenewToken
  | SetToken
  | RemoveAuth;
