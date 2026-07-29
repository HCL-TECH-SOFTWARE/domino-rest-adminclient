/* ========================================================================== *
 * Copyright (C) 2023, 2025 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

// State for one Application
export interface AppProp {
  appName: string;
  appDescription: string;
  appCallbackUrls: Array<string>;
  appContacts: Array<string>;
  appIcon: string;
  appId: string;
  appScope: string;
  appHasSecret: boolean;
  appSecret: string;
  appStartPage: string;
  appStatus: string;
  usePkce: boolean;
}

// State for all Applications
export interface ApplicationStates {
  apps: Array<any>;
  status: boolean;
  appPull: boolean;
  deleteDialogOpen: boolean;
}

// State for the Application Form
export interface AppFormProp {
  appId: string;
  appName: string;
  appDescription: string;
  appStatus: boolean;
  appCallbackUrlsStr: string;
  appContactsStr: string;
  appHasSecret: boolean;
  appSecret: string;
  appStartPage: string;
  appScope: string;
  appIcon: string;
  usePkce: boolean;
}

// Describing the different ACTION NAMES available
export const GET_APPS = 'GET_APPS';
export const DROP_UPDATE = 'UPDATE_APPS';
export const UPDATE_APP = 'UPDATE_APP';
export const ADD_APP = 'ADD_APP';
export const SET_PULLED_APP = 'SET_PULLED_APP';
export const DELETE_APP = 'DELETE_APP';
export const EXECUTING = 'EXECUTING';
// `TOGGLE_DELETE_DIALOG` was declared here too, with the same value as the one in
// `dialog/types.ts`, so one dispatch drove both reducers. That is what made #840's
// regression invisible — converting the dialog slice unhooked this one, silently. The
// dialog slice owns it; this reducer matches its generated action *object* (#866).
//
// `SET_APP_ERROR` / `CLEAR_APP_ERROR` are gone too (#869). Nothing ever dispatched them:
// `setAppError` and both its call sites had been commented out, and the only thing that
// reached the reducer case was `databases`' `SET_DB_ERROR`, which shared the value until
// #866 renamed it. Application failures report through `toggleAlert`.
export const INIT_STATE = 'INIT_STATE';

export const status = ['Requested', 'Active', 'Approved', 'Inactive'];

interface GetApps {
  type: typeof GET_APPS;
  payload: any;
}

interface AddApp {
  type: typeof ADD_APP;
  payload: object;
}

interface UpdateApp {
  type: typeof UPDATE_APP;
  payload: any;
}

interface DeleteApp {
  type: typeof DELETE_APP;
  payload: string;
}

interface Deleting {
  type: typeof EXECUTING;
  payload: boolean;
}

interface DropUpdate {
  type: typeof DROP_UPDATE;
  payload: {
    appId: string;
    destination: {
      droppableId: number;
      index: number;
      data: object;
    };
  };
}

interface SetPullApp {
  type: typeof SET_PULLED_APP;
  payload: boolean;
}


/**
 * Init state
 */
interface InitState {
  type: typeof INIT_STATE;
}

export type AppsActionTypes =
  | GetApps
  | DropUpdate
  | DeleteApp
  | SetPullApp
  | Deleting
  | AddApp
  | UpdateApp
  | InitState;
