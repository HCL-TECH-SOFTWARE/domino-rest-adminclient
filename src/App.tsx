/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import './App.css';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useSelector, useDispatch } from 'react-redux';
import LoginPage from './components/login/LoginPage';
import Views from './Views';
import HomeElement from './components/home/HomeElement';
import { AppState } from './store';
import {
  authenticate,
  setToken,
  renewToken,
  removeAuth,
  setIdpLogin,
} from './store/account/action';
import PageLoading from './components/loaders/PageLoading';
import { getTheme } from './store/styles/action';
import { TokenProps } from './store/account/types';
import theme from './theme';
import CallbackPage from './components/login/CallbackPage';

const App: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [valid, setValid] = useState(false);
  const dispatch = useDispatch();
  const { themeMode } = useSelector((state: AppState) => state.styles);

  const { authenticated } = useSelector((state: AppState) => state.account);

  useEffect(() => {
    // Get JWT TOken from Browser Local Storage
    const jwtToken = localStorage.getItem('user_token') as string;

    // Check if Token is present in the browser
    setValid(true);

    if (jwtToken) {
      // Set IDP login flag to true if token contains "access_token"
      const idpLogin = !!JSON.parse(jwtToken).access_token
      if (idpLogin) dispatch(setIdpLogin(true))

      const { issueDate, expSeconds } = JSON.parse(jwtToken) as TokenProps;

      dispatch(setToken(jwtToken));

      const storageToken = new Date(issueDate).getTime() + 1000 * expSeconds;
      const storageTokenTime = new Date(storageToken).getTime();
      const today = new Date().getTime();

      dispatch(authenticate());
      if ((today < storageTokenTime) && !idpLogin) {
        dispatch(renewToken() as any);
      } else {
        if (!idpLogin) {
          dispatch(removeAuth());
        }
      }
    }
  }, [dispatch]);

  const HomePage = <>
    <HomeElement MainElement={Views} mainElementProps={{ open }} />
  </>

  return (
    <ThemeProvider theme={theme(authenticated, getTheme, themeMode)}>
      <CssBaseline />
      {valid ? (
        <Router basename="/admin/ui">
          <Routes>
              <Route path='*' element={authenticated ? HomePage : <LoginPage />} />
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
