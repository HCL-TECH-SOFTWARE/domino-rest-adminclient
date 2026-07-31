/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AlertState } from './types';

const initialState: AlertState = {
  visible: false,
  message: '',
};

export const alertSlice = createSlice({
  name: 'alert',
  initialState,
  reducers: {
    // `visible: true`, not `!state.visible`. The name says toggle, but every one
    // of its 100-odd call sites means "show this message" — nothing dispatches it
    // to dismiss. Notification auto-hides after 3s via closeSnackbar, so a second
    // alert raised inside that window used to flip visible back to false: the new
    // message was stored, the alert closed, and the user saw neither (#792).
    toggleAlert(state, action: PayloadAction<string>) {
      state.visible = true;
      state.message = action.payload;
    },
    // The message is deliberately left alone: Notification reads it while it
    // animates out, so clearing it here would blank the text mid-transition.
    closeSnackbar(state) {
      state.visible = false;
    },
  },
});

export const { toggleAlert, closeSnackbar } = alertSlice.actions;

export default alertSlice.reducer;
