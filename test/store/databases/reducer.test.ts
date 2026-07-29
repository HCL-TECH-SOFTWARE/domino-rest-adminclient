/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import databaseReducer from '../../../src/store/databases/reducer';
import { DBState, FETCH_AVAILABLE_DATABASES, VIEWS_ERROR, AGENTS_ERROR, SET_ACTIVEVIEWS, SET_ACTIVEAGENTS, SAVE_READ_RESULT, SAVE_WRITE_RESULT, SAVE_DELETE_RESULT, SAVE_LOAD_RESULT, SAVE_SAVE_RESULT, SET_DB_ERROR, CLEAR_DB_ERROR, INIT_STATE } from '../../../src/store/databases/types';
import {
  fetchKeepDatabases as fetchKeepDatabasesAction,
  fetchKeepScopes as fetchKeepScopesAction,
  addAvailableDatabase as addAvailableDatabaseAction,
  addNewSchemaToState as addNewSchemaToStateAction,
  clearSchemaForm as clearSchemaFormAction,
  updateError as updateErrorAction,
  fetchDbConfig as fetchDbConfigAction,
  addSchema as addSchemaAction,
  addScope as addScopeAction,
  updateScope as updateScopeAction,
  deleteSchema as deleteSchemaAction,
  deleteScope as deleteScopeAction,
  updateSchema as updateSchemaAction,
  setPullDatabase as setPullDatabaseAction,
  setPullScope as setPullScopeAction,
  formLoading as formLoadingAction,
  appendFormData as appendFormDataAction,
  setForms as setFormsAction,
  addForm as addFormAction,
  setCurrentForms as setCurrentFormsAction,
  cacheModes as cacheModesAction,
  cacheFormFields as cacheFormFieldsAction,
  setRetryCount as setRetryCountAction,
  appendConfiguredForm as appendConfiguredFormAction,
  unConfigForm as unConfigFormAction,
  setDbIndex as setDbIndexAction,
  resetForm as resetFormAction,
  setLoadedForm as setLoadedFormAction,
  setLoadedFields as setLoadedFieldsAction,
  setActiveForm as setActiveFormAction,
  addActiveFields as addActiveFieldsAction,
  setViews as setViewsAction,
  updateView as updateViewAction,
  addActiveView as addActiveViewAction,
  deleteActiveView as deleteActiveViewAction,
  setFolders as setFoldersAction,
  setAgents as setAgentsAction,
  updateAgent as updateAgentAction,
  addActiveAgent as addActiveAgentAction,
  deleteActiveAgent as deleteActiveAgentAction,
  setFormName as setFormNameAction,
  clearFormulaResults as clearFormulaResultsAction,
  clearDatabasePullResult as clearDatabasePullResultAction,
  clearForms as clearFormsAction,
  addNsfDesign as addNsfDesignAction,
  setOnlyShowSchemasWithScopes as setOnlyShowSchemasWithScopesAction,
  fetchKeepPermissions as fetchKeepPermissionsAction,
} from '../../../src/store/databases/reducer';

// The reducer's initialState is not exported, so we mirror it here. It doubles
// as the strong assertion target for the "unknown action" and INIT_STATE cases.
const expectedInitial: DBState = {
  databases: [],
  databasesOverview: [],
  nsfDesigns: {},
  availableDatabases: [],
  scopes: [],
  databasePull: false,
  scopePull: false,
  forms: [],
  loadedForm: '',
  loadedFields: [],
  activeForm: '',
  activeFields: [],
  views: [],
  activeViews: [],
  folders: [],
  agents: [],
  newForm: { enabled: false },
  activeAgents: [],
  formLoading: true,
  contextViewIndex: -1,
  retryCount: 0,
  dbError: false,
  dbErrorMessage: '',
  displayTestResults: false,
  displayReadResults: false,
  readFormulaResults: '',
  displayWriteResults: false,
  writeFormulaResults: '',
  displayDeleteResults: false,
  deleteFormulaResults: '',
  displayLoadResults: false,
  loadFormulaResults: '',
  displaySaveResults: false,
  saveFormulaResults: '',
  onlyShowSchemasWithScopes: true,
  permissions: {},
  clearSchemaForm: false,
  updateViewError: false,
  updateAgentError: false,
  updateSchemaError: false,
  formName: '',
  updateFormError: false,
};

