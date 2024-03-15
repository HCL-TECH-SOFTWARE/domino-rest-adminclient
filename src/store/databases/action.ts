/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
import axios, { AxiosResponse } from 'axios';
import _ from 'lodash';
import { v4 as uuid } from 'uuid';
import {
  Database,
  ADD_SCHEMA,
  ADD_SCOPE,
  ADD_NEW_SCHEMA_TO_STATE,
  SET_PULLED_DATABASE,
  SET_PULLED_SCOPE,
  FETCH_KEEP_DATABASES,
  ADD_AVAILABLE_DATABASE,
  DELETE_SCHEMA,
  DELETE_SCOPE,
  FETCH_DB_CONFIG,
  UPDATE_SCOPE,
  UPDATE_SCHEMA,
  SET_FORMS,
  ADD_FORM,
  SET_CURRENTFORMS,
  SET_LOADEDFORM,
  SET_LOADEDFIELDS,
  SET_ACTIVEFORM,
  ADD_ACTIVEFIELDS,
  SET_VIEWS,
  UPDATE_VIEW,
  SET_ACTIVEVIEWS,
  SET_AGENTS,
  UPDATE_AGENT,
  SET_ACTIVEAGENTS,
  CACHE_FORM_FIELDS,
  SET_RETRY_COUNT,
  CLEAR_FORMS,
  SET_DB_INDEX,
  SET_DB_ERROR,
  CLEAR_DB_ERROR,
  APPEND_CONFIGURED_FORM,
  RESET_FORM,
  CLEAR_FORMULA_RESULTS,
  ViewObj,
  AgentObj,
  UNCONFIG_FORM,
  FETCH_KEEP_SCOPES,
  ADD_NSF_DESIGN,
  SET_ONLY_SHOW_SCHEMAS_WITH_SCOPES,
  FETCH_KEEP_PERMISSIONS,
  INIT_STATE,
  CLEAR_SCHEMA_FORM,
  ADD_ACTIVEVIEW,
  DELETE_ACTIVEVIEW,
  VIEWS_ERROR,
  AGENTS_ERROR,
  ADD_ACTIVEAGENT,
  DELETE_ACTIVEAGENT,
  UPDATE_ERROR,
  SET_FORM_NAME,
  SET_FOLDERS,
} from './types';
import { setLoading } from '../loading/action';
import { toggleDrawer, toggleQuickConfigDrawer } from '../drawer/action';
import { AppState } from '..';
import { getFormIndex, getFormModeIndex } from './scripts';
import { TOGGLE_DRAWER } from '../drawer/types';
import { SET_VALUE, TOGGLE_DETAILS_LOADING } from '../loading/types';
import { toggleAlert, closeSnackbar } from '../alerts/action';
import { SETUP_KEEP_API_URL, BASE_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { setApiLoading, toggleDeleteDialog, toggleErrorDialog } from '../dialog/action';
import { toggleSettings } from '../dbsettings/action';
import {
  convert2FieldType,
  convertDesignType2Format
} from '../../components/access/functions';
import { fullEncode } from '../../utils/common';
import appIcons from '../../styles/app-icons';
import { SET_API_LOADING } from '../dialog/types';

/**
 * action.ts provides the action methods for the Database page
 *
 * @author Michael Angelo Silva
 * @author Neil Schultz
 *
 */

export function addSchemas(database: Database) {
  return {
    type: ADD_SCHEMA,
    payload: database
  };
}

export function setDbIndex(index: number) {
  return {
    type: SET_DB_INDEX,
    payload: index
  };
}

function getErrorMsg(error: any) {
  if (error) {
    if (error.response && error.response.statusText)
      return error.response.statusText;
    if (error.message) return error.message;
  }
  return '';
}

export function deleteScope(apiName: string) {
  return async (dispatch: Dispatch) => {
    dispatch(setApiLoading(true));
    // NEED UPDATE DEL
    axios
      .delete(`${SETUP_KEEP_API_URL}/admin/scope?scopeName=${apiName}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      })
      .then(() => {
        dispatch({
          type: DELETE_SCOPE,
          payload: apiName
        });
        dispatch(setApiLoading(false));
        dispatch(toggleDeleteDialog());
        dispatch(toggleDrawer());
        dispatch(toggleAlert(`${apiName} has been successfully deleted.`));
      })
      .catch((error: any) => {
        dispatch(setApiLoading(false));
        dispatch(toggleDeleteDialog());
        const errorMsg = getErrorMsg(error);
        dispatch(toggleAlert(`Delete scope failed! ${errorMsg}`));
      });
  };
}

export function deleteSchema(dbData: any) {
  return async (dispatch: Dispatch) => {
    dispatch(setApiLoading(true));
    // NEED UPDATE DEL
    const { nsfPath, schemaName } = dbData;
    if (nsfPath && schemaName) {
      try {
        axios
          .delete(
            `${SETUP_KEEP_API_URL}/schema?nsfPath=${nsfPath}&configName=${schemaName}`,
            {
              headers: {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
              }
            }
          )
          .then(() => {
            dispatch({
              type: DELETE_SCHEMA,
              payload: {
                schemaName: dbData.schemaName,
                nsfPath: dbData.nsfPath
              }
            });
            dispatch(toggleDeleteDialog());
            dispatch(setApiLoading(false));
            dispatch(
              toggleAlert(`${dbData.schemaName} has been successfully deleted.`)
            );
          })
          .catch((error: any) => {
            dispatch(setApiLoading(false));
            dispatch(toggleDeleteDialog());
            const errorMsg = getErrorMsg(error);
            dispatch(toggleAlert(`Delete schema failed! ${errorMsg}`));
          });
      } catch (err: any) {
        dispatch(setApiLoading(false));
        dispatch(toggleDeleteDialog());
        dispatch(toggleAlert(`Delete schema failed!`));
      }
    }
  };
}

export const setPullDatabase = (databasePull: boolean) => {
  return {
    type: SET_PULLED_DATABASE,
    payload: databasePull
  };
};

export const setPullScope = (scopePull: boolean) => {
  return {
    type: SET_PULLED_SCOPE,
    payload: scopePull
  };
};

export const fetchScope = async (scopeData: any) => {
  const { apiName } = scopeData;
  const scopes = await axios
    .get(`${SETUP_KEEP_API_URL}/admin/scope?scopeName=${apiName}`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      }
    })
    .then((res) => res.data);
  const {
    schemaName,
    nsfPath,
    isActive,
    icon,
    iconName,
    description,
    formulaEngine
  } = scopes;
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
};

export const fetchSchema2 = async (nsfPath: string, schemaName: string, setSchemaData: (schemaData: Database) => void) => {
  // const { nsfPath, schemaName } = schemaData;
  return async (dispatch: Dispatch) => {
    await axios
      .get(
        `${SETUP_KEEP_API_URL}/schema?nsfPath=${nsfPath}&configName=${schemaName}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          }
        }
      )
      .then((res) => {
        setSchemaData(res.data)
        dispatch({
          type: SET_API_LOADING,
          payload: false,
        })
    });
  }
  // const schema = await axios
  //   .get(
  //     `${SETUP_KEEP_API_URL}/schema?nsfPath=${nsfPath}&configName=${schemaName}`,
  //     {
  //       headers: {
  //         Authorization: `Bearer ${getToken()}`,
  //         'Content-Type': 'application/json'
  //       }
  //     }
  //   )
  //   .then((res) => res.data);
  // return {
  //   ...schema,
  //   schemaName: schemaName,
  //   nsfPath
  // };
};

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
      await axios
        .get(`${SETUP_KEEP_API_URL}/schema?nsfPath=${nsfPath}&configName=${schemaName}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json'
          }
        })
        .then((res) => {
          setSchemaData(res.data)
          dispatch({
            type: SET_API_LOADING,
            payload: false,
          })
        });
    } catch (err) {
      console.log(err);
    }
  };
};

const processResponse = (response: any, dispatch: Dispatch, scopeList: Array<any>) => {
  const reader = response.body.getReader();
  const td = new TextDecoder("utf-8");
  let buffer = "";
  
  reader.read().then(async function processText({ done, value, schemasWithoutScopes }: any) {
    schemasWithoutScopes = [];
    if (done) {
      schemasWithoutScopes = [...schemasWithoutScopes, processBuffer(buffer, dispatch, scopeList, schemasWithoutScopes, true)];
      // remove undefined nsfPaths and schemaNames
      schemasWithoutScopes = schemasWithoutScopes[0].filter((db: any) => !!db.nsfPath && !!db.schemaName);

      const chunkSize = 20;
      for (let i = 0; i < schemasWithoutScopes.length; i += chunkSize) {
          const chunk = schemasWithoutScopes.slice(i, i + chunkSize);
          const stringChunk = chunk.map((c: any) => JSON.stringify(c))
          const uniqueChunk = [...new Set(stringChunk)].map((c: any) => JSON.parse(c))
          setTimeout(() => {
            dispatch({
              type: UPDATE_SCHEMA,
              payload: uniqueChunk
            })
          })
      }
      
      dispatch(setPullDatabase(true));
      return;
    }

    try {
        let decoded = td.decode(value);
        buffer += decoded;
        dispatch({
          type: SET_VALUE,
          payload: { status: false }
        })
    }
    catch(e){
        //console.log("Exception:"+e);
    }

    return reader.read().then(processText);
  })
}

const processBuffer = (buffer: string, dispatch: Dispatch, scopeList: Array<any>, schemasWithoutScopes: Array<any>, lastLine: boolean) => {
  let newArray = lastLine ? buffer.split('\n') : buffer.split('\n').slice(0, -1);
  newArray.forEach(part => {
    let processedPart = processPart(part, dispatch, displayResult, scopeList, schemasWithoutScopes);
    if(!!processedPart) schemasWithoutScopes = [...schemasWithoutScopes, processedPart];
  });
  buffer = newArray[newArray.length - 1];
  return schemasWithoutScopes
}

const processPart = (part: string, dispatch: Dispatch, callback: any, scopeList: Array<any>, schemasWithoutScopes: Array<any>,) => {
  if (part.endsWith(',')) return callback(JSON.parse(part.slice(0, -1)), dispatch, scopeList, schemasWithoutScopes);
  else if (part.endsWith('}')) return callback(JSON.parse(part), dispatch, scopeList, schemasWithoutScopes);
}

const displayResult = (json: any, dispatch: Dispatch, scopeList: Array<any>, schemasWithoutScopes: Array<any>) => {
  if (!!json.configurations && json.configurations.length > 0) {
    const { configurations } = json;
    let schemasWithScopes: Array<{
      schemaName: string;
      description: string;
      iconName: string;
      icon: string;
      nsfPath: string;
    }> = []
    configurations.forEach((config: any) => {
      let schema = typeof(config) === 'string' ? config : config.name;
      if (!!json.path && !!schema) {
        if (scopeList.includes(json.path + ':' + schema)) {
          const new_config = {
            schemaName: config.name,
            description: config.description,
            iconName: config.iconName,
            icon: appIcons[config.iconName],
            nsfPath: json.path,
          }
          schemasWithScopes.push(new_config)
        } else {
          schemasWithoutScopes.push({
            nsfPath: json.path,
            schemaName: schema,
            description: config.description,
            iconName: config.iconName,
            icon: appIcons[config.iconName],
          });
        }
      }
    });
    
    const chunkSize = 20;
    for (let i = 0; i < schemasWithScopes.length; i += chunkSize) {
        const chunk = schemasWithScopes.slice(i, i + chunkSize);
        const stringChunk = chunk.map((c) => JSON.stringify(c))
        const uniqueChunk = [...new Set(stringChunk)].map((c) => JSON.parse(c))
        
        setTimeout(() => {
          dispatch({
            type: UPDATE_SCHEMA,
            payload: uniqueChunk
          })
        })
    }
  }

  let availableDatabases = {
    title: json.path,
    nsfpath: json.path,
    apinames: json.configurations ? json.configurations : []
  }
  let { apinames } = availableDatabases;
  availableDatabases.apinames = apinames.map((apiName: any) => {
    if (typeof(apiName) === 'string') return apiName
    else return apiName.name
  });
  dispatch({
    type: ADD_AVAILABLE_DATABASE,
    payload: availableDatabases
  })

  return schemasWithoutScopes
}

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

    fetch(`${SETUP_KEEP_API_URL}/admin/access`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).then(async function respond(response) {
      processResponse(response, dispatch, scopeList)
    });
  }
}

const sortAndRemoveDupSchemas = (origSchemas: Array<any>) => {
  origSchemas.sort((schemaA, schemaB) => {
    if (schemaA.schemaName !== schemaB.schemaName) {
      return schemaA.schemaName
        ? schemaA.schemaName.localeCompare(schemaB.schemaName)
        : -1;
    } else if (schemaA.nsfPath !== schemaB.nsfPath) {
      return schemaA.nsfPath
        ? schemaA.nsfPath.localeCompare(schemaB.nsfPath)
        : -1;
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

export const fetchScopes = () => {
  return async (dispatch: Dispatch) => {
    const payload = {
      checkAllNsf: true,
      onlyConfigured: false
    };

    const scopes = await axios
      .get(`${SETUP_KEEP_API_URL}/admin/scopes?adminInfo=true`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          Accept: 'application/json'
        }
      })
      .then(async (res) => res.data)
      .catch((err) => {
        if (err.response && err.response.status === 401) throw err;
        dispatch(toggleErrorDialog(`${err.code}: ${err.message}`));
      });

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
      dispatch({
        type: FETCH_KEEP_DATABASES,
        payload: []
      });
      dispatch({
        type: FETCH_KEEP_SCOPES,
        payload: scopes
      });

      // Begin fetch detailed schemas and refresh store
      simpleSchemas.forEach((schema: any) => {
        dispatch(setPullScope(true));
        if(!pulled) {
          pulled = true;
          dispatch(setPullScope(true));
        }
      });
    } else {
      dispatch(setPullScope(true));
    }
  };
};

export function setLoadedForm(dbName: string, formName: string) {
  return {
    type: SET_LOADEDFORM,
    payload: {
      db: dbName,
      formName
    }
  };
}

/**
 * Save the list of fields for the currently loaded form.
 *
 * @param formName the form containing the fields
 * @param fields the array of fields
 */
export const setLoadedFields = (formName: string, fields: Array<any>) => {
  return async (dispatch: any) => {
    await dispatch({
      type: SET_LOADEDFIELDS,
      payload: {
        formName: formName,
        fields
      }
    });
  };
};

export function setActiveForm(dbName: string, formName: string) {
  return {
    type: SET_ACTIVEFORM,
    payload: {
      db: dbName,
      formName
    }
  };
}

/**
 * Add fields to the list of available fields
 * to add to a mode.
 *
 * @param formName the form containing the fields
 * @param fields the array of fields
 */
export const addActiveFields = (formName: string, fields: Array<any>) => {
  return async (dispatch: any) => {
    await dispatch({
      type: ADD_ACTIVEFIELDS,
      payload: {
        activeFields: {
          formName,
          fields
        }
      }
    });
  };
};

/**
 * Retrieves the fields for a particular form and
 * passes them to Redux.
 *
 * @param schemaName the name of the database
 * @param formName the unencoded name of the form
 */
export const fetchFields = (
  schemaName: string,
  nsfPath: string,
  formName: string,
  externalName: string,
  designType: string
) => {
  return async (dispatch: Dispatch) => {
    try {
      // Encode the form name
      const encodedFormName = fullEncode(formName);
      await axios
        .get(
          `${SETUP_KEEP_API_URL}/design/${designType}/${encodedFormName}?nsfPath=${nsfPath}`,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
              Accept: 'application/json'
            }
          }
        )
        .then((res) => {
          // Add uuids for React
          const transformFields = [];
          // Set default value for fields otherwise those field cannot be saved properly once added
          for (const key in res.data as any) {
            if (key.startsWith('@')) {
              let type = 'string';
              let isMultiValue = false;
              if (key === 'alias') {
                type = 'array';
                isMultiValue = true;
              }
              transformFields.push({
                id: uuid(),
                content: key,
                name: key,
                isMultiValue: isMultiValue,
                fieldAccess: 'RO',
                format: 'string',
                type: type
              });
            } else {
              let field = res.data[key];
              let format = key === "$FILES" ? "string" : convertDesignType2Format(field.type, field.attributes);
              let allowMultiValues = field.allowmultivalues;
              let type = convert2FieldType(format, allowMultiValues);
              let fieldAccess = 'RO';
              if (field.kind === 'editable') {
                fieldAccess = 'RW';
              }
              transformFields.push({
                id: uuid(),
                content: key,
                isMultiValue: allowMultiValues,
                fieldAccess: fieldAccess,
                format: format,
                type: type
              });
            }
          }

          // Strip away @alias, @hide, and @name
          const draggableFields: Array<any> = transformFields.filter(
            (value, idx) => {
              return idx > 2;
            }
          );

          // Save active form and fields for left panel
          dispatch<any>(setActiveForm(schemaName, formName));
          dispatch<any>(addActiveFields(externalName, draggableFields));
          dispatch<any>(setLoadedForm(schemaName, formName));
          dispatch<any>(setLoadedFields(externalName, draggableFields) as any);

          dispatch({
            type: SET_VALUE,
            payload: {
              status: false,
            }
          })
        });
    } catch (err: any) {
      console.log(err);
      dispatch(toggleErrorDialog(`${err.code}: ${err.message}`))
    }
  };
};

/**
 * Retrieves views for a particular database and
 * passes them to Redux.
 *
 * @param nsfPath the name of the database
 */
export const fetchViews = (dbName: string, nsfPath: string) => {
  return async (dispatch: Dispatch) => {
    try {
      await axios
        .get(`${SETUP_KEEP_API_URL}/designlist/views?nsfPath=${nsfPath}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json'
          }
        })
        .then((res) => {
          dispatch(
            setViews(
              dbName,
              res.data.views.map((view: any) => {
                let aliasArray: Array<any> = [];
                if (view['@alias'] != null && view['@alias'].length > 0) {
                  if (Array.isArray(view['@alias'])) {
                    aliasArray = view['@alias'];
                  } else {
                    aliasArray.push(view['@alias']);
                  }
                }
                return {
                  viewName: view['@name'],
                  viewAlias: aliasArray,
                  viewUnid: view['@unid'],
                  viewUpdated: view['columns'] && view['columns'].length ? true : false
                };
              })
            ) as any
          );
        });
    } catch (err) {
      console.log(err);
    }
  };
};

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
      await axios
        .get(`${SETUP_KEEP_API_URL}/designlist/folders?nsfPath=${nsfPath}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json'
          }
        })
        .then((res) => {
          dispatch(
            setFolders(
              dbName,
              res.data.folders.map((folder: any) => {
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
        });
    } catch (err) {
      console.log(err);
    }
  };
};

/**
 * Retrieves agents for a particular database and
 * passes them to Redux.
 *
 * @param dbName the name of the database
 * @param nsfPath the name of the database
 */
export const fetchAgents = (dbName: string, nsfPath: string) => {
  return async (dispatch: Dispatch) => {
    try {
      await axios
        .get(`${SETUP_KEEP_API_URL}/designlist/agents?nsfPath=${nsfPath}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json'
          }
        })
        .then((res) => {
          dispatch(
            setAgents(
              dbName,
              res.data.agents.map((agent: any) => {
                let aliasArray: Array<any> = [];
                if (agent['@alias'] != null && agent['@alias'].length > 0) {
                  if (Array.isArray(agent['@alias'])) {
                    aliasArray = agent['@alias'];
                  } else {
                    aliasArray.push(agent['@alias']);
                  }
                }
                return {
                  agentName: agent['@name'],
                  agentAlias: aliasArray,
                  agentUnid: agent['@unid']
                };
              })
            ) as any
          );
        });
    } catch (err) {
      console.log(err);
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
      await axios
        .post(`${SETUP_KEEP_API_URL}/admin/quickconfig`, dbData, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          }
        })
        .then((response) => {
          const keepData = _.omit(response.data, [
            /*'@unid',*/ '@noteid',
            '@created',
            '@lastmodified',
            '@revision',
            '@lastaccessed',
            '@size',
            '@unread',
            '@etag',
            '$UpdatedBy'
          ]);
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

          dispatch({
            type: ADD_SCHEMA,
            payload: schemaData
          });

          dispatch({
            type: ADD_SCOPE,
            payload: scopeData
          });

          dispatch(toggleQuickConfigDrawer());

          if (response.status === 200) {
            dispatch({
              type: ADD_NEW_SCHEMA_TO_STATE,
              payload: {
                schemaName: schemaName,
                nsfPath: nsfPath
              }
            });
          }

          dispatch(
            toggleAlert(
              `${schemaName} and ${dbData.scopeName} have been successfully created.`
            )
          );

          dispatch(setApiLoading(false));
        });
      dispatch(clearDBError());
    } catch (err: any) {
      // Use the response error if it's available
      if (err.response && err.response.statusText) {
        dispatch(setDBError(err.response.statusText));
      } else if (
        err.response &&
        err.response.data &&
        err.response.data.message
      ) {
        dispatch(setDBError(err.response.data.message));
      } else {
        dispatch(setDBError(err.message));
      }
    }
  };
};

