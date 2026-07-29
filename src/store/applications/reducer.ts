/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  ApplicationStates,
  AppProp,
  CLEAR_APP_ERROR,
  INIT_STATE,
  SET_APP_ERROR,
  status,
} from './types';
import { toggleDeleteDialog } from '../dialog/reducer';

const initialState: ApplicationStates = {
  apps: [],
  status: false,
  appPull: false,
  appError: false,
  appErrorMessage: '',
  deleteDialogOpen: false,
};

export const appsSlice = createSlice({
  name: 'apps',
  initialState,
  reducers: {
    executing(state, action: PayloadAction<boolean>) {
      state.status = action.payload;
    },
    getApps(state, action: PayloadAction<AppProp[]>) {
      state.apps = action.payload;
    },
    addApp(state, action: PayloadAction<AppProp>) {
      state.apps.push(action.payload);
    },
    dropUpdate(
      state,
      action: PayloadAction<{ appId: string; destination: { droppableId: string } }>,
    ) {
      const { appId, destination } = action.payload;
      const app = state.apps.find((a) => a.appId === appId);
      if (app) app.appStatus = status[destination.droppableId as keyof typeof status];
    },
    updateApp(state, action: PayloadAction<AppProp>) {
      const index = state.apps.findIndex((a) => a.appId === action.payload.appId);
      if (index >= 0) state.apps[index] = action.payload;
    },
    deleteApp(state, action: PayloadAction<string>) {
      const index = state.apps.findIndex((a) => a.appId === action.payload);
      if (index >= 0) state.apps.splice(index, 1);
    },
    setPulledApp(state, action: PayloadAction<boolean>) {
      state.appPull = action.payload;
    },
  },
  /**
   * Three actions this slice reacts to are **not its own**, and all three are shared
   * by string rather than by import. They must be matched literally, because
   * createSlice would namespace anything declared above.
   *
   * - `dialog/toggleDeleteDialog` — `TOGGLE_DELETE_DIALOG` is declared in *both*
   *   `dialog/types.ts` and `applications/types.ts` with the same value, so one
   *   dispatch has always driven both reducers. #840 converted the dialog slice and
   *   silently stopped this one seeing it, which left DeleteApplicationDialog unable
   *   to open. The regression test in this PR is what would have caught it.
   * - `SET_APP_ERROR` / `CLEAR_APP_ERROR` — `databases/types.ts` declares
   *   `SET_DB_ERROR = 'SET_APP_ERROR'` and `CLEAR_DB_ERROR = 'CLEAR_APP_ERROR'`, so
   *   every database error also writes this slice's `appError`. Preserved rather
   *   than untangled: whether AppForm is *meant* to show database errors is a
   *   product question, not a migration one.
   */
  extraReducers: (builder) => {
    builder
      .addCase(toggleDeleteDialog, (state) => {
        state.deleteDialogOpen = !state.deleteDialogOpen;
      })
      .addCase(SET_APP_ERROR, (state, action: any) => {
        state.appError = true;
        state.appErrorMessage = action.payload;
      })
      .addCase(CLEAR_APP_ERROR, (state) => {
        state.appError = false;
        state.appErrorMessage = '';
      })
      .addCase(INIT_STATE, () => initialState);
  },
});

export const { executing, getApps, addApp, dropUpdate, updateApp, deleteApp, setPulledApp } =
  appsSlice.actions;

export default appsSlice.reducer;
