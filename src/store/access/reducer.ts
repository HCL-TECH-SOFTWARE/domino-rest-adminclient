/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { INIT_STATE, type UserState } from './types';

const initialState: UserState = {
  users: null,
};

export const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setUsers(state, action: PayloadAction<UserState['users']>) {
      state.users = action.payload;
    },
  },
  // INIT_STATE is not this slice's action. It is a bare 'INIT_STATE' broadcast —
  // dispatched by databases, consents and applications — that six slices reset on.
  // createSlice namespaces everything declared under `reducers` as `users/…`, so
  // handling it there would compile, pass a naive test, and silently stop resetting.
  // It has to be matched as the literal type it is.
  extraReducers: (builder) => {
    builder.addCase(INIT_STATE, () => initialState);
  },
});

export const { setUsers } = usersSlice.actions;

export default usersSlice.reducer;