/**
 * Add Database and check for errors
 */
export const addSchema = (dbData: any) => {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(setApiLoading(true));
      await axios
        .post(
          `${SETUP_KEEP_API_URL}/schema?nsfPath=${dbData.nsfPath}&configName=${dbData.schemaName}`,
          dbData,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json'
            }
          }
        )
        .then((response) => {
          const { data } = response;
          dispatch({
            type: ADD_SCHEMA,
            payload: data
          });

          if (response.status === 200) {
            dispatch({
              type: ADD_NEW_SCHEMA_TO_STATE,
              payload: {
                schemaName: data.schemaName,
                nsfPath: data.nsfPath
              }
            });
            dispatch({
              type: CLEAR_SCHEMA_FORM,
              payload: true
            });
          }
          dispatch(
            toggleAlert(`${dbData.schemaName} has been successfully created.`)
          );

          dispatch(setApiLoading(false));
        });
      dispatch(clearDBError());
    } catch (err: any) {
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
 * Update schema to server and check for errors
 */
export const updateSchema = (schemaData: any, setSchemaData?: (data: any) => void) => {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(setApiLoading(true));
      dispatch({
        type: UPDATE_ERROR,
        payload: false,
      })
      await axios
        .post(
          `${SETUP_KEEP_API_URL}/schema?nsfPath=${schemaData.nsfPath}&configName=${schemaData.schemaName}`,
          schemaData,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json'
            }
          }
        )
        .then((response) => {
          const { data } = response;
          if (!!setSchemaData) {
            setSchemaData(data)
          }
          dispatch({
            type: ADD_NEW_SCHEMA_TO_STATE,
            payload: {
              schemaName: data.schemaName,
              nsfPath: data.nsfPath
            }
          });
          dispatch(setApiLoading(false));
          dispatch(toggleAlert(`Schema has been successfully updated.`));
        })
        .catch((error) => {
          const errorMsg = getErrorMsg(error);
          dispatch(toggleAlert(`Update schema failed! ${errorMsg}`));
          dispatch({
            type: UPDATE_ERROR,
            payload: true
          });
        });
      dispatch(clearDBError());
    } catch (err: any) {
      // Use the response error if it's available
      if (err.response && err.response.statusText) {
        dispatch(setDBError(err.response.statusText));
      } else {
        dispatch(setDBError(err.message));
      }
    }
  };
};

