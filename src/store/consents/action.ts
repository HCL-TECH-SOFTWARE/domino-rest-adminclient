/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
import axios from 'axios';
import { BASE_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { DELETE_CONSENT, INIT_STATE, SET_CONSENTS, TOGGLE_DELETE_CONSENT } from './types';
import { toggleAlert } from '../alerts/action';
import { toggleConsentsLoading } from '../loading/action';

export function getConsents() {
  return async (dispatch: Dispatch) => {
    // toggle on consents loading flag
    dispatch(toggleConsentsLoading());
    await axios
      .get(`${BASE_KEEP_API_URL}/consents`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          Accept: 'application/json'
        }
      })
      .then((res) => {
        dispatch({
          type: SET_CONSENTS,
          payload: res.data,
        });
        // toggle off consents loading flag
        dispatch(toggleConsentsLoading());
      });
  }
}

export function deleteConsent (unid: string) {
  return async (dispatch: Dispatch) => {
    await axios
      .delete(`${BASE_KEEP_API_URL}/consent/revoke/${encodeURIComponent(unid)}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          Accept: 'application/json'
        }
      })
      .then((res) => {
        dispatch({
          type: DELETE_CONSENT,
          payload: res.data,
        });
        dispatch(toggleAlert(`Successfully deleted consent for client ID ${unid}`));
      });
  }
}

export function toggleDeleteConsent (unid: string) {
  return {
    type: TOGGLE_DELETE_CONSENT,
    payload: unid,
  }
}

export const initApplicationState = () => {
  return {
    type: INIT_STATE
  };
};