// Actions carry a broad set of payload shapes (many are heavy interfaces such as
// Database/Scope). Typing every fixture fully adds no coverage value, so actions
// flow through `run` as `any` — the reducer is the unit under test, not the wire
// types. Each test builds a fresh state so nested arrays are never shared.
const run = (state: DBState | undefined, action: any): DBState =>
  databaseReducer(state, action);

const makeState = (overrides: Partial<DBState> = {}): DBState => ({
  ...expectedInitial,
  databasesOverview: [],
  availableDatabases: [],
  scopes: [],
  forms: [],
  loadedFields: [],
  activeFields: [],
  views: [],
  activeViews: [],
  folders: [],
  agents: [],
  activeAgents: [],
  nsfDesigns: {},
  permissions: {},
  ...overrides,
});

describe('databaseReducer - base behaviour', () => {
  it('returns the initial state for an unknown action', () => {
    expect(run(undefined, { type: '@@UNKNOWN' })).toEqual(expectedInitial);
  });

  it('returns the current state unchanged for an unrecognised action type', () => {
    const state = makeState({ retryCount: 9, formName: 'keep' });
    expect(run(state, { type: 'NON_EXISTENT' })).toBe(state);
  });

  it('INIT_STATE resets a dirty state back to the initial state', () => {
    const dirty = makeState({
      retryCount: 42,
      dbError: true,
      dbErrorMessage: 'x',
      formName: 'stale',
      onlyShowSchemasWithScopes: false,
    });
    expect(run(dirty, { type: INIT_STATE })).toEqual(expectedInitial);
  });
});

describe('databaseReducer - single-field setters', () => {
  const cases: Array<{ type: string; payload: any; field: keyof DBState }> = [
    {
      type: fetchKeepDatabasesAction.type,
      payload: [{ schemaName: 'x', nsfPath: 'p', description: '', icon: '', iconName: '' }],
      field: 'databasesOverview',
    },
    {
      type: FETCH_AVAILABLE_DATABASES,
      payload: [{ title: 't', nsfpath: 'n', apinames: [] }],
      field: 'availableDatabases',
    },
    { type: clearSchemaFormAction.type, payload: true, field: 'clearSchemaForm' },
    { type: VIEWS_ERROR, payload: true, field: 'updateViewError' },
    { type: AGENTS_ERROR, payload: true, field: 'updateAgentError' },
    { type: updateErrorAction.type, payload: true, field: 'updateSchemaError' },
    { type: setPullScopeAction.type, payload: true, field: 'scopePull' },
    { type: formLoadingAction.type, payload: false, field: 'formLoading' },
    { type: setRetryCountAction.type, payload: 3, field: 'retryCount' },
    { type: setDbIndexAction.type, payload: 5, field: 'contextViewIndex' },
    { type: setFormNameAction.type, payload: 'myForm', field: 'formName' },
    { type: setOnlyShowSchemasWithScopesAction.type, payload: false, field: 'onlyShowSchemasWithScopes' },
  ];

  it.each(cases)('$type sets $field from the payload', ({ type, payload, field }) => {
    const next = run(makeState({ formLoading: true }), { type, payload });
    expect(next[field]).toEqual(payload);
  });
});

