/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef } from 'react';
import { styled } from '@linaria/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AccessMode from './components/access/AccessMode';
import ApplicationsContainer from './components/applications/Applications';
import FormsContainer from './components/forms/FormsContainer';
import { AppState } from './store';
import { setLoading } from './store/loading/action';
import Homepage from './components/home/Homepage';
import PageRouters from './components/routers/PageRouters';
import SchemasLists from './components/schemas/SchemasLists';
import { fetchScopes, fetchKeepPermissions } from './store/databases/action';
import ScopeLists from './components/scopes/ScopeLists';
import { NavigationGuardProvider } from './components/navigation/NavigationGuardContext';
import QuickConfigFormContainer from './components/database/QuickConfigFormContainer';
import ConsentsContainer from './components/applications/ConsentsContainer';
import CallbackPage from './components/login/CallbackPage';
import { PrivateRoutes } from './components/routers/ProtectedRoute';

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
 * outside `wa-page`'s own grid rows: the 23px `.footer-container` is a fixed overlay, and
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
    /* No footer overlay below the breakpoint — see .footer-container in styles.css. */
    height: calc(100vh - var(--header-height, 0px));
    padding: 0;
  }
`;

const Views: React.FC = () => {
  const dispatch = useDispatch();

  const path = useLocation();
  const url = path.pathname.split('/')[1];

  const { scopePull, databasePull } = useSelector((state: AppState) => state.databases);
  const { idpLogin } = useSelector((state: AppState) => state.account);

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
      dispatch(fetchKeepPermissions() as any);
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
      dispatch(fetchScopes() as any);
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
      dispatch(fetchScopes() as any);
      dispatch(fetchKeepPermissions() as any);
    }
  }, [idpLogin, dispatch]);

  return (
    <ViewContainer id="main-stack">
      <NavigationGuardProvider basename="/admin/ui">
        <PageRouters />
        <Routes>
          <Route element={<PrivateRoutes />}>
            <Route path='/' element={<Homepage />} />
            <Route path='/schema' element={<SchemasLists />} />
            <Route path='/schema/:nsfPath/:dbName' element={<FormsContainer />} />
            <Route path='/schema/:nsfPath/:dbName/:formName/access' element={<AccessMode />}/>
            <Route path='/scope' element={<ScopeLists />} />
            <Route path='/apps' element={<ApplicationsContainer />} />
            <Route path='/apps/consents' element={<ConsentsContainer />} />
          </Route>
          <Route path='/callback' element={<CallbackPage/>}/>
        </Routes>
        
        {/*
          /groups, /people and /mail stay commented out: their components are still in
          the tree and the Mail/Dashboard pair is blocked on LABS-1214 (#698). The
          /settings block is gone with src/components/settings/ (#681).

        <Route path="/groups">
          <Groups />
        </Route>
        <Route path="/people">
          <People />
        </Route>
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
