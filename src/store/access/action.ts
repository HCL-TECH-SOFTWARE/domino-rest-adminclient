/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
import { ADMIN_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { toggleUsersLoading } from '../loading/action';
import { SET_USERS } from './types';
import { apiRequestWithRetry } from '../../utils/api-retry';

export function fetchUsers (startsWith?: string) {
  const callUrl = startsWith?.length === 0 ? `${ADMIN_KEEP_API_URL}/access/users` : 
                  startsWith ? `${ADMIN_KEEP_API_URL}/access/users?startsWith=${startsWith}` : `${ADMIN_KEEP_API_URL}/access/users`;
  return async (dispatch: Dispatch) => {
    dispatch(toggleUsersLoading());
    try {
      const response = await apiRequestWithRetry(() =>
        fetch(callUrl, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json'
          },
        })
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      dispatch({
        type: SET_USERS,
        payload: data,
      })
      dispatch(toggleUsersLoading());
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)
      console.error(error);
    }
  }
}
