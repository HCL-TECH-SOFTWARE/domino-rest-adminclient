/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
import { v4 as uuid } from 'uuid';
import {
  Database,
  ADD_SCOPE,
  SET_PULLED_SCOPE,
  FETCH_KEEP_DATABASES,
  DELETE_SCOPE,
  UPDATE_SCOPE,
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
  UPDATE_AGENT,
  SET_ACTIVEAGENTS,
  CACHE_FORM_FIELDS,
  CLEAR_FORMS,
  APPEND_CONFIGURED_FORM,
  RESET_FORM,
  ViewObj,
  AgentObj,
  UNCONFIG_FORM,
  FETCH_KEEP_SCOPES,
  ADD_ACTIVEVIEW,
  DELETE_ACTIVEVIEW,
  VIEWS_ERROR,
  SET_FORM_NAME
} from './types';
import { toggleDrawer } from '../drawer/action';
import { AppState, AppDispatch } from '..';
import { getFormIndex, getFormModeIndex } from './scripts';
import { TOGGLE_DRAWER } from '../drawer/types';
import { SET_VALUE } from '../loading/types';
import { toggleAlert, closeSnackbar } from '../alerts/action';
import { SETUP_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { setApiLoading, toggleDeleteDialog, toggleErrorDialog } from '../dialog/action';
import { toggleSettings } from '../dbsettings/action';
import { convert2FieldType, convertDesignType2Format } from '../../utils/field-types';
import { fullEncode } from '../../utils/common';
import { apiRequestWithRetry } from '../../utils/api-retry';
import { log, getErrorMsg, setDBError, clearDBError } from './shared';
// Consumed by the concerns still in this file — fetchScopes, pullForms and
// processViewsAgents respectively. They follow in the next cut.
import { sortAndRemoveDupSchemas } from './schemas';
import { addNsfDesign } from './databases';
import { isActiveAgent } from './agents';

// Re-exported so every existing `from '../store/databases/action'` import keeps
// working unchanged: this file is the barrel while #711 moves the concerns out.
export * from './shared';
export * from './formulas';
export * from './folders';
export * from './databases';
export * from './schemas';
export * from './agents';

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

      dispatch({
        type: DELETE_SCOPE,
        payload: apiName
      });
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
  return {
    type: SET_PULLED_SCOPE,
    payload: scopePull
  };
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
        dispatch({
          type: FETCH_KEEP_DATABASES,
          payload: []
        });
        dispatch({
          type: FETCH_KEEP_SCOPES,
          payload: scopes
        });

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
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)
      if (err) throw err;
        dispatch(toggleErrorDialog(`${error.statusCode}: ${error.message}`));
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
export const fetchFields = (schemaName: string, nsfPath: string, formName: string, externalName: string, designType: string) => {
  return async (dispatch: AppDispatch) => {
    try {
      // Encode the form name
      const encodedFormName = fullEncode(formName);
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/design/${designType}/${encodedFormName}?nsfPath=${nsfPath}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json',
          },
        })
      )
      const res = response

      if (!res.ok) {
        throw new Error(JSON.stringify(data))
      }

      // Add uuids for React
      const transformFields = [];
      // Set default value for fields otherwise those field cannot be saved properly once added
      for (const key in data as any) {
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
            type: type,
            kind: "",
          });
        } else {
          let field = data[key];
          let format = key === '$FILES' ? 'string' : convertDesignType2Format(field.type, field.attributes);
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
            type: type,
            kind: field.kind,
          });
        }
      }

      // Strip away @alias, @hide, and @name
      const draggableFields: Array<any> = transformFields.filter((_value, idx) => {
        return idx > 2;
      });

      // Save active form and fields for left panel
      dispatch(setActiveForm(schemaName, formName));
      dispatch(addActiveFields(externalName, draggableFields));
      dispatch(setLoadedForm(schemaName, formName));
      dispatch(setLoadedFields(externalName, draggableFields));

      dispatch({
        type: SET_VALUE,
        payload: {
          status: false
        }
      });
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)
      log.error('Error fetching fields', { error: err });
      dispatch(toggleErrorDialog(`${error.statusCode}: ${error.message}`));
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
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/designlist/views?nsfPath=${nsfPath}`, {
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
        setViews(
          dbName,
          data.views.map((view: any) => {
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
              viewUpdated: view['columns'] && view['columns'].length ? true : false,
              viewSelectionFormula: view['@selectionformula']
            };
          })
        ) as any
      );
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)
      log.error('Error fetching views', { error });
    }
  };
};

/**
 * Prepare form object to pass into the schema data payload.
 *
 * @param schemaData      the current schema object before changing the forms
 * @param dbName          the name of the schema
 * @param formsArray      the array of the new forms to be set into the schema object
 * @param setSchemaData   callback to set the schema state
 * @param successMsg      the alert message to show if updating the forms is a success
 * @param successCallback callback function to execute after success
 */
export const handleDatabaseForms = (
  schemaData: Database,
  dbName: string,
  formsArray: Array<any>,
  setSchemaData: (data: Database) => void,
  successMsg: string,
  successCallback?: () => void
) => {
  return async (dispatch: AppDispatch) => {
    // Send the new views to the server
    const formModeData = {
      modeName: 'default',
      fields: [],
      readAccessFormula: {
        formulaType: 'domino',
        formula: '@True'
      },
      writeAccessFormula: {
        formulaType: 'domino',
        formula: '@True'
      },
      deleteAccessFormula: {
        formulaType: 'domino',
        formula: '@False'
      },
      computeWithForm: false
    };
    const formToUpdate: Array<any> = [];
    formsArray.forEach((form) => {
      // Skip already configured forms.
      if (form.formModes.length > 0) {
        formToUpdate.push(form);
        return;
      } else {
        const newFormData = {
          formName: form.formName,
          alias: form.alias,
          formModes: [formModeData]
        };
        formToUpdate.push(newFormData);
      }
    });
    dispatch(updateForms(schemaData, dbName, formToUpdate, setSchemaData, successMsg, successCallback));
  };
};

export const pullForms = (nsfPath: string, _dbName: string, _setData: React.Dispatch<React.SetStateAction<string[]>>) => {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(setApiLoading(true));
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/designlist/forms?nsfPath=${nsfPath}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json',
          },
        }), { notifyOnError: false })
      
      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      } else {
        dispatch(addNsfDesign(nsfPath, data));
      }
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      // Use the response error if it's available
      if (err) {
        dispatch(setDBError(error.message));
      } else {
        dispatch(setDBError(error));
      }
    } finally {
      // A finally, not a line on each path: this flag was stranded on *every*
      // exit including success, so there is no path that may skip clearing it.
      dispatch(setApiLoading(false));
    }
  };
};

/**
 * Set the new forms by updating the schema.
 *
 * @param schemaData      the current schema object before changing the forms
 * @param dbName          the name of the schema
 * @param formsData       the array of the organized forms to be set into the schema object
 * @param setSchemaData   callback to set the schema state
 * @param successMsg      the alert message to show if updating the forms is a success
 * @param successCallback callback function to execute after success
 */
const updateForms = (
  schemaData: Database,
  dbName: string,
  formsData: Array<any>,
  setSchemaData: (data: Database) => void,
  successMsg: string,
  successCallback?: () => void
) => {
  let configformsList: Array<any> = [];
  return async (dispatch: Dispatch) => {
    const newSchemaData = {
      ...schemaData,
      forms: formsData
    };
    try {
      dispatch(setApiLoading(true));
      try {
        const { response, data } = await apiRequestWithRetry(() =>
          fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${newSchemaData.nsfPath}&configName=${newSchemaData.schemaName}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newSchemaData),
          }), { notifyOnError: false })

        if (!response.ok) {
          throw new Error(JSON.stringify(data))
        }

        const customForms = data.forms
        const allForms = schemaData.forms

        let newForms = []
        if (allForms.length > customForms.length) {
          newForms = allForms.map((form: any) => {
            const customForm = customForms.find((customForm: any) => customForm.formName === form.formName);
            if (customForm) {
              return {
                ...form,
                formModes: customForm.formModes
              };
            } else {
              return {
                ...form,
                formModes: [],
              }
            }
          })
        } else {
          newForms = data.forms
        }

        const newData = {
          ...data,
          forms: newForms,
        }

        setSchemaData(newData);
        configformsList = newForms.map((form: any) => {
          return { ...form, dbName };
        });

        dispatch(
          dispatch({
            type: SET_FORMS,
            payload: {
              db: dbName,
              forms: configformsList
            }
          })
        );
        dispatch(setApiLoading(false));
        dispatch(toggleAlert(successMsg));
      } catch (e: any) {
        // Before the parse below, which throws on any non-JSON error and would
        // take the rest of this handler with it.
        dispatch(setApiLoading(false));
        const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
        const error = JSON.parse(err)

        dispatch(toggleAlert(`Update forms failed! ${error.message}`));
      }
      dispatch(clearDBError());
      if (successCallback) {
        successCallback();
      }
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
 * Add/remove active view/s and then send them to the server
 */
export const handleDatabaseViews = (
  viewsArray: Array<any>,
  activeViews: any,
  dbName: string,
  schemaData: Database,
  active: boolean,
  setSchemaData: (data: any) => void,
  folderNames: Array<string>
) => {
  return async (dispatch: AppDispatch) => {
    // Build redux data
    const viewsData = viewsArray.map((view: any) => {
      return buildReduxViewData(view, active);
    });

    // Update panels
    viewsData.forEach((view: any) => {
      dispatch(updatePanels(dbName, view));
    });

    // Save views
    //  Build the array of new views
    const viewsList: Array<any> = [];
    if (viewsArray.length === 1) {
      activeViews.forEach((view: any) => {
        if (view.viewName !== viewsData[0].viewName) {
          viewsList.push(saveViewDetails(view, schemaData.nsfPath, active, folderNames.includes(view.viewName)));
        } else if (view.viewName === viewsData[0].viewName && active) {
          viewsList.push(saveViewDetails(view, schemaData.nsfPath, active, folderNames.includes(view.viewName)));
        }
      });
      if (active) {
        viewsList.push(
          saveViewDetails(viewsArray[0], schemaData.nsfPath, active, folderNames.includes(viewsArray[0].viewName), true)
        );
      }
    } else if (active) {
      const activeViewNames = activeViews.map((view: any) => {
        return view.viewName;
      });
      viewsArray.forEach(async (view: any) => {
        // if a view was already active, don't add it again to the active views list
        if (!activeViewNames.includes(view.viewName)) {
          const viewDetails = saveViewDetails(view, schemaData.nsfPath, active, folderNames.includes(view.viewName), true);
          viewsList.push(viewDetails);
        }
      });
      activeViews.forEach(async (view: any) => {
        const viewDetails = saveViewDetails(view, schemaData.nsfPath, active, folderNames.includes(view.viewName));
        viewsList.push(viewDetails);
      });
    }

    const finalViews = await Promise.all(viewsList);

    // Send the new views to the server
    dispatch(updateViews(schemaData, finalViews, setSchemaData));
  };
};

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
    const newSchemaData: any = {
      ...schemaData,
      forms: filteredForms,
      views: viewsData
    };
    try {
      dispatch(setApiLoading(true));
      try {
        let { response, data } = await apiRequestWithRetry(() =>
          fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${newSchemaData.nsfPath}&configName=${newSchemaData.schemaName}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newSchemaData),
          }), { notifyOnError: false })

        if (!response.ok) {
          throw new Error(JSON.stringify(data))
        }

        dispatch(toggleAlert(`Views have been successfully saved.`));
        setSchemaData({
          ...data,
          nsfPath: newSchemaData.nsfPath,
          schemaName: newSchemaData.schemaName
        });
        response = {
          ...data,
          nsfPath: newSchemaData.nsfPath,
          schemaName: newSchemaData.schemaName
        };
      } catch (e: any) {
        const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
        const error = JSON.parse(err)

        dispatch(toggleAlert(`Update views failed! ${error.message}`));
        dispatch({
          type: VIEWS_ERROR,
          payload: true
        });
      }
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

async function saveViewDetails(currentView: any, nsfPath: string, active: boolean, isFolder: boolean, callFetch = false) {
  let aliasArray: Array<any> = [];
  if (currentView.viewAlias != null && currentView.viewAlias.length > 0) {
    if (Array.isArray(currentView.viewAlias)) {
      aliasArray = currentView.viewAlias;
    } else {
      aliasArray.push(currentView.viewAlias);
    }
  }

  let viewDesign: any = {};

  if (active && callFetch) {
    viewDesign = await getViewDesign(currentView.viewName, nsfPath, isFolder);
  } else {
    viewDesign = {
      ...viewDesign,
      '@selectionFormula': currentView.viewSelectionFormula
    };
  }

  if (isFolder) {
    return {
      name: currentView.viewName,
      alias: aliasArray,
      unid: currentView.viewUnid,
      columns: currentView.viewColumns,
      viewUpdated: currentView.viewUpdated
    };
  } else {
    return {
      name: currentView.viewName,
      alias: aliasArray,
      unid: currentView.viewUnid,
      columns: currentView.viewColumns,
      viewUpdated: currentView.viewUpdated,
      selectionFormula: viewDesign['@selectionFormula']
    };
  }
}

// Get view elements by calling the design API
async function getViewDesign(viewName: string, nsfPath: string, isFolder: boolean) {
  const { data } = await apiRequestWithRetry(() =>
    fetch(
      `${SETUP_KEEP_API_URL}/design/${isFolder ? 'folders' : 'views'}/${fullEncode(viewName)}?nsfPath=${fullEncode(nsfPath)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${getToken()}`,
          'Content-Type': 'application/json'
        }
      }
    ), { notifyOnError: false })

  // const obj = await response.json();
  const obj = data
  return obj;
}

export function setFormName(formName: string) {
  return async (dispatch: Dispatch) => {
    dispatch({
      type: SET_FORM_NAME,
      payload: formName
    });
  };
}

function buildReduxViewData(currentView: any, viewActive: boolean) {
  return {
    viewName: currentView.viewName,
    viewAlias: currentView.viewAlias,
    viewUnid: currentView.viewUnid,
    viewActive: viewActive,
    viewUpdated: !viewActive ? false : currentView.viewUpdated,
    viewSelectionFormula: currentView.viewSelectionFormula
  };
}

function updatePanels(dbName: string, viewData: ViewObj) {
  return async (dispatch: Dispatch) => {
    // Update All Panel
    dispatch({
      type: UPDATE_VIEW,
      payload: {
        db: dbName,
        view: viewData
      }
    });

    // Update Active Panel
    if (viewData.viewActive) {
      dispatch({
        type: ADD_ACTIVEVIEW,
        payload: {
          db: dbName,
          activeView: viewData
        }
      });
    } else {
      dispatch({
        type: DELETE_ACTIVEVIEW,
        payload: {
          db: dbName,
          activeView: viewData.viewUnid
        }
      });
    }
  };
}

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
  setSchemaData: (schemaData: any) => void
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
      const formModeIndex = getFormModeIndex(filteredForms[formIndex].formModes, formModeData.modeName);
      if (formModeIndex >= 0) {
        let newFormModes = [...filteredForms[formIndex].formModes];
        newFormModes[formModeIndex] = formModeData;
        filteredForms[formIndex] = {
          formName: formName,
          alias: alias && alias.length > 0 ? alias : filteredForms[formIndex].alias,
          formModes: newFormModes
        };
      } else {
        filteredForms[formIndex] = {
          formName: formName,
          alias: alias && alias.length > 0 ? alias : filteredForms[formIndex].alias,
          formModes: [...filteredForms[formIndex].formModes, formModeData]
        };
        isNew = true;
      }
    } else {
      filteredForms.push(newFormData);
    }
    const newSchemaData: any = {
      ...schemaData,
      forms: filteredForms
    };
    try {
      dispatch(setApiLoading(true));
      try {
        const { response, data } = await apiRequestWithRetry(() =>
          fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${newSchemaData.nsfPath}&configName=${newSchemaData.schemaName}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newSchemaData),
          }), { notifyOnError: false })

        if (!response.ok) {
          throw new Error(JSON.stringify(data))
        }

        if (formIdx !== -1) {
          setSchemaData(data);
          dispatch(appendConfiguredForm(formIdx, formModeData));
        }
        if (!clone) {
          setSchemaData(data);
          dispatch(toggleAlert(`${formModeData.modeName} mode has been successfully ${isNew ? 'added' : 'updated'}.`));
        } else {
          setSchemaData(data);
          dispatch(toggleAlert(`Mode successfully cloned to ${formModeData.modeName}`));
        }

        dispatch(setApiLoading(false));
      } catch (error) {
        const errorMsg = getErrorMsg(error);
        dispatch(toggleAlert(`Update form mode failed! ${errorMsg}`));
        dispatch(setApiLoading(false))
      }
      dispatch(clearDBError());
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      // Use the response error if it's available
      if (err) {
        dispatch(setDBError(error.message));
      } else {
        dispatch(setDBError(error));
      }
      dispatch(setApiLoading(false))
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
  setSchemaData: (data: any) => void
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
      const formModeIndex = getFormModeIndex(filteredForms[formIndex].formModes, formModeName);
      if (formModeIndex >= 0) {
        const newFormModes = filteredForms[formIndex].formModes.filter((formMode) => formMode.modeName !== formModeName);
        filteredForms[formIndex] = {
          formName: formName,
          alias: filteredForms[formIndex].alias,
          formModes: newFormModes
        };
      }
    }
    const newSchemaData: any = {
      ...schemaData,
      forms: filteredForms
    };
    try {
      dispatch(setApiLoading(true));
      try {
        const { response, data } = await apiRequestWithRetry(() => 
          fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${newSchemaData.nsfPath}&configName=${newSchemaData.schemaName}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newSchemaData),
          }), { notifyOnError: false })

        if (!response.ok) {
          throw new Error(JSON.stringify(data))
        }

        setSchemaData(data);

        dispatch(setApiLoading(false));
        dispatch(toggleDeleteDialog());
        dispatch(toggleAlert(`${formModeName} mode has been deleted!`));
      } catch (e: any) {
        const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
        const error = JSON.parse(err)

        dispatch(setApiLoading(false));
        dispatch(toggleDeleteDialog());
        dispatch(toggleAlert(`Delete form mode failed! ${error.message}`));
      }
      dispatch(clearDBError());
    } catch {
      dispatch(toggleDeleteDialog());
      dispatch(toggleAlert(`Delete mode failed!`));
    }
  };
};

/**
 * Deactivate a configured form to the server.
 *
 * @param schemaData      the current schema object before changing the forms
 * @param formName        the name of the form to delete
 * @param setSchemaData   callback to set the schema state
 */
export const deleteForm = (
  schemaData: Database,
  formName: string,
  setSchemaData?: (data: Database) => void,
  customForm = false
) => {
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
    const newSchemaData: any = {
      ...schemaData,
      forms: filteredForms
    };
    try {
      dispatch(setApiLoading(true));
      try {
        const { response, data } = await apiRequestWithRetry(() =>
          fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${newSchemaData.nsfPath}&configName=${newSchemaData.schemaName}`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${getToken()}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newSchemaData),
          }), { notifyOnError: false })

        if (!response.ok) {
          throw new Error(JSON.stringify(data))
        }

        if (setSchemaData) {
          setSchemaData({
            ...data,
          });
          if (customForm) {
            dispatch({
              type: RESET_FORM,
              payload: formName
            });
            dispatch(toggleAlert(`Successfully deleted form ${formName}.`));
          } else {
            dispatch(toggleAlert(`Successfully deactivated form ${formName}.`));
          }
        }
        dispatch(setApiLoading(false));

        dispatch(unConfigForm(newSchemaData.schemaName, formName));
      } catch (e: any) {
        const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
        const error = JSON.parse(err)

        dispatch(setApiLoading(false));
        dispatch(toggleAlert(`Delete form failed! ${error.message}`));
      }
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
      dispatch({
        type: RESET_FORM,
        payload: {
          dbName: apiName
        }
      });

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
      dispatch({
        type: UPDATE_SCOPE,
        payload: { ...scopeData, index: contextViewIndex }
      });
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
      let { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${nsfPath}&configName=${dbName}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
        })
      )

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      // Initialize Views and Agents
      if (action === 'init') {
        // Get list of Active Views and Agents
        let views: Array<any> = data.availableViews;
        let agents: Array<any> = data.agents;

        // Build Active View list
        const viewsList: Array<any> = [];
        Object.values(views).forEach((view) => {
          let alias = view.alias != null && view.alias.length > 0 ? view.alias[0] : '';

          // Suppress alias when it's a duplicate of the name LABS-1903
          alias = alias === view.name ? '' : alias;
          let viewUpdatedBool = view.columns && view.columns.length > 0 ? true : false;
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
          let alias = agent.alias != null && agent.alias.length > 0 ? agent.alias[0] : '';

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
          data.availableViews = viewData;
        } else {
          data.agents = agentData;
        }

        try {
          // Destructured under different names on purpose. Called `data`, this
          // binding shadowed the outer `data` for the whole block — including the
          // `JSON.stringify(data)` in the request body below, which runs inside the
          // callback while the binding is still in its temporal dead zone. Every
          // save therefore raised "Cannot access 'data' before initialization"
          // inside apiRequestWithRetry, which caught it and returned a failure: the
          // POST was never sent, the user got a toast quoting a JavaScript error,
          // and the thunk resolved as though it had merely failed. (#803)
          const { response: saveResponse, data: saveData } = await apiRequestWithRetry(() =>
            fetch(`${SETUP_KEEP_API_URL}/admin/scope`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data),
            })
          )
          const res = saveResponse
          const resData = saveData

          if (!res.ok) {
            throw new Error(JSON.stringify(resData))
          }

          // Notify user
          if (type === 'views') {
            dispatch(toggleAlert('Activated Views have been saved'));
          } else {
            dispatch(toggleAlert('Activated Agents have been saved'));
          }
        } catch (e: any) {
          const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
          const error = JSON.parse(err)

          log.error('Error in saveViewsAgents', { statusCode: error.statusCode, message: error.message });
        }
      }
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      log.error('Error in processViewsAgents', { statusCode: error.statusCode, message: error.message });
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
    dbName: string;
    formName: string;
    alias: Array<string>;
    formModes: Array<any>;
    formAccessModes: Array<any>;
  }
) => {
  return async (dispatch: any) => {
    if (enabled) {
      await dispatch({
        type: ADD_FORM,
        payload: {
          enabled: true,
          form: form
        }
      });
    } else {
      await dispatch({
        type: ADD_FORM,
        payload: {
          enabled: false
        }
      });
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
    formName: string;
    fields: Array<any>;
  },
  nsfPath: string
) => {
  return async (dispatch: any) => {
    const formData = {
      name: form.formName,
      alias: '',
      fields: form.fields
    };
    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/design/forms/${fullEncode(form.formName)}?nsfPath=${fullEncode(nsfPath)}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })
      )

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      dispatch(toggleAlert('New form schema created!'));
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      log.error('Error creating new form schema', { error });
    }
  };
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

