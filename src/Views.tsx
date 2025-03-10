/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
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

  const { scopePull, onlyShowSchemasWithScopes, databasePull } = useSelector((state: AppState) => state.databases);
  const [scopePulling, setScopePulling] = useState(false);
  const [databasePulling, setDatabasePulling] = useState(false);
  const [fetchedPermission, setFetchedPermission] = useState(false);
  const { idpLogin } = useSelector((state: AppState) => state.account);

  useEffect(() => {
    var subTitle = 'Overview';
    switch(url) {
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
    if (!fetchedPermission) {
      dispatch(fetchKeepPermissions() as any);
      setFetchedPermission(true);
    }
    if (scopePull && scopePulling) {
      setScopePulling(false);
    }
    if (databasePull && databasePulling) {
      setDatabasePulling(false);
    }
    if (!scopePull && !scopePulling && (url.startsWith('scope') || url.startsWith('apps'))) {
      setScopePulling(true);
      dispatch(fetchScopes() as any);
    }
    if (!scopePull && !scopePulling && url === '') {
      setScopePulling(true);
      dispatch(fetchScopes() as any);
    }
    if (url.startsWith('schema')) {
      if (!scopePull || !databasePull) {
        dispatch(setLoading({ status: true }));
      }
      if (!scopePulling && !databasePulling) {
        if (!scopePull) {
          setScopePulling(true);
          dispatch(fetchScopes() as any);
        } else if (!databasePull) {
          setDatabasePulling(true);
        }
      }
    }
  }, [scopePull, dispatch, url, scopePulling, databasePull, onlyShowSchemasWithScopes, fetchedPermission, databasePulling]);

  useEffect(() => {
    if (idpLogin) {
      dispatch(fetchScopes() as any);
      dispatch(fetchKeepPermissions() as any)
    }
  }, [idpLogin])

  return (
    <ViewContainer id="main-stack">
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
    </ViewContainer>
  );
};

export default Views;
