/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
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

const ViewContainer = styled.main`
  position: relative;
  height: calc(100vh - 23px);
  overflow-y: auto;

  @media only screen and (max-width: 768px) {
    height: calc(100vh - 56px);
  }
`;

interface ViewsProps {
  open: boolean;
}

const Views: React.FC<ViewsProps> = ({ open }) => {
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
        <Route path="/groups">
          <Groups />
        </Route>
        <Route path="/people">
          <People />
        </Route>
        <Route path="/mail">
          <Mail />
        </Route>
        <Route path="/settings">
          <SettingsPage />
        </Route>
        */}
      <QuickConfigFormContainer />
      </NavigationGuardProvider>
    </ViewContainer>
  );
};

export default Views;
