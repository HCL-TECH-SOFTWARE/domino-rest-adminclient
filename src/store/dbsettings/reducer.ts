/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createSlice } from '@reduxjs/toolkit';
import type { DBSettingDialogState } from './types';

const initialState: DBSettingDialogState = {
  visible: false,
};

export const dbSettingSlice = createSlice({
  name: 'dbSetting',
  initialState,
  reducers: {
    toggleSettings(state) {
      state.visible = !state.visible;
    },
  },
});

export const { toggleSettings } = dbSettingSlice.actions;

export default dbSettingSlice.reducer;
