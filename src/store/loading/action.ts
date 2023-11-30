/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { SET_VALUE, LoadingProps, TOGGLE_CONSENTS_LOADING, TOGGLE_USERS_LOADING } from './types';

export function setLoading(value: LoadingProps) {
  return {
    type: SET_VALUE,
    payload: value,
  };
}

export function toggleConsentsLoading() {
  return {
    type: TOGGLE_CONSENTS_LOADING,
  };
}

export function toggleUsersLoading() {
  return {
    type: TOGGLE_USERS_LOADING,
  };
}
