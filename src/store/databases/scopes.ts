/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
import { toggleDrawer } from '../drawer/action';
import { AppState } from '..';
import { toggleAlert, closeSnackbar } from '../alerts/action';
import { SETUP_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { setApiLoading, toggleDeleteDialog, toggleErrorDialog } from '../dialog/action';
import { toggleSettings } from '../dbsettings/action';
import { apiRequestWithRetry } from '../../utils/api-retry';
import { log, getErrorMsg, setDBError, clearDBError } from './shared';
import { sortAndRemoveDupSchemas } from './schemas';
import {
  addScope as addScopeAction,
  updateScope as updateScopeAction,
  deleteScope as deleteScopeAction,
  fetchKeepDatabases,
  fetchKeepScopes,
  resetForm,
  setPullScope as setPullScopeAction,
} from './reducer';

export function deleteScope(apiName: string) {
  return async (dispatch: Dispatch) => {
    dispatch(setApiLoading(true));
    try {
      // NEED UPDATE DEL
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/admin/scope?scopeName=${apiName}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
        }), { notifyOnError: false })

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      dispatch(deleteScopeAction(apiName));
      dispatch(setApiLoading(false));
      dispatch(toggleDeleteDialog());
      dispatch(toggleDrawer());
      dispatch(toggleAlert(`${apiName} has been successfully deleted.`));
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)
      dispatch(setApiLoading(false));
      dispatch(toggleDeleteDialog());
      dispatch(toggleAlert(`Delete scope failed! ${error.message}`));
    }
  };
}
export const setPullScope = (scopePull: boolean) => {
  return setPullScopeAction(scopePull);
};
export const fetchScope = async (scopeData: any) => {
  const { apiName } = scopeData;
  try {
    const { response, data } = await apiRequestWithRetry(() =>
      fetch(`${SETUP_KEEP_API_URL}/admin/scope?scopeName=${apiName}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
      })
    )
    const scopes = data

    if (!response.ok) {
      throw new Error(JSON.stringify(scopes))
    }

    const { schemaName, nsfPath, isActive, icon, iconName, description, formulaEngine } = scopes;
    return {
      apiName: apiName,
      schemaName: schemaName,
      nsfPath,
      description,
      isActive: isActive,
      icon,
      iconName,
      formulaEngine,
      isFetch: false,
      isModeFetch: false,
      modes: []
    };
  } catch (e: any) {
    const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
    const error = JSON.parse(err)
    log.error(`Error fetching scope ${apiName}`, { error });
  }
};
export const fetchScopes = () => {
  return async (dispatch: Dispatch) => {
    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/admin/scopes?adminInfo=true`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
        })
      )
      const scopes = data

      if (!response.ok) {
        throw new Error(JSON.stringify(scopes))
      }

      var pulled = false;
      if (scopes && scopes.length > 0) {
        let simpleSchemas = scopes
          .filter((scope: any) => scope.apiName !== 'keepconfig')
          .map((scope: any) => {
            return {
              agents: [],
              forms: [],
              views: [],
              modes: [],
              schemaName: scope.schemaName,
              nsfPath: scope.nsfPath,
              isActive: scope.isActive
            };
          });
        sortAndRemoveDupSchemas(simpleSchemas);
        // Once summary of scopes and schemas fetched, dispatch them to refresh UI first
        dispatch(fetchKeepDatabases([]));
        dispatch(fetchKeepScopes(scopes));

        // Begin fetch detailed schemas and refresh store
        simpleSchemas.forEach(() => {
          dispatch(setPullScope(true));
          if (!pulled) {
            pulled = true;
            dispatch(setPullScope(true));
          }
        });
      } else {
        dispatch(setPullScope(true));
      }
    } catch (e: any) {
      // Reports rather than propagates. Both callers in Views.tsx dispatch this
      // fire-and-forget with no .catch, so rethrowing surfaced as an unhandled
      // rejection and the user saw nothing at all -- the `if (err) throw err`
      // that used to sit here fired on every path, making the dispatch below it
      // unreachable (#818).
      dispatch(toggleErrorDialog(errorDialogMessage(e)));
    }
  };
};

