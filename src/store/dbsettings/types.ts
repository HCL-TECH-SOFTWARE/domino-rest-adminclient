/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { dbSettingSlice } from './reducer';

/** Shape of the database-settings dialog slice of state. */
export interface DBSettingDialogState {
  visible: boolean;
}

/**
 * Back-compat alias for the hand-written action-type constant (#710).
 *
 * `createSlice` derives its own type string — `dbSetting/toggleSettings` — so this no
 * longer holds the literal it used to. Nothing under `src/` ever read it; it is kept for
 * exactly one commit so the existing reducer test can dispatch
 * `{ type: TOGGLE_DBSETTING_DIALOG }` unchanged and prove parity, and is deleted with the
 * test that needs it.
 *
 * `reducer.ts` imports this module for a *type* only, and type imports are erased, so the
 * runtime module graph stays one-directional.
 */
export const TOGGLE_DBSETTING_DIALOG = dbSettingSlice.actions.toggleSettings.type;
