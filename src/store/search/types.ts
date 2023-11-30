/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

// Describing the shape of the Databases's slice of state

export interface SearchState {
  show: boolean;
}

export const TOGGLE_SEARCH = 'TOGGLE_SEARCH';
export const CLOSE_SEARCH = 'CLOSE_SEARCH';

interface ToggleSearch {
  type: typeof TOGGLE_SEARCH;
}

interface CloseSearch {
  type: typeof CLOSE_SEARCH;
}

export type SearchActionTypes = ToggleSearch | CloseSearch;