describe('databaseReducer - multi-field setters', () => {
  const cases: Array<{ type: string; payload: any; patch: Partial<DBState> }> = [
    { type: setPullDatabaseAction.type, payload: true, patch: { databasePull: true, scopePull: true } },
    {
      type: SAVE_READ_RESULT,
      payload: 'R',
      patch: { displayTestResults: true, displayReadResults: true, readFormulaResults: 'R' },
    },
    {
      type: SAVE_WRITE_RESULT,
      payload: 'W',
      patch: { displayTestResults: true, displayWriteResults: true, writeFormulaResults: 'W' },
    },
    {
      type: SAVE_DELETE_RESULT,
      payload: 'D',
      patch: { displayTestResults: true, displayDeleteResults: true, deleteFormulaResults: 'D' },
    },
    {
      type: SAVE_LOAD_RESULT,
      payload: 'L',
      patch: { displayTestResults: true, displayLoadResults: true, loadFormulaResults: 'L' },
    },
    {
      type: SAVE_SAVE_RESULT,
      payload: 'S',
      patch: { displayTestResults: true, displaySaveResults: true, saveFormulaResults: 'S' },
    },
    { type: SET_DB_ERROR, payload: 'boom', patch: { dbError: true, dbErrorMessage: 'boom' } },
  ];

  it.each(cases)('$type applies its field patch', ({ type, payload, patch }) => {
    expect(run(makeState(), { type, payload })).toMatchObject(patch);
  });

  it('CLEAR_DB_ERROR clears the error flag and message', () => {
    const next = run(makeState({ dbError: true, dbErrorMessage: 'x' }), { type: CLEAR_DB_ERROR });
    expect(next).toMatchObject({ dbError: false, dbErrorMessage: '' });
  });

  it('CLEAR_DATABASEPULL_RESULT resets both pull flags', () => {
    const next = run(makeState({ databasePull: true, scopePull: true }), {
      type: clearDatabasePullResultAction.type,
    });
    expect(next).toMatchObject({ databasePull: false, scopePull: false });
  });

  it('CLEAR_FORMS empties the forms array', () => {
    const state = makeState({ forms: [{ dbName: 'db', formName: 'F', alias: [], formAccessModes: [] }] });
    expect(run(state, { type: clearFormsAction.type }).forms).toEqual([]);
  });

  it('CLEAR_FORMULA_RESULTS clears every formula display flag and result string', () => {
    const dirty = makeState({
      displayTestResults: true,
      displayReadResults: true,
      readFormulaResults: 'r',
      displayWriteResults: true,
      writeFormulaResults: 'w',
      displayDeleteResults: true,
      deleteFormulaResults: 'd',
      displayLoadResults: true,
      loadFormulaResults: 'l',
      displaySaveResults: true,
      saveFormulaResults: 's',
    });
    expect(run(dirty, { type: clearFormulaResultsAction.type })).toMatchObject({
      displayTestResults: false,
      displayReadResults: false,
      readFormulaResults: '',
      displayWriteResults: false,
      writeFormulaResults: '',
      displayDeleteResults: false,
      deleteFormulaResults: '',
      displayLoadResults: false,
      loadFormulaResults: '',
      displaySaveResults: false,
      saveFormulaResults: '',
    });
  });

  it('FETCH_KEEP_PERMISSIONS stores the create/delete mapping flags', () => {
    const next = run(makeState(), {
      type: fetchKeepPermissionsAction.type,
      payload: { createDbMapping: true, deleteDbMapping: false },
    });
    expect(next.permissions).toEqual({ createDbMapping: true, deleteDbMapping: false });
  });
});

describe('databaseReducer - scopes', () => {
  it('FETCH_KEEP_SCOPES stores scopes while filtering out the keepconfig scope', () => {
    const next = run(makeState(), {
      type: fetchKeepScopesAction.type,
      payload: [{ apiName: 'keepconfig' }, { apiName: 'real' }, { apiName: 'other' }],
    });
    expect(next.scopes).toHaveLength(2);
    expect(next.scopes.map((s) => s.apiName)).toEqual(['real', 'other']);
  });

  it('ADD_SCOPE appends the scope to the list', () => {
    const state = makeState({ scopes: [{ apiName: 'sc1' } as any] });
    const next = run(state, { type: addScopeAction.type, payload: { apiName: 'sc2' } });
    expect(next.scopes).toHaveLength(2);
    expect(next.scopes[1].apiName).toBe('sc2');
  });

  it('UPDATE_SCOPE replaces the scope matched by apiName', () => {
    const state = makeState({
      scopes: [{ apiName: 'sc1', schemaName: 'old' } as any, { apiName: 'sc2' } as any],
    });
    const next = run(state, { type: updateScopeAction.type, payload: { apiName: 'sc1', schemaName: 'new' } });
    expect(next.scopes[0].schemaName).toBe('new');
    expect(next.scopes[1].apiName).toBe('sc2');
  });

  it('DELETE_SCOPE removes the scope whose apiName matches the payload string', () => {
    const state = makeState({
      scopes: [{ apiName: 'sc1' } as any, { apiName: 'sc2' } as any],
    });
    const next = run(state, { type: deleteScopeAction.type, payload: 'sc1' });
    expect(next.scopes).toHaveLength(1);
    expect(next.scopes[0].apiName).toBe('sc2');
  });
});