function loadUnconfiguredForms(
  apiData: AxiosResponse<any, any>,
  allForms: any[],
  dbName: string,
  setData: React.Dispatch<React.SetStateAction<string[]>>,
  dispatch: Dispatch<any>
) {
  apiData.data.forms.forEach((form: any) => {
    allForms.push({
      dbName,
      formName: form['@name'],
      alias: form['@alias'],
      formModes: []
    });
  });
  

  // Sort the form names alphabetically
  try {
    allForms.sort((a, b) =>
      a.formName.toLowerCase() > b.formName.toLowerCase() ? 1 : -1
    );
  } catch (e) {}

  // Save Forms Data
  setData(apiData.data.forms);
  dispatch(setForms(dbName, allForms));
  dispatch(setCurrentForms(dbName, allForms));
}

function loadConfiguredForms(
  configformsList: any[],
  allForms: any[],
  dbName: string,
  apiData: AxiosResponse<any, any>,
  setData: React.Dispatch<React.SetStateAction<string[]>>,
  dispatch: Dispatch<any>
) {
  let formPromises: Array<any> = [];

  for (const form of configformsList) {
    allForms.push({ dbName, ...form });
  }

  // Wait for all configured forms to be loaded
  Promise.allSettled(formPromises)
    .then((results) => {
      // Once we have all the results build a complete list
      // and update our state
      // Add unconfigured forms
      let configformsNameList = configformsList.map((form) => form.formName);
      apiData.data.forms.forEach((form: any) => {
        if (!configformsNameList.includes(form['@name']))
          allForms.push({
            dbName,
            formName: form['@name'],
            alias: form['@alias'],
            formModes: []
          });
        });
      // Sort the form names alphabetically
      allForms.sort((a, b) =>
        a.formName.toLowerCase() > b.formName.toLowerCase() ? 1 : -1
      );
      // Save Forms Data
      setData(apiData.data.forms);
      dispatch(setForms(dbName, allForms));
      dispatch(setCurrentForms(dbName, allForms));
    })
    .catch((e: any) => console.log('Error processing: ' + e));
  }

