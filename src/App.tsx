/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import './App.css';
import styled from 'styled-components';
import { BrowserRouter as Router, Switch } from 'react-router-dom';
import { ThemeProvider } from '@material-ui/core/styles';
import CssBaseline from '@material-ui/core/CssBaseline';
import { useSelector, useDispatch } from 'react-redux';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { useStyles } from './components/sidenav/style';
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
import CollapseMenuIcon from '@material-ui/icons/ChevronLeftRounded';
import ExpandMenuIcon from '@material-ui/icons/ChevronRightRounded';
import { IconButton } from '@material-ui/core';



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
  const classes = useStyles();
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

  return (
    <ThemeProvider theme={theme(authenticated, getTheme, themeMode)}>
      <CssBaseline />
      {valid ? (
        <Router basename="/admin/ui/">
          {authenticated ? (
            <>
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
                  classes={classes}
                  open={open}
                />
                {matches && (
                  <MobileSidebar
                    toggleMenu={toggleMenu}
                    classes={classes}
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
                  <Switch>
                    <Views open={open} classes={classes} />
                  </Switch>
                </RightPanel>
                {!ipadMatches && <Footer />}
              </AppContainer>
            </>
          ) : (
            <LoginPage />
          )}
        </Router>
      ) : (
        <PageLoading message="loading page" />
      )}
    </ThemeProvider>
  );
};

export default App;