describe('databaseReducer - available databases & schemas', () => {
  it('ADD_AVAILABLE_DATABASE appends a database that is not yet present', () => {
    const state = makeState({ availableDatabases: [{ title: 'a', nsfpath: 'n1', apinames: [] }] });
    const next = run(state, {
      type: addAvailableDatabaseAction.type,
      payload: { title: 'b', nsfpath: 'n2', apinames: [] },
    });
    expect(next.availableDatabases).toHaveLength(2);
    expect(next.availableDatabases[1].nsfpath).toBe('n2');
  });

  it('ADD_AVAILABLE_DATABASE is a no-op when the nsfpath already exists', () => {
    const state = makeState({ availableDatabases: [{ title: 'a', nsfpath: 'n1', apinames: [] }] });
    const next = run(state, {
      type: addAvailableDatabaseAction.type,
      payload: { title: 'dup', nsfpath: 'n1', apinames: [] },
    });
    expect(next).toBe(state);
    expect(next.availableDatabases).toHaveLength(1);
  });

  it('ADD_NEW_SCHEMA_TO_STATE pushes the schema name onto the matching available database', () => {
    const state = makeState({
      availableDatabases: [{ title: 'a', nsfpath: 'path1', apinames: ['s1'] }],
    });
    const next = run(state, {
      type: addNewSchemaToStateAction.type,
      payload: { schemaName: 's2', nsfPath: 'path1' },
    });
    expect(next.availableDatabases[0].apinames).toEqual(['s1', 's2']);
  });

  it('ADD_SCHEMA pushes a schema onto databasesOverview', () => {
    const state = makeState({ databasesOverview: [{ schemaName: 's1' } as any] });
    const next = run(state, { type: addSchemaAction.type, payload: { schemaName: 's2', nsfPath: 'p' } });
    expect(next.databasesOverview).toHaveLength(2);
    expect(next.databasesOverview[1].schemaName).toBe('s2');
  });

  it('FETCH_DB_CONFIG replaces the matched overview entry and records its index', () => {
    const state = makeState({
      databasesOverview: [
        { schemaName: 'other', nsfPath: 'p0' } as any,
        { schemaName: 's1', nsfPath: 'path1' } as any,
      ],
    });
    const next = run(state, {
      type: fetchDbConfigAction.type,
      payload: { apiName: 's1', schemaName: 's1', nsfPath: 'path1', description: 'cfg' },
    });
    expect(next.contextViewIndex).toBe(1);
    expect(next.databasesOverview[1]).toMatchObject({ apiName: 's1', description: 'cfg' });
  });

  it('DELETE_SCHEMA removes the overview entry and its apiname from availableDatabases', () => {
    const state = makeState({
      databasesOverview: [{ schemaName: 's1', nsfPath: 'path1' } as any],
      availableDatabases: [{ title: 'a', nsfpath: 'path1', apinames: ['s1', 's2'] }],
    });
    const next = run(state, {
      type: deleteSchemaAction.type,
      payload: { schemaName: 's1', nsfPath: 'path1' },
    });
    expect(next.databasesOverview).toHaveLength(0);
    expect(next.availableDatabases[0].apinames).toEqual(['s2']);
  });

  it('UPDATE_SCHEMA updates existing overview entries and appends new ones', () => {
    const state = makeState({
      databasesOverview: [
        { schemaName: 's1', nsfPath: 'p', description: 'old', icon: '', iconName: '' } as any,
      ],
    });
    const next = run(state, {
      type: updateSchemaAction.type,
      payload: [
        { schemaName: 's1', nsfPath: 'p', description: 'new', icon: '', iconName: '' },
        { schemaName: 's2', nsfPath: 'p', description: 'brand', icon: '', iconName: '' },
      ],
    });
    expect(next.databasesOverview).toHaveLength(2);
    expect(next.databasesOverview[0].description).toBe('new');
    expect(next.databasesOverview[1].schemaName).toBe('s2');
  });
});

