/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import {
  DialogActionTypes,
  DialogStates,
  SET_API_LOADING,
  TOGGLE_DELETE_DIALOG,
  INIT_STATE,
  TOGGLE_ERROR_DIALOG,
  TOGGLE_RESET_VIEW_DIALOG,
} from './types';

const initialState: DialogStates = {
  deleteDialog: false,
  errorDialogOpen: false,
  errorDialogMessage: "",
  loading: false,
  resetViewDialog: false,
};

export default function dialogReducer(
  state = initialState,
  action: DialogActionTypes
): DialogStates {
  switch (action.type) {
    case SET_API_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    case TOGGLE_DELETE_DIALOG:
      return {
        ...state,
        deleteDialog: !state.deleteDialog,
      };
    case TOGGLE_ERROR_DIALOG:
      return {
        ...state,
        errorDialogOpen: !state.errorDialogOpen,
        errorDialogMessage: action.payload,
      };
    case INIT_STATE:
      return {
        ...initialState
      };
    case TOGGLE_RESET_VIEW_DIALOG:
      return {
        ...state,
        resetViewDialog: action.payload,
      };
    default:
      return state;
  }
}
