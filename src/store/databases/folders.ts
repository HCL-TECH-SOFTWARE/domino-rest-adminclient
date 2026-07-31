/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import type { Dispatch } from '@reduxjs/toolkit';
import { SETUP_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { apiRequestWithRetry } from '../../utils/api-retry';
import { encodeQueryValue } from '../../utils/common';
import { log } from './shared';
import { setFolders as setFoldersAction } from './reducer';

/**
 * Retrieves folders for a particular database and
 * passes them to Redux.
 *
 * @param dbName the name of the schema
 * @param nsfPath the name of the database
 */
export const fetchFolders = (dbName: string, nsfPath: string) => {
  return async (dispatch: Dispatch) => {
    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/designlist/folders?nsfPath=${encodeQueryValue(nsfPath)}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json',
          },
        })
      )

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      dispatch(
        setFolders(
          dbName,
          data.folders.map((folder: any) => {
            let aliasArray: Array<any> = [];
            if (folder['@alias'] != null && folder['@alias'].length > 0) {
              if (Array.isArray(folder['@alias'])) {
                aliasArray = folder['@alias'];
              } else {
                aliasArray.push(folder['@alias']);
              }
            }
            return {
              viewName: folder['@name'],
              viewAlias: aliasArray,
              viewUnid: folder['@unid'],
              viewUpdated: folder['columns'] && folder['columns'].length ? true : false
            };
          })
        ) as any
      );
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)
      log.error('Error fetching folders', { error })
    }
  };
};
/**
 * Save a list of folders for a particular database
 *
 * @param dbname the database containing the views
 * @param views the array of views
 */
export const setFolders = (dbName: string, folders: Array<any>) => {
  return async (dispatch: any) => {
    await dispatch(setFoldersAction({
        db: dbName,
        folders
      }));
  };
};
