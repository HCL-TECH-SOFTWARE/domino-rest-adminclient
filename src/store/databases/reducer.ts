/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  DBState,
  AGENTS_ERROR,
  CLEAR_DB_ERROR,
  FETCH_AVAILABLE_DATABASES,
  INIT_STATE,
  SAVE_DELETE_RESULT,
  SAVE_LOAD_RESULT,
  SAVE_READ_RESULT,
  SAVE_SAVE_RESULT,
  SAVE_WRITE_RESULT,
  SET_ACTIVEAGENTS,
  SET_ACTIVEVIEWS,
  SET_DB_ERROR,
  VIEWS_ERROR,
} from './types';
import { getDatabaseIndex, getScopeIndex } from './scripts';

const initialState: DBState = {
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
  newForm: {
    enabled: false,
  },
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
  updateFormError: false
};


/**
 * The Database page's slice.
 *
 * #710 converted this from a 60-case `switch` reducer. Most actions became
 * generated creators, but **13 could not** and are matched as literal strings in
 * `extraReducers`, because something outside this folder dispatches them:
 *
 * - `SAVE_*_RESULT` (×5) — `saveResult(formulaType, result)` uses its *argument*
 *   as the action type, and `components/access/TabsAccess.tsx` hard-codes the five
 *   strings it passes. Namespacing them empties the formula-test results panel,
 *   and nothing would catch it: the string is untyped the whole way through.
 * - `SET_DB_ERROR` / `CLEAR_DB_ERROR` — literal only because the values are still
 *   spelled out in `types.ts`. They no longer collide: #866 renamed them from
 *   `'SET_APP_ERROR'` / `'CLEAR_APP_ERROR'` — the applications slice's values — to
 *   `'databases/…'`, so a database error stays in this slice. Both are dispatched
 *   solely through `setDBError`/`clearDBError` in `./shared`, never as raw strings,
 *   so these two could become generated creators whenever someone wants them to.
 * - `VIEWS_ERROR`, `AGENTS_ERROR`, `FETCH_AVAILABLE_DATABASES`, `SET_ACTIVEVIEWS`,
 *   `SET_ACTIVEAGENTS` — dispatched raw from `ActivateSwitch`, `ScopeLists`,
 *   `FormsContainer` and `EditView`. Left literal rather than rewiring six
 *   `track:views` files that #806 is actively converting.
 * - `INIT_STATE` — the cross-slice reset broadcast six slices answer.
 *
 * @author Michael Angelo Silva
 * @author Neil Schultz
 * @author Qian Liang
 */
