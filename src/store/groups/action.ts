/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
import {
  FETCH_GROUPS,
  CREATE_GROUP,
  UPDATE_GROUP,
  DELETE_GROUP,
  CLEAR_GROUP_ERROR,
  GroupRedux,
} from './types';

import { PIM_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { toggleAlert } from '../alerts/action';
import { toggleApplicationDrawer } from '../drawer/action';
import { toggleDeleteDialog } from '../dialog/action';
import { apiRequestWithRetry } from '../../utils/api-retry';

/**
 * action.ts provides the action methods for the Groups page
 *
 * @author Neil Schultz
 */

/**
 * Fetch the list of Groups from Keep.
 */
export function fetchGroups() {
  return async (dispatch: Dispatch) => {
    try {
      const response = await apiRequestWithRetry(() =>
        fetch(`${PIM_KEEP_API_URL}/public/groups?documents=true`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json',
          },
        })
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      // Use the data to build a list of rows for display
      const groupRows = buildRows(data);

      // Upate Groups state
      dispatch(saveGroupsList(groupRows));
    } catch (err: any) {
      // Use the Keep response error if it's available
      if (err.response && err.response.statusText) {
        console.log(`Error reading Groups: ${err.response.statusText}`);
        dispatch(
          toggleAlert(`Error reading Groups: ${err.response.statusText}`)
        );
      }

      // Otherwise use the generic error
      else {
        console.log(`Error reading Groups: ${err.message}`);
        dispatch(toggleAlert(`Error reading Groups: ${err.message}`));
      }
    }
  };
}

/**
 * Use the response to build a list of rows for the DataGrid
 *
 * @param groups the list of groups
 */
export function buildRows(groups: any) {
  const groupsList: Array<any> = [];
  groups.forEach((group: any) => {
    groupsList.push({
      id: group['@unid'],
      groupName: group.ListName,
      groupCategory: group.ListCategory,
      groupDescription: group.ListDescription,
    });
  });
  return groupsList;
}

/**
 * Save the Groups list for display in the UI
 *
 * @param groupRows the rows of Groups
 */
export function saveGroupsList(groupRows: any) {
  return {
    type: FETCH_GROUPS,
    payload: groupRows,
  };
}

/**
 * Create a Group and check for errors
 *
 * @param groupData the values needed for the Create
 */
export function createGroup(groupData: object) {
  return async (dispatch: Dispatch) => {
    try {
      const response = await apiRequestWithRetry(() =>
        fetch(`${PIM_KEEP_API_URL}/public/group`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
        })
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      // Collect values for Redux and update state
      const groupReduxData: GroupRedux = {
        id: data['@unid'],
        groupName: data.ListName,
        groupCategory: data.ListCategory,
        groupDescription: data.ListDescription,
      };

      dispatch({
        type: CREATE_GROUP,
        payload: groupReduxData,
      });
      dispatch(toggleApplicationDrawer());
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      // Use the Keep response error if it's available
      if (error.message) {
        console.log(`Error creating Group: ${error.message}`);
        dispatch(
          toggleAlert(`Error creating Group: ${error}`)
        );
      }

      // Otherwise use the generic error
      else {
        console.log(`Error creating Group: ${err.message}`);
        dispatch(toggleAlert(`Error creating Group: ${err.message}`));
      }
    }
  };
}

/**
 * Update a Group and check for errors
 *
 * @param groupData the values needed for the Create
 */
export function updateGroup(groupId: string, groupData: any) {
  return async (dispatch: Dispatch) => {
    try {
      const response = await apiRequestWithRetry(() =>
        fetch(`${PIM_KEEP_API_URL}/public/group/${groupId}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(groupData),
        })
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      // Collect values for Redux and update state
      let groupReduxData: GroupRedux = {
        id: data['@unid'],
        groupName: data.ListName[0],
        groupCategory: data.ListCategory,
        groupDescription: data.ListDescription,
      };

      dispatch({
        type: UPDATE_GROUP,
        payload: groupReduxData,
      });

      dispatch(toggleApplicationDrawer());
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      // Use the Keep response error if it's available
      if (error.message) {
        console.log(`Error updating Group: ${error.message}`);
        dispatch(
          toggleAlert(`Error updating Group: ${error}`)
        );
      }

      // Otherwise use the generic error
      else {
        console.log(`Error updating Group: ${err.message}`);
        dispatch(toggleAlert(`Error updating Group: ${err.message}`));
      }
    }
  };
}

/**
 * Delete a Group and check for errors
 *
 * @param groupId the Group to delete
 */
export function deleteGroup(groupId: string) {
  return async (dispatch: Dispatch) => {
    try {
      const response = await apiRequestWithRetry(() =>
        fetch(`${PIM_KEEP_API_URL}/public/group/${groupId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
        })
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      // Update our state
      dispatch({ type: DELETE_GROUP, payload: groupId });

      // Close the Delete confirmation Dialog
      dispatch(toggleDeleteDialog());
      dispatch(toggleAlert(`Group Deleted`));
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      // Close the Delete confirmation Dialog
      dispatch(toggleDeleteDialog());

      // Use the Keep response error if it's available
      if (err) {
        console.log(`Error deleting Group: ${error.message}`);
        dispatch(
          toggleAlert(`Error deleting Group: ${error.message}`)
        );
      }

      // Otherwise use the generic error
      else {
        console.log(`Error deleting Group: ${err.message}`);
        dispatch(toggleAlert(`Error deleting Group: ${err.message}`));
      }
    }
  };
}
/**
 * Clear Group error
 */
export function clearGroupError() {
  return {
    type: CLEAR_GROUP_ERROR,
  };
}
