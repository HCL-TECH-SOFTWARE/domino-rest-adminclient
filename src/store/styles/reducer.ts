/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { StylesState } from './types';

const theme = localStorage.getItem('theme') || 'default';

const initialState: StylesState = {
  databaseSize: 100,
  accessModeFullscreen: false,
  isMobile: false,
  themeMode: theme,
};

export const stylesSlice = createSlice({
  name: 'styles',
  initialState,
  reducers: {
    adjustDatabaseStyle(state, action: PayloadAction<number>) {
      state.databaseSize = action.payload;
    },
    toggleFullscreen(state) {
      state.accessModeFullscreen = !state.accessModeFullscreen;
    },
    // Sets rather than toggles, and there is nothing that clears it: the viewport
    // is read once at startup. Preserved as-is; changing it is not this issue's job.
    setViewport(state) {
      state.isMobile = true;
    },
    switchTheme(state, action: PayloadAction<string>) {
      state.themeMode = action.payload;
    },
  },
});

export const { adjustDatabaseStyle, toggleFullscreen, setViewport, switchTheme } =
  stylesSlice.actions;

export default stylesSlice.reducer;
