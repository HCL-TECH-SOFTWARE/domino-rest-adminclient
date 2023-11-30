/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import {
  TOGGLE_ALERT,
  AlertState,
  AlertActionTypes,
  CLOSE_SNACKBAR,
} from './types';

const initialState: AlertState = {
  visible: false,
  message: '',
  snackbarStatus: false,
  snackbarMessagE: '',
};

export default function alertReducer(
  state = initialState,
  action: AlertActionTypes
): AlertState {
  switch (action.type) {
    case TOGGLE_ALERT:
      return {
        ...state,
        visible: !state.visible,
        message: action.payload,
      };
    case CLOSE_SNACKBAR:
      return {
        ...state,
        visible: false,
        snackbarMessagE: '',
      };
    default:
      return state;
  }
}
