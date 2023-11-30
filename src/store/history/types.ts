/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

// Describing the shape of the Databases's slice of state
export interface KeepHistory {
  uri: string;
  label: string;
}

export interface HistoryState {
  histories: KeepHistory[];
}

// Describing the different ACTION NAMES available
export const ADD_HISTORY = 'ADD_HISTORY';

interface AddHistory {
  type: typeof ADD_HISTORY;
  payload: KeepHistory;
}

export type KeepHistoryActionTypes = AddHistory;
