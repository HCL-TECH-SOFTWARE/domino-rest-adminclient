/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
import axios from 'axios';
import { ADMIN_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { toggleUsersLoading } from '../loading/action';
import { SET_USERS } from './types';

export function fetchUsers (startsWith?: string) {
  const callUrl = startsWith?.length === 0 ? `${ADMIN_KEEP_API_URL}/access/users` : 
                  startsWith ? `${ADMIN_KEEP_API_URL}/access/users?startsWith=${startsWith}` : `${ADMIN_KEEP_API_URL}/access/users`;
  return async (dispatch: Dispatch) => {
    dispatch(toggleUsersLoading());
    await axios
      .get(callUrl, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          Accept: 'application/json'
        }
      })
      .then((res) => {
        dispatch({
          type: SET_USERS,
          payload: res.data,
        })
        dispatch(toggleUsersLoading());
        console.log(res.data);
        // return res.data
      })
      .catch((err) => {
        console.error(err);
      });
  }
}
