/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createSlice } from '@reduxjs/toolkit';
import type { SearchState } from './types';

const initialState: SearchState = {
  show: false,
};

export const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    toggleSearch(state) {
      state.show = !state.show;
    },
    closeSearch(state) {
      state.show = false;
    },
  },
});

export const { toggleSearch, closeSearch } = searchSlice.actions;

export default searchSlice.reducer;
