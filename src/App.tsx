/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import './App.css';
import styled from 'styled-components';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useSelector, useDispatch } from 'react-redux';
import useMediaQuery from '@mui/material/useMediaQuery';
import Header from './components/header/Header';
import SideNav from './components/sidenav/SideNav';
import LoginPage from './components/login/LoginPage';
import Views from './Views';
import { AppState } from './store';
import {
  authenticate,
  setToken,
  renewToken,
  removeAuth,
} from './store/account/action';
import PageLoading from './components/loaders/PageLoading';
import MobileSidebar from './components/sidenav/MobileSidebar';
import injectInterceptor from './utils/api-interceptor';
import { getTheme } from './store/styles/action';
import { TokenProps } from './store/account/types';
import theme from './theme';
import Footer from './Footer';
import Notification from './components/alerts/Notification';
import CollapseMenuIcon from '@mui/icons-material/ChevronLeftRounded';
import ExpandMenuIcon from '@mui/icons-material/ChevronRightRounded';
import { IconButton } from '@mui/material';
import CallbackPage from './components/login/CallbackPage';
import { PrivateRoutes } from './components/routers/ProtectedRoute';

const AppContainer = styled.main`
  display: flex;
  overflow-x: hidden;
  // height: calc( 100vh - 23px);

  @media only screen and (max-width: 768px) {
    overflow-x: hidden;
    height: calc( 100vh - 56px);
  }
  
  .MuiSnackbar-root {
    max-width: 90%;
    
    .MuiSnackbarContent-message {
      word-break: break-word;
    }
  }
  `;
  
const RightPanel = styled.div<{ open: boolean; theme: string }>`
  position: relative;
  height: 100%;
  background: ${(props) => props.theme.bodyColor};
  width: calc( 100% - ${(props) => (props.open ? '241px' : '50px')});
  padding: 0 40px;

  @media only screen and (max-width: 768px) {
    background: white;
    width: 100%;
    filter: blur(${(props) => (props.open ? '10px' : 0)});
    ${(props) => props.open && `pointer-events: none;`}
  }

  .toggle-button {
    border-radius:0 10px 10px 0;
    width: 23px;
    height: 42px; 
    position: absolute;
    top: 35px;
    left: -1px;
    background-color: #5F1FBF;
    color: #fff;
    z-index: 100 !important;
    border: 1px solid #CFCFCF !important;
    border-left: 0px !important;
  }
`;

const App: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [valid, setValid] = useState(false);
  const dispatch = useDispatch();
  const matches = useMediaQuery('(max-width:768px)');
  const { themeMode } = useSelector((state: AppState) => state.styles);

  const ipadMatches = useMediaQuery('(max-width:768px)');
  const { authenticated } = useSelector((state: AppState) => state.account);

  const toggleMenu = () => {
    setOpen(!open);
  };

  useEffect(() => {
    // Handle Axios Interceptor
    // Handle All API Request on the Page
    injectInterceptor(dispatch);

    // Get JWT TOken from Browser Local Storage
    const jwtToken = localStorage.getItem('user_token') as string;

    // Check if Token is present in the browser
    setValid(true);

    if (jwtToken) {
      const { issueDate, expSeconds } = JSON.parse(jwtToken) as TokenProps;

      dispatch(setToken(jwtToken));

      const storageToken = new Date(issueDate).getTime() + 1000 * expSeconds;
      const storageTokenTime = new Date(storageToken).getTime();
      const today = new Date().getTime();

      dispatch(authenticate());
      if (today < storageTokenTime) {
        dispatch(renewToken() as any);
      } else {
        dispatch(removeAuth());
      }
    }
  }, [dispatch]);

  const HomeElement = <>
    {matches && (
      <Header
        toggleMobileMenu={toggleMenu}
        open={open}
      />
    )}
    <AppContainer>
      <Notification />
      <SideNav
        toggleMenu={toggleMenu}
        open={open}
      />
      {matches && (
        <MobileSidebar
          toggleMenu={toggleMenu}
          open={open}
        />
      )}
      <RightPanel theme={getTheme(themeMode)} open={open}>
        {!matches && (
            open ? (
              <IconButton 
                aria-label="collapse menu"
                className='toggle-button'
                onClick={toggleMenu}
              >
                <CollapseMenuIcon />
              </IconButton>
            ) : (
              <IconButton 
                aria-label="expand menu"
                className='toggle-button'
                onClick={toggleMenu}
              >
                <ExpandMenuIcon />
              </IconButton>
            )
        )}

      <Views open={open} />
      </RightPanel>
      {!ipadMatches && <Footer />}
    </AppContainer>
  </>

  return (
    <ThemeProvider theme={theme(authenticated, getTheme, themeMode)}>
      <CssBaseline />
      {valid ? (
        <Router basename="/admin/ui">
          <Routes>
              <Route element={<PrivateRoutes />}>
                <Route path='/' element={
                  HomeElement
                } />
              </Route>
              <Route path='/login' element={<LoginPage/>}/>
              <Route path='/callback' element={<CallbackPage/>}/>
          </Routes>
        </Router>
      ) : (
        <PageLoading message="loading page" />
      )}
    </ThemeProvider>
  );
};

export default App;
