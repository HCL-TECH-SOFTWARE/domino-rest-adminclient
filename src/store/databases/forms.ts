/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Dispatch } from 'redux';
import { Database } from './types';
import { AppDispatch } from '..';
import { getFormIndex, getFormModeIndex } from './scripts';
import { toggleAlert } from '../alerts/action';
import { SETUP_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { setApiLoading, toggleDeleteDialog } from '../dialog/action';
import { encodeQueryValue, fullEncode } from '../../utils/common';
import { apiRequestWithRetry } from '../../utils/api-retry';
import { log, getErrorMsg, setDBError, clearDBError } from './shared';
import { addNsfDesign } from './databases';
import {
  addForm as addFormAction,
  appendConfiguredForm as appendConfiguredFormAction,
  cacheFormFields as cacheFormFieldsAction,
  clearForms as clearFormsAction,
  resetForm,
  setActiveForm as setActiveFormAction,
  setCurrentForms as setCurrentFormsAction,
  setFormName as setFormNameAction,
  setForms as setFormsAction,
  setLoadedForm as setLoadedFormAction,
  unConfigForm as unConfigFormAction
} from './reducer';

export function setLoadedForm(dbName: string, formName: string) {
  return setLoadedFormAction({
      db: dbName,
      formName
    });
}
export function setActiveForm(dbName: string, formName: string) {
  return setActiveFormAction({
      db: dbName,
      formName
    });
}
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
/**
 * Fetch an NSF's design list and cache it under `nsfDesigns[nsfPath]`.
 *
 * `nsfPath` must be the **decoded** path — see the note on `addNsfDesign` in the reducer for
 * why, and for what goes wrong when a caller passes the encoded one.
 *
 * It took two further parameters until #977, and read neither: a schema name, which this
 * request does not carry — the design list belongs to the NSF, not to a schema over it — and
 * a React `useState` setter left behind when the answer stopped going back to a caller's
 * local state and started going into `nsfDesigns`. Both are gone; the design list reaches
 * every reader through the store.
 */
export const pullForms = (nsfPath: string) => {
  return async (dispatch: Dispatch) => {
    try {
      dispatch(setApiLoading(true));
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/designlist/forms?nsfPath=${encodeQueryValue(nsfPath)}`, {
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
          fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${encodeQueryValue(newSchemaData.nsfPath)}&configName=${encodeQueryValue(newSchemaData.schemaName)}`, {
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
          dispatch(setFormsAction({
              db: dbName,
              forms: configformsList
            }))
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
export function setFormName(formName: string) {
  return async (dispatch: Dispatch) => {
    dispatch(setFormNameAction(formName));
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
          fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${encodeQueryValue(newSchemaData.nsfPath)}&configName=${encodeQueryValue(newSchemaData.schemaName)}`, {
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
          fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${encodeQueryValue(newSchemaData.nsfPath)}&configName=${encodeQueryValue(newSchemaData.schemaName)}`, {
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
          fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${encodeQueryValue(newSchemaData.nsfPath)}&configName=${encodeQueryValue(newSchemaData.schemaName)}`, {
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
            dispatch(resetForm(formName));
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
 * Save a list of forms for a particular database
 *
 * @param dbname the database containing the forms
 * @param forms the array of forms
 */
export const setForms = (dbName: string, forms: Array<any>) => {
  return async (dispatch: any) => {
    await dispatch(setFormsAction({
        db: dbName,
        forms
      }));
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
      await dispatch(addFormAction({
          enabled: true,
          form: form
        }));
    } else {
      await dispatch(addFormAction({
          enabled: false
        }));
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
        fetch(`${SETUP_KEEP_API_URL}/design/forms/${fullEncode(form.formName)}?nsfPath=${encodeQueryValue(nsfPath)}`, {
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
    await dispatch(setCurrentFormsAction({
        db: dbName,
        forms
      }));
  };
};
export const cacheFormFields = (dbName: string, formName: string, fields: Array<any>) => {
  return async (dispatch: any) => {
    await dispatch(cacheFormFieldsAction({
        db: dbName,
        formName,
        fields
      }));
  };
};
export const appendConfiguredForm = (formIndex: number, data: object) => {
  return appendConfiguredFormAction({
      formIndex,
      data
    });
};

// function to Unconfigure form
export const unConfigForm = (schemaName: string, formName: string) => {
  return unConfigFormAction({
      schemaName,
      formName
    });
};
/**
 * Clear Form results
 */
export function clearForms() {
  return clearFormsAction();
}
