/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
import axios from 'axios';
import {
  Credentials,
  LOGIN,
  SET_LOGIN_ERROR,
  SET_401_ERROR,
  AUTHENTICATE,
  SET_TOKEN,
  RENEW_TOKEN,
  REMOVE_AUTH,
  NAVITEMS,
  PageListObj
} from './types';
import { BASE_KEEP_API_URL } from '../../config.dev';
import {
  initState,
} from '../databases/action';
import { AppState } from '..';
import { clearForms } from '../databases/action';

export function setLoginError(error: boolean) {
  return {
    type: SET_LOGIN_ERROR,
    payload: error
  };
}

export function set401Error(error401: boolean) {
  return {
    type: SET_401_ERROR,
    payload: error401
  }
}

export function authenticate() {
  return {
    type: AUTHENTICATE
  };
}

export function removeAuth() {
  localStorage.removeItem('user_token');
  return {
    type: REMOVE_AUTH
  };
}

export function setToken(token: string) {
  return {
    type: SET_TOKEN,
    payload: token
  };
}

export const getToken = () => {
  return JSON.parse(localStorage.getItem('user_token') as string).bearer;
};

export function renewToken() {
  return async (dispatch: Dispatch, getState: () => AppState) => {
    const {
      account: { token }
    } = getState();

    // Old JWT Token
    const oldToken = JSON.parse(token);

    axios
      .post(
        `${BASE_KEEP_API_URL}/auth/extend`,
        localStorage.getItem('user_token'),
        {
          headers: {
            Authorization: `Bearer ${oldToken.bearer}`,
            'Content-Type': 'application/json'
          }
        }
      )
      .then((response) => {
        const newToken = response.data;

        // Set token to account store
        dispatch({
          type: RENEW_TOKEN,
          payload: newToken.bearer
        });

        // Apply new token on local storage
        localStorage.setItem('user_token', JSON.stringify(newToken));
      });
  };
}

// Create User Session
// Add Token To Local Storage
// Redirect to Main Page
export function login(credentials: Credentials) {
  const instance = axios.create();
  return async (dispatch: Dispatch) => {
    instance
      .post(`${BASE_KEEP_API_URL}/auth`, credentials, {
        withCredentials: false
      })
      .then((response) => {
        const jwtData = response.data;
        localStorage.setItem('user_token', JSON.stringify(jwtData));
        dispatch({
          type: LOGIN
        });
        dispatch(setToken(jwtData));
        delete axios.defaults.headers.common.Authorization;
      })
      .catch((err) => {
        // delete axios.defaults.headers.common['content-type'];
        dispatch(setLoginError(true));
        return err;
      });
  };
}

// Log Out USer Session
// Redirect to Login Page
export function logout() {
  return async (dispatch: Dispatch) => {
    axios
      .post(
        `${BASE_KEEP_API_URL}/auth/logout?dataSource=keepconfig`,
        { logout: 'Yes' },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          }
        }
      )
      .then((response) => {
        dispatch(removeAuth());
        dispatch(initState());

        // Clearing form results
        dispatch(clearForms());

        return response;
      });
  };
}

// Admin UI pages initially on
const pageList: PageListObj = {
  apps: true,
  databases: true,
  groups: true,
  users: true
};

/**
 * Determine which Admin UI pages are visable.
 */
export function showPages() {
  return async (dispatch: Dispatch) => {
    axios
      .get(`/adminui.json`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          Accept: 'application/json'
        }
      })

      // Handle a valid response
      .then((response) => {
        // If we have a configuration setting then use it
        if (response.data.apps != null) {
          pageList.apps = response.data.apps;
        }
        if (response.data.databases != null) {
          pageList.databases = response.data.databases;
        }
        if (response.data.groups != null) {
          pageList.groups = response.data.groups;
        }
        if (response.data.users != null) {
          pageList.users = response.data.users;
        }

        // Save page state
        dispatch({
          type: NAVITEMS,
          payload: pageList
        });
      })

      // Handle an error response
      .catch((err) => {
        // If no configruation settings were found, use the default
        dispatch({
          type: NAVITEMS,
          payload: pageList
        });

        // Use the Keep response error if it's available
        if (err.response && err.response.statusText) {
          console.log(
            `Error reading page configuration: ${err.response.statusText}`
          );
        }

        // Otherwise use the generic error
        else {
          console.log(`Error reading page configuration: ${err.message}`);
        }
      });
  };
}
