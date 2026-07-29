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
  appError: boolean;
  appErrorMessage: string;
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
export const SET_APP_ERROR = 'SET_APP_ERROR';
export const CLEAR_APP_ERROR = 'CLEAR_APP_ERROR';
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
 * Store an Application error for display in the UI
 */
interface SetAppError {
  type: typeof SET_APP_ERROR;
  payload: string;
}

/**
 * Clear an Application error
 */
interface ClearAppError {
  type: typeof CLEAR_APP_ERROR;
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
  | SetAppError
  | InitState
  | ClearAppError;