describe('databaseReducer - forms', () => {
  it('APPEND_FORM_DATA replaces the overview entry at the given index', () => {
    const state = makeState({ databasesOverview: [{ schemaName: 'old' } as any] });
    const next = run(state, {
      type: appendFormDataAction.type,
      payload: { dbIndex: 0, data: { schemaName: 'new' } },
    });
    expect(next.databasesOverview[0].schemaName).toBe('new');
  });

  it('SET_FORMS merges by formName - replacing existing and appending new forms', () => {
    const state = makeState({
      forms: [{ dbName: 'db', formName: 'A', alias: [], formModes: [], formAccessModes: [] }],
    });
    const next = run(state, {
      type: setFormsAction.type,
      payload: {
        db: 'db',
        nsfPath: 'p',
        forms: [
          { dbName: 'db', formName: 'A', alias: [], formModes: [{ x: 1 }], formAccessModes: [] },
          { dbName: 'db', formName: 'B', alias: [], formModes: [], formAccessModes: [] },
        ],
      },
    });
    expect(next.forms).toHaveLength(2);
    expect(next.forms[0].formModes).toHaveLength(1);
    expect(next.forms[1].formName).toBe('B');
  });

  it('SET_CURRENTFORMS overwrites the forms array', () => {
    const state = makeState({
      forms: [{ dbName: 'db', formName: 'A', alias: [], formAccessModes: [] }],
    });
    const next = run(state, {
      type: setCurrentFormsAction.type,
      payload: { db: 'db', forms: [{ dbName: 'db', formName: 'Z', alias: [], formAccessModes: [] }] },
    });
    expect(next.forms).toHaveLength(1);
    expect(next.forms[0].formName).toBe('Z');
  });

  it('ADD_FORM stores the new form when enabled is true', () => {
    const next = run(makeState(), {
      type: addFormAction.type,
      payload: { enabled: true, form: { formName: 'NF' } },
    });
    expect(next.newForm).toMatchObject({ enabled: true, form: { formName: 'NF' } });
  });

  it('ADD_FORM disables newForm when enabled is false', () => {
    const state = makeState({ newForm: { enabled: true, form: { formName: 'X' } as any } });
    const next = run(state, { type: addFormAction.type, payload: { enabled: false } });
    expect(next.newForm).toEqual({ enabled: false });
  });

  it('APPEND_CONFIGURED_FORM pushes onto the target form modes', () => {
    const state = makeState({
      forms: [{ dbName: 'db', formName: 'A', alias: [], formModes: [{ a: 1 }], formAccessModes: [] }],
    });
    const next = run(state, { type: appendConfiguredFormAction.type, payload: { formIndex: 0, data: { b: 2 } } });
    expect(next.forms[0].formModes).toHaveLength(2);
    expect(next.forms[0].formModes?.[1]).toEqual({ b: 2 });
  });

  it('UNCONFIG_FORM clears the formModes of the matched form', () => {
    const state = makeState({
      forms: [{ dbName: 'db1', formName: 'F', alias: [], formModes: [{ a: 1 }], formAccessModes: [] }],
    });
    const next = run(state, { type: unConfigFormAction.type, payload: { schemaName: 'db1', formName: 'F' } });
    expect(next.forms[0].formModes).toEqual([]);
  });

  it('RESET_FORM removes the form matching the payload formName', () => {
    const state = makeState({
      forms: [
        { dbName: 'db', formName: 'A', alias: [], formAccessModes: [] },
        { dbName: 'db', formName: 'B', alias: [], formAccessModes: [] },
      ],
    });
    const next = run(state, { type: resetFormAction.type, payload: 'A' });
    expect(next.forms).toHaveLength(1);
    expect(next.forms[0].formName).toBe('B');
  });

  it('SET_LOADEDFORM records the loaded form name', () => {
    const next = run(makeState(), { type: setLoadedFormAction.type, payload: { db: 'db', formName: 'LF' } });
    expect(next.loadedForm).toBe('LF');
  });

  it('SET_LOADEDFIELDS stores the loaded fields', () => {
    const fields = [{ name: 'f1' }, { name: 'f2' }];
    const next = run(makeState(), { type: setLoadedFieldsAction.type, payload: { formName: 'LF', fields } });
    expect(next.loadedFields).toEqual(fields);
  });

  it('SET_ACTIVEFORM records the active form name', () => {
    const next = run(makeState(), { type: setActiveFormAction.type, payload: { db: 'db', formName: 'AF' } });
    expect(next.activeForm).toBe('AF');
  });

  it('ADD_ACTIVEFIELDS adds a new active-fields entry', () => {
    const next = run(makeState(), {
      type: addActiveFieldsAction.type,
      payload: { activeFields: { formName: 'AF', fields: [] } },
    });
    expect(next.activeFields).toHaveLength(1);
    expect(next.activeFields[0].formName).toBe('AF');
  });

  it('ADD_ACTIVEFIELDS does not add a second entry for the same form name', () => {
    const state = makeState({ activeFields: [{ formName: 'AF', fields: [] }] });
    const next = run(state, {
      type: addActiveFieldsAction.type,
      payload: { activeFields: { formName: 'AF', fields: [{ name: 'x' }] } },
    });
    expect(next.activeFields).toHaveLength(1);
    expect(next.activeFields[0].fields).toEqual([{ name: 'x' }]);
  });
});

