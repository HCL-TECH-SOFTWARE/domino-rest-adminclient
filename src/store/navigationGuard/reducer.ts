/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { INIT_STATE, type NavigationGuardState } from './types';

const initialState: NavigationGuardState = { isDirty: false, pendingPath: null };

export const navigationGuardSlice = createSlice({
  name: 'navigationGuard',
  initialState,
  reducers: {
    /** The editing screen reporting whether it has work that would be lost. */
    setNavigationDirty(state, action: PayloadAction<boolean>) {
      state.isDirty = action.payload;
    },

    /**
     * Hold a navigation and put the dialog up.
     *
     * Only ever dispatched once the guard has established that the screen is dirty —
     * blocking a clean navigation would strand the user behind a dialog they cannot
     * answer usefully.
     */
    blockNavigation(state, action: PayloadAction<string>) {
      state.pendingPath = action.payload;
    },

    /** The user chose to stay. The screen keeps its unsaved work, so `isDirty` stands. */
    cancelNavigation(state) {
      state.pendingPath = null;
    },

    /**
     * The user chose to leave — having saved, or having discarded.
     *
     * Both fields in one action rather than two dispatches: this is a single transition,
     * and a store that is briefly "clean but still holding a navigation" is a state no
     * subscriber should ever be able to observe. Clearing `isDirty` is what stops the
     * guard blocking the very navigation it is about to perform.
     */
    allowNavigation() {
      return initialState;
    },
  },

  // See access/reducer.ts: INIT_STATE is not this slice's action but a bare 'INIT_STATE'
  // broadcast that several slices reset on, so it has to be matched as the literal type it
  // is. Declaring it under `reducers` would namespace it to 'navigationGuard/INIT_STATE',
  // which compiles, passes a naive test, and silently never fires.
  //
  // It is dispatched from one place — `logout()` in account/action.ts — and the reset is
  // right there: the session that owned the unsaved work is gone, so a guard still holding
  // a dirty flag would block the next user's first navigation with a dialog whose Save
  // button would call a function belonging to an unmounted screen.
  extraReducers: (builder) => {
    builder.addCase(INIT_STATE, () => initialState);
  },
});

export const { setNavigationDirty, blockNavigation, cancelNavigation, allowNavigation } =
  navigationGuardSlice.actions;

export default navigationGuardSlice.reducer;
