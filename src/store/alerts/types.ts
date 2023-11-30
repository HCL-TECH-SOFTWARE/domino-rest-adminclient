/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

export interface AlertState {
  visible: boolean;
  message: string;
  snackbarStatus: boolean;
  snackbarMessagE: string;
}
export const TOGGLE_ALERT = 'TOGGLE_ALERT';
export const CLOSE_SNACKBAR = 'CLOSE_SNACKBAR';

interface ToggleAlert {
  type: typeof TOGGLE_ALERT;
  payload: string;
}

interface CloseSnackbar {
  type: typeof CLOSE_SNACKBAR;
  payload: string;
}

export type AlertActionTypes = ToggleAlert | CloseSnackbar;
