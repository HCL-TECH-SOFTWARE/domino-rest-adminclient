/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { Database, Field, Form, Mode } from './types';

export const getDatabaseIndex = (databases: any, dbName: string, nsfPath: string) => {
  // Todo: we should only use schemaName in future
  return databases.findIndex((db: Database) => (dbName === db.schemaName && nsfPath === db.nsfPath) || (dbName === db.apiName && nsfPath === db.nsfPath));
};

export const getScopeIndex = (scopes: any, apiName: string) => {
  return scopes.findIndex((scope: Database) => apiName === scope.apiName);
};

export const findScopeBySchema = (scopes: any, schemaName: string, nsfPath: string) => {
  return scopes.findIndex((scope: Database) => schemaName === scope.schemaName && nsfPath === scope.nsfPath);
};

export const getFormIndex = (forms: Array<Form>, formName: string) => {
  return forms.findIndex((form: Form) => formName === form.formName);
};

export const getFormModeIndex = (formModes: Array<Mode>, formModeName: string) => {
  return formModes.findIndex((formMode: Mode) => formModeName === formMode.modeName);
};

export const getFieldIndex = (fields: Array<Field>, fieldName: string) => {
  return fields.findIndex((field: any) => fieldName === field.name)
};

export const validateFormSchemaName = (formName: string, formList: Array<string>) => {
  if (formList.includes(formName)) {
    return {
      error: true,
      errorMessage: `The form name ${formName} already exists!`,
    }
  } else if (formName === "") {
    return {
      error: true,
      errorMessage: `Please input a form name!`,
    }
  } else {
    return {
      error: false,
      errorMessage: "",
    }
  }
}
