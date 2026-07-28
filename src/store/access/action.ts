/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
import { ADMIN_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { toggleUsersLoading } from '../loading/action';
import { SET_USERS } from './types';
import { apiRequestWithRetry } from '../../utils/api-retry';
import { getLogger } from '../../services/log-service';

const log = getLogger('store/access');

export function fetchUsers (startsWith?: string) {
  const callUrl = startsWith?.length === 0 ? `${ADMIN_KEEP_API_URL}/access/users` : 
                  startsWith ? `${ADMIN_KEEP_API_URL}/access/users?startsWith=${startsWith}` : `${ADMIN_KEEP_API_URL}/access/users`;
  return async (dispatch: Dispatch) => {
    dispatch(toggleUsersLoading());
    try {
      const { response, data, error } = await apiRequestWithRetry(() =>
        fetch(callUrl, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json'
          },
        })
      )

      // apiRequestWithRetry does not rethrow a failed request, it returns a null
      // response — so this has to be checked before `.ok`.
      if (!response) {
        throw new Error(error ?? 'the request did not complete')
      }
      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      dispatch({
        type: SET_USERS,
        payload: data,
      })
      dispatch(toggleUsersLoading());
    } catch (e: any) {
      // `usersLoading` is a toggle, not a set: without this second flip the users list
      // spins forever on any failure.
      dispatch(toggleUsersLoading());
      // Plain `e.message`. The old `toString().replace('Error: ', '')` cut the substring
      // wherever it appeared ("TypeError: x" became "Typex"), and the JSON.parse that
      // followed it threw inside this handler, so failures were never logged at all.
      log.error('Error fetching users', { error: e?.message ?? String(e) });
    }
  }
}