export const cacheFormFields = (dbName: string, formName: string, fields: Array<any>) => {
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

export const appendConfiguredForm = (formIndex: number, data: object) => {
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
 * Clear Form results
 */
export function clearForms() {
  return {
    type: CLEAR_FORMS
  };
}

/**
 * get all fields from nsf path
 */
export const getAllFieldsByNsf = (nsfPath: any) => {
  return async (dispatch: AppDispatch) => {
    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/design/itemdefinitions?nsfPath=${nsfPath}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json',
          },
        })
      )

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      const allFields = data[0]
      const mapping = {
        TYPE_TEXT: 'string',
        TYPE_NUMBER: 'number',
        TYPE_TIME: 'date-time',
        TYPE_TEXT_LIST: 'string',
        TYPE_NUMBER_LIST: 'number',
        TYPE_TIME_RANGE: 'date-time'
      };
      const allFieldsKey = Object.keys(allFields);
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
          const fieldValue = allFields[allFieldKey];
          let format = 'string';
          let type = 'string';
          let isMultiValue = false;
          if (allFieldKey === 'TYPE_NUMBER' || allFieldKey === 'TYPE_NUMBER_RANGE') {
            format = 'float';
            type = 'number';
          }
          if (allFieldKey === 'TYPE_NUMBER_RANGE' || allFieldKey === 'TYPE_TIME_RANGE' || allFieldKey === 'TYPE_TEXT_LIST') {
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
      const checkSymbolFileFieldExist = finalFields.filter((field: any) => field.content === '$FILE');
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
  
      dispatch(addActiveFields('keep_internal_form_for_allFields', finalFields));
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      log.error('Error fetching all fields', { error })
    }
  };
};
