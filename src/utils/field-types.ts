/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * Pure conversions between Domino design types, JSON-schema formats and field types.
 *
 * These live in `utils/` rather than `components/access/functions.ts` because the store
 * needs them: `store/databases/action.ts` imported them from the component layer, which
 * inverted the dependency direction and meant anything importing the store transitively
 * pulled in a component module.
 */

export const convertDesignType2Format = (designType: string, attributes: Array<string>) => {
  if (designType === 'datetime') {
    if (attributes.length === 1 && attributes.includes('time')) {
      return 'string';
    }

    if (attributes.length === 1 && attributes.includes('date')) {
      return 'date';
    }
    return 'date-time';
  } else if (designType === 'number') {
    return 'float';
  } else if (designType === 'authors') {
    return 'authors';
  } else if (designType === 'password') {
    return 'password';
  } else if (designType === 'richtext' || designType === 'richtextlite') {
    return 'richtext';
  } else if (designType === 'names') {
    return 'names';
  } else if (designType === 'readers') {
    return 'readers';
  } else if (designType === 'json') {
    return 'binary';
  } else if (designType === 'attachments') {
    return 'binary';
  } else {
    // keyword, color, timezone, text, formula
    return 'string';
  }
};

export const convert2FieldType = (fieldFormat: string, isMultipleValue: boolean) => {
  if (isMultipleValue) {
    return 'array';
  }

  if (fieldFormat === 'boolean') {
    return 'boolean';
  } else if (fieldFormat === 'float' || fieldFormat === 'double') {
    return 'number';
  } else if (fieldFormat === 'int32' || fieldFormat === 'int64' || fieldFormat === 'byte') {
    return 'integer';
  } else if (fieldFormat === 'binary') {
    return 'object';
  } else if (fieldFormat === 'json') {
    return 'object';
  } else {
    return 'string';
  }
};