/**
 * `status`, not `statusCode`: nothing in this codebase writes `statusCode`, so the
 * dialog would have read "undefined: ..." had it ever opened. The parse is guarded
 * because only the `!response.ok` throw above carries a JSON body -- anything else
 * reaching the catch is a plain message.
 */
function errorDialogMessage(e: any): string {
  const raw = e?.message ?? String(e);
  try {
    const body = JSON.parse(raw);
    return body?.status ? `${body.status}: ${body.message}` : (body?.message ?? raw);
  } catch {
    return raw;
  }
}
/**
 * Change Scope(API Name) and check for errors
 */
export const changeScope = (dbData: any, isEdit?: boolean) => {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(setApiLoading(true));
      dispatch(clearDBError());
      try {
        const { response, data } = await apiRequestWithRetry(() =>
          fetch(`${SETUP_KEEP_API_URL}/admin/scope`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(dbData),
          })
        )

        if (!response.ok) {
          throw new Error(JSON.stringify(data))
        }

        const omitKeys = [
          '@noteid',
          '@created',
          '@lastmodified',
          '@revision',
          '@lastaccessed',
          '@size',
          '@unread',
          '@etag',
          '$UpdatedBy'
        ];
        const keepData = Object.keys(data).reduce((acc, key) => {
          if (!omitKeys.includes(key)) {
            acc[key] = data[key];
          }
          return acc;
        }, {} as { [key: string]: any });
        // A conditional action type, so it needs the branch rather than a
        // rewrite: `isEdit ? updateScope : addScope` picks the creator.
        dispatch(isEdit ? updateScopeAction(keepData) : addScopeAction(keepData));
  
        dispatch(toggleDrawer());
        dispatch(
          isEdit
            ? toggleAlert(`${dbData.apiName} has been successfully updated.`)
            : toggleAlert(`${dbData.apiName} has been successfully created.`)
        );
  
        dispatch(setApiLoading(false));
      } catch (e: any) {
        // Cleared before the parse below, not after: JSON.parse throws on any
        // non-JSON error, and a handler that throws never reaches its own tail.
        dispatch(setApiLoading(false));
        const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
        const error = JSON.parse(err)

        dispatch(setDBError(getErrorMsg(error.message)));
      }
    } catch (err: any) {
      // Use the response error if it's available
      dispatch(setApiLoading(false));
      dispatch(setDBError(getErrorMsg(err)));
    }
  };
};
export const updateScope = (active: boolean, data?: any) => {
  return async (dispatch: Dispatch, getState: () => AppState) => {
    dispatch(closeSnackbar());
    dispatch(setApiLoading(true));
    const { contextViewIndex, scopes } = getState().databases;
    const { apiName, schemaName, nsfPath, description } = scopes[contextViewIndex];

    const formData = {
      apiName,
      schemaName,
      isActive: active ? true : false,
      description,
      nsfPath
    };

    const apiData = data
      ? {
          ...data,
          isActive: active ? true : false
        }
      : formData;

    // Reset Form
    if (!data)
      dispatch(resetForm({
          dbName: apiName
        }));

    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/admin/scope`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiData),
        })
      )
      const scopeData = data

      if (!response.ok) {
        throw new Error(JSON.stringify(scopeData))
      }

      dispatch(setApiLoading(false));
      dispatch(updateScopeAction({ ...scopeData, index: contextViewIndex }));
      dispatch(toggleAlert(`${apiName} has been successfully updated.`));
      if (data) dispatch(toggleSettings());
    } catch (e: any) {
      // As in changeScope: clear the flag before anything that can throw.
      dispatch(setApiLoading(false));
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      log.error('Error updating scope', { error })
    }
  };
};