export const handleDatabaseForms= (schemaData: Database, dbName:string, formsArray: Array<any>) => {
  return async (dispatch: Dispatch) => {
    // Send the new views to the server
    const formModeData = {
      modeName: "default",
      fields: [],
      readAccessFormula: {
        formulaType: "domino",
        formula: "@True",
      },
      writeAccessFormula: {
        formulaType: "domino",
        formula: "@True",
      },
      deleteAccessFormula: {
        formulaType: "domino",
        formula: "@False",
      },
      computeWithForm: false,
    };
    const formToUpdate: Array<any> = [];
    formsArray.forEach((form) => {
      // Skip already configured forms.
      if (form.formModes.length > 0) {
        formToUpdate.push(form);
        return;
      }else{
        const newFormData = {
          formName: form.formName,
          alias: form.alias,
          formModes: [formModeData],
        };
        formToUpdate.push(newFormData);
      }
    });
    dispatch(updateForms(schemaData,dbName, formToUpdate) as any);
  }
}

export const pullForms = (nsfPath: string, dbName:string, setData:React.Dispatch<React.SetStateAction<string[]>>)  => {
  let allForms: Array<any> = [];
  let configformsList: Array<any> = [];
  
  return async (dispatch: Dispatch) => {
    try {
      dispatch(setApiLoading(true));
      const apiData = await axios.get(
        `${SETUP_KEEP_API_URL}/designlist/forms?nsfPath=${nsfPath}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json'
          }
        })
        if (apiData) {
          dispatch(addNsfDesign(nsfPath, apiData.data))
  
          // Get list of configured forms
          axios
            .get(
              `${SETUP_KEEP_API_URL}/schema?nsfPath=${nsfPath}&configName=${dbName}`,
              {
                headers: {
                  Authorization: `Bearer ${getToken()}`,
                  'Content-Type': 'application/json'
                }
              }
            )
            .then((response) => {
              // Loop through configured forms and fetch their modes
              configformsList = response.data.forms;
              if (configformsList != null && configformsList.length > 0) {
                loadConfiguredForms(
                  configformsList,
                  allForms,
                  dbName,
                  apiData,
                  setData,
                  dispatch
                );
              } else {
                // Add unconfigured forms
                loadUnconfiguredForms(
                  apiData,
                  allForms,
                  dbName,
                  setData,
                  dispatch
                );
              }
              setActiveViews(dbName, response.data.views);
              setActiveAgents(dbName, response.data.agents);
            });
        }
    }catch (err: any) {
      // Use the response error if it's available
      if (err.response && err.response.statusText) {
        dispatch(setDBError(err.response.statusText));
      } else {
        dispatch(setDBError(err.message));
      }
    }
  }
}

const updateForms = (schemaData: Database, dbName: string, formsData: Array<any>) => {
  let configformsList: Array<any> = [];
  return async (dispatch: Dispatch) => {
    const newSchemaData: any = _.omit(
      {
        ...schemaData,
        forms: formsData,
      },
      ['isFetch']
    );
    try {
      dispatch(setApiLoading(true));
      await axios
        .post(
          `${SETUP_KEEP_API_URL}/schema?nsfPath=${newSchemaData.nsfPath}&configName=${newSchemaData.schemaName}`,
          newSchemaData,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json'
            }
          }
        )
        .then((response) => {
          const { data } = response;
          configformsList = response.data.forms.map((form: any) => {
            return { ...form, dbName };
          });

          dispatch(dispatch({
            type: SET_FORMS,
            payload: {
              db: dbName,
              forms: configformsList
            }
          }));
          dispatch(toggleAlert(`Forms have been successfully saved.`));
          dispatch(setApiLoading(false));
        })
        .catch((error) => {
          const errorMsg = getErrorMsg(error);
          dispatch(toggleAlert(`Update forms failed! ${errorMsg}`));
          dispatch({
            type: VIEWS_ERROR,
            payload: true
          });
        });
      dispatch(clearDBError());
    } catch (err: any) {
      // Use the response error if it's available
      if (err.response && err.response.statusText) {
        dispatch(setDBError(err.response.statusText));
      } else {
        dispatch(setDBError(err.message));
      }
    }
  };
}

/**
 * Add/remove active view/s and then send them to the server
 */
export const handleDatabaseViews = (
  viewsArray: Array<any>,
  activeViews: any,
  dbName: string,
  schemaData: Database,
  active: boolean,
  setSchemaData: (data: any) => void,
) => {
  return async (dispatch: Dispatch) => {
    // Build redux data
    const viewsData = viewsArray.map((view: any) => {
      return buildReduxViewData(view, active);
    });

    // Update panels
    viewsData.forEach((view: any) => {
      dispatch(updatePanels(dbName, view) as any);
    });

    // Save views
    //  Build the array of new views
    const viewsList: Array<any> = [];
    if (viewsArray.length === 1) {
      activeViews.forEach((view: any) => {
        if (view.viewName !== viewsData[0].viewName) {
          viewsList.push(saveViewDetails(view));
        } else if (view.viewName === viewsData[0].viewName && active) {
          viewsList.push(saveViewDetails(view));
        }
      });
      if (active) {
        viewsList.push(saveViewDetails(viewsArray[0]));
      }
    } else if (active) {
      const activeViewNames = activeViews.map((view: any) => {
        return view.viewName
      });
      viewsArray.forEach((view: any) => {
        // if a view was already active, don't add it again to the active views list
        if (!activeViewNames.includes(view.viewName)) {
          viewsList.push(saveViewDetails(view));
        }
      });
      activeViews.forEach((view: any) => {
        viewsList.push(saveViewDetails(view));
      });
    }

    // Send the new views to the server
    dispatch(updateViews(schemaData, viewsList, setSchemaData) as any)
  }
}

/**
 * update views to server
 */
const updateViews = (schemaData: Database, viewsData: any, setSchemaData: (data: any) => void) => {
  return async (dispatch: Dispatch) => {
    let filteredForms = schemaData.forms
      .filter((form) => form.formModes.length > 0)
      .map((form) => {
        return {
          formName: form.formName,
          formModes: form.formModes,
          alias: form.alias
        };
      });
    const newSchemaData: any = _.omit(
      {
        ...schemaData,
        forms: filteredForms,
        views: viewsData
      },
      ['isFetch']
    );
    try {
      dispatch(setApiLoading(true));
      await axios
        .post(
          `${SETUP_KEEP_API_URL}/schema?nsfPath=${newSchemaData.nsfPath}&configName=${newSchemaData.schemaName}`,
          newSchemaData,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json'
            }
          }
        )
        .then((response) => {
          const { data } = response;
          dispatch(toggleAlert(`Views have been successfully saved.`));
          setSchemaData({
            ...data,
            nsfPath: newSchemaData.nsfPath,
            schemaName: newSchemaData.schemaName,
          })
          return {
            ...data,
            nsfPath: newSchemaData.nsfPath,
            schemaName: newSchemaData.schemaName,
          }
        })
        .catch((error) => {
          const errorMsg = getErrorMsg(error);
          dispatch(toggleAlert(`Update views failed! ${errorMsg}`));
          dispatch({
            type: VIEWS_ERROR,
            payload: true
          });
        });
      dispatch(setApiLoading(false));
      dispatch(clearDBError());
    } catch (err: any) {
      // Use the response error if it's available
      if (err.response && err.response.statusText) {
        dispatch(setDBError(err.response.statusText));
      } else {
        dispatch(setDBError(err.message));
      }
    }
  };
};

function saveViewDetails(currentView: any) {
  let aliasArray: Array<any> = [];
  if (currentView.viewAlias != null && currentView.viewAlias.length > 0) {
    if (Array.isArray(currentView.viewAlias)) {
      aliasArray = currentView.viewAlias;
    } else {
      aliasArray.push(currentView.viewAlias);
    }
  }

  return {
    name: currentView.viewName,
    alias: aliasArray,
    unid: currentView.viewUnid,
    columns: currentView.viewColumns,
    viewUpdated: currentView.viewUpdated
  }
};

export function setFormName(formName: string) {
  return async (dispatch: Dispatch) => {
    dispatch({
      type: SET_FORM_NAME,
      payload: formName
    })
  }
}

function buildReduxViewData(currentView: any, viewActive: boolean) {
  return {
    viewName: currentView.viewName,
    viewAlias: currentView.viewAlias,
    viewUnid: currentView.viewUnid,
    viewActive: viewActive,
    viewUpdated: !viewActive ? false : currentView.viewUpdated
  }
}

function updatePanels(dbName: string, viewData: ViewObj) {
  return async (dispatch: Dispatch) => {
    // Update All Panel
    dispatch({
      type: UPDATE_VIEW,
      payload: {
        db: dbName,
        view: viewData,
      },
    });

    // Update Active Panel
    if (viewData.viewActive) {
      dispatch({
        type: ADD_ACTIVEVIEW,
        payload: {
          db: dbName,
          activeView: viewData,
        },
      });
    } else {
      dispatch({
        type: DELETE_ACTIVEVIEW,
        payload: {
          db: dbName,
          activeView: viewData.viewUnid,
        },
      });
    }
  }
}

export const handleDatabaseAgents = (agentsArray: Array<any>, activeAgents: Array<any>, dbName: string, schemaData: Database, active: boolean) => {
  return async (dispatch: Dispatch) => {
    // Build redux data
    const agentsData = agentsArray.map((agent: any) => {
      return buildReduxAgentData(agent, active);
    });

    // Update panels
    agentsData.forEach((agent: any) => {
      dispatch(updateActiveAgents(dbName, agent) as any);
    });

    // Save agents
    //  Build the array of new agents
    const agentsList: Array<any> = [];
    if (agentsArray.length === 1) {
      activeAgents.forEach((agent: any) => {
        if (agent.agentName !== agentsData[0].agentName) {
          agentsList.push(saveAgentDetails(agent));
        }
      });
      if (active) {
        // add to active agents
        agentsList.push(saveAgentDetails(agentsArray[0]));
      }
    } else if (active) {
      const activeAgentNames = activeAgents.map((agent: any) => {
        return agent.agentName
      });
      agentsArray.forEach((agent: any) => {
        // if agent was already active, don't add it again to the active views list
        if (!activeAgentNames.includes(agent.agentName)) {
          agentsList.push(saveAgentDetails(agent));
        }
      });
      activeAgents.forEach((agent: any) => {
        agentsList.push(saveAgentDetails(agent));
      });
    }

    // Send the new agents to the server
    dispatch(updateAgents(schemaData, agentsList) as any);
  }
}

function buildReduxAgentData(currentAgent: any, agentActive: boolean) {
  return {
    agentName: currentAgent.agentName,
    agentAlias: currentAgent.agentAlias,
    agentUnid: currentAgent.agentUnid,
    agentActive: agentActive,
    agentUpdated: currentAgent.agentUpdated
  } 
}

function updateActiveAgents(dbName: string, agentData: AgentObj) {
  return async (dispatch: Dispatch) => {
    // Update All Panel
    dispatch({
      type: UPDATE_AGENT,
      payload: {
        db: dbName,
        agent: agentData,
      },
    });

    // Update Active Panel
    if (agentData.agentActive) {
      dispatch({
        type: ADD_ACTIVEAGENT,
        payload: {
          db: dbName,
          activeAgent: agentData,
        },
      });
    } else {
      dispatch({
        type: DELETE_ACTIVEAGENT,
        payload: {
          db: dbName,
          activeAgent: agentData.agentUnid,
        },
      });
    }
  }
}

function saveAgentDetails(currentAgent: any) {
  let aliasArray: Array<any> = [];
  if (currentAgent.agentAlias != null && currentAgent.agentAlias.length > 0) {
    if (Array.isArray(currentAgent.agentAlias)) {
      aliasArray = currentAgent.agentAlias;
    } else {
      aliasArray.push(currentAgent.agentAlias);
    }
  }

  return {
    name: currentAgent.agentName,
    alias: aliasArray,
    unid: currentAgent.agentUnid,
    columns: currentAgent.agentColumns,
    agentUpdated: currentAgent.agentUpdated
  }
};

/**
 * update agents to server
 */
export const updateAgents = (schemaData: Database, agentsData: any) => {
  return async (dispatch: Dispatch) => {
    let filteredForms = schemaData.forms
      .filter((form) => form.formModes.length > 0)
      .map((form) => {
        return {
          formName: form.formName,
          formModes: form.formModes,
          alias: form.alias
        };
      });
    const newSchemaData: any = _.omit(
      {
        ...schemaData,
        forms: filteredForms,
        agents: agentsData
      },
      ['isFetch']
    );
    try {
      dispatch(setApiLoading(true));
      await axios
        .post(
          `${SETUP_KEEP_API_URL}/schema?nsfPath=${newSchemaData.nsfPath}&configName=${newSchemaData.schemaName}`,
          newSchemaData,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json'
            }
          }
        )
        .then((response) => {
          const { data } = response;
          
          dispatch(setApiLoading(false));
          dispatch(toggleAlert(`Agents have been successfully saved.`));
        })
        .catch((error) => {
          const errorMsg = getErrorMsg(error);
          dispatch(toggleAlert(`Update agents failed! ${errorMsg}`));
          dispatch({
            type: AGENTS_ERROR,
            payload: true
          });
        });
      dispatch(clearDBError());
    } catch (err: any) {
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
 * Add/update form mode to server
 */
export const updateFormMode = (
  schemaData: Database,
  formName: string,
  alias: Array<string>,
  formModeData: any,
  formIdx: number,
  clone: boolean,
  setSchemaData: (schemaData: any) => void,
) => {
  return async (dispatch: Dispatch) => {
    let filteredForms = schemaData.forms
      .filter((form) => form.formModes.length > 0)
      .map((form) => {
        return {
          formName: form.formName,
          alias: form.alias,
          formModes: form.formModes
        };
      });
    const formIndex = getFormIndex(filteredForms, formName);
    const newFormData = {
      formName: formName,
      alias: alias,
      formModes: [formModeData]
    };
    let isNew = false;
    if (formIndex >= 0) {
      const formModeIndex = getFormModeIndex(
        filteredForms[formIndex].formModes,
        formModeData.modeName
      );
      if (formModeIndex >= 0) {
        let newFormModes = [...filteredForms[formIndex].formModes];
        newFormModes[formModeIndex] = formModeData;
        filteredForms[formIndex] = {
          formName: formName,
          alias:
            alias && alias.length > 0 ? alias : filteredForms[formIndex].alias,
          formModes: newFormModes
        };
      } else {
        filteredForms[formIndex] = {
          formName: formName,
          alias:
            alias && alias.length > 0 ? alias : filteredForms[formIndex].alias,
          formModes: [...filteredForms[formIndex].formModes, formModeData]
        };
        isNew = true;
      }
    } else {
      filteredForms.push(newFormData);
    }
    const newSchemaData: any = _.omit(
      {
        ...schemaData,
        forms: filteredForms
      },
      ['isFetch']
    );
    try {
      dispatch(setApiLoading(true));
      await axios
        .post(
          `${SETUP_KEEP_API_URL}/schema?nsfPath=${newSchemaData.nsfPath}&configName=${newSchemaData.schemaName}`,
          newSchemaData,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json'
            }
          }
        )
        .then((response) => {
          const { data } = response;
          console.log(data)
          // setSchemaData(data)

          if (formIdx !== -1) {
            setSchemaData({ ...data })
            dispatch(
              appendConfiguredForm(formIdx, formModeData)
            );
          }
          if (!clone) {
            setSchemaData({ ...data })
            dispatch(
              toggleAlert(
                `${formModeData.modeName} mode has been successfully ${
                  isNew ? 'added' : 'updated'
                }.`
              )
            );
          } else {
            setSchemaData({ ...data })
            dispatch(
              toggleAlert(
                `Mode successfully cloned to ${formModeData.modeName}`
              )
            );
          }

          dispatch({
            type: SET_FORMS,
            payload: {
              ...data,
              db: data.schemaName,
            }
          })

          dispatch(setApiLoading(false));
        })
        .catch((error) => {
          const errorMsg = getErrorMsg(error);
          dispatch(toggleAlert(`Update form mode failed! ${errorMsg}`));
          console.log(errorMsg)
        });
      dispatch(clearDBError());
    } catch (err: any) {
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
 * Delete form mode to server
 */
export const deleteFormMode = (
  schemaData: Database,
  formName: string,
  formModeName: string,
  setSchemaData: (data: any) => void,
) => {
  return async (dispatch: Dispatch) => {
    let filteredForms = schemaData.forms
      .filter((form) => form.formModes.length > 0)
      .map((form) => {
        return {
          formName: form.formName,
          alias: form.alias,
          formModes: form.formModes
        };
      });
    const formIndex = getFormIndex(filteredForms, formName);
    if (formIndex >= 0) {
      const formModeIndex = getFormModeIndex(
        filteredForms[formIndex].formModes,
        formModeName
      );
      if (formModeIndex >= 0) {
        const newFormModes = filteredForms[formIndex].formModes.filter(
          (formMode) => formMode.modeName !== formModeName
        );
        filteredForms[formIndex] = {
          formName: formName,
          alias: filteredForms[formIndex].alias,
          formModes: newFormModes
        };
      }
    }
    const newSchemaData: any = _.omit(
      {
        ...schemaData,
        forms: filteredForms
      },
      ['isFetch']
    );
    try {
      dispatch(setApiLoading(true));
      await axios
        .post(
          `${SETUP_KEEP_API_URL}/schema?nsfPath=${newSchemaData.nsfPath}&configName=${newSchemaData.schemaName}`,
          newSchemaData,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json'
            }
          }
        )
        .then((response) => {
          const { data } = response;
          setSchemaData(data)

          dispatch(setApiLoading(false));
          dispatch(toggleDeleteDialog());
          dispatch(toggleAlert(`${formModeName} mode has been deleted!`));
        })
        .catch((error: any) => {
          dispatch(setApiLoading(false));
          dispatch(toggleDeleteDialog());
          const errorMsg = getErrorMsg(error);
          dispatch(toggleAlert(`Delete form mode failed! ${errorMsg}`));
        });
      dispatch(clearDBError());
    } catch (err: any) {
      dispatch(toggleDeleteDialog());
      dispatch(toggleAlert(`Delete mode failed!`));
    }
  };
};

/**
 * Delete configured form to server
 */
export const deleteForm = (schemaData: Database, formName: string, setSchemaData?: (data: Database) => void) => {
  return async (dispatch: Dispatch) => {
    let filteredForms = schemaData.forms
      .filter((form) => form.formModes.length > 0 && form.formName !== formName)
      .map((form) => {
        return {
          formName: form.formName,
          alias: form.alias,
          formModes: form.formModes
        };
      });
    const newSchemaData: any = _.omit(
      {
        ...schemaData,
        forms: filteredForms
      },
      ['isFetch']
    );
    try {
      dispatch(setApiLoading(true));
      await axios
        .post(
          `${SETUP_KEEP_API_URL}/schema?nsfPath=${newSchemaData.nsfPath}&configName=${newSchemaData.schemaName}`,
          newSchemaData,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json'
            }
          }
        )
        .then((response) => {
          if (!!setSchemaData) {
            setSchemaData({
              ...response.data,
            })
            dispatch({
              type: RESET_FORM,
              payload: formName,
            })
          }
          dispatch(setApiLoading(false));
          dispatch(
            toggleAlert(`${formName} has been Unconfigured Successfully.`)
          );
          // dispatch(toggleDeleteDialog());
          dispatch(unConfigForm(newSchemaData.schemaName, formName));
        })
        .catch((error: any) => {
          dispatch(setApiLoading(false));
          // dispatch(toggleDeleteDialog());
          const errorMsg = getErrorMsg(error);
          dispatch(toggleAlert(`Delete form failed! ${errorMsg}`));
        });
      dispatch(clearDBError());
    } catch (err: any) {
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
 * Change Scope(API Name) and check for errors
 */
export const changeScope = (dbData: any, isEdit?: boolean) => {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(setApiLoading(true));
      dispatch(clearDBError());
      await axios
        .post(`${SETUP_KEEP_API_URL}/admin/scope`, dbData, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          }
        })
        .then((response) => {
          const keepData = _.omit(response.data, [
            /*'@unid',*/ '@noteid',
            '@created',
            '@lastmodified',
            '@revision',
            '@lastaccessed',
            '@size',
            '@unread',
            '@etag',
            '$UpdatedBy'
          ]);
          dispatch({
            type: isEdit ? UPDATE_SCOPE : ADD_SCOPE,
            payload: keepData
          });

          dispatch({
            type: TOGGLE_DRAWER
          });
          dispatch(
            isEdit
              ? toggleAlert(`${dbData.apiName} has been successfully updated.`)
              : toggleAlert(`${dbData.apiName} has been successfully created.`)
          );

          dispatch(setApiLoading(false));
        })
        .catch((error: any) => {
          dispatch(setDBError(getErrorMsg(error)));
        });
    } catch (err: any) {
      // Use the response error if it's available
      dispatch(setDBError(getErrorMsg(err)));
    }
  };
};

export const fetchDBConfig = (config: string) => {
  return async (dispatch: Dispatch) => {
    dispatch(setApiLoading(true));
    try {
      const dbConfig = await axios
        .get(`${BASE_KEEP_API_URL}/scope?dataSource=${config}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json'
          }
        })
        .then((res) => res.data);

      dispatch({
        type: FETCH_DB_CONFIG,
        payload: dbConfig
      });
      dispatch(setApiLoading(false));
      dispatch({ type: TOGGLE_DETAILS_LOADING });
    } catch (err: any) {
      console.log(err);
    }
  };
};

