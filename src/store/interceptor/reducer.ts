/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { InterceptorState, IResponseProp } from './types';

const initialState: InterceptorState = {
  response: {
    status: 200,
    statusText: '',
  },
};

export const interceptorSlice = createSlice({
  name: 'interceptor',
  initialState,
  reducers: {
    setCallStatus(state, action: PayloadAction<IResponseProp>) {
      state.response = action.payload;
    },
  },
});

export const { setCallStatus } = interceptorSlice.actions;

export default interceptorSlice.reducer;
