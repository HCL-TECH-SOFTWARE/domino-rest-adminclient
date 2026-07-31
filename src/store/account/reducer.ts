/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AccountState, IdP, PageListObj } from './types';

const initialState: AccountState = {
  navitems: {
    databases: false,
    apps: false,
  },
  authenticated: false,
  error: false,
  error401: false,
  errorMessage: '',
  idpLogin: false,
  currentIdp: {
    name: '',
    wellKnown: '',
    adminui_config: {
      active: false,
      client_id: '',
      scope: [],
    },
  },
};

export const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    // login/authenticate and logout/removeAuth are pairs of synonyms: each pair
    // had two action types doing the same thing, dispatched from different places.
    // Preserved as four actions rather than collapsed, because collapsing them
    // changes which names callers import — a separate decision from #710.
    login(state) {
      state.authenticated = true;
    },
    authenticate(state) {
      state.authenticated = true;
    },
    logout(state) {
      state.authenticated = false;
    },
    removeAuth(state) {
      state.authenticated = false;
    },
    setNavItems(state, action: PayloadAction<PageListObj>) {
      state.navitems = action.payload;
    },
    setLoginError(state, action: PayloadAction<boolean>) {
      state.error = action.payload;
    },
    set401Error(state, action: PayloadAction<boolean>) {
      state.error401 = action.payload;
    },
    setErrorMessage(state, action: PayloadAction<string>) {
      state.errorMessage = action.payload;
    },
    setIdpLogin(state, action: PayloadAction<boolean>) {
      state.idpLogin = action.payload;
    },
    setCurrentIdp(state, action: PayloadAction<IdP>) {
      state.currentIdp = action.payload;
    },
  },
});

export const {
  login,
  authenticate,
  logout,
  removeAuth,
  setNavItems,
  setLoginError,
  set401Error,
  setErrorMessage,
  setIdpLogin,
  setCurrentIdp,
} = accountSlice.actions;

export default accountSlice.reducer;