export const updateScope = (active: boolean, data?: any) => {
  return async (dispatch: Dispatch, getState: () => AppState) => {
    dispatch(closeSnackbar());
    dispatch(setApiLoading(true));
    const { contextViewIndex, scopes } = getState().databases;
    const { apiName, schemaName, nsfPath, description, isActive } =
      scopes[contextViewIndex];

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
      dispatch({
        type: RESET_FORM,
        payload: {
          dbName: apiName
        }
      });

    axios
      .post(`${SETUP_KEEP_API_URL}/admin/scope/`, apiData, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      })
      .then((response) => {
        dispatch(setApiLoading(false));
        dispatch({
          type: UPDATE_SCOPE,
          payload: { ...response.data, index: contextViewIndex }
        });
        dispatch(toggleAlert(`${apiName} has been successfully updated.`));
        if (data) dispatch(toggleSettings());
      });
  };
};

/**
 * Retrieves the information for a particular database and
 * either uses it to populate the active views and agents
 * panels, or to save the active views and agents panels.
 *
 * @param dbName the name of the database
 * @param action "init" to initialize state and "save" to save it
 * @param type "views", "agents", "both"
 * @param allViewsList complete views list
 * @param allAgentsList complete agents list
 * @param viewData views to save
 * @param agentData agents to save
 *
 */
