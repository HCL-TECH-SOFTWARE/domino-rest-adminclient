/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { styled } from '@linaria/react';
import { RouterOutlet, useLocation, type RouteDef } from './router/react';
import { useSelector } from 'react-redux';
import { AppState } from './store';
import { setLoading } from './store/loading/action';
import { KeepBreadcrumbRouter } from './components/keep-elements/react/KeepBreadcrumbRouter';
import { KeepPageLoading } from './components/keep-elements/react/KeepPageLoading';
import { KeepPageRouters } from './components/keep-elements/react/KeepPageRouters';
import { fetchScopes, fetchKeepPermissions } from './store/databases/action';
import { NavigationGuard } from './components/navigation/NavigationGuard';
/*
 * Lazy, and mounted on first open rather than while open (#813 step 3).
 *
 * It is the only thing on the eager path that reaches yup, and it renders a drawer that
 * starts closed — so the entry chunk was paying for a form most sessions never open. Formik
 * was the other half of that weight until #717 converted this pair to `FormController`; the
 * yup schema and the form element itself are reason enough to keep the split.
 *
 * Mounting it *while* `quickConfigDrawer` is true would be the smaller change and is what
 * the issue suggests, but it breaks two things. `keep-drawer` wraps `<wa-drawer>`, whose
 * close is animated and whose `wa-after-hide` fires only once that animation finishes;
 * unmounting the instant the flag clears skips both. And the element renders the
 * `dbError` alert *outside* the drawer, so an error would vanish the moment the drawer
 * closed rather than staying up to be read.
 *
 * Mounting on first open and leaving it mounted keeps both behaviours. The one visible
 * difference is that the very first open has no slide-in animation, because the element
 * mounts with `open` already true.
 */
const KeepQuickConfigDrawer = React.lazy(() =>
  import('./components/keep-elements/react/KeepQuickConfigDrawer').then((m) => ({
    default: m.KeepQuickConfigDrawer,
  })),
);
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
  const { quickConfigDrawer } = useSelector((state: AppState) => state.drawer);

  /** Latches on the first open; see the note on the lazy import above. */
  const [quickConfigOpened, setQuickConfigOpened] = useState(false);
  useEffect(() => {
    if (quickConfigDrawer) setQuickConfigOpened(true);
  }, [quickConfigDrawer]);

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
  /*
   * `load` rather than `element` (#813): each of the seven is its own chunk, fetched when
   * the route is first reached rather than sitting in the entry.
   *
   * `guard` still runs first, and creating a `React.lazy` does not call `load`, so an
   * unauthenticated visitor is redirected without fetching the view they asked for.
   *
   * These are inline `import()` calls on purpose — the specifier has to be statically
   * analysable for the bundler to emit a chunk, so a helper taking a path string would
   * silently produce one big chunk again.
   */
  const routes: RouteDef[] = useMemo(() => {
    const guard = () => authenticated;
    return [
      { path: '/', load: () => import('./components/home/HomePage'), guard, redirectTo: '/' },
      {
        /* A Lit element behind its wrapper, like `/apps/consents` below (#806). */
        path: '/schema',
        load: () =>
          import('./components/keep-elements/react/KeepSchemasList').then((m) => ({
            default: m.KeepSchemasList,
          })),
        guard,
        redirectTo: '/',
      },
      {
        /*
         * The four routes below are Lit elements behind their `@lit/react` wrappers, the same
         * shape as `/schema` above and `/apps/consents` below (#806 wave 6).
         *
         * Each is deep-imported from `keep-elements/react/<Name>` rather than through the
         * `KeepElements` barrel. A route root pulled in through the barrel drags every other
         * screen's element into this chunk, which is what #813 split them apart to stop.
         *
         * The wrappers now exist for one reason only: `React.lazy` needs a module whose
         * default export is a component, and an element module's default export is a class.
         * They used to be the last frame that could read the router and the route params too
         * — #926 landed `RouterController`, so each of these four is a bare `createComponent`
         * call and the elements reach the URL themselves. The wrappers go when `RouterOutlet`
         * does (#719 P4), because a Lit outlet can mount the element directly.
         */
        path: '/schema/:nsfPath/:dbName',
        load: () =>
          import('./components/keep-elements/react/KeepFormsContainer').then((m) => ({
            default: m.KeepFormsContainer,
          })),
        guard,
        redirectTo: '/',
      },
      {
        path: '/schema/:nsfPath/:dbName/:formName/access',
        load: () =>
          import('./components/keep-elements/react/KeepAccessMode').then((m) => ({
            default: m.KeepAccessMode,
          })),
        guard,
        redirectTo: '/',
      },
      {
        path: '/scope',
        load: () =>
          import('./components/keep-elements/react/KeepScopesList').then((m) => ({
            default: m.KeepScopesList,
          })),
        guard,
        redirectTo: '/',
      },
      {
        path: '/apps',
        load: () =>
          import('./components/keep-elements/react/KeepApplications').then((m) => ({
            default: m.KeepApplications,
          })),
        guard,
        redirectTo: '/',
      },
      {
        /*
         * A route whose view is a Lit element (#806), as `/schema` above is. `React.lazy`
         * needs a module whose default export is a component, so the route points at the
         * element's `@lit/react` wrapper rather than at `keep-consents-container` itself —
         * the same shape the quick-config drawer above is loaded with.
         */
        path: '/apps/consents',
        load: () =>
          import('./components/keep-elements/react/KeepConsentsContainer').then((m) => ({
            default: m.KeepConsentsContainer,
          })),
        guard,
        redirectTo: '/',
      },
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
      {/*
        A sibling, not a wrapper. It was `<NavigationGuardProvider>` around the routes, but
        its state lives in the store now (#806 decision 1) and its listeners are on
        `document` and `window` — so the subtree it appeared to scope was never the subtree
        it guarded, and a component moved out of it would have looked guarded and not been.
      */}
      <NavigationGuard basename="/admin/ui" />
      <KeepPageRouters>
        <KeepBreadcrumbRouter />
      </KeepPageRouters>
      <RouterOutlet routes={routes} fallback={<KeepPageLoading message="loading view" />} />

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
      {quickConfigOpened && (
        <React.Suspense fallback={null}>
          <KeepQuickConfigDrawer />
        </React.Suspense>
      )}
    </ViewContainer>
  );
};

export default Views;
