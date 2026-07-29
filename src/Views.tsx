/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useMemo, useRef } from 'react';
import { styled } from '@linaria/react';
import { RouterOutlet, useLocation, type RouteDef } from './router/react';
import { useSelector } from 'react-redux';
import AccessMode from './components/access/AccessMode';
import ApplicationsContainer from './components/applications/Applications';
import FormsContainer from './components/forms/FormsContainer';
import { AppState } from './store';
import { setLoading } from './store/loading/action';
import Section from './components/home/sections/Section';
import BreadcrumbRouter from './components/routers/BreadcrumbRouter';
import { KeepHomepage, KeepPageRouters } from './components/keep-elements/KeepElements';
import SchemasLists from './components/schemas/SchemasLists';
import { fetchScopes, fetchKeepPermissions } from './store/databases/action';
import ScopeLists from './components/scopes/ScopeLists';
import { NavigationGuardProvider } from './components/navigation/NavigationGuardContext';
import QuickConfigFormContainer from './components/database/QuickConfigFormContainer';
import ConsentsContainer from './components/applications/ConsentsContainer';
import { useAppDispatch } from './store/hooks';

/**
 * Views.tsx provides routes to each of the main pages in the Admin UI.
 *
 * @author Michael Angelo Silva
 * @author Neil Schultz
 *
 */

/*
 * The main region of `<wa-page>` (#707).
 *
 * The horizontal padding used to belong to the deleted `RightPanel`; it moves here because
 * this is now the element that occupies the main column. Declaring it also overrides
 * `wa-page`'s own `slot:not([name])::slotted(main) { padding: var(--wa-space-3xl) }`, which
 * is 48px on every side and would push the page content down by that much.
 *
 * The height stays viewport-relative rather than `100%` because both bars it subtracts sit
 * outside `wa-page`'s own grid rows: the 23px `keep-footer` bar is a fixed overlay, and
 * `--header-height` is what `wa-page` measures its header region to be. Reading that
 * variable replaces the hardcoded `56px` this rule used to guess — get it wrong by a pixel
 * and the document gains a second scrollbar on top of this element's own.
 */
const ViewContainer = styled.main`
  position: relative;
  height: calc(100vh - var(--header-height, 0px) - 23px);
  overflow-y: auto;
  padding: 0 40px;

  @media only screen and (width < 768px) {
    /* No footer overlay below the breakpoint — see the media query in keep-footer.ts. */
    height: calc(100vh - var(--header-height, 0px));
    padding: 0;
  }
`;

const Views: React.FC = () => {
  const dispatch = useAppDispatch();

  const path = useLocation();
  const url = path.pathname.split('/')[1];

  const { scopePull, databasePull } = useSelector((state: AppState) => state.databases);
  const { idpLogin, authenticated } = useSelector((state: AppState) => state.account);

  /*
   * The route table (#716), replacing the `<Routes>`/`<Route>` tree.
   *
   * `guard` is what `<Route element={<PrivateRoutes/>}>` used to be: that wrapper existed
   * only to render an `<Outlet/>` or a `<Navigate to='/'/>`, which is a predicate and a
   * redirect target written as a component. Both are fields here, and
   * `components/routers/ProtectedRoute.tsx` is gone with the last `<Outlet/>` in the app.
   *
   * It is belt-and-braces either way: `App.tsx` only renders `AppShell` — and so this
   * component — when authenticated, so the redirect branch is not reachable today.
   *
   * `/callback` is deliberately absent. It was declared here as well as in `App.tsx`, but
   * App's copy always won, and its element is the whole page rather than a main-region
   * view, so this one could never render.
   */
  const routes: RouteDef[] = useMemo(() => {
    const guard = () => authenticated;
    return [
      { path: '/', element: <KeepHomepage><Section /></KeepHomepage>, guard, redirectTo: '/' },
      { path: '/schema', element: <SchemasLists />, guard, redirectTo: '/' },
      { path: '/schema/:nsfPath/:dbName', element: <FormsContainer />, guard, redirectTo: '/' },
      {
        path: '/schema/:nsfPath/:dbName/:formName/access',
        element: <AccessMode />,
        guard,
        redirectTo: '/',
      },
      { path: '/scope', element: <ScopeLists />, guard, redirectTo: '/' },
      { path: '/apps', element: <ApplicationsContainer />, guard, redirectTo: '/' },
      { path: '/apps/consents', element: <ConsentsContainer />, guard, redirectTo: '/' },
    ];
  }, [authenticated]);

  // Use refs for in-flight guards so they don't trigger re-renders
  const scopePullingRef = useRef(false);
  const databasePullingRef = useRef(false);
  const permissionFetchedRef = useRef(false);

  // Effect 1: Update the page title when the URL changes
  useEffect(() => {
    let subTitle = 'Overview';
    switch (url) {
      case 'scope':
        subTitle = 'Scopes';
        break;
      case 'schema':
        subTitle = 'Schemas';
        break;
      case 'apps':
        subTitle = 'Applications';
        break;
    }
    document.title = `HCL Domino REST API | ${subTitle}`;
  }, [url]);

  // Effect 2: Fetch permissions once on mount
  useEffect(() => {
    if (!permissionFetchedRef.current) {
      permissionFetchedRef.current = true;
      dispatch(fetchKeepPermissions());
    }
  }, [dispatch]);

  // Effect 3: Fetch scopes when navigating to pages that need them
  useEffect(() => {
    // Reset in-flight flag when fetch completes
    if (scopePull) {
      scopePullingRef.current = false;
      return;
    }

    // Determine if the current page needs scopes
    const needsScopes =
      url === '' ||
      url.startsWith('scope') ||
      url.startsWith('apps') ||
      url.startsWith('schema');

    if (needsScopes && !scopePullingRef.current) {
      scopePullingRef.current = true;
      dispatch(fetchScopes());
    }
  }, [scopePull, url, dispatch]);

  // Effect 4: Show loading spinner on schemas page while data is being fetched
  useEffect(() => {
    if (url.startsWith('schema')) {
      if (!scopePull || !databasePull) {
        dispatch(setLoading({ status: true }));
      }

      // Reset database in-flight flag when fetch completes
      if (databasePull) {
        databasePullingRef.current = false;
      }
    }
  }, [url, scopePull, databasePull, dispatch]);

  // Effect 5: Fetch scopes and permissions on IDP login
  useEffect(() => {
    if (idpLogin) {
      dispatch(fetchScopes());
      dispatch(fetchKeepPermissions());
    }
  }, [idpLogin, dispatch]);

  return (
    <ViewContainer id="main-stack">
      <NavigationGuardProvider basename="/admin/ui">
        <KeepPageRouters>
          <BreadcrumbRouter />
        </KeepPageRouters>
        <RouterOutlet routes={routes} />

        {/*
          /mail stays commented out: the Mail/Dashboard pair is blocked on LABS-1214
          (#698). /settings went with src/components/settings/ (#681), and /groups and
          /people went with their screens in #770 — the v6 router upgrade (9324783,
          2024-04-25) commented all four out instead of converting them, and nobody
          noticed for fifteen months.

        <Route path="/mail">
          <Mail />
        </Route>
        */}
      <QuickConfigFormContainer />
      </NavigationGuardProvider>
    </ViewContainer>
  );
};

export default Views;