export const processViewsAgents = (
  dbName: string,
  nsfPath: string,
  action: string,
  type: string,
  allViewsList: Array<ViewObj>,
  allAgentsList: Array<any>,
  viewData: Array<any>,
  agentData: Array<any>
) => {
  return async (dispatch: Dispatch) => {
    try {
      axios
        .get(
          `${SETUP_KEEP_API_URL}/schema?nsfPath=${nsfPath}&configName=${dbName}`,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json'
            }
          }
        )
        .then((response) => {
          // Initialize Views and Agents
          if (action === 'init') {
            // Get list of Active Views and Agents
            let views: Array<any> = response.data.availableViews;
            let agents: Array<any> = response.data.agents;

            // Build Active View list
            const viewsList: Array<any> = [];
            Object.values(views).forEach((view) => {
              let alias =
                view.alias != null && view.alias.length > 0
                  ? view.alias[0]
                  : '';

              // Suppress alias when it's a duplicate of the name LABS-1903
              alias = alias === view.name ? '' : alias;
              let viewUpdatedBool = (view.columns && view.columns.length > 0) ? true : false
              viewsList.push({
                viewName: view.name,
                viewAlias: alias,
                viewUnid: view.unid,
                viewActive: true,
                viewUpdated: viewUpdatedBool
              });
            });

            // Build Active Agent list
            const agentsList: Array<any> = [];
            Object.values(agents).forEach((agent) => {
              let alias =
                agent.alias != null && agent.alias.length > 0
                  ? agent.alias[0]
                  : '';

              // Suppress alias when it's a duplicate of the name LABS-1903
              alias = alias === agent.name ? '' : alias;
              agentsList.push({
                agentName: agent.name,
                agentAlias: alias,
                agentUnid: agent.unid,
                agentActive: true
              });
            });

            // Save Active Views \ Agents Data
            dispatch({
              type: SET_ACTIVEVIEWS,
              payload: {
                db: dbName,
                activeViews: viewsList
              }
            });
            dispatch({
              type: SET_ACTIVEAGENTS,
              payload: {
                db: dbName,
                activeAgents: agentsList
              }
            });

            // Mark Active Views (left Panel)
            allViewsList.forEach((view: ViewObj) => {
              if (isActiveView(view.viewUnid, viewsList)) {
                const viewData: ViewObj = {
                  viewName: view.viewName,
                  viewAlias: view.viewAlias,
                  viewUnid: view.viewUnid,
                  viewActive: true,
                  viewUpdated: view.viewUpdated
                };
                dispatch({
                  type: UPDATE_VIEW,
                  payload: {
                    db: dbName,
                    view: viewData
                  }
                });
              }
            });

            // Mark Active Agents (left Panel)
            allAgentsList.forEach((agent: AgentObj) => {
              if (isActiveAgent(agent.agentUnid, agentsList)) {
                const agentData: AgentObj = {
                  agentName: agent.agentName,
                  agentAlias: agent.agentAlias,
                  agentUnid: agent.agentUnid,
                  agentActive: true
                };
                dispatch({
                  type: UPDATE_AGENT,
                  payload: {
                    db: dbName,
                    agent: agentData
                  }
                });
              }
            });
          }

          // Save Views and Agents
          else {
            // Build data
            if (type === 'views') {
              response.data.availableViews = viewData;
            } else {
              response.data.agents = agentData;
            }

            try {
              axios
                .post(`${SETUP_KEEP_API_URL}/admin/scope`, response.data, {
                  headers: {
                    Authorization: `Bearer ${getToken()}`,
                    'Content-Type': 'application/json'
                  }
                })
                .then((response) => {
                  // Notify user
                  if (type === 'views') {
                    dispatch(toggleAlert('Activated Views have been saved'));
                  } else {
                    dispatch(toggleAlert('Activated Agents have been saved'));
                  }
                  return response;
                });
            } catch (e: any) {
              console.log(`Error in saveViewsAgents: ${e.response.status}`);
              console.log(`Error text: ${e.response.statusText}`);
            }
          }
          return response;
        });
    } catch (e: any) {
      console.log(`Error in processViewsAgents: ${e.response.status}`);
      console.log(`Error text: ${e.response.statusText}`);
    }
  };
};

