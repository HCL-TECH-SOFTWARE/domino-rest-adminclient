/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { v4 as uuid } from 'uuid';
import { AppDispatch } from '..';
import { SETUP_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { toggleErrorDialog } from '../dialog/action';
import { convert2FieldType, convertDesignType2Format } from '../../utils/field-types';
import { fullEncode } from '../../utils/common';
import { apiRequestWithRetry } from '../../utils/api-retry';
import { log } from './shared';
import { setActiveForm, setLoadedForm } from './forms';
import { setLoading } from '../loading/action';
import {
  addActiveFields as addActiveFieldsAction,
  setLoadedFields as setLoadedFieldsAction,
} from './reducer';

/**
 * Save the list of fields for the currently loaded form.
 *
 * @param formName the form containing the fields
 * @param fields the array of fields
 */
export const setLoadedFields = (formName: string, fields: Array<any>) => {
  return async (dispatch: any) => {
    await dispatch(setLoadedFieldsAction({
        formName: formName,
        fields
      }));
  };
};
/**
 * Add fields to the list of available fields
 * to add to a mode.
 *
 * @param formName the form containing the fields
 * @param fields the array of fields
 */
export const addActiveFields = (formName: string, fields: Array<any>) => {
  return async (dispatch: any) => {
    await dispatch(addActiveFieldsAction({ activeFields: { formName, fields } }));
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

      dispatch(setLoading({ status: false }));
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)
      log.error('Error fetching fields', { error: err });
      dispatch(toggleErrorDialog(`${error.statusCode}: ${error.message}`));
    }
  };
};
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
