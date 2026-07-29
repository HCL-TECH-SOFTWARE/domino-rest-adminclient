/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { INIT_STATE, type Consent, type ConsentState } from './types';

const initialState: ConsentState = {
  consents: [],
  deleteConsentDialog: false,
  deleteUnid: '',
  appName: '',
  username: '',
  scope: '',
};

export const consentsSlice = createSlice({
  name: 'consents',
  initialState,
  reducers: {
    setConsents(state, action: PayloadAction<Consent[]>) {
      state.consents = action.payload;
    },
    deleteConsent(state, action: PayloadAction<Consent>) {
      state.consents = state.consents.filter(
        (consent: Consent) => consent.client_id !== action.payload.client_id,
      );
      state.deleteUnid = '';
    },
    toggleDeleteConsent(
      state,
      action: PayloadAction<{ unid: string; appName: string; username: string; scope: string }>,
    ) {
      state.deleteConsentDialog = !state.deleteConsentDialog;
      state.deleteUnid = action.payload.unid;
      state.appName = action.payload.appName;
      state.username = action.payload.username;
      state.scope = action.payload.scope;
    },
  },
  // See access/reducer.ts: a bare cross-slice broadcast, matched literally.
  extraReducers: (builder) => {
    builder.addCase(INIT_STATE, () => initialState);
  },
});

export const { setConsents, deleteConsent, toggleDeleteConsent } = consentsSlice.actions;

export default consentsSlice.reducer;
