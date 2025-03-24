/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
import { BASE_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { DELETE_CONSENT, INIT_STATE, SET_CONSENTS, TOGGLE_DELETE_CONSENT } from './types';
import { toggleAlert } from '../alerts/action';
import { toggleConsentsLoading } from '../loading/action';

export function getConsents() {
  return async (dispatch: Dispatch) => {
    // toggle on consents loading flag
    dispatch(toggleConsentsLoading());
    const response = await fetch(`${BASE_KEEP_API_URL}/consents`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
        Accept: 'application/json',
      },
    })
    const data = await response.json()

    dispatch({
      type: SET_CONSENTS,
      payload: data,
    });
    // toggle off consents loading flag
    dispatch(toggleConsentsLoading());
  }
}

export function deleteConsent (unid: string, successCallback: () => void) {
  return async (dispatch: Dispatch) => {
    const response = await
      fetch(`${BASE_KEEP_API_URL}/consent/revoke/${encodeURIComponent(unid)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          Accept: 'application/json',
        },
      })
    const data = await response.json()
    dispatch({
      type: DELETE_CONSENT,
      payload: data,
    });
    successCallback()
    dispatch(toggleAlert(`Successfully deleted consent for client ID ${unid}`));
  }
}

export function toggleDeleteConsent (unid:string, appName:string, username:string, scope:string) {
  return {
    type: TOGGLE_DELETE_CONSENT,
    payload: {
      unid: unid,
      appName: appName,
      username: username,
      scope: scope,
    }
  }
}

export const initApplicationState = () => {
  return {
    type: INIT_STATE
  };
};