/**
 * isActiveView determines if a particular View has been
 * activated.
 *
 * @param unid the id of the view to check
 * @param activeList the list of activated Views
 *
 */
export const isActiveView = (unid: string, activeList: Array<ViewObj>) => {
  for (let ii = 0; ii < activeList.length; ii++) {
    if (unid === activeList[ii].viewUnid) {
      return true;
    }
  }
  return false;
};

/**
 * isActiveAgent determines if a particular Agent has been
 * activated.
 *
 * @param unid the id of the view to check
 * @param activeList the list of activated Views
 *
 */
export const isActiveAgent = (unid: string, activeList: Array<AgentObj>) => {
  for (let ii = 0; ii < activeList.length; ii++) {
    if (unid === activeList[ii].agentUnid) {
      return true;
    }
  }
  return false;
};

/**
 * Save a list of forms for a particular database
 *
 * @param dbname the database containing the forms
 * @param forms the array of forms
 */
export const setForms = (dbName: string, forms: Array<any>) => {
  return async (dispatch: any) => {
    await dispatch({
      type: SET_FORMS,
      payload: {
        db: dbName,
        forms
      }
    });
  };
};

/**
 * Initialize a new form that user wants to create and configure
 *
 * @param form the form object
 */
export const addForm = (
  enabled: boolean,
  form?: {
    dbName: string,
    formName: string,
    alias: Array<string>,
    formModes: Array<any>,
    formAccessModes: Array<any>,
  }
) => {
  return async (dispatch: any) => {
    if (enabled) {
      await dispatch({
        type: ADD_FORM,
        payload: {
          enabled: true,
          form: form,
        }
      })
    } else {
      await dispatch({
        type: ADD_FORM,
        payload: {
          enabled: false,
        }
      })
    }
  };
};

/**
 * Initialize a new form that user wants to create and configure
 *
 * @param form the form object
 * @param nsfPath the name of the NSF
 */
