/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  ApplicationStates,
  AppProp,
  INIT_STATE,
  status,
} from './types';
import { toggleDeleteDialog } from '../dialog/reducer';

const initialState: ApplicationStates = {
  apps: [],
  status: false,
  appPull: false,
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
   * Two actions this slice reacts to are **not its own**.
   *
   * - `dialog/toggleDeleteDialog` — the delete dialog lives in the dialog slice and
   *   this reducer follows it, matching its generated action *object*. The duplicate
   *   `TOGGLE_DELETE_DIALOG` that used to be declared here as well is gone (#866); it
   *   was what made #840's regression invisible, since converting the dialog slice
   *   unhooked this one with no type error and no failing test.
   * - `INIT_STATE` — the cross-slice reset broadcast, matched literally because
   *   createSlice would namespace anything declared above.
   *
   * `SET_APP_ERROR` / `CLEAR_APP_ERROR` were here until #869, along with `appError`
   * and `appErrorMessage`. Nothing dispatched them: `setAppError` and both its call
   * sites had been commented out, and the only thing reaching those cases was
   * `databases`' `SET_DB_ERROR`, which shared the value until #866 renamed it — so
   * AppForm's "Error: Unable to save application" banner had only ever shown
   * *database* errors. Application failures report through `toggleAlert`.
   */
  extraReducers: (builder) => {
    builder
      .addCase(toggleDeleteDialog, (state) => {
        state.deleteDialogOpen = !state.deleteDialogOpen;
      })
      .addCase(INIT_STATE, () => initialState);
  },
});

export const { executing, getApps, addApp, dropUpdate, updateApp, deleteApp, setPulledApp } =
  appsSlice.actions;

export default appsSlice.reducer;
