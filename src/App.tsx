/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import { Router } from './router/router';
import { RouterOutlet, RouterProvider, type RouteDef } from './router/react';
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
import { TokenProps } from './store/account/types';
import CallbackPage from './components/login/CallbackPage';
import { KeepPageLoading } from './components/keep-elements/KeepElements';
import { useAppDispatch } from './store/hooks';

const App: React.FC = () => {
  const [valid, setValid] = useState(false);
  const dispatch = useAppDispatch();

  const { authenticated } = useSelector((state: AppState) => state.account);

  /*
   * One router for the life of the app (#716). It attaches a `popstate` listener in its
   * constructor, so rebuilding it on every render would leak one listener per render and
   * hand `useSyncExternalStore` a new subscription target each time.
   *
   * `/admin/ui` is where the UI is served; every route table, `navigate()` and `<Link to>`
   * below this point is written base-relative and never sees it.
   */
  const router = useMemo(() => new Router({ base: '/admin/ui' }), []);

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
   * renders through AppShell — sits under that one. keep-page-loading carries its own styles. Once
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
  const routes: RouteDef[] = [
    // `/callback` is listed first because matching is by declaration order, not by
    // specificity (see `matchRoutes`) — behind the catch-all it would never be reached.
    { path: '/callback', element: <CallbackPage /> },
    { path: '*', element: authenticated ? <AppShell /> : <LoginPage /> },
  ];

  return valid ? (
    <RouterProvider router={router}>
      <RouterOutlet routes={routes} />
    </RouterProvider>
  ) : (
    <KeepPageLoading message="loading page" />
  );
};

export default App;
