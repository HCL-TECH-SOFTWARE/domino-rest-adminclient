/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
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
};

export default function alertReducer(
  state = initialState,
  action: AlertActionTypes
): AlertState {
  switch (action.type) {
    case TOGGLE_ALERT:
      // `visible: true`, not `!state.visible`. The name says toggle, but every one
      // of its 100-odd call sites means "show this message" — nothing dispatches it
      // to dismiss. Notification auto-hides after 3s via CLOSE_SNACKBAR, so a second
      // alert raised inside that window used to flip visible back to false: the new
      // message was stored, the alert closed, and the user saw neither (#792).
      return {
        ...state,
        visible: true,
        message: action.payload,
      };
    case CLOSE_SNACKBAR:
      return {
        ...state,
        visible: false,
      };
    default:
      return state;
  }
}
