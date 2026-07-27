/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * `visible`/`message` drive `components/alerts/Notification.tsx`, the app's one alert.
 *
 * `snackbarStatus`/`snackbarMessagE` used to sit here for `SnackbarToaster`, and both were
 * dead twice over (#707): no reducer case ever wrote `snackbarStatus`, so its `<Snackbar>`
 * could never open, and the component's only mount site was inside a branch of `Header.tsx`
 * that could never render. Both are gone.
 */
export interface AlertState {
  visible: boolean;
  message: string;
}
export const TOGGLE_ALERT = 'TOGGLE_ALERT';
export const CLOSE_SNACKBAR = 'CLOSE_SNACKBAR';

interface ToggleAlert {
  type: typeof TOGGLE_ALERT;
  payload: string;
}

interface CloseSnackbar {
  type: typeof CLOSE_SNACKBAR;
}

export type AlertActionTypes = ToggleAlert | CloseSnackbar;