describe('databaseReducer - views & folders', () => {
  it('SET_VIEWS marks views active/updated based on the current activeViews', () => {
    const state = makeState({ activeViews: [{ viewUnid: 'v1', viewUpdated: true }] });
    const next = run(state, {
      type: setViewsAction.type,
      payload: {
        db: 'db',
        views: [
          { viewUnid: 'v1', viewName: 'One', viewActive: false },
          { viewUnid: 'v2', viewName: 'Two' },
        ],
      },
    });
    expect(next.views[0]).toMatchObject({ viewUnid: 'v1', viewActive: true, viewUpdated: true });
    expect(next.views[1].viewActive).toBe(false);
  });

  it('UPDATE_VIEW replaces the matching view', () => {
    const state = makeState({ views: [{ viewUnid: 'v1', viewName: 'old', viewActive: true }] });
    const next = run(state, {
      type: updateViewAction.type,
      payload: { db: 'db', view: { viewUnid: 'v1', viewName: 'new', viewActive: true } },
    });
    expect(next.views[0].viewName).toBe('new');
  });

  it('SET_ACTIVEVIEWS overwrites the active views list', () => {
    const next = run(makeState(), {
      type: SET_ACTIVEVIEWS,
      payload: { db: 'db', activeViews: [{ viewUnid: 'v9' }] },
    });
    expect(next.activeViews).toEqual([{ viewUnid: 'v9' }]);
  });

  it('ADD_ACTIVEVIEW appends a non-duplicate active view', () => {
    const state = makeState({ activeViews: [{ viewUnid: 'v1' }] });
    const next = run(state, {
      type: addActiveViewAction.type,
      payload: { db: 'db', activeView: { viewUnid: 'v2', viewName: 'Two', viewActive: true } },
    });
    expect(next.activeViews).toHaveLength(2);
  });

  it('ADD_ACTIVEVIEW ignores a duplicate viewUnid', () => {
    const state = makeState({ activeViews: [{ viewUnid: 'v1' }] });
    const next = run(state, {
      type: addActiveViewAction.type,
      payload: { db: 'db', activeView: { viewUnid: 'v1', viewName: 'dup', viewActive: true } },
    });
    expect(next.activeViews).toHaveLength(1);
  });

  it('DELETE_ACTIVEVIEW removes the active view by unid', () => {
    const state = makeState({ activeViews: [{ viewUnid: 'v1' }, { viewUnid: 'v2' }] });
    const next = run(state, { type: deleteActiveViewAction.type, payload: { db: 'db', activeView: 'v1' } });
    expect(next.activeViews).toHaveLength(1);
    expect(next.activeViews[0].viewUnid).toBe('v2');
  });

  it('SET_FOLDERS stores folders with active/updated status from activeViews', () => {
    const state = makeState({ activeViews: [{ viewUnid: 'f1', viewUpdated: true }] });
    const next = run(state, {
      type: setFoldersAction.type,
      payload: {
        db: 'db',
        folders: [
          { viewUnid: 'f1', viewName: 'Folder1', viewActive: false },
          { viewUnid: 'f2', viewName: 'Folder2' },
        ],
      },
    });
    expect(next.folders[0]).toMatchObject({ viewActive: true, viewUpdated: true });
    expect(next.folders[1].viewActive).toBe(false);
  });
});

