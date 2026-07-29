/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { searchSlice } from './reducer';

/** Shape of the search slice of state. */
export interface SearchState {
  show: boolean;
}

/**
 * Back-compat aliases for the hand-written action-type constants (#710).
 *
 * `createSlice` derives its own type strings — `search/toggleSearch` and
 * `search/closeSearch`. See the longer note in `dbsettings/types.ts`: these exist for one
 * commit, to let the reducer test dispatch unchanged and prove parity, and are deleted
 * with it.
 */
export const TOGGLE_SEARCH = searchSlice.actions.toggleSearch.type;
export const CLOSE_SEARCH = searchSlice.actions.closeSearch.type;