export const databasesSlice = createSlice({
  name: 'databases',
  initialState,
  reducers: {
    fetchKeepDatabases(state, action: PayloadAction<any[]>) {
      state.databasesOverview = action.payload;
    },
    fetchKeepScopes(state, action: PayloadAction<any[]>) {
      state.scopes = action.payload.filter((scope: any) => scope.apiName !== 'keepconfig');
    },
    addAvailableDatabase(state, action: PayloadAction<any>) {
      const exists = state.availableDatabases.findIndex((db) => db.nsfpath === action.payload.nsfpath) >= 0;
      if (!exists) state.availableDatabases.push(action.payload);
    },
    addNewSchemaToState(state, action: PayloadAction<{ schemaName: string; nsfPath: string }>) {
      const { schemaName, nsfPath } = action.payload;
      const index = state.availableDatabases.findIndex((db) => db.nsfpath === nsfPath);
      if (index >= 0) state.availableDatabases[index].apinames.push(schemaName);
    },
    clearSchemaForm(state, action: PayloadAction<boolean>) {
      state.clearSchemaForm = action.payload;
    },
    updateError(state, action: PayloadAction<boolean>) {
      state.updateSchemaError = action.payload;
    },
    fetchDbConfig(state, action: PayloadAction<any>) {
      const dbIndex = getDatabaseIndex(state.databasesOverview, action.payload.apiName, action.payload.nsfPath);
      state.contextViewIndex = dbIndex;
      state.databasesOverview[dbIndex] = action.payload;
    },
    addSchema(state, action: PayloadAction<any>) {
      state.databasesOverview.push(action.payload);
    },
    addScope(state, action: PayloadAction<any>) {
      state.scopes.push(action.payload);
    },
    updateScope(state, action: PayloadAction<any>) {
      state.scopes[getScopeIndex(state.scopes, action.payload.apiName)] = action.payload;
    },
    deleteSchema(state, action: PayloadAction<{ schemaName: string; nsfPath: string }>) {
      let dbIndex = getDatabaseIndex(state.databasesOverview, action.payload.schemaName, action.payload.nsfPath);
      state.databasesOverview.splice(dbIndex, 1);
      dbIndex = state.availableDatabases.findIndex((db) => db.nsfpath === action.payload.nsfPath);
      if (dbIndex >= 0) {
        const apiIndex = state.availableDatabases[dbIndex].apinames.findIndex(
          (apiname: string) => apiname === action.payload.schemaName,
        );
        state.availableDatabases[dbIndex].apinames.splice(apiIndex, 1);
      }
    },
    deleteScope(state, action: PayloadAction<string>) {
      state.scopes.splice(getScopeIndex(state.scopes, action.payload), 1);
    },
    updateSchema(state, action: PayloadAction<any[]>) {
      const newDatabases: any[] = [];
      action.payload.forEach((schema: any) => {
        const dbIndex = getDatabaseIndex(state.databasesOverview, schema.schemaName, schema.nsfPath);
        if (dbIndex >= 0) state.databasesOverview[dbIndex] = schema;
        else newDatabases.push(schema);
      });
      state.databasesOverview = [...state.databasesOverview, ...newDatabases];
    },
    setPullDatabase(state, action: PayloadAction<boolean>) {
      state.databasePull = action.payload;
      state.scopePull = action.payload;
    },
    setPullScope(state, action: PayloadAction<boolean>) {
      state.scopePull = action.payload;
    },
    formLoading(state, action: PayloadAction<boolean>) {
      state.formLoading = action.payload;
    },
    appendFormData(state, action: PayloadAction<{ dbIndex: number; data: any }>) {
      state.databasesOverview[action.payload.dbIndex] = action.payload.data;
    },
    setForms(state, action: PayloadAction<{ db?: string; forms: any[] }>) {
      action.payload.forms.forEach((form: any) => {
        const index = state.forms.findIndex((f) => f.formName === form.formName);
        if (index !== -1) state.forms[index] = form;
        else state.forms.push(form);
      });
    },
    addForm(state, action: PayloadAction<{ enabled: boolean; form?: any }>) {
      state.newForm = action.payload.enabled
        ? { enabled: true, form: action.payload.form }
        : { enabled: false };
    },
    setCurrentForms(state, action: PayloadAction<{ db?: string; forms: any[] }>) {
      state.forms = action.payload.forms;
    },
    // Both were `produce(state, () => {})` — deliberate no-ops kept so the action
    // types stay dispatchable and typed. Preserved rather than deleted: removing
    // them changes what `default:` sees.
    cacheModes(_state, _action: PayloadAction<any>) {},
    cacheFormFields(_state, _action: PayloadAction<any>) {},
    setRetryCount(state, action: PayloadAction<number>) {
      state.retryCount = action.payload;
    },
    appendConfiguredForm(state, action: PayloadAction<{ formIndex: number; data: any }>) {
      const formModes = state.forms[action.payload.formIndex].formModes;
      if (formModes !== undefined) formModes.push(action.payload.data);
    },
    unConfigForm(state, action: PayloadAction<{ schemaName: string; formName: string }>) {
      const index = state.forms.findIndex(
        (value) => value.dbName === action.payload.schemaName && value.formName === action.payload.formName,
      );
      state.forms[index].formModes = [];
    },
    setDbIndex(state, action: PayloadAction<number>) {
      state.contextViewIndex = action.payload;
    },
    // `string` again since #848 removed the one caller that passed an object.
    // tsc is now the guard: a second caller with a different shape is a compile
    // error rather than a filter that silently matches nothing.
    resetForm(state, action: PayloadAction<string>) {
      state.forms = state.forms.filter((form) => form.formName !== action.payload);
    },
    setLoadedForm(state, action: PayloadAction<{ db?: string; formName: string }>) {
      state.loadedForm = action.payload.formName;
    },
    setLoadedFields(state, action: PayloadAction<{ db?: string; formName?: string; fields: any[] }>) {
      state.loadedFields = action.payload.fields;
    },
    setActiveForm(state, action: PayloadAction<{ db?: string; formName: string }>) {
      state.activeForm = action.payload.formName;
    },
    addActiveFields(state, action: PayloadAction<{ activeFields: any }>) {
      const formIndex = state.activeFields.findIndex(
        (form: any) => form.formName === action.payload.activeFields.formName,
      );
      if (formIndex === -1) state.activeFields.push(action.payload.activeFields);
      else state.activeFields[formIndex] = action.payload.activeFields;
    },
    setViews(state, action: PayloadAction<{ db?: string; views: any[] }>) {
      action.payload.views.forEach((view: any) => {
        view.viewActive = !!view.viewActive;
        for (let ii = 0; ii < state.activeViews.length; ii++) {
          if (view.viewUnid === state.activeViews[ii].viewUnid) {
            view.viewActive = true;
            view.viewUpdated = !!state.activeViews[ii].viewUpdated;
            break;
          }
        }
      });
      state.views = action.payload.views;
    },
    updateView(state, action: PayloadAction<{ db?: string; view: any }>) {
      const viewIndex = state.views.findIndex((view) => view.viewUnid === action.payload.view.viewUnid);
      if (viewIndex !== -1) state.views[viewIndex] = action.payload.view;
    },
    addActiveView(state, action: PayloadAction<{ db?: string; activeView: any }>) {
      const viewIndex = state.activeViews.findIndex(
        (view) => view.viewUnid === action.payload.activeView.viewUnid,
      );
      if (viewIndex === -1) state.activeViews.push(action.payload.activeView);
    },
    deleteActiveView(state, action: PayloadAction<{ db?: string; activeView: string }>) {
      const viewIndex = state.activeViews.findIndex((view) => view.viewUnid === action.payload.activeView);
      if (viewIndex !== -1) state.activeViews.splice(viewIndex, 1);
    },
    setFolders(state, action: PayloadAction<{ db?: string; folders: any[] }>) {
      action.payload.folders.forEach((folder: any) => {
        folder.viewActive = !!folder.viewActive;
        for (let ii = 0; ii < state.activeViews.length; ii++) {
          if (folder.viewUnid === state.activeViews[ii].viewUnid) {
            folder.viewActive = true;
            folder.viewUpdated = !!state.activeViews[ii].viewUpdated;
            break;
          }
        }
      });
      state.folders = action.payload.folders;
    },
    setAgents(state, action: PayloadAction<{ db?: string; agents: any[] }>) {
      state.agents = action.payload.agents.map((agent: any) => ({
        ...agent,
        agentActive:
          agent.agentActive !== undefined
            ? agent.agentActive
            : state.activeAgents.some((activeAgent) => activeAgent.agentUnid === agent.agentUnid),
      }));
    },
    updateAgent(state, action: PayloadAction<{ db?: string; agent: any }>) {
      const agentIndex = state.agents.findIndex((agent) => agent.agentUnid === action.payload.agent.agentUnid);
      if (agentIndex !== -1) state.agents[agentIndex] = action.payload.agent;
    },
    addActiveAgent(state, action: PayloadAction<{ db?: string; activeAgent: any }>) {
      const agentIndex = state.activeAgents.findIndex(
        (agent) => agent.agentUnid === action.payload.activeAgent.agentUnid,
      );
      if (agentIndex === -1) state.activeAgents.push(action.payload.activeAgent);
    },
    deleteActiveAgent(state, action: PayloadAction<{ db?: string; activeAgent: string }>) {
      const agentIndex = state.activeAgents.findIndex(
        (agent) => agent.agentUnid === action.payload.activeAgent,
      );
      if (agentIndex !== -1) state.activeAgents.splice(agentIndex, 1);
    },
    setFormName(state, action: PayloadAction<string>) {
      state.formName = action.payload;
    },
    clearFormulaResults(state) {
      state.displayTestResults = false;
      state.displayReadResults = false;
      state.readFormulaResults = '';
      state.displayWriteResults = false;
      state.writeFormulaResults = '';
      state.displayDeleteResults = false;
      state.deleteFormulaResults = '';
      state.displayLoadResults = false;
      state.loadFormulaResults = '';
      state.displaySaveResults = false;
      state.saveFormulaResults = '';
    },
    clearDatabasePullResult(state) {
      state.databasePull = false;
      state.scopePull = false;
    },
    clearForms(state) {
      state.forms = [];
    },
    addNsfDesign(state, action: PayloadAction<{ nsfPath: string; nsfDesign: any }>) {
      state.nsfDesigns[action.payload.nsfPath] = {
        ...state.nsfDesigns[action.payload.nsfPath],
        ...action.payload.nsfDesign,
      };
    },
    setOnlyShowSchemasWithScopes(state, action: PayloadAction<boolean>) {
      state.onlyShowSchemasWithScopes = action.payload;
    },
    fetchKeepPermissions(state, action: PayloadAction<{ createDbMapping: any; deleteDbMapping: any }>) {
      state.permissions = {
        createDbMapping: action.payload.createDbMapping,
        deleteDbMapping: action.payload.deleteDbMapping,
      };
    },
  },
  extraReducers: (builder) => {
    const saveFormulaResult = (display: keyof DBState, results: keyof DBState) =>
      (state: DBState, action: any) => {
        state.displayTestResults = true;
        (state as any)[display] = true;
        (state as any)[results] = action.payload;
      };

    builder
      .addCase(FETCH_AVAILABLE_DATABASES, (state, action: any) => {
        state.availableDatabases = action.payload;
      })
      .addCase(VIEWS_ERROR, (state, action: any) => {
        state.updateViewError = action.payload;
      })
      .addCase(AGENTS_ERROR, (state, action: any) => {
        state.updateAgentError = action.payload;
      })
      .addCase(SET_ACTIVEVIEWS, (state, action: any) => {
        state.activeViews = action.payload.activeViews;
      })
      .addCase(SET_ACTIVEAGENTS, (state, action: any) => {
        state.activeAgents = action.payload.activeAgents;
      })
      .addCase(SAVE_READ_RESULT, saveFormulaResult('displayReadResults', 'readFormulaResults'))
      .addCase(SAVE_WRITE_RESULT, saveFormulaResult('displayWriteResults', 'writeFormulaResults'))
      .addCase(SAVE_DELETE_RESULT, saveFormulaResult('displayDeleteResults', 'deleteFormulaResults'))
      .addCase(SAVE_LOAD_RESULT, saveFormulaResult('displayLoadResults', 'loadFormulaResults'))
      .addCase(SAVE_SAVE_RESULT, saveFormulaResult('displaySaveResults', 'saveFormulaResults'))
      .addCase(SET_DB_ERROR, (state, action: any) => {
        state.dbError = true;
        state.dbErrorMessage = action.payload;
      })
      .addCase(CLEAR_DB_ERROR, (state) => {
        state.dbError = false;
        state.dbErrorMessage = '';
      })
      .addCase(INIT_STATE, () => initialState);
  },
});

export const {
  fetchKeepDatabases,
  fetchKeepScopes,
  addAvailableDatabase,
  addNewSchemaToState,
  clearSchemaForm,
  updateError,
  fetchDbConfig,
  addSchema,
  addScope,
  updateScope,
  deleteSchema,
  deleteScope,
  updateSchema,
  setPullDatabase,
  setPullScope,
  formLoading,
  appendFormData,
  setForms,
  addForm,
  setCurrentForms,
  cacheModes,
  cacheFormFields,
  setRetryCount,
  appendConfiguredForm,
  unConfigForm,
  setDbIndex,
  resetForm,
  setLoadedForm,
  setLoadedFields,
  setActiveForm,
  addActiveFields,
  setViews,
  updateView,
  addActiveView,
  deleteActiveView,
  setFolders,
  setAgents,
  updateAgent,
  addActiveAgent,
  deleteActiveAgent,
  setFormName,
  clearFormulaResults,
  clearDatabasePullResult,
  clearForms,
  addNsfDesign,
  setOnlyShowSchemasWithScopes,
  fetchKeepPermissions,
} = databasesSlice.actions;

export default databasesSlice.reducer;
