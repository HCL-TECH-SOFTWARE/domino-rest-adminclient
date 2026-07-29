/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { INIT_STATE, type DialogStates } from './types';

const initialState: DialogStates = {
  deleteDialog: false,
  errorDialogOpen: false,
  errorDialogMessage: '',
  loading: false,
  resetViewDialog: false,
};

export const dialogSlice = createSlice({
  name: 'dialog',
  initialState,
  reducers: {
    setApiLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    toggleDeleteDialog(state) {
      state.deleteDialog = !state.deleteDialog;
    },
    toggleErrorDialog(state, action: PayloadAction<string>) {
      state.errorDialogOpen = !state.errorDialogOpen;
      state.errorDialogMessage = action.payload;
    },
    toggleResetViewDialog(state, action: PayloadAction<boolean>) {
      state.resetViewDialog = action.payload;
    },
  },
  // See access/reducer.ts: a bare cross-slice broadcast, matched literally.
  extraReducers: (builder) => {
    builder.addCase(INIT_STATE, () => initialState);
  },
});

export const { setApiLoading, toggleDeleteDialog, toggleErrorDialog, toggleResetViewDialog } =
  dialogSlice.actions;

export default dialogSlice.reducer;
