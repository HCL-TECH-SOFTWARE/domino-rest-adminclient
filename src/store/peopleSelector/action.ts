/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc                                   *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
import {
  ADD_MEMBER,
  REMOVE_MEMBER,
  REMOVE_ALL_MEMBERS,
  FETCH_ALL_MEMBERS,
  CLEAR_MEMBER_ERROR,
  TOGGLE_DELETE_DIALOG,
  MemberRedux,
} from './types';
import { PIM_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { toggleAlert } from '../alerts/action';
import { toggleApplicationDrawer } from '../drawer/action';
import { apiRequestWithRetry } from '../../utils/api-retry';

/**
 * action.ts provides the action methods for group members
 *
 * @author Roopa HS
 * @author Mallisetty Subbaiah
 * @author Sudula Prakash
 */

/**
 * Fetch the list of Group members from group.
 *
 * @param groupId the Group to fetch group members
 */
export function fetchGroupMembers(currentRow: Array<any>) {
  return async (dispatch: Dispatch) => {
    const groupId: string = currentRow[0];
    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${PIM_KEEP_API_URL}/public/group/${groupId}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json',
          },
        })
      )

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      // Use the data to build a list of rows for display
      const memberRows = {
        id: data.unid,
        fullName: data.Members,
      };
      // Update People state
      dispatch(saveMembersList(memberRows));
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      // Use the Keep response error if it's available
      if (err) {
        console.log(`Error reading Member: ${error.message}`);
        dispatch(
          toggleAlert(`Error reading Member: ${error.message}`)
        );
      }

      // Otherwise use the generic error
      else {
        console.log(`Error reading Member: ${err.message}`);
        dispatch(toggleAlert(`Error reading Member: ${err.message}`));
      }
    }
  };
}

/**
 * Use the response to build a list of rows for the DataGrid
 *
 * @param members the list of People
 */
export function buildRows(groups: any) {
  const membersList: Array<any> = [];

  groups.forEach((group: any) => {
    membersList.push({
      id: group['@unid'],
      fullName: group.Members,
    });
  });
  return membersList;
}
/**
 * Save the Members list for display in the UI
 */
export function saveMembersList(memberRows: any) {
  return {
    type: FETCH_ALL_MEMBERS,
    payload: memberRows,
  };
}

/**
 * Create Member and check for errors
 *
 * @param membersData the values needed for the Create
 */
export const addMember = (membersData: any) => {
  return async (dispatch: Dispatch) => {
    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${PIM_KEEP_API_URL}/public/group`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(membersData),
        })
      )

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      const MemberReduxData: MemberRedux = {
        id: data.unid,
        fullName: membersData.Members,
      };
      dispatch({
        type: ADD_MEMBER,
        payload: MemberReduxData,
      });
      dispatch(toggleApplicationDrawer());
      dispatch(
        toggleAlert(`${membersData.FirstName} has been successfully added`)
      );
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      // Use the Keep response error if it's available
      if (err) {
        console.log(`Error in Adding Member: ${error.message}`);
        dispatch(
          toggleAlert(`Error in Adding Member: ${error.message}`)
        );
      }

      // Otherwise use the generic error
      else {
        console.log(`Error in Adding Member: ${err.message}`);
        dispatch(toggleAlert(`Error in Adding Member: ${err.message}`));
      }
    }
  };
};

/**
 * Clear an Group Member error
 */
export function clearMemberError() {
  return {
    type: CLEAR_MEMBER_ERROR,
  };
}
/**
 * Delete Dialog
 */
export function toggleDeleteDialog() {
  return {
    type: TOGGLE_DELETE_DIALOG,
  };
}

/**
 * Remove a Member and check for errors
 *
 * @param memberId the member to Remove
 */
export function removeMember(memberId: string) {
  return async (dispatch: Dispatch) => {
    // Delete User
    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${PIM_KEEP_API_URL}/public/group/${memberId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
        })
      )

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      dispatch({ type: REMOVE_MEMBER, payload: memberId });
      dispatch(toggleAlert(`Member Removed Successfully!`));
      // Close the Delete confirmation Dialog
      dispatch(toggleDeleteDialog());
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      // Close the Delete confirmation Dialog
      dispatch(toggleDeleteDialog());

      // Use the Keep response error if it's available
      if (err) {
        console.log(`Error in removing Member: ${error.message}`);
        dispatch(
          toggleAlert(`Error in removing Member: ${error.message}`)
        );
      }

      // Otherwise use the generic error
      else {
        console.log(`Error in removing Member: ${err.message}`);
        dispatch(toggleAlert(`Error in removing Member: ${err.message}`));
      }
    }
  };
}
/**
 * Remove a Member and check for errors
 *
 * @param memberId the member to remove
 */
export function removeAllMembers(memberId: string) {
  return async (dispatch: Dispatch) => {
    // Remove Member
    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${PIM_KEEP_API_URL}/public/group/${memberId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
        })
      )

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      dispatch({ type: REMOVE_ALL_MEMBERS, payload: memberId });
      dispatch(toggleAlert(`Members Removed Successfully!`));
      // Close the Delete confirmation Dialog
      dispatch(toggleDeleteDialog());
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      // Close the Delete confirmation Dialog
      dispatch(toggleDeleteDialog());

      // Use the Keep response error if it's available
      if (err) {
        console.log(`Error in removing Members: ${error.message}`);
        dispatch(
          toggleAlert(`Error in removing Members: ${error.message}`)
        );
      }

      // Otherwise use the generic error
      else {
        console.log(`Error in removing Members: ${err.message}`);
        dispatch(toggleAlert(`Error in removing Members: ${err.message}`));
      }
    }
  };
}
