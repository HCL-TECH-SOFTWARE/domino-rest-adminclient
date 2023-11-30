/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { TOGGLE_DELETE_DIALOG, SET_API_LOADING, TOGGLE_ERROR_DIALOG, TOGGLE_RESET_VIEW_DIALOG } from './types';

export function toggleDeleteDialog() {
  return {
    type: TOGGLE_DELETE_DIALOG,
  };
}

export function toggleErrorDialog(errorMessage: string) {
  return {
    type: TOGGLE_ERROR_DIALOG,
    payload: errorMessage,
  };
}

export function setApiLoading(value: boolean) {
  return {
    type: SET_API_LOADING,
    payload: value,
  };
}

export function toggleResetViewDialog(value: boolean) {
  return {
    type: TOGGLE_RESET_VIEW_DIALOG,
    payload: value
  }
}