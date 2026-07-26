/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
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
  PageListObj,
  SET_IDP_LOGIN,
  IdP,
  SET_ERROR_MESSAGE,
} from './types';
import { BASE_KEEP_API_URL, IDP_KEEP_API_URL } from '../../config.dev';
import {
  initState,
} from '../databases/action';
import { AppState } from '..';
import { clearForms } from '../databases/action';
import { ThunkAction } from 'redux-thunk';
import { AnyAction } from 'redux';
import { apiRequestWithRetry, notify } from '../../utils/api-retry';
import { emitTokenEvent, waitForToken } from '../../utils/token-emitter';
import { checkForResponse } from '../../utils/common';
import { getLogger } from '../../services/log-service';

const log = getLogger('store/account');

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

export function setErrorMessage(errorMessage: string) {
  return {
    type: SET_ERROR_MESSAGE,
    payload: errorMessage,
  };
}

export function authenticate() {
  return {
    type: AUTHENTICATE
  };
}

export function removeAuth() {
  localStorage.removeItem('user_token');
  localStorage.removeItem('refresh_token')
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
  try {
    const raw = localStorage.getItem('user_token');
    if (!raw) return null;
    const userToken = JSON.parse(raw);
    if (userToken?.access_token) {
      return userToken.access_token;
    }
    return userToken?.bearer ?? null;
  } catch {
    return null;
  }
};

export function renewToken() {
  return async (dispatch: Dispatch, getState: () => AppState) => {
    const {
      account: { token }
    } = getState();

    let oldToken;
    try {
      oldToken = JSON.parse(token);
    } catch {
      dispatch(removeAuth());
      return;
    }

    // Every failure below ends the same way: drop the session and let the user log
    // in again. `renewToken` is dispatched once, from App.tsx's bootstrap, and the
    // sibling branch there already calls `removeAuth()` when the stored token has
    // expired — so a failed extend landing in the same place is consistent, and far
    // better than the previous behaviour of putting `undefined` in the store.
    let response: Response;
    let newToken: { bearer?: string } | undefined;
    try {
      response = await fetch(`${BASE_KEEP_API_URL}/auth/extend`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${oldToken.bearer}`,
          'Content-Type': 'application/json'
        },
        body: localStorage.getItem('user_token'),
      });
      // `checkForResponse` parses the body on both paths; it does not throw on !ok,
      // so the status still has to be checked below.
      newToken = await checkForResponse(response);
    } catch (err) {
      // Network failure, or a body that is not JSON at all.
      log.warn('Token renewal request failed; signing out', err as Error);
      dispatch(removeAuth());
      return;
    }

    if (!response.ok || !newToken?.bearer) {
      log.warn('Token renewal rejected; signing out', {
        status: response.status,
        hasBearer: Boolean(newToken?.bearer)
      });
      dispatch(removeAuth());
      return;
    }

    // Set token to account store
    dispatch({
      type: RENEW_TOKEN,
      payload: newToken.bearer
    });

    // Apply new token on local storage
    localStorage.setItem('user_token', JSON.stringify(newToken));
    // `emitTokenEvent` is declared `(token: string)`, but this and the other two call
    // sites in this file all hand it the token *object* — and its only consumer,
    // `showPages()`, interpolates what it receives straight into
    // `Authorization: Bearer ${token}`, yielding `Bearer [object Object]`. That is a
    // pre-existing bug (it type-checked only because those locals were `any`), not
    // something P0-4 introduced. Behaviour is preserved here rather than changed
    // under an unrelated fix; see the follow-ups in the PR description.
    emitTokenEvent(newToken as unknown as string)
  };
}

// Create User Session
// Add Token To Local Storage
// Redirect to Main Page
export function login(credentials: Credentials, successCallback: () => void) {
  return async (dispatch: Dispatch) => {
    const response = await
      fetch(`${BASE_KEEP_API_URL}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })
    const data = await checkForResponse(response)

    if (response.ok) {
      // debug, not info: auth-flow state is exactly the kind of thing that should not
      // be sitting in a production console by default (P0-6).
      log.debug('Login successful, setting token and updating state')
      const jwtData = data;
      localStorage.setItem('user_token', JSON.stringify(jwtData));
      emitTokenEvent(jwtData)
      dispatch({
        type: LOGIN
      });
      dispatch(setToken(jwtData));
      successCallback()
    } else {
      log.debug('Login failed, dispatching error state')
      dispatch(setLoginError(true));
      dispatch(setErrorMessage(`${data.status} error: ${data.message}`));
      notify(`${data.message}`, 'danger');
      return data;
    }
  };
}

