/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

// Describing the shape of the Databases's slice of state
export interface SettingProps {
  database: {};
}

export interface SettingState {
  loading: SettingProps;
  detailsLoading: boolean;
}
//   Describing the different ACTION NAMES available
export const SET_VALUE = 'SET_VALUE';

export const TOGGLE_DETAILS_LOADING = 'TOGGLE_DETAILS_LOADING';

interface SetSet {
  type: typeof SET_VALUE;
}

interface ToggleDetailsLoading {
  type: typeof TOGGLE_DETAILS_LOADING;
}

export type LoadingActionTypes = ToggleDetailsLoading;
