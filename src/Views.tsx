/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import AccessMode from './components/access/AccessMode';
import ApplicationsContainer from './components/applications/Applications';
import FormsContainer from './components/forms/FormsContainer';
import { AppState } from './store';
import Groups from './components/groups/Groups';
import People from './components/people/People';
import Mail from './components/mail/Mail';
import { setLoading } from './store/loading/action';
import SettingsPage from './components/settings/SettingsPage';
import Homepage from './components/home/Homepage';
import PageRouters from './components/routers/PageRouters';
import SchemasLists from './components/schemas/SchemasLists';
import { fetchScopes, fetchKeepPermissions } from './store/databases/action';
import ScopeLists from './components/scopes/ScopeLists';
import QuickConfigFormContainer from './components/database/QuickConfigFormContainer';
import ConsentsContainer from './components/applications/ConsentsContainer';
import { Home } from '@material-ui/icons';

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
  classes: any;
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

  return (
    <ViewContainer id="main-stack">
        <PageRouters />
        {/* <BrowserRouter> */}
        <Routes>
          <Route path='/schema/:nsfPath/:dbName/:formName/access' element={<AccessMode />}/>
          <Route path='/' element={<Homepage />} />
          <Route path='/schema' element={<SchemasLists />} />
          <Route path='/scope' element={<ScopeLists />} />
          <Route path='/apps' element={<ApplicationsContainer />} />
          <Route path='/apps/consents' element={<ConsentsContainer />} />
          <Route path='/schema/:nsfPath/:dbName' element={<FormsContainer />} />
        </Routes>
        {/* </BrowserRouter> */}
        
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
