/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc                                   *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import axios from 'axios';
import { Dispatch } from 'redux';
import {
  ADD_USER,
  CLEAR_PEOPLE_ERROR,
  FETCH_ALL_USERS,
  UPDATE_USER,
  DELETE_USER,
  PeopleRedux,
} from './types';
import { PIM_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { toggleAlert } from '../alerts/action';
import { TOGGLE_DELETE_DIALOG } from '../dialog/types';
import { toggleApplicationDrawer } from '../drawer/action';
import { apiRequestWithRetry } from '../../utils/api-retry';

/**
 * action.ts provides the action methods for the People page
 *
 * @author Roopa HS
 * @author Mallisetty Subbaiah
 * @author Sudula Prakash
 */

/**
 * Fetch the list of People from Keep.
 */
export function fetchPeople() {
  return async (dispatch: Dispatch) => {
    try {
      const response = await apiRequestWithRetry(() =>
        axios
          .get(`${PIM_KEEP_API_URL}/public/people?documents=true`, {
            headers: {
              Authorization: `Bearer ${getToken()}`,
              Accept: 'application/json',
            },
          })
      )
      // Use the data to build a list of rows for display
      const peopleRows = buildRows(response.data);

      // Update People state
      dispatch(savePeoplesList(peopleRows));
    } catch (err: any) {
      // Use the Keep response error if it's available
      if (err.response && err.response.statusText) {
        console.log(`Error reading People: ${err.response.statusText}`);
        dispatch(
          toggleAlert(`Error reading People: ${err.response.statusText}`)
        );
      }

      // Otherwise use the generic error
      else {
        console.log(`Error reading People: ${err.message}`);
        dispatch(toggleAlert(`Error reading People: ${err.message}`));
      }
    }
  };
}

/**
 * Use the response to build a list of rows for the DataGrid
 *
 * @param peoples the list of People
 */
export function buildRows(peoples: any) {
  const peopleList: Array<any> = [];
  peoples.forEach((people: any) => {
    peopleList.push({
      id: people['@unid'],
      firstName: people.FirstName,
      lastName: people.LastName,
      internetAddress: people.InternetAddress,
      mailDomain: people.MailDomain,
      mailFile: people.MailFile,
      lastModified: people['@lastmodified'],
      personName: `${people.LastName} , ${people.FirstName}`,
    });
  });
  return peopleList;
}

/**
 * Save the People list for display in the UI
 */
export function savePeoplesList(peopleRows: any) {
  return {
    type: FETCH_ALL_USERS,
    payload: peopleRows,
  };
}

/**
 * Create People and check for errors
 *
 * @param peopleData the values needed for the Create
 */
export const addPeople = (peopleData: any) => {
  return async (dispatch: Dispatch) => {
    try {
      const response = await apiRequestWithRetry(() =>
        axios
          .post(`${PIM_KEEP_API_URL}/public/person`, peopleData, {
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json',
            },
          })
      )
      const peopleReduxData: PeopleRedux = {
        id: response.data.unid,
        firstName: peopleData.FirstName,
        lastName: peopleData.LastName,
        shortName: peopleData.ShortName,
        password: peopleData.HTTPPassword,
        companyName: peopleData.CompanyName,
        phoneNumber: peopleData.PhoneNumber,
        internetAddress: peopleData.InternetAddress,
        mailAddress: peopleData.MailAddress,
      };
      dispatch({
        type: ADD_USER,
        payload: peopleReduxData,
      });
      dispatch(toggleApplicationDrawer());
      dispatch(
        toggleAlert(`${peopleData.FirstName} has been successfully created`)
      );
    } catch (err: any) {
      // Use the Keep response error if it's available
      if (err.response && err.response.statusText) {
        console.log(`Error Creating People: ${err.response.statusText}`);
        dispatch(
          toggleAlert(`Error Creating People: ${err.response.statusText}`)
        );
      }

      // Otherwise use the generic error
      else {
        console.log(`Error Creating People: ${err.message}`);
        dispatch(toggleAlert(`Error Creating People: ${err.message}`));
      }
    }
  };
};
/**
 * Clear an Application error
 */
export function clearPeopleError() {
  return {
    type: CLEAR_PEOPLE_ERROR,
  };
}

export function toggleDeleteDialog() {
  return {
    type: TOGGLE_DELETE_DIALOG,
  };
}

/**
 * Update People and check for errors
 *
 * @param personId the user to update
 * @param peopleData the values needed for the Create
 */
export function updatePeople(personId: string, peopleData: any) {
  return async (dispatch: Dispatch) => {
    try {
      const response = await apiRequestWithRetry(() =>
        axios
          .post(`${PIM_KEEP_API_URL}/public/person/${personId}`, peopleData, {
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json',
            },
          })
      )
      const peopleReduxData: PeopleRedux = {
        id: response.data.unid,
        firstName: peopleData.FirstName,
        lastName: peopleData.LastName,
        shortName: peopleData.ShortName,
        password: peopleData.HTTPPassword,
        companyName: peopleData.CompanyName,
        phoneNumber: peopleData.PhoneNumber,
        internetAddress: peopleData.InternetAddress,
        mailAddress: peopleData.MailAddress,
      };
      dispatch({
        type: UPDATE_USER,
        payload: peopleReduxData,
      });
      dispatch(toggleApplicationDrawer());
      dispatch(
        toggleAlert(`${peopleData.FirstName} has been updated successfully`)
      );
    } catch (err: any) {
      // Use the Keep response error if it's available
      if (err.response && err.response.statusText) {
        console.log(`Error Updating People: ${err.response.statusText}`);
        dispatch(
          toggleAlert(`Error Updating People: ${err.response.statusText}`)
        );
      }
      // Otherwise use the generic error
      else {
        console.log(`Error Updating People: ${err.message}`);
        dispatch(toggleAlert(`Error Updating People: ${err.message}`));
      }
    }
  };
}

/**
 * Delete a People and check for errors
 *
 * @param personId the user to delete
 */
export function deletePeople(personId: string) {
  return async (dispatch: Dispatch) => {
    try {
      await apiRequestWithRetry(() =>
        axios
          .delete(`${PIM_KEEP_API_URL}/public/person/${personId}`, {
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json',
            },
          })
      )
      dispatch({ type: DELETE_USER, payload: personId });
      dispatch(toggleAlert(`User Deleted Successfully`));
      // Close the Delete confirmation Dialog
      dispatch(toggleDeleteDialog());
    } catch (err: any) {
      // Close the Delete confirmation Dialog
      dispatch(toggleDeleteDialog());

      // Use the Keep response error if it's available
      if (err.response && err.response.statusText) {
        console.log(`Error deleting in User: ${err.response.statusText}`);
        dispatch(
          toggleAlert(`Error deleting in User: ${err.response.statusText}`)
        );
      }

      // Otherwise use the generic error
      else {
        console.log(`Error deleting in User: ${err.message}`);
        dispatch(toggleAlert(`Error deleting in User: ${err.message}`));
      }
    }
  };
}
