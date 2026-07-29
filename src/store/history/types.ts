/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { historySlice } from './reducer';

/** One breadcrumb entry. */
export interface KeepHistory {
  uri: string;
  label: string;
}

/** Shape of the breadcrumb-history slice of state. */
export interface HistoryState {
  histories: KeepHistory[];
}

/**
 * Back-compat alias for the hand-written action-type constant (#710).
 *
 * `createSlice` derives its own type string — `histories/addHistory`. See the longer note
 * in `dbsettings/types.ts`: this exists for one commit, to let the reducer test dispatch
 * unchanged and prove parity, and is deleted with it.
 */
export const ADD_HISTORY = historySlice.actions.addHistory.type;
