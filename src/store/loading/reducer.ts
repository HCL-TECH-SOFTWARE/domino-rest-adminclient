/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { LoadingProps, LoadingState } from './types';

const initialState: LoadingState = {
  loading: {
    status: false,
    data: {
      message: 'Getting All Databases',
    },
  },
  detailsLoading: false,
  consentsLoading: false,
  usersLoading: false,
};

export const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<LoadingProps>) {
      state.loading = action.payload;
    },
    toggleDetailsLoading(state) {
      state.detailsLoading = !state.detailsLoading;
    },
    toggleConsentsLoading(state) {
      state.consentsLoading = !state.consentsLoading;
    },
    toggleUsersLoading(state) {
      state.usersLoading = !state.usersLoading;
    },
  },
});

export const { setLoading, toggleDetailsLoading, toggleConsentsLoading, toggleUsersLoading } =
  loadingSlice.actions;

export default loadingSlice.reducer;