// Log Out User Session
// Redirect to Login Page
export function logout() {
  return async (dispatch: Dispatch) => {
    try {
      const response = await
        fetch(`${BASE_KEEP_API_URL}/auth/logout?dataSource=keepconfig`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ logout: 'Yes' }),
        })

      if (!response.ok && response.status !== 401) {
        const data = await response.json()
        throw new Error(JSON.stringify(data))

      }
    } catch {
      // Logout failed, but we still clear local state below
    } finally {
      dispatch(removeAuth());
      dispatch(setIdpLogin(false))
      dispatch(initState());

      // Clearing form results
      dispatch(clearForms());
    }
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
    let token = getToken()
    if (token === null) {
      token = await waitForToken()
    }
    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`/adminui.json`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        })
      )

      if (!response.ok) {
        throw new Error(JSON.stringify(response))
      }

      // If we have a configuration setting then use it
      if (data.apps != null) {
        pageList.apps = data.apps;
      }
      if (data.databases != null) {
        pageList.databases = data.databases;
      }
      if (data.groups != null) {
        pageList.groups = data.groups;
      }
      if (data.users != null) {
        pageList.users = data.users;
      }

      // Save page state
      dispatch({
        type: NAVITEMS,
        payload: pageList
      });
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      // If no configruation settings were found, use the default
      dispatch({
        type: NAVITEMS,
        payload: pageList
      });

      // Use the Keep response error if it's available
      if (err) {
        log.error('Error reading page configuration', { statusText: error.statusText });
      }

      // Otherwise use the generic error
      else {
        log.error('Error reading page configuration', { message: error.message });
      }
    }
  };
}

// Get list of available IdPs
// Each IdP should be a button in Admin UI to login
export async function getIdpList() {
  const res = await fetch(
      `${BASE_KEEP_API_URL}/auth/idpList?configFor=adminui`,
      {
        method: 'GET'
      }
    );
  const resJson = await res.json()
  return resJson
}

export function setIdpLogin(idpLogin: boolean) {
  return {
    type: SET_IDP_LOGIN,
    payload: idpLogin,
  }
}

export function setCurrentIdp(idp: IdP) {
  return {
    type: 'CURRENT_IDP',
    payload: idp,
  }
}

export function setPkceToken(token: any) {
  return {
    type: 'SET_PKCE_TOKEN',
    payload: token,
  }
}

export function loginWithPkce(token: any) {
  return async (dispatch: Dispatch) => {
    dispatch(setPkceToken(token))
    localStorage.setItem('user_token', JSON.stringify(token));
    emitTokenEvent(token)
    dispatch(setIdpLogin(true))
    dispatch(authenticate())
    dispatch({
      type: LOGIN
    });
    dispatch(setToken(token))
  }
}

// Thunk action to get the current idpLogin state
export const getCurrentIdpLogin = (): ThunkAction<void, AppState, unknown, AnyAction> => (_dispatch, getState) => {
  const { idpLogin } = getState().account;
  return idpLogin;
};

export const getKeepIdpActive = async () => {
  const res = await fetch(
    `${IDP_KEEP_API_URL}/active`,
    {
      method: 'GET'
    }
  );
  const resJson = await res.json()
  return resJson
}