/* ========================================================================== *
 * Copyright (C) 2023, 2025 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
import { BASE_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { DELETE_CONSENT, INIT_STATE, SET_CONSENTS, TOGGLE_DELETE_CONSENT } from './types';
import { toggleAlert } from '../alerts/action';
import { toggleConsentsLoading } from '../loading/action';
import { getLogger } from '../../services/log-service';

const log = getLogger('store/consents');

export function getConsents() {
  return async (dispatch: Dispatch) => {
    // toggle on consents loading flag
    dispatch(toggleConsentsLoading());
    try {
      const response = await fetch(`${BASE_KEEP_API_URL}/consents`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          Accept: 'application/json',
        },
      })
      if (!response.ok) {
        throw new Error(`consents request failed with ${response.status}`)
      }
      const data = await response.json()

      dispatch({
        type: SET_CONSENTS,
        payload: data,
      });
    } catch (e: any) {
      // Without a status check the error body was dispatched as the consent list, and
      // without a catch a non-JSON body rejected out of the thunk — either way the
      // loading flag below was never reached and the list span forever.
      log.error('Error fetching consents', { error: e?.message ?? String(e) });
      dispatch(toggleAlert(`Error fetching consents: ${e?.message ?? String(e)}`));
    } finally {
      // toggle off consents loading flag
      dispatch(toggleConsentsLoading());
    }
  }
}

export function deleteConsent (unid: string, successCallback: () => void) {
  return async (dispatch: Dispatch) => {
    try {
      const response = await
        fetch(`${BASE_KEEP_API_URL}/consent/revoke/${encodeURIComponent(unid)}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json',
          },
        })
      // Revoking a consent is a security action. Reporting success without checking the
      // status told the user a refused revoke had gone through, which is worse than an
      // error — they stop looking for the problem.
      if (!response.ok) {
        throw new Error(`revoke failed with ${response.status}`)
      }
      const data = await response.json()
      dispatch({
        type: DELETE_CONSENT,
        payload: data,
      });
      successCallback()
      dispatch(toggleAlert(`Successfully deleted consent for client ID ${unid}`));
    } catch (e: any) {
      log.error('Error revoking consent', { unid, error: e?.message ?? String(e) });
      dispatch(toggleAlert(`Error deleting consent for client ID ${unid}`));
    }
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