/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
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
import { apiRequestWithRetry } from '../../utils/api-retry';

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
    try {
      const response = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/admin/applications`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json'
          }
        })
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(JSON.stringify(data.message))
      }
      const appsList: Array<AppProp> = [];

      // Set Application state
      data.forEach((app: any) => {
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
          appStatus: app.status,
          usePkce: app.token_endpoint_auth_method === 'none',
        });
      });

      dispatch({
        type: GET_APPS,
        payload: appsList
      });
      dispatch(setPullApp(true));
    } catch (err: any) {
      // Use the Keep response error if it's available
      if (err) {
        dispatch(
          toggleAlert(`Error Fetching Apps: ${err}`)
        );
      }
      // Otherwise use the generic error
      else {
        dispatch(toggleAlert(`Error Fetching Apps: ${err}`));
      }
    }
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
    try {
      // Based on API verb, this is now PUT instead of patch
      const res = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/admin/application/${appData.client_id}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...appData,
            isActive: appData.status,
          }),
        })
      )
      const data = await res.json()

      if (!res.ok) {
        throw new Error(JSON.stringify(data.message))
      }

      const appReduxData: AppProp = {
        appName: data.client_name,
        appDescription: data.description,
        appCallbackUrls: data.redirect_uris,
        appContacts: data.contacts,
        appId: data.client_id,
        appIcon: data.logo_uri,
        appScope: data.scope,
        appHasSecret: data.hasSecret ? true : false,
        appSecret: data.client_secret,
        appStartPage: data.client_uri,
        appStatus: data.status,
        usePkce: data.token_endpoint_auth_method === 'none',
      };
      dispatch({
        type: UPDATE_APP,
        payload: appReduxData
      });
      dispatch(toggleApplicationDrawer());
      dispatch(toggleAlert(`${appData.client_name} has been updated!`));
    } catch (err: any) {
      // Use the Keep response error if it's available
      if (err) {
        dispatch(
          toggleAlert(`Error Updating App: ${err}`)
        );
      }
      // Otherwise use the generic error
      else {
        dispatch(toggleAlert(`Error Updating App: ${err}`));
      }
    }
  };
}

export function getSingleApp(appId: string) {
  return async (dispatch: Dispatch) => {
    try {
      const res = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/admin/application/${appId}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          }
        })
      )
      const data = await res.json()

      if (!res.ok) {
        throw new Error(JSON.stringify(data.message))
      }

      const appReduxData: AppProp = {
        appName: data.client_name,
        appDescription: data.description,
        appCallbackUrls: data.redirect_uris,
        appContacts: data.contacts,
        appId: data.client_id,
        appIcon: data.logo_uri,
        appScope: data.scope,
        appHasSecret: data.hasSecret ? true : false,
        appSecret: data.client_secret,
        appStartPage: data.client_uri,
        appStatus: data.status,
        usePkce: data.token_endpoint_auth_method === 'none',
      };
      dispatch({
        type: UPDATE_APP,
        payload: appReduxData
      });
    } catch (err: any) {
      // Use the Keep response error if it's available
      if (err) {
        dispatch(
          toggleAlert(`Error Updating App: ${err}`)
        );
      }
      // Otherwise use the generic error
      else {
        dispatch(toggleAlert(`Error Updating App: ${err}`));
      }
    }
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

    try {
      const response = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/admin/application/${appId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          },
        })
      )
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(JSON.stringify(data.message))
      }

      dispatch({
        type: DELETE_APP,
        payload: appId
      });
      dispatch(toggleDeleteDialog());
      dispatch(toggleAlert(`Application Deleted`));
    } catch (err: any) {
      // Close the Delete confirmation Dialog
      dispatch(toggleDeleteDialog());
      // Use the Keep response error if it's available
      if (err) {
        dispatch(
          toggleAlert(`Error Deleting App: ${err}`)
        );
      }
      // Otherwise use the generic error
      else {
        dispatch(toggleAlert(`Error Deleting App: ${err}`));
      }
    }
  };
}

/**
 * Create an Application and check for errors
 */
export function addApplication(appData: any) {
  return async (dispatch: Dispatch) => {
    dispatch(executing(true));
    try {
      const res = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/admin/application`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(appData),
        })
      )
      const data = await res.json()

      if (!res.ok) {
        throw new Error(JSON.stringify(data.message))
      }

      const appReduxData: AppProp = {
        appName: data.client_name,
        appDescription: data.description,
        appCallbackUrls: data.redirect_uris,
        appContacts: data.contacts,
        appId: data.client_id,
        appIcon: data.logo_uri,
        appScope: data.scope,
        appHasSecret: data.hasSecret,
        appSecret: data.client_secret,
        appStartPage: data.client_uri,
        appStatus: data.status,
        usePkce: data.token_endpoint_auth_method === 'none',
      };
      dispatch({
        type: ADD_APP,
        payload: appReduxData
      });
      dispatch(toggleApplicationDrawer());
      dispatch(toggleAlert(`New Application Added`));
    } catch (err: any) {
      // Use the Keep response error if it's available
      if (err.response && err.response.statusText) {
        dispatch(toggleAlert(`Error adding App: ${err}`));
      }
      // Otherwise use the generic error
      else {
        dispatch(toggleAlert(`Error adding App: ${err}`));
      }
    }
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
 * Generate application secret
 * @param appId     the application ID
 * @param appStatus the application status
 */
export const generateSecret = (
  appId: string,
  appStatus: string,
  setGenerating: (generating: boolean) => void,
  setAppSecret: (appSecret: string) => void,
)  => {
  return async (dispatch: Dispatch) => {
    setGenerating(true)

    try {
      const response = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/admin/application/${appId}/secret?force=true`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          // TODO: warn if secret exists ask for confirmation
          body: JSON.stringify({ status: appStatus })
        })
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }
      setGenerating(false);
      setAppSecret(data.client_secret);
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)
      if (err) {
        dispatch(
          toggleAlert(
            `Error Generating App Secret: ${error.message}`
          )
        );
        console.error(err)
      }
      // Otherwise use the generic error
      else {
        dispatch(toggleAlert(`Error Generating App Secret: ${error.message}`));
      }
    }
  }
}

/**
 * Init applications state
 */
export const initApplicationState = () => {
  return {
    type: INIT_STATE
  };
};