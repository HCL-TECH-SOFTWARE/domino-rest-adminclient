/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoginPage from './components/login/LoginPage';
import AppShell from './AppShell';
import { AppState } from './store';
import {
  authenticate,
  renewToken,
  removeAuth,
  setIdpLogin,
} from './store/account/action';
import PageLoading from './components/loaders/PageLoading';
import { TokenProps } from './store/account/types';
import CallbackPage from './components/login/CallbackPage';
import { useAppDispatch } from './store/hooks';

const App: React.FC = () => {
  const [valid, setValid] = useState(false);
  const dispatch = useAppDispatch();

  const { authenticated } = useSelector((state: AppState) => state.account);

  useEffect(() => {
    // Get JWT Token from Browser Local Storage
    const jwtToken = localStorage.getItem('user_token');

    // Check if Token is present in the browser
    setValid(true);

    if (jwtToken) {
      try {
        const parsedToken = JSON.parse(jwtToken);
        // Set IDP login flag to true if token contains "access_token"
        const idpLogin = !!parsedToken.access_token;
        if (idpLogin) dispatch(setIdpLogin(true));

        const { issueDate, expSeconds } = parsedToken as TokenProps;

        const storageToken = new Date(issueDate).getTime() + 1000 * expSeconds;
        const storageTokenTime = new Date(storageToken).getTime();
        const today = new Date().getTime();

        dispatch(authenticate());
        if ((today < storageTokenTime) && !idpLogin) {
          dispatch(renewToken());
        } else {
          if (!idpLogin) {
            dispatch(removeAuth());
          }
        }
      } catch {
        // Token is corrupted — clear it and force re-login
        localStorage.removeItem('user_token');
        dispatch(removeAuth());
      }
    }
  }, [dispatch]);

  /*
   * No <ThemeProvider>/<CssBaseline> here, deliberately (#743).
   *
   * They used to wrap this whole tree, but they were redundant everywhere except the login
   * page: AppShell mounts its own pair from the same `theme(authenticated, getTheme,
   * themeMode)` expression, and every authenticated route — including /callback, which
   * renders through AppShell — sits under that one. PageLoading is pure Linaria. Once
   * LoginPage stopped importing MUI, this pair had no consumer left.
   *
   * The document baseline they provided is not lost: WebAwesome's `native.css` (imported
   * once in index.tsx) already sets `html { box-sizing: border-box; margin: 0 }`,
   * `*, *::before, *::after { box-sizing: inherit }` and `body { margin: 0 }` with the same
   * values. It lives in `@layer wa-native` and CssBaseline was unlayered, so MUI simply won
   * until now. What does change on the login route is body typography and colour — see the
   * PR for the measured before/after; the notable ones are `font-size` 16px -> 13.6px (WA's
   * ramp scaled by `--wa-font-size-scale: 0.85` in keep-overrides.css, which every WA
   * control on the page was already using) and `strong`/`b` 700 -> 600.
   *
   * This also drops App's `state.styles` subscription, so it no longer re-renders on a
   * theme switch. AppShell still has its own and still calls `applyTheme(themeMode)`.
   *
   * Report 03 §6 step 5; AppShell's pair is the last one.
   */
  return valid ? (
    <Router basename="/admin/ui">
      <Routes>
        <Route path='*' element={authenticated ? <AppShell /> : <LoginPage />} />
        <Route path='/callback' element={<CallbackPage/>}/>
      </Routes>
    </Router>
  ) : (
    <PageLoading message="loading page" />
  );
};

export default App;
