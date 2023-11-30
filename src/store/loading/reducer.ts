/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import {
  LoadingState,
  LoadingActionTypes,
  SET_VALUE,
  TOGGLE_DETAILS_LOADING,
  TOGGLE_CONSENTS_LOADING,
  TOGGLE_USERS_LOADING,
} from './types';

const initialState: LoadingState = {
  loading: {
    status: false,
    data: {
      message: 'Getting All Databases',
    },
  },
  detailsLoading: false,
  consentsLoading: false,
  usersLoading: false,
};

export default function loadingReducer(
  state = initialState,
  action: LoadingActionTypes
): LoadingState {
  switch (action.type) {
    case SET_VALUE:
      return {
        ...state,
        loading: action.payload,
      };
    case TOGGLE_DETAILS_LOADING:
      return {
        ...state,
        detailsLoading: !state.detailsLoading,
      };
    case TOGGLE_CONSENTS_LOADING:
      return {
        ...state,
        consentsLoading: !state.consentsLoading,
      }
    case TOGGLE_USERS_LOADING:
      return {
        ...state,
        usersLoading: !state.usersLoading,
      }
    default:
      return state;
  }
}
