/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
import { INIT_STATE } from './types';
import { setLoading, toggleDetailsLoading } from '../loading/action';
import { toggleQuickConfigDrawer } from '../drawer/action';
import { AppState } from '..';
import { toggleAlert } from '../alerts/action';
import { SETUP_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { setApiLoading } from '../dialog/action';
import { AlertManager } from '../../utils/common';
import { getAppIcons, loadAppIcons } from '../../services/app-icons';
import { apiRequestWithRetry } from '../../utils/api-retry';
import { log, setDBError, clearDBError } from './shared';
import {
  addAvailableDatabase,
  addNewSchemaToState,
  addNsfDesign as addNsfDesignAction,
  addSchema,
  addScope,
  fetchDbConfig,
  fetchKeepPermissions as fetchKeepPermissionsAction,
  setDbIndex as setDbIndexAction,
  setPullDatabase as setPullDatabaseAction,
  setRetryCount,
  updateSchema
} from './reducer';

export function setDbIndex(index: number) {
  return setDbIndexAction(index);
}
export const setPullDatabase = (databasePull: boolean) => {
  return setPullDatabaseAction(databasePull);
};
const processResponse = async (response: any, dispatch: Dispatch, scopeList: Array<any>) => {
  // `displayResult` puts the base64 payload in the store next to `iconName`, and it runs
  // synchronously per streamed chunk. Resolving the lazy icon chunk (#772) once, here,
  // lets everything downstream keep reading it synchronously without threading a promise
  // through `processText` → `processBuffer` → `processPart`. By this point the warm-up in
  // `index.tsx` has almost always finished, so this awaits an already-settled promise; if
  // the chunk failed to load the stream still processes, just with empty `icon` fields —
  // every render path resolves its own icon from `iconName` anyway.
  await loadAppIcons().catch(() => {});

  const reader = response.body.getReader();
  const td = new TextDecoder('utf-8');
  let buffer = '';

  reader.read().then(async function processText({ done, value, schemasWithoutScopes }: any) {
    schemasWithoutScopes = [];
    if (done) {
      schemasWithoutScopes = [...schemasWithoutScopes, processBuffer(buffer, dispatch, scopeList, schemasWithoutScopes, true)];
      // remove undefined nsfPaths and schemaNames
      schemasWithoutScopes = schemasWithoutScopes[0].filter((db: any) => !!db.nsfPath && !!db.schemaName);

      const chunkSize = 20;
      for (let i = 0; i < schemasWithoutScopes.length; i += chunkSize) {
        const chunk = schemasWithoutScopes.slice(i, i + chunkSize);
        const stringChunk = chunk.map((c: any) => JSON.stringify(c));
        const uniqueChunk = [...new Set(stringChunk)].map((c: any) => JSON.parse(c));
        setTimeout(() => {
          dispatch(updateSchema(uniqueChunk));
        });
      }

      dispatch(setPullDatabase(true));
      return;
    }

    try {
      let decoded = td.decode(value);
      buffer += decoded;
      dispatch(setLoading({ status: false }));
    } catch (e) {
      // A malformed chunk must not kill the stream: `processText` recurses per chunk, so
      // throwing here would abandon the rest of the response silently. Log and continue
      // to the next chunk instead.
      log.error('failed to decode a chunk of the design stream', { error: e });
    }

    return reader.read().then(processText);
  });
};
const processBuffer = (
  buffer: string,
  dispatch: Dispatch,
  scopeList: Array<any>,
  schemasWithoutScopes: Array<any>,
  lastLine: boolean
) => {
  let newArray = lastLine ? buffer.split('\n') : buffer.split('\n').slice(0, -1);
  newArray.forEach((part) => {
    let processedPart = processPart(part, dispatch, displayResult, scopeList, schemasWithoutScopes);
    if (processedPart) schemasWithoutScopes = [...schemasWithoutScopes, processedPart];
  });
  buffer = newArray[newArray.length - 1];
  return schemasWithoutScopes;
};
const processPart = (part: string, dispatch: Dispatch, callback: any, scopeList: Array<any>, schemasWithoutScopes: Array<any>) => {
  if (part.endsWith(',')) return callback(JSON.parse(part.slice(0, -1)), dispatch, scopeList, schemasWithoutScopes);
  else if (part.endsWith('}')) return callback(JSON.parse(part), dispatch, scopeList, schemasWithoutScopes);
};
const displayResult = (json: any, dispatch: Dispatch, scopeList: Array<any>, schemasWithoutScopes: Array<any>) => {
  if (!!json.configurations && json.configurations.length > 0) {
    // Already resolved: `processResponse` awaited the icon chunk before opening the stream.
    const appIcons = getAppIcons();
    const { configurations } = json;
    let schemasWithScopes: Array<{
      schemaName: string;
      description: string;
      iconName: string;
      icon: string;
      nsfPath: string;
    }> = [];
    configurations.forEach((config: any) => {
      let schema = typeof config === 'string' ? config : config.name;
      if (!!json.path && !!schema) {
        if (scopeList.includes(json.path + ':' + schema)) {
          const new_config = {
            schemaName: config.name,
            description: config.description,
            iconName: config.iconName,
            icon: appIcons[config.iconName],
            nsfPath: json.path
          };
          schemasWithScopes.push(new_config);
        } else {
          schemasWithoutScopes.push({
            nsfPath: json.path,
            schemaName: schema,
            description: config.description,
            iconName: config.iconName,
            icon: appIcons[config.iconName]
          });
        }
      }
    });

    const chunkSize = 20;
    for (let i = 0; i < schemasWithScopes.length; i += chunkSize) {
      const chunk = schemasWithScopes.slice(i, i + chunkSize);
      const stringChunk = chunk.map((c) => JSON.stringify(c));
      const uniqueChunk = [...new Set(stringChunk)].map((c) => JSON.parse(c));

      setTimeout(() => {
        dispatch(updateSchema(uniqueChunk));
      });
    }
  }

  let availableDatabases = {
    title: json.path,
    nsfpath: json.path,
    apinames: json.configurations ? json.configurations : []
  };
  let { apinames } = availableDatabases;
  availableDatabases.apinames = apinames.map((apiName: any) => {
    if (typeof apiName === 'string') return apiName;
    else return apiName.name;
  });
  dispatch(addAvailableDatabase(availableDatabases));

  return schemasWithoutScopes;
};
export const fetchKeepDatabases = () => {
  return async (dispatch: Dispatch, getState: () => AppState) => {
    dispatch(setLoading({ status: true }));

    const payload = {
      checkAllNsf: true,
      onlyConfigured: false
    };

    const { scopes } = getState().databases;

    const scopeList = scopes.map((scope) => {
      return scope.nsfPath + ':' + scope.schemaName;
    });

    try {
      const response = await fetch(`${SETUP_KEEP_API_URL}/admin/access`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if(response.status === 401) {
        localStorage.removeItem('user_token')
        AlertManager.showAlert("Invalid credentials. Going back to the login page.");
        window.location.reload();
        return
      }

      processResponse(response, dispatch, scopeList);
    } catch {
        const response = await fetch(`${SETUP_KEEP_API_URL}/admin/access`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
        processResponse(response, dispatch, scopeList);
    }
  };
};
/**
 * Add Database and check for errors
 */
export const quickConfig = (dbData: any) => {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(setApiLoading(true));
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/admin/quickconfig`, {
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

      const propertiesToOmit = [
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
        if (!propertiesToOmit.includes(key)) {
          acc[key] = data[key];
        }
        return acc;
      }, {} as { [key: string]: any });

      const {
        unid,
        agents,
        allowCode,
        allowDecryption,
        description,
        dqlAccess,
        dalFormula,
        forms,
        formulaEngine,
        icon,
        iconName,
        isActive,
        nsfPath,
        openAccess,
        owners,
        requireRevisionToUpdate,
        schemaName,
        views,
        Form,
        Type,
        apiName,
        server
      } = keepData;
      const meta = keepData['@meta'];
      const schemaData = {
        unid,
        agents,
        allowCode,
        allowDecryption,
        description,
        dqlAccess,
        dalFormula,
        forms,
        formulaEngine,
        icon,
        iconName,
        isActive,
        nsfPath,
        openAccess,
        owners,
        requireRevisionToUpdate,
        schemaName,
        views
      };
      const scopeData = {
        '@meta': meta,
        Form,
        Type,
        apiName,
        description,
        icon,
        iconName,
        isActive,
        nsfPath,
        schemaName,
        server
      };

      dispatch(addSchema(schemaData));

      dispatch(addScope(scopeData));

      dispatch(toggleQuickConfigDrawer());

      if (response.status === 200) {
        dispatch(addNewSchemaToState({
            schemaName: schemaName,
            nsfPath: nsfPath
          }));
      }

      dispatch(toggleAlert(`${schemaName} and ${dbData.scopeName} have been successfully created.`));

      dispatch(setApiLoading(false));
      dispatch(clearDBError());
    } catch (e: any) {
      // Before the parse, which throws on any non-JSON error and would take the
      // rest of this handler with it.
      dispatch(setApiLoading(false));
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      // Use the response error if it's available
      if (err) {
        dispatch(setDBError(error.message));
      }
    }
  };
};
export const fetchDBConfig = (config: string) => {
  return async (dispatch: Dispatch) => {
    dispatch(setApiLoading(true));
    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/scope?dataSource=${config}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json',
          },
        })
      )
      const dbConfig = data

      if (!response.ok) {
        throw new Error(JSON.stringify(dbConfig))
      }

      dispatch(fetchDbConfig(dbConfig));
      dispatch(setApiLoading(false));
      dispatch(toggleDetailsLoading());
    } catch (e: any) {
      // Before the parse, which throws on any non-JSON error and would take the
      // rest of this handler with it.
      dispatch(setApiLoading(false));
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      log.error('Error fetching database configuration', { error });
    }
  };
};
export const retry = (count: number) => {
  return setRetryCount(count);
};
/**
 * Add Nsf design
 */
export function addNsfDesign(nsfPath: string, nsfDesign: any) {
  return addNsfDesignAction({
      nsfPath,
      nsfDesign
    });
}
export const fetchKeepPermissions = () => {
  return async (dispatch: Dispatch) => {
    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/admin/access`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json',
          },
        })
      )

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      dispatch(fetchKeepPermissionsAction({
          createDbMapping: data.CreateDbMapping,
          deleteDbMapping: data.DeleteDbMapping
        }));
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      log.error('Error fetching Keep permissions', { error })
    }
  };
};
export const initState = () => {
  return {
    type: INIT_STATE
  };
};
