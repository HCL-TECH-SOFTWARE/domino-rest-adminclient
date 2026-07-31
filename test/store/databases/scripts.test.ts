/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  getDatabaseIndex,
  getScopeIndex,
  findScopeBySchema,
  getFormIndex,
  getFormModeIndex,
  getFieldIndex,
  validateFormSchemaName,
} from '../../../src/store/databases/scripts';

describe('getDatabaseIndex', () => {
  const databases = [
    { schemaName: 'Sales', apiName: 'sales-api', nsfPath: 'sales.nsf' },
    { schemaName: 'HR', apiName: 'hr-api', nsfPath: 'hr.nsf' },
  ];

  it('matches on schemaName + nsfPath', () => {
    expect(getDatabaseIndex(databases, 'HR', 'hr.nsf')).toBe(1);
  });

  it('matches on apiName + nsfPath', () => {
    expect(getDatabaseIndex(databases, 'sales-api', 'sales.nsf')).toBe(0);
  });

  it('returns -1 when the name matches but the nsfPath does not', () => {
    expect(getDatabaseIndex(databases, 'HR', 'sales.nsf')).toBe(-1);
  });

  it('returns -1 when nothing matches', () => {
    expect(getDatabaseIndex(databases, 'Unknown', 'none.nsf')).toBe(-1);
  });

  it('returns -1 for an empty list', () => {
    expect(getDatabaseIndex([], 'Sales', 'sales.nsf')).toBe(-1);
  });
});

describe('getScopeIndex', () => {
  const scopes = [{ apiName: 'a' }, { apiName: 'b' }, { apiName: 'c' }];

  it('finds the scope by apiName', () => {
    expect(getScopeIndex(scopes, 'b')).toBe(1);
  });

  it('returns -1 when the apiName is absent', () => {
    expect(getScopeIndex(scopes, 'z')).toBe(-1);
  });

  it('returns -1 for an empty list', () => {
    expect(getScopeIndex([], 'a')).toBe(-1);
  });
});

describe('findScopeBySchema', () => {
  const scopes = [
    { schemaName: 'Sales', nsfPath: 'sales.nsf' },
    { schemaName: 'HR', nsfPath: 'hr.nsf' },
  ];

  it('matches on schemaName + nsfPath', () => {
    expect(findScopeBySchema(scopes, 'HR', 'hr.nsf')).toBe(1);
  });

  it('returns -1 when the schema matches but the nsfPath does not', () => {
    expect(findScopeBySchema(scopes, 'HR', 'sales.nsf')).toBe(-1);
  });

  it('returns -1 when nothing matches', () => {
    expect(findScopeBySchema(scopes, 'None', 'none.nsf')).toBe(-1);
  });

  it('returns -1 for an empty list', () => {
    expect(findScopeBySchema([], 'Sales', 'sales.nsf')).toBe(-1);
  });
});

describe('getFormIndex', () => {
  const forms = [{ formName: 'Contact' }, { formName: 'Order' }] as any;

  it('finds the form by formName', () => {
    expect(getFormIndex(forms, 'Order')).toBe(1);
  });

  it('returns -1 when the formName is absent', () => {
    expect(getFormIndex(forms, 'Missing')).toBe(-1);
  });

  it('returns -1 for an empty list', () => {
    expect(getFormIndex([] as any, 'Contact')).toBe(-1);
  });
});

describe('getFormModeIndex', () => {
  const formModes = [{ modeName: 'default' }, { modeName: 'admin' }] as any;

  it('finds the form mode by modeName', () => {
    expect(getFormModeIndex(formModes, 'admin')).toBe(1);
  });

  it('returns -1 when the modeName is absent', () => {
    expect(getFormModeIndex(formModes, 'guest')).toBe(-1);
  });

  it('returns -1 for an empty list', () => {
    expect(getFormModeIndex([] as any, 'default')).toBe(-1);
  });
});

describe('getFieldIndex', () => {
  const fields = [{ name: 'firstName' }, { name: 'lastName' }] as any;

  it('finds the field by name', () => {
    expect(getFieldIndex(fields, 'lastName')).toBe(1);
  });

  it('returns -1 when the field name is absent', () => {
    expect(getFieldIndex(fields, 'age')).toBe(-1);
  });

  it('returns -1 for an empty list', () => {
    expect(getFieldIndex([] as any, 'firstName')).toBe(-1);
  });
});

describe('validateFormSchemaName', () => {
  it('flags a duplicate form name', () => {
    expect(validateFormSchemaName('Contact', ['Contact', 'Order'])).toEqual({
      error: true,
      errorMessage: 'The form name Contact already exists!',
    });
  });

  it('flags an empty form name', () => {
    expect(validateFormSchemaName('', [])).toEqual({
      error: true,
      errorMessage: 'Please input a form name!',
    });
  });

  it('accepts a unique, non-empty form name', () => {
    expect(validateFormSchemaName('NewForm', ['Contact', 'Order'])).toEqual({
      error: false,
      errorMessage: '',
    });
  });
});
