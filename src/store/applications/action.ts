/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
import axios from 'axios';
import {
  AppProp,
  GET_APPS,
  DELETE_APP,
  SET_PULLED_APP,
  EXECUTING,
  ADD_APP,
  UPDATE_APP,
  CLEAR_APP_ERROR,
  INIT_STATE,
} from './types';
import { SETUP_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { toggleAlert } from '../alerts/action';
import { toggleApplicationDrawer } from '../drawer/action';
import { TOGGLE_DELETE_DIALOG } from '../dialog/types';

export function toggleDeleteDialog() {
  return {
    type: TOGGLE_DELETE_DIALOG
  };
}

/**
 * Retrieves the arrays of Applications and
 * passes them to Redux.
 */
export const fetchMyApps = () => {
  return async (dispatch: Dispatch) => {
    axios
      .get(`${SETUP_KEEP_API_URL}/admin/applications`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          Accept: 'application/json'
        }
      })

      .then((res) => {
        const appsList: Array<AppProp> = [];

        // Set Application state
        res.data.forEach((app: any) => {
          appsList.push({
            appName: app.client_name,
            appDescription: app.description,
            appCallbackUrls: app.redirect_uris,
            appContacts: app.contacts,
            appId: app.client_id,
            appIcon: app.logo_uri,
            appScope: app.scope,
            appHasSecret: app.hasSecret,
            appSecret: app.client_secret,
            appStartPage: app.client_uri,
            appStatus: app.status
          });
        });

        dispatch({
          type: GET_APPS,
          payload: appsList
        });
        dispatch(setPullApp(true));
      })
      .catch((err) => {
        // Use the Keep response error if it's available
        if (err.response && err.response.statusText) {
          dispatch(
            toggleAlert(`Error Fetching Apps: ${err.response.statusText}`)
          );
        }
        // Otherwise use the generic error
        else {
          dispatch(toggleAlert(`Error Fetching Apps: ${err.message}`));
        }
      });
  };
};

// export function dropUpdate(app: {
//   appId: string;
//   destination: {
//     droppableId: number;
//     index: number;
//   };
//   data: any;
// }) {
//   return async (dispatch: Dispatch) => {
//     try {
//       const {
//         appId,
//         data,
//         destination: { droppableId }
//       } = app;
//       await axios.patch(
//         `${SETUP_KEEP_API_URL}/admin/application/${appId}`,
//         { ...data, appStatus: status[droppableId] },
//         {
//           headers: {
//             Authorization: `Bearer ${getToken()}`,
//             'Content-Type': 'application/json'
//           }
//         }
//       );
//       dispatch({
//         type: DROP_UPDATE,
//         payload: app
//       });

//       dispatch(toggleAlert(`${data.appName} moved to ${status[droppableId]}`));
//     } catch (err: any) {
//       if (err.response && err.response.statusText) {
//         dispatch(setAppError(err.response.statusText));
//       } else {
//         dispatch(setAppError(err.message));
//       }
//     }
//   };
// }
/**
 * Update an Application and check for errors
 */
export function updateApp(appData: any) {
  return async (dispatch: Dispatch) => {
    // Based on API verb, this is now PUT instead of patch
    await axios
      .put(
        `${SETUP_KEEP_API_URL}/admin/application/${appData.client_id}`,
        { ...appData, isActive: appData.status },
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          }
        }
      )
      .then((res) => {
        const appReduxData: AppProp = {
          appName: res.data.client_name,
          appDescription: res.data.description,
          appCallbackUrls: res.data.redirect_uris,
          appContacts: res.data.contacts,
          appId: res.data.client_id,
          appIcon: res.data.logo_uri,
          appScope: res.data.scope,
          appHasSecret: res.data.hasSecret ? true : false,
          appSecret: res.data.client_secret,
          appStartPage: res.data.client_uri,
          appStatus: res.data.status
        };
        dispatch({
          type: UPDATE_APP,
          payload: appReduxData
        });
        dispatch(toggleApplicationDrawer());
        dispatch(toggleAlert(`${appData.client_name} has been updated!`));
      })
      .catch((err) => {
        // Use the Keep response error if it's available
        if (err.response && err.response.statusText) {
          dispatch(
            toggleAlert(`Error Updating App: ${err.response.statusText}`)
          );
        }
        // Otherwise use the generic error
        else {
          dispatch(toggleAlert(`Error Updating App: ${err.message}`));
        }
      });
  };
}

export function executing(visibility: boolean) {
  return {
    type: EXECUTING,
    payload: visibility
  };
}

/**
 * Delete an Application and check for errors
 */
export function deleteApplication(appId: string) {
  return async (dispatch: Dispatch) => {
    dispatch(executing(true));

    await axios
      .delete(`${SETUP_KEEP_API_URL}/admin/application/${appId}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      })
      .then(() => {
        dispatch({
          type: DELETE_APP,
          payload: appId
        });
        dispatch(toggleDeleteDialog());
        dispatch(toggleAlert(`Application Deleted`));
      })
      .catch((err) => {
        // Close the Delete confirmation Dialog
        dispatch(toggleDeleteDialog());
        // Use the Keep response error if it's available
        if (err.response && err.response.statusText) {
          dispatch(
            toggleAlert(`Error Deleting App: ${err.response.statusText}`)
          );
        }
        // Otherwise use the generic error
        else {
          dispatch(toggleAlert(`Error Deleting App: ${err.message}`));
        }
      });
  };
}

/**
 * Create an Application and check for errors
 */
export function addApplication(appData: any) {
  return async (dispatch: Dispatch) => {
    dispatch(executing(true));
    await axios
      .post(`${SETUP_KEEP_API_URL}/admin/application`, appData, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      })
      .then((res) => {
        const appReduxData: AppProp = {
          appName: res.data.client_name,
          appDescription: res.data.description,
          appCallbackUrls: res.data.redirect_uris,
          appContacts: res.data.contacts,
          appId: res.data.client_id,
          appIcon: res.data.logo_uri,
          appScope: res.data.scope,
          appHasSecret: res.data.hasSecret,
          appSecret: res.data.client_secret,
          appStartPage: res.data.client_uri,
          appStatus: res.data.status
        };
        dispatch({
          type: ADD_APP,
          payload: appReduxData
        });
        dispatch(toggleApplicationDrawer());
        dispatch(toggleAlert(`New Application Added`));
      })
      // Handle an error response
      .catch((err) => {
        // Use the Keep response error if it's available
        if (err.response && err.response.statusText) {
          dispatch(toggleAlert(`Error adding App: ${err.response.statusText}`));
        }
        // Otherwise use the generic error
        else {
          dispatch(toggleAlert(`Error adding App: ${err.message}`));
        }
      });
  };
}

// /**
//  * Store an Application error for display in the UI
//  */
// export function setAppError(message: string) {
//   return {
//     type: SET_APP_ERROR,
//     payload: message
//   };
// }

/**
 * Clear an Application error
 */
export function clearAppError() {
  return {
    type: CLEAR_APP_ERROR
  };
}

/**
 * Set applications pulled flag
 */
export const setPullApp = (appPull: boolean) => {
  return {
    type: SET_PULLED_APP,
    payload: appPull
  };
};

/**
 * Init applications state
 */
export const initApplicationState = () => {
  return {
    type: INIT_STATE
  };
};