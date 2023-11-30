/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

// Describing the shape of the Databases's slice of state
export interface DBSettingDialogState {
  visible: boolean;
}
// Describing the different ACTION NAMES available
export const TOGGLE_DBSETTING_DIALOG = 'TOGGLE_DBSETTING_DIALOG';

interface ToggleDialog {
  type: typeof TOGGLE_DBSETTING_DIALOG;
}

export type DBSettingActionTypes = ToggleDialog;
