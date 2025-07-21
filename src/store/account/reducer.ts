/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import {
  AccountActionTypes,
  LOGIN,
  NAVITEMS,
  AccountState,
  LOGOUT,
  SET_LOGIN_ERROR,
  AUTHENTICATE,
  SET_TOKEN,
  RENEW_TOKEN,
  REMOVE_AUTH,
  SET_401_ERROR,
  SET_IDP_LOGIN,
  CURRENT_IDP,
  SET_ERROR_MESSAGE,
} from './types';

const initialState: AccountState = {
  navitems: {
    databases: false,
    apps: false,
    users: false,
    groups: false,
  },
  authenticated: false,
  error: false,
  error401: false,
  errorMessage: '',
  token: '',
  idpLogin: false,
  currentIdp: {
    name: '',
    wellKnown: '',
    adminui_config: {
      active: false,
      client_id: '',
      scope: [],
    },
  }
};

export default function accountReducer(
  state = initialState,
  action: AccountActionTypes
): AccountState {
  switch (action.type) {
    case CURRENT_IDP:
      return {
        ...state,
        currentIdp: action.payload,
      };
    case LOGIN:
      return {
        ...state,
        authenticated: true,
      };
    case LOGOUT:
      return {
        ...state,
        authenticated: false,
        token: '',
      };
    case AUTHENTICATE:
      return {
        ...state,
        authenticated: true,
      };
    case NAVITEMS:
      return {
        ...state,
        navitems: action.payload,
      };
    case REMOVE_AUTH:
      return {
        ...state,
        authenticated: false,
        token: '',
      };
    case SET_LOGIN_ERROR:
      return {
        ...state,
        error: action.payload,
      };
    case SET_IDP_LOGIN:
      return {
        ...state,
        idpLogin: action.payload,
      };
    case SET_401_ERROR:
      return {
        ...state,
        error401: action.payload,
      };
    case SET_ERROR_MESSAGE:
      return {
        ...state,
        errorMessage: action.payload,
      };
    case SET_TOKEN:
      return {
        ...state,
        token: action.payload,
      };
    case RENEW_TOKEN:
      return {
        ...state,
        token: action.payload,
      };
    default:
      return state;
  }
}
