/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createSlice } from '@reduxjs/toolkit';
import { INIT_STATE, type DrawerState } from './types';

const initialState: DrawerState = {
  visible: false,
  applicationDrawer: false,
  appFilterDrawer: false,
  quickConfigDrawer: false,
  consentsDrawer: false,
};

export const drawerSlice = createSlice({
  name: 'drawer',
  initialState,
  reducers: {
    toggleDrawer(state) {
      state.visible = !state.visible;
    },
    toggleApplicationDrawer(state) {
      state.applicationDrawer = !state.applicationDrawer;
    },
    toggleAppFilterDrawer(state) {
      state.appFilterDrawer = !state.appFilterDrawer;
    },
    toggleQuickConfigDrawer(state) {
      state.quickConfigDrawer = !state.quickConfigDrawer;
    },
    toggleConsentsDrawer(state) {
      state.consentsDrawer = !state.consentsDrawer;
    },
  },
  // See access/reducer.ts: INIT_STATE is a bare cross-slice broadcast, not one of
  // this slice's own actions, so it must be matched literally rather than declared
  // under `reducers` where createSlice would namespace it to `drawer/INIT_STATE`.
  extraReducers: (builder) => {
    builder.addCase(INIT_STATE, () => initialState);
  },
});

export const {
  toggleDrawer,
  toggleApplicationDrawer,
  toggleAppFilterDrawer,
  toggleQuickConfigDrawer,
  toggleConsentsDrawer,
} = drawerSlice.actions;

export default drawerSlice.reducer;
