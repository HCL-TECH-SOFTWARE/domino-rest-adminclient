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
   * - `dialog/toggleDeleteDialog` — the delete dialog lives in the dialog slice and
   *   this reducer follows it, matching its generated action *object*. The duplicate
   *   `TOGGLE_DELETE_DIALOG` that used to be declared here as well is gone (#866); it
   *   was what made #840's regression invisible, since converting the dialog slice
   *   unhooked this one with no type error and no failing test.
   * - `SET_APP_ERROR` / `CLEAR_APP_ERROR` — this slice's own, and no longer shared:
   *   `databases/types.ts` used to declare `SET_DB_ERROR = 'SET_APP_ERROR'`, so every
   *   database error wrote `appError` too. #866 untangled that.
   *
   *   ⚠️ **Nothing sets `appError` any more, and nothing did directly before.**
   *   `setAppError` and both its dispatch sites are commented out in `action.ts`
   *   (`:126`, `:128`, `:328`) — application failures report through `toggleAlert`
   *   instead. The collision was the only thing ever setting this field, so
   *   `AppForm.tsx:149`'s "Error: Unable to save application" banner has only ever
   *   displayed *database* errors, and now displays nothing. Left standing rather
   *   than deleted: removing a visible banner is a product call in a `track:views`
   *   file, and it is filed separately.
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
