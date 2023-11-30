/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

// Describing the shape of the Databases's slice of state
export interface LoadingProps {
  status: boolean;
  data?: {
    message: string;
  };
}

export interface LoadingState {
  loading: LoadingProps;
  detailsLoading: boolean;
  consentsLoading: boolean;
  usersLoading: boolean;
}
//   Describing the different ACTION NAMES available
export const SET_VALUE = 'SET_VALUE';
export const TOGGLE_DETAILS_LOADING = 'TOGGLE_DETAILS_LOADING';
export const TOGGLE_CONSENTS_LOADING = 'TOGGLE_CONSENTS_LOADING';
export const TOGGLE_USERS_LOADING = 'TOGGLE_USERS_LOADING';

interface SetValue {
  type: typeof SET_VALUE;
  payload: LoadingProps;
}

interface ToggleDetailsLoading {
  type: typeof TOGGLE_DETAILS_LOADING;
}

interface ToggleConsentsLoading {
  type: typeof TOGGLE_CONSENTS_LOADING;
}

interface ToggleUsersLoading {
  type: typeof TOGGLE_USERS_LOADING;
}

export type LoadingActionTypes = SetValue | ToggleDetailsLoading | ToggleConsentsLoading | ToggleUsersLoading;
