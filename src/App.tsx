/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useMemo, useState } from 'react';
import './App.css';
import { getRouter } from './router/instance';
import { RouterOutlet, RouterProvider, type RouteDef } from './router/react';
import { useSelector } from 'react-redux';
import { AppState } from './store';
import {
  authenticate,
  renewToken,
  removeAuth,
  setIdpLogin,
} from './store/account/action';
import { TokenProps } from './store/account/types';
import AppShell from './AppShell';
import { KeepCallbackPage } from './components/keep-elements/react/KeepCallbackPage';
import { KeepPageLoading } from './components/keep-elements/react/KeepPageLoading';
import { useAppDispatch } from './store/hooks';

const App: React.FC = () => {
  const [valid, setValid] = useState(false);
  const dispatch = useAppDispatch();

  const { authenticated } = useSelector((state: AppState) => state.account);

  /*
   * One router for the life of the app (#716), and since #926 it is a module singleton rather
   * than a `useMemo` here — see `router/instance.ts` for why that had to happen (a Lit element
   * has no React context to read from) and why it is a function rather than a const.
   *
   * The `useMemo` is gone, not replaced: `getRouter()` returns the same instance every time,
   * so there is nothing left to memoise. It still attaches exactly one `popstate` listener,
   * and `useSyncExternalStore` still sees one stable subscription target.
   *
   * The base — where the UI is served — moved to `ROUTER_BASE` with it. Every route table,
   * `navigate()` and `<Link to>` below this point is written base-relative and never sees it.
   */
  const router = getRouter();

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
   * Going home after a password login (#806 wave 6).
   *
   * `keep-login-page` emits `login-success` rather than navigating itself, because when it
   * was written the router was reachable only through React context — and unlike `/callback`,
   * that page is behind a `load` route, so there is no prop to hand a callback to either:
   * `RouterOutlet` renders the lazy component with none. The event is composed and bubbling,
   * so the document is where it can be caught.
   *
   * #926 has since landed `RouterController`, so the page *could* now navigate itself. That
   * is a change to `keep-login-page`, not to this file, and it is deliberately not made here:
   * the ordering this listener pins (authenticate, then go home) has its own test.
   */
  useEffect(() => {
    const goHome = () => router.navigate('/');
    document.addEventListener('login-success', goHome);
    return () => document.removeEventListener('login-success', goHome);
  }, [router]);

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
  /*
   * `AppShell` and `LoginPage` are mutually exclusive — an authenticated user never needs
   * the login page, and an anonymous one never needs the shell — so neither belongs in the
   * entry chunk (#813 step 3). The catch-all picks which one to *fetch* rather than which
   * already-loaded element to render.
   *
   * **This array has to be memoised.** `RouterOutlet` builds one `React.lazy` per `load`
   * route and memoises them on the table's identity; `lazy()` returns a fresh component
   * type per call and React remounts when the type changes. A literal rebuilt each render
   * would therefore unmount and refetch the whole shell on every App render. With
   * `element:` that was harmless, which is why it was a literal until now.
   */
  const routes: RouteDef[] = useMemo(
    () => [
      // `/callback` is listed first because matching is by declaration order, not by
      // specificity (see `matchRoutes`) — behind the catch-all it would never be reached.
      // It keeps `element:`: it is the OAuth redirect landing, so its chunk would be
      // fetched at the one moment the user is already waiting on a round trip.
      //
      // `AppShell` wraps it here rather than inside the page, which is where the component
      // this replaces put it. That is the one case where the shell is on screen with
      // something other than the router behind it, and the shell is still React.
      {
        path: '/callback',
        element: (
          <AppShell>
            <KeepCallbackPage onAuthenticated={() => router.navigate('/')} />
          </AppShell>
        ),
      },
      {
        path: '*',
        load: authenticated
          ? () => import('./AppShell')
          : () => import('./components/keep-elements/react/KeepLoginPage'),
      },
    ],
    [authenticated, router],
  );

  return valid ? (
    <RouterProvider router={router}>
      <RouterOutlet routes={routes} fallback={<KeepPageLoading message="loading page" />} />
    </RouterProvider>
  ) : (
    <KeepPageLoading message="loading page" />
  );
};

export default App;