describe('databaseReducer - agents', () => {
  it('SET_AGENTS derives agentActive from activeAgents or the incoming value', () => {
    const state = makeState({ activeAgents: [{ agentUnid: 'a1' }] });
    const next = run(state, {
      type: setAgentsAction.type,
      payload: {
        db: 'db',
        agents: [
          { agentUnid: 'a1', agentName: 'InActiveList' },
          { agentUnid: 'a2', agentName: 'Retained', agentActive: true },
          { agentUnid: 'a3', agentName: 'Neither' },
        ],
      },
    });
    expect(next.agents[0].agentActive).toBe(true); // found in activeAgents
    expect(next.agents[1].agentActive).toBe(true); // retained from payload
    expect(next.agents[2].agentActive).toBe(false); // not active and no flag
  });

  it('UPDATE_AGENT replaces the matching agent', () => {
    const state = makeState({ agents: [{ agentUnid: 'a1', agentName: 'old' }] });
    const next = run(state, {
      type: updateAgentAction.type,
      payload: { db: 'db', agent: { agentUnid: 'a1', agentName: 'new', agentActive: true } },
    });
    expect(next.agents[0].agentName).toBe('new');
  });

  it('SET_ACTIVEAGENTS overwrites the active agents list', () => {
    const next = run(makeState(), {
      type: SET_ACTIVEAGENTS,
      payload: { db: 'db', activeAgents: [{ agentUnid: 'a9' }] },
    });
    expect(next.activeAgents).toEqual([{ agentUnid: 'a9' }]);
  });

  it('ADD_ACTIVEAGENT appends a non-duplicate active agent', () => {
    const state = makeState({ activeAgents: [{ agentUnid: 'a1' }] });
    const next = run(state, {
      type: addActiveAgentAction.type,
      payload: { db: 'db', activeAgent: { agentUnid: 'a2', agentName: 'Two', agentActive: true } },
    });
    expect(next.activeAgents).toHaveLength(2);
  });

  it('ADD_ACTIVEAGENT ignores a duplicate agentUnid', () => {
    const state = makeState({ activeAgents: [{ agentUnid: 'a1' }] });
    const next = run(state, {
      type: addActiveAgentAction.type,
      payload: { db: 'db', activeAgent: { agentUnid: 'a1', agentName: 'dup', agentActive: true } },
    });
    expect(next.activeAgents).toHaveLength(1);
  });

  it('DELETE_ACTIVEAGENT removes the active agent by unid', () => {
    const state = makeState({ activeAgents: [{ agentUnid: 'a1' }, { agentUnid: 'a2' }] });
    const next = run(state, { type: deleteActiveAgentAction.type, payload: { db: 'db', activeAgent: 'a1' } });
    expect(next.activeAgents).toHaveLength(1);
    expect(next.activeAgents[0].agentUnid).toBe('a2');
  });
});

