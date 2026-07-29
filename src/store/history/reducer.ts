/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { HistoryState, KeepHistory } from './types';

const initialState: HistoryState = {
  histories: [
    { uri: '/', label: 'HCL Notes Admin' },
    { uri: 'server', label: 'Server' },
    { uri: 'keep-api', label: 'HCL Domino REST API' },
  ],
};

export const historySlice = createSlice({
  name: 'histories',
  initialState,
  reducers: {
    addHistory(state, action: PayloadAction<KeepHistory>) {
      state.histories.push(action.payload);
    },
  },
});

export const { addHistory } = historySlice.actions;

export default historySlice.reducer;
