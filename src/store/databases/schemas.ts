/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
import { Database } from './types';
import { toggleAlert } from '../alerts/action';
import { SETUP_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { setApiLoading, toggleDeleteDialog } from '../dialog/action';
import { apiRequestWithRetry } from '../../utils/api-retry';
import { encodeQueryValue } from '../../utils/common';
import { log, setDBError, clearDBError } from './shared';
import {
  addNewSchemaToState,
  addSchema as addSchemaAction,
  clearSchemaForm,
  deleteSchema as deleteSchemaAction,
  setOnlyShowSchemasWithScopes as setOnlyShowSchemasWithScopesAction,
  updateError
} from './reducer';

/**
 * action.ts provides the action methods for the Database page
 *
 * @author Michael Angelo Silva
 * @author Neil Schultz
 *
 */

export function addSchemas(database: Database) {
  return addSchemaAction(database);
}
export function deleteSchema(dbData: any) {
  return async (dispatch: Dispatch) => {
    dispatch(setApiLoading(true));
    // NEED UPDATE DEL
    const { nsfPath, schemaName } = dbData;
    if (nsfPath && schemaName) {
      try {
        try {
          const { response, data } = await apiRequestWithRetry(() =>
            fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${encodeQueryValue(nsfPath)}&configName=${encodeQueryValue(schemaName)}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
              },
            }), { notifyOnError: false })

          if (!response.ok) {
            throw new Error(JSON.stringify(data))
          }

          dispatch(deleteSchemaAction({
              schemaName: dbData.schemaName,
              nsfPath: dbData.nsfPath
            }));
          dispatch(toggleDeleteDialog());
          dispatch(setApiLoading(false));
          dispatch(toggleAlert(`${dbData.schemaName} has been successfully deleted.`));
        } catch (e: any) {
          const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
          const error = JSON.parse(err)
          
          dispatch(setApiLoading(false));
          dispatch(toggleDeleteDialog());
          dispatch(toggleAlert(`Delete schema failed! ${error.message}`));
        }
      } catch {
        dispatch(setApiLoading(false));
        dispatch(toggleDeleteDialog());
        dispatch(toggleAlert(`Delete schema failed!`));
      }
    } else {
      // The flag is set before these are validated, so returning early without clearing
      // it stranded the screen on a call that never went out.
      dispatch(setApiLoading(false));
      log.error('Delete schema called without an nsfPath or schemaName', { dbData });
    }
  };
}
/**
 * Retrieves views for a particular database and
 * passes them to Redux.
 *
 * @param nsfPath             the name of the database
 * @param schemaName          the name of the schema
 * @param setSchemaCallback   callback to set the schema state
 */
export const fetchSchema = (nsfPath: string, schemaName: string, setSchemaData: (schemaData: any) => void) => {
  return async (dispatch: Dispatch) => {
    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${encodeQueryValue(nsfPath)}&configName=${encodeQueryValue(schemaName)}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json',
          },
        })
      )

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      setSchemaData(data);
      dispatch(setApiLoading(false));
    } catch (e: any) {
      // The old JSON.parse over the stringified error threw for anything that was not a
      // JSON body, so this handler failed and the rejection escaped the thunk.
      log.error('Error fetching schema', { error: e?.message ?? String(e) });
    }
  };
};
export const sortAndRemoveDupSchemas = (origSchemas: Array<any>) => {
  origSchemas.sort((schemaA, schemaB) => {
    if (schemaA.schemaName !== schemaB.schemaName) {
      return schemaA.schemaName ? schemaA.schemaName.localeCompare(schemaB.schemaName) : -1;
    } else if (schemaA.nsfPath !== schemaB.nsfPath) {
      return schemaA.nsfPath ? schemaA.nsfPath.localeCompare(schemaB.nsfPath) : -1;
    } else {
      return 0;
    }
  });
  for (var index = origSchemas.length - 1; index >= 1; index--) {
    if (
      origSchemas[index].nsfPath === origSchemas[index - 1].nsfPath &&
      origSchemas[index].schemaName === origSchemas[index - 1].schemaName
    )
      origSchemas.splice(index, 1);
  }
};
/**
 * Add Database and check for errors
 */
export const addSchema = (dbData: any, resetCallback?: () => void) => {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(setApiLoading(true));
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${encodeQueryValue(dbData.nsfPath)}&configName=${encodeQueryValue(dbData.schemaName)}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dbData),
        }), { notifyOnError: false })

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      dispatch(addSchemaAction(data));

      if (response.status === 200) {
        dispatch(addNewSchemaToState({
            schemaName: data.schemaName,
            nsfPath: data.nsfPath
          }));
        dispatch(clearSchemaForm(true));
        if (resetCallback) {
          resetCallback();
        }
      }
      dispatch(toggleAlert(`${dbData.schemaName} has been successfully created.`));

      dispatch(setApiLoading(false));
      dispatch(clearDBError());
    } catch (e: any) {
      // `setApiLoading(true)` is dispatched on entry and was only cleared on the success
      // path, so a failed create left the eight screens reading `dialog.loading` stuck.
      dispatch(setApiLoading(false));

      const raw = e?.message ?? String(e);
      let message = raw;
      try {
        message = JSON.parse(raw).message ?? raw;
      } catch {
        // Not a JSON body — the raw text is the best message available.
      }

      log.error('Error adding schema', { error: message })
      dispatch(setDBError(message));

      dispatch(clearSchemaForm(false));
      dispatch(toggleAlert(`Unable to create schema ${dbData.schemaName}!`))
    }
  };
};
/**
 * Update schema to server and check for errors
 */
export const updateSchema = (schemaData: any, setSchemaData?: (data: any) => void) => {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(setApiLoading(true));
      dispatch(updateError(false));
      try {
        const { response, data } = await apiRequestWithRetry(() =>
          fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${encodeQueryValue(schemaData.nsfPath)}&configName=${encodeQueryValue(schemaData.schemaName)}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(schemaData),
          }), { notifyOnError: false })

        if (!response.ok) {
          throw new Error(JSON.stringify(data))
        }

        if (setSchemaData) {
          setSchemaData(data);
        }
        dispatch(addNewSchemaToState({
            schemaName: data.schemaName,
            nsfPath: data.nsfPath
          }));
        dispatch(setApiLoading(false));
        dispatch(toggleAlert(`Schema has been successfully updated.`));
      } catch (e: any) {
        // Cleared here as well as on the success path above; without it a failed update
        // left `dialog.loading` on for good.
        dispatch(setApiLoading(false));

        const raw = e?.message ?? String(e);
        let message = raw;
        try {
          message = JSON.parse(raw).message ?? raw;
        } catch {
          // Not a JSON body — the raw text is the best message available.
        }

        dispatch(toggleAlert(`Update schema failed! ${message}`));
        dispatch(updateError(true));
      }
    } catch (err: any) {
      dispatch(setApiLoading(false));
      // Use the response error if it's available
      if (err.response && err.response.statusText) {
        dispatch(setDBError(err.response.statusText));
      } else {
        dispatch(setDBError(err.message));
      }
    }
  };
};
/**
 * Set only show schemas configured with scopes
 */
export function setOnlyShowSchemasWithScopes(onlyShowSchemasWithScopes: boolean) {
  return setOnlyShowSchemasWithScopesAction(onlyShowSchemasWithScopes);
}