describe('databaseReducer - nsf designs & no-op immer cases', () => {
  it('ADD_NSF_DESIGN deep-merges the design under its nsfPath key', () => {
    const state = makeState({ nsfDesigns: { path1: { a: 1 } } });
    const next = run(state, {
      type: addNsfDesignAction.type,
      payload: { nsfPath: 'path1', nsfDesign: { b: 2 } },
    });
    expect(next.nsfDesigns.path1).toEqual({ a: 1, b: 2 });
  });

  it('ADD_NSF_DESIGN creates a new key when the nsfPath is not present', () => {
    const state = makeState({ nsfDesigns: { path1: { a: 1 } } });
    const next = run(state, {
      type: addNsfDesignAction.type,
      payload: { nsfPath: 'path2', nsfDesign: { c: 3 } },
    });
    expect(next.nsfDesigns).toEqual({ path1: { a: 1 }, path2: { c: 3 } });
  });

  it('CACHE_MODES leaves the state unchanged', () => {
    const state = makeState({ databasesOverview: [{ schemaName: 's1', nsfPath: 'p' } as any] });
    const next = run(state, {
      type: cacheModesAction.type,
      payload: { db: 's1', nsfPath: 'p', formName: 'F', formModes: [] },
    });
    expect(next).toEqual(state);
  });

  it('CACHE_FORM_FIELDS leaves the state unchanged', () => {
    const state = makeState({ forms: [{ dbName: 'db', formName: 'F', alias: [], formAccessModes: [] }] });
    const next = run(state, {
      type: cacheFormFieldsAction.type,
      payload: { db: 'db', formName: 'F', fields: [] },
    });
    expect(next).toEqual(state);
  });
});

describe('databaseReducer - no-match branches leave state unchanged', () => {
  it('UPDATE_VIEW does nothing when the viewUnid is not found', () => {
    const state = makeState({ views: [{ viewUnid: 'v1', viewName: 'keep', viewActive: true }] });
    const next = run(state, {
      type: updateViewAction.type,
      payload: { db: 'db', view: { viewUnid: 'missing', viewName: 'x', viewActive: true } },
    });
    expect(next.views).toEqual(state.views);
  });

  it('UPDATE_AGENT does nothing when the agentUnid is not found', () => {
    const state = makeState({ agents: [{ agentUnid: 'a1', agentName: 'keep' }] });
    const next = run(state, {
      type: updateAgentAction.type,
      payload: { db: 'db', agent: { agentUnid: 'missing', agentName: 'x', agentActive: true } },
    });
    expect(next.agents).toEqual(state.agents);
  });

  it('DELETE_ACTIVEVIEW does nothing when the view is not present', () => {
    const state = makeState({ activeViews: [{ viewUnid: 'v1' }] });
    const next = run(state, { type: deleteActiveViewAction.type, payload: { db: 'db', activeView: 'missing' } });
    expect(next.activeViews).toHaveLength(1);
  });

  it('DELETE_ACTIVEAGENT does nothing when the agent is not present', () => {
    const state = makeState({ activeAgents: [{ agentUnid: 'a1' }] });
    const next = run(state, { type: deleteActiveAgentAction.type, payload: { db: 'db', activeAgent: 'missing' } });
    expect(next.activeAgents).toHaveLength(1);
  });

  it('ADD_NEW_SCHEMA_TO_STATE is a no-op when no available database matches the nsfPath', () => {
    const state = makeState({
      availableDatabases: [{ title: 'a', nsfpath: 'path1', apinames: ['s1'] }],
    });
    const next = run(state, {
      type: addNewSchemaToStateAction.type,
      payload: { schemaName: 's2', nsfPath: 'unknown' },
    });
    expect(next.availableDatabases[0].apinames).toEqual(['s1']);
  });
});

describe('databaseReducer - immutability', () => {
  it('does not mutate a frozen nested slice for a spread-based case (addNsfDesignAction.type)', () => {
    const nsfDesigns = { p1: { a: 1 } };
    Object.freeze(nsfDesigns);
    Object.freeze(nsfDesigns.p1);
    const state = makeState({ nsfDesigns });
    expect(() =>
      run(state, { type: addNsfDesignAction.type, payload: { nsfPath: 'p1', nsfDesign: { b: 2 } } }),
    ).not.toThrow();
    // the original frozen slice is left untouched
    expect(nsfDesigns.p1).toEqual({ a: 1 });
  });

  it('does not mutate a frozen nested slice for an immer-based case (addScopeAction.type)', () => {
    const scopes = [{ apiName: 'sc1' } as any];
    Object.freeze(scopes);
    const state = makeState({ scopes });
    const next = run(state, { type: addScopeAction.type, payload: { apiName: 'sc2' } });
    expect(scopes).toHaveLength(1); // original untouched
    expect(next.scopes).toHaveLength(2);
  });
});
