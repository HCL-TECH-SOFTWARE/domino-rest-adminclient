/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

// Describing the shape of the Databases's slice of state

export interface DialogStates {
  deleteDialog: boolean;
  errorDialogOpen: boolean;
  errorDialogMessage: string;
  loading: boolean;
  resetViewDialog: boolean;
}
//   Describing the different ACTION NAMES available
export const TOGGLE_DELETE_DIALOG = 'TOGGLE_DELETE_DIALOG';
export const SET_API_LOADING = 'SET_API_LOADING';
export const INIT_STATE = 'INIT_STATE';
export const TOGGLE_ERROR_DIALOG = 'TOGGLE_ERROR_DIALOG';
export const TOGGLE_RESET_VIEW_DIALOG = 'TOGGLE_RESET_VIEW_DIALOG';

interface ToggleDeleteDialog {
  type: typeof TOGGLE_DELETE_DIALOG;
}
interface SetApiLoading {
  type: typeof SET_API_LOADING;
  payload: boolean;
}
interface InitState {
  type: typeof INIT_STATE;
}

interface ToggleErrorDialog {
  type: typeof TOGGLE_ERROR_DIALOG;
  payload: string;
}

interface ToggleResetViewDialog {
  type: typeof TOGGLE_RESET_VIEW_DIALOG;
  payload: boolean;
}

export type DialogActionTypes = ToggleDeleteDialog | SetApiLoading | InitState | ToggleErrorDialog | ToggleResetViewDialog ;