export const saveNewForm = (
  form: {
    formName: string,
    fields: Array<any>,
  },
  nsfPath: string,
) => {
  return async (dispatch: any) => {
    const formData = {
      name: form.formName,
      alias: "",
      fields: form.fields,
    }
    await axios
      .put(
        `${SETUP_KEEP_API_URL}/design/forms/${form.formName}?nsfPath=${nsfPath}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          }
        }
      )
      .then((res) => {
        const data = { res }
        
        dispatch(toggleAlert("New form schema created!"))
      })
      .catch((err: string) => {
        console.log(err)
      })
  }
};

/**
 * Save a list of forms for the current page
 *
 * @param dbname the database containing the forms
 * @param forms the array of forms
 */
export const setCurrentForms = (dbName: string, forms: Array<any>) => {
  return async (dispatch: any) => {
    await dispatch({
      type: SET_CURRENTFORMS,
      payload: {
        db: dbName,
        forms
      }
    });
  };
};

/**
 * Save a list of views for a particular database
 *
 * @param dbname the database containing the views
 * @param views the array of views
 */
export const setViews = (dbName: string, views: Array<any>) => {
  return async (dispatch: any) => {
    await dispatch({
      type: SET_VIEWS,
      payload: {
        db: dbName,
        views
      }
    });
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
    await dispatch({
      type: SET_FOLDERS,
      payload: {
        db: dbName,
        folders
      }
    });
  };
};

/*
 * Save a list of views for a particular database
 *
 * @param dbname the database containing the views
 * @param views the array of views
 */
export const setActiveViews = (dbName: string, activeViews: Array<any>) => {
  return async (dispatch: any) => {
    await dispatch({
      type: SET_ACTIVEVIEWS,
      payload: {
        db: dbName,
        activeViews
      }
    });
  };
};

/**
 * Save a list of agents for a particular database
 *
 * @param dbname the database containing the agents
 * @param agents the array of agents
 */
export const setAgents = (dbName: string, agents: Array<any>) => {
  return async (dispatch: any) => {
    await dispatch({
      type: SET_AGENTS,
      payload: {
        db: dbName,
        agents
      }
    });
  };
};

/*
 * Save a list of agents for a particular database
 *
 * @param dbname the database containing the agents
 * @param agents the array of agents
 */
export const setActiveAgents = (dbName: string, activeAgents: Array<any>) => {
  return async (dispatch: any) => {
    await dispatch({
      type: SET_ACTIVEAGENTS,
      payload: {
        db: dbName,
        activeAgents
      }
    });
  };
};

export const cacheFormFields = (
  dbName: string,
  formName: string,
  fields: Array<any>
) => {
  return async (dispatch: any) => {
    await dispatch({
      type: CACHE_FORM_FIELDS,
      payload: {
        db: dbName,
        formName,
        fields
      }
    });
  };
};

export const retry = (count: number) => {
  return {
    type: SET_RETRY_COUNT,
    payload: count
  };
};

export const appendConfiguredForm = (formIndex: number, data: Object) => {
  return {
    type: APPEND_CONFIGURED_FORM,
    payload: {
      formIndex,
      data
    }
  };
};

// function to Unconfigure form
export const unConfigForm = (schemaName: string, formName: string) => {
  return {
    type: UNCONFIG_FORM,
    payload: {
      schemaName,
      formName
    }
  };
};

/**
 * Call a Keep Api to test a Formula against a database.
 *
 * @param formulaData Formula information needed to run the test
 */
export const testFormula = (
  dataSource: string,
  formulaData: any,
  formulaType: string
) => {
  return async (dispatch: Dispatch) => {
    // Run Formula test
    axios
      .post(
        `${BASE_KEEP_API_URL}/run/formula?dataSource=${dataSource}`,
        formulaData,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
          }
        }
      )

      // Handle valid response
      .then((response) => {
        dispatch(saveResult(formulaType, response.data.result[0].result[0]));
      })

      // Handle error response
      .catch((err) => {
        // Use the response error if it's available
        if (err.response && err.response.data && err.response.data.message) {
          dispatch(saveResult(formulaType, err.response.data.message));
        }
        // Otherwise use the generic error
        else {
          dispatch(saveResult(formulaType, `Error: ${err.message}`));
        }
      });
  };
};

/**
 * Save the results of a Formula test.
 *
 * @param formulaType The Forumla being tested
 * @param result Test result
 */
export function saveResult(formulaType: string, result: string) {
  return {
    type: formulaType,
    payload: result
  };
}

/**
 * CLear all Formula test results
 */
export function clearFormulaResults() {
  return {
    type: CLEAR_FORMULA_RESULTS
  };
}

/**
 * Clear Form results
 */
export function clearForms() {
  return {
    type: CLEAR_FORMS
  };
}

/**
 * Store Database error to display in the UI
 */
export function setDBError(message: string) {
  return {
    type: SET_DB_ERROR,
    payload: message
  };
}

/**
 * Clear Database error
 */
export function clearDBError() {
  return {
    type: CLEAR_DB_ERROR
  };
}

/**
 * Add Nsf design
 */
export function addNsfDesign(nsfPath: string, nsfDesign: any) {
  return {
    type: ADD_NSF_DESIGN,
    payload: {
      nsfPath,
      nsfDesign
    }
  };
}

/**
 * Set only show schemas configured with scopes
 */
export function setOnlyShowSchemasWithScopes(
  onlyShowSchemasWithScopes: boolean
) {
  return {
    type: SET_ONLY_SHOW_SCHEMAS_WITH_SCOPES,
    payload: onlyShowSchemasWithScopes
  };
}

/**
 * get all fields from nsf path
 */
export const getAllFieldsByNsf = (nsfPath: any) => {
  return async (dispatch: Dispatch) => {
    const allFields = await axios
      .get(
        `${SETUP_KEEP_API_URL}/design/itemdefinitions?nsfPath=${nsfPath}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json'
          }
        }
      )
      .then(async (res) => {
        return res.data[0];
      });
    const mapping = {
      TYPE_TEXT: 'string',
      TYPE_NUMBER: 'number',
      TYPE_TIME: 'date-time',
      TYPE_TEXT_LIST: 'string',
      TYPE_NUMBER_LIST: 'number',
      TYPE_TIME_RANGE: 'date-time',
    };
    const allFieldsKey = Object.keys(allFields);
    let requiredFields: any[] = [];
    let finalFields: {
      content: any;
      name: any;
      isMultiValue: boolean;
      fieldAccess: string;
      format: string;
      type: string;
    }[] = [];
    allFieldsKey.forEach((allFieldKey) => {
      if (mapping.hasOwnProperty(allFieldKey)) {
        //@ts-ignore
        const fieldValue = allFields[allFieldKey];
        let format = 'string';
        let type = 'string';
        let isMultiValue = false;
        if (
          allFieldKey === 'TYPE_NUMBER' ||
          allFieldKey === 'TYPE_NUMBER_RANGE'
        ) {
          format = 'float';
          type = 'number';
        }
        if (
          allFieldKey === 'TYPE_NUMBER_RANGE' ||
          allFieldKey === 'TYPE_TIME_RANGE' ||
          allFieldKey === 'TYPE_TEXT_LIST'
        ) {
          isMultiValue = true;
          type = 'array';
        }
        if (allFieldKey === 'TYPE_TIME' || allFieldKey === 'TYPE_TIME_RANGE') {
          format = 'date-time';
        }
        if (allFieldKey === 'TYPE_MIME_PART') {
          format = 'richtext';
        }
        if (allFieldKey === 'TYPE_COMPOSITE' || allFieldKey === 'TYPE_OBJECT') {
          format = 'binary';
          type = 'object';
        }

        for (const field in fieldValue as any) {
          if (!fieldValue[field].startsWith('$')) {
            const convertedField = {
              content: fieldValue[field],
              name: fieldValue[field],
              isMultiValue: isMultiValue,
              fieldAccess: 'RO',
              format: format,
              type: type
            };
            finalFields.push(convertedField);
          }
        }
      }
    });
    const checkSymbolFileFieldExist = finalFields.filter(
      (field: any) => field.content === '$FILE'
    );
    if (!checkSymbolFileFieldExist || checkSymbolFileFieldExist.length <= 0) {
      const symbolFileField = {
        id: uuid(),
        content: '$FILE',
        name: '$FILE',
        isMultiValue: false,
        fieldAccess: 'RW',
        format: 'binary',
        type: 'object'
      };
      finalFields.push(symbolFileField);
    }

    dispatch<any>(
      addActiveFields('keep_internal_form_for_allFields', finalFields)
    );
  };
};

export const fetchKeepPermissions = () => {
  return async (dispatch: Dispatch) => {
    const data = await axios
      .get(`${SETUP_KEEP_API_URL}/admin/access`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          Accept: 'application/json'
        }
      })
      .then((res) => res.data);
    dispatch({
      type: FETCH_KEEP_PERMISSIONS,
      payload: {
        createDbMapping: data.CreateDbMapping,
        deleteDbMapping: data.DeleteDbMapping
      }
    });
  };
};

export const initState = () => {
  return {
    type: INIT_STATE
  };
};
