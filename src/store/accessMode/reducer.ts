/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuid } from 'uuid';
import { INIT_STATE, type AccessModeState } from './types';

/** One empty column under a fresh droppable id — what `useState({ [uuid()]: [] })` gave. */
const emptyColumn = (id: string): AccessModeState['fields'] => ({ [id]: [] });

/**
 * The id is generated once, at module load, rather than left absent.
 *
 * A `useState` initialiser runs per mount; a slice is created once per page load, so the
 * two only line up if the screen resets the slice when it mounts — which `AccessMode.tsx`
 * does. What that reset cannot cover is the *first* render, before its effect has run, and
 * every consumer reads the map as `Object.keys(fields)[0]`. An empty map makes that
 * `undefined`, and `fields[undefined]` is what would then be spread, indexed and mapped.
 * Starting with one empty column means the shape is valid from the first frame.
 */
const initialState: AccessModeState = { fields: emptyColumn(uuid()) };

export const accessModeSlice = createSlice({
  name: 'accessMode',
  initialState,
  reducers: {
    /**
     * Replace the whole map. This is the old context's `setState`, and the call sites pass
     * the same object literals they always did.
     */
    setAccessFields(state, action: PayloadAction<AccessModeState['fields']>) {
      state.fields = action.payload;
    },

    /**
     * Back to one empty column under a *new* id.
     *
     * The uuid comes from `prepare` rather than the reducer body: a reducer has to be a
     * pure function of its arguments, and `uuid()` inside one would make replaying an
     * action produce a different state than it did the first time. `prepare` is where
     * Redux Toolkit puts exactly this.
     */
    resetAccessFields: {
      reducer(state, action: PayloadAction<string>) {
        state.fields = emptyColumn(action.payload);
      },
      prepare: () => ({ payload: uuid() }),
    },
  },

  // See access/reducer.ts: INIT_STATE is not this slice's action but a bare 'INIT_STATE'
  // broadcast that several slices reset on, so it has to be matched as the literal type it
  // is. Declaring it under `reducers` would namespace it to 'accessMode/INIT_STATE', which
  // compiles, passes a naive test, and silently never fires.
  extraReducers: (builder) => {
    builder.addCase(INIT_STATE, () => initialState);
  },
});

export const { setAccessFields, resetAccessFields } = accessModeSlice.actions;

export default accessModeSlice.reducer;
