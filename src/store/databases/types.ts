/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * type.ts provides prop and action types for the Database page
 *
 * @author Michael Angelo Silva
 * @author Neil Schultz
 *
 */

export interface Mode {
  formName: string;
  modeName: string;
  fields: Array<{
    name: string;
    type: string;
    fieldAccess: string;
    fieldGroup: string;
    isMultiValue: boolean;
    format: string;
  }>;
  data: Array<{
    modeName: string;
    readAccessFields: Array<any>;
    writeAccessFields: Array<any>;
    readAccessFormula: string;
    writeAccessFormula: string;
    deleteAccessFormula: string;
    onLoad: string;
    onSave: string;
    computeWithForm: boolean;
    strictInput: boolean;
    configuredForms: Array<string>;
  }>;
}

export interface Form {
  formName: string;
  alias: Array<string>;
  formModes: Array<Mode>;
}

export interface Field {
  name: string;
  externalName?: string;
  fieldAccess: string;
  itemFlags?: Array<string>;
  summaryField?: boolean;
  isMultiValue: boolean;
  items?: {
    format: string;
    type: string;
  };
  format?: string;
  type?: string;
  fieldGroup?: string;
}

export interface Database {
  '@unid': string;
  apiName: string;
  schemaName: string;
  description: string;
  nsfPath: string;
  index?: number;
  icon: string;
  iconName: string;
  formulaEngine?: string;
  dqlFormula?: any;
  requireRevisionToUpdate?: any;
  isActive: string;
  owners: Array<string>;
  isModeFetch: boolean;
  modes: Array<Mode>;
  openAccess?: any;
  allowCode?: any;
  dqlAccess?: any;
  allowDecryption?: any;
  excludedViews?: any;
  storedProcedures?: any;
  applicationAccessApprovers?: any;
  forms: Array<Form>;
  configuredForms: Array<string>;
  views?: Array<string>;
  activeViews?: Array<string>;
  agents?: Array<string>;
  activeAgents?: Array<string>;
}

export interface AvailableDatabases {
  title: string;
  nsfpath: string;
  apinames: Array<string>;
}

export interface Scope {
  apiName: string;
  schemaName: string;
  description: string;
  nsfPath: string;
  index?: number;
  icon: string;
  iconName: string;
  formulaEngine?: string;
  isActive: string;
}

export interface DBState {
  databases: Array<Database>;
  nsfDesigns: any;
  availableDatabases: AvailableDatabases[];
  scopes: Scope[];
  databasePull: boolean;
  scopePull: boolean;
  forms: Array<{
    dbName: string;
    formName: string;
    alias: Array<string>;
    formModes: Array<any>;
    formAccessModes: Array<any>;
  }>;
  loadedForm: string;
  loadedFields: Array<any>;
  activeForm: string;
  activeFields: Array<any>;
  views: Array<any>;
  activeViews: Array<any>;
  agents: Array<any>;
  activeAgents: Array<any>;
  formLoading: boolean;
  contextViewIndex: number;
  retryCount: number;
  dbError: boolean;
  dbErrorMessage: string;
  displayTestResults: boolean;
  displayReadResults: boolean;
  readFormulaResults: string;
  displayWriteResults: boolean;
  writeFormulaResults: string;
  displayDeleteResults: boolean;
  deleteFormulaResults: string;
  displayLoadResults: boolean;
  loadFormulaResults: string;
  displaySaveResults: boolean;
  saveFormulaResults: string;
  onlyShowSchemasWithScopes: boolean;
  permissions: any;
  clearSchemaForm: boolean;
  updateViewError: boolean;
  updateAgentError: boolean;
  updateFormError: boolean;
  updateSchemaError: boolean;
  formName: string;
}

// A list of the different Action Types available
export const ADD_SCHEMA = 'ADD_SCHEMA';
export const ADD_SCOPE = 'ADD_SCOPE';
export const DELETE_SCHEMA = 'DELETE_SCHEMA';
export const DELETE_SCOPE = 'DELETE_SCOPE';
export const UPDATE_SCHEMA = 'UPDATE_SCHEMA';
export const UPDATE_SCOPE = 'UPDATE_SCOPE';
export const FETCH_AVAILABLE_DATABASES = 'FETCH_AVAILABLE_DATABASES';
export const FETCH_KEEP_DATABASES = 'FETCH_KEEP_DATABASES';
export const FETCH_KEEP_SCOPES = 'FETCH_KEEP_SCOPES';
export const ADD_AVAILABLE_DATABASE = 'ADD_AVAILABLE_DATABASE';
export const ADD_NEW_SCHEMA_TO_STATE = 'ADD_NEW_SCHEMA_TO_STATE';
export const CLEAR_SCHEMA_FORM = 'CLEAR_SCHEMA_FORM';
export const APPEND_FORM_DATA = 'APPEND_FORM_DATA';
export const FORM_LOADING = 'FORM_LOADING';
export const SET_PULLED_DATABASE = 'SET_PULLED_DATABASE';
export const SET_PULLED_SCOPE = 'SET_PULLED_SCOPE';
export const FETCH_DB_CONFIG = 'FETCH_DB_CONFIG';
export const SET_FORMS = 'SET_FORMS';
export const SET_CURRENTFORMS = 'SET_CURRENTFORMS';
export const SET_LOADEDFORM = 'SET_LOADEDFORM';
export const SET_LOADEDFIELDS = 'SET_LOADEDFIELDS';
export const SET_ACTIVEFORM = 'SET_ACTIVEFORM';
export const SET_ACTIVEFIELDS = 'SET_ACTIVEFIELDS';
export const ADD_ACTIVEFIELDS = 'ADD_ACTIVEFIELDS';
export const SET_VIEWS = 'SET_VIEWS';
export const UPDATE_VIEW = 'UPDATE_VIEW';
export const SET_ACTIVEVIEWS = 'SET_ACTIVEVIEWS';
export const ADD_ACTIVEVIEW = 'ADD_ACTIVEVIEW';
export const DELETE_ACTIVEVIEW = 'DELETE_ACTIVEVIEW';
export const SET_AGENTS = 'SET_AGENTS';
export const UPDATE_AGENT = 'UPDATE_AGENT';
export const SET_ACTIVEAGENTS = 'SET_ACTIVEAGENTS';
export const ADD_ACTIVEAGENT = 'ADD_ACTIVEAGENT';
export const DELETE_ACTIVEAGENT = 'DELETE_ACTIVEAGENT';
export const CACHE_MODES = 'CACHE_MODES';
export const CACHE_FORM_FIELDS = 'CACHE_FORM_FIELDS';
export const SET_RETRY_COUNT = 'SET_RETRY_COUNT';
export const CLEAR_FORMS = 'CLEAR_FORMS';
export const SET_DB_INDEX = 'SET_DB_INDEX';
export const APPEND_CONFIGURED_FORM = 'APPEND_CONFIGURED_FORM';
export const UNCONFIG_FORM = 'UNCONFIG_FORM';
export const RESET_FORM = 'RESET_FORM';
export const SAVE_READ_RESULT = 'SAVE_READ_RESULT';
export const SAVE_WRITE_RESULT = 'SAVE_WRITE_RESULT';
export const SAVE_DELETE_RESULT = 'SAVE_DELETE_RESULT';
export const SAVE_LOAD_RESULT = 'SAVE_LOAD_RESULT';
export const SAVE_SAVE_RESULT = 'SAVE_SAVE_RESULT';
export const CLEAR_FORMULA_RESULTS = 'CLEAR_FORMULA_RESULTS';
export const CLEAR_DATABASEPULL_RESULT = 'CLEAR_DATABASEPULL_RESULT';
export const SET_DB_ERROR = 'SET_APP_ERROR';
export const CLEAR_DB_ERROR = 'CLEAR_APP_ERROR';
export const ADD_NSF_DESIGN = 'ADD_NSF_DESIGN';
export const SET_ONLY_SHOW_SCHEMAS_WITH_SCOPES = 'SET_ONLY_SHOW_SCHEMAS_WITH_SCOPES';
export const FETCH_KEEP_PERMISSIONS = 'FETCH_KEEP_PERMISSIONS';
export const VIEWS_ERROR = 'VIEWS_ERROR';
export const AGENTS_ERROR = 'AGENTS_ERROR';
export const FORMS_ERROR = 'FORMS_ERROR';
export const UPDATE_ERROR = 'UPDATE_ERROR';
export const INIT_STATE = 'INIT_STATE';
export const SET_FORM_NAME = 'SET_FORM_NAME';

interface SetDbIndex {
  type: typeof SET_DB_INDEX;
  payload: number;
}

interface AddSchema {
  type: typeof ADD_SCHEMA;
  payload: Database;
}

interface AddScope {
  type: typeof ADD_SCOPE;
  payload: Scope;
}

interface AddNsfDesign {
  type: typeof ADD_NSF_DESIGN;
  payload: {
    nsfPath: string;
    nsfDesign: any;
  };
}

interface FetchDBConfig {
  type: typeof FETCH_DB_CONFIG;
  payload: Database;
}

interface DeleteScope {
  type: typeof DELETE_SCOPE;
  payload: string;
}

interface DeleteSchema {
  type: typeof DELETE_SCHEMA;
  payload: {
    schemaName: string;
    nsfPath: string;
  };
}

interface SetPullDatabase {
  type: typeof SET_PULLED_DATABASE;
  payload: boolean;
}

interface SetPullScope {
  type: typeof SET_PULLED_SCOPE;
  payload: boolean;
}

interface SetForms {
  type: typeof SET_FORMS;
  payload: {
    db: string;
    nsfPath: string;
    forms: Array<any>;
  };
}

interface SetCurrentForms {
  type: typeof SET_CURRENTFORMS;
  payload: {
    db: string;
    forms: Array<any>;
  };
}

interface ClearForms {
  type: typeof CLEAR_FORMS;
}

interface SetLoadedForm {
  type: typeof SET_LOADEDFORM;
  payload: {
    db: string;
    formName: string;
  };
}

interface SetLoadedFields {
  type: typeof SET_LOADEDFIELDS;
  payload: {
    formName: string;
    fields: Array<any>;
  };
}

interface SetActiveForm {
  type: typeof SET_ACTIVEFORM;
  payload: {
    db: string;
    formName: string;
  };
}

interface AddActiveFields {
  type: typeof ADD_ACTIVEFIELDS;
  payload: {
    activeFields: {
      formName: string;
      fields: Array<any>;
    };
  };
}

interface SetViews {
  type: typeof SET_VIEWS;
  payload: {
    db: string;
    views: Array<any>;
  };
}

interface UpdateView {
  type: typeof UPDATE_VIEW;
  payload: {
    db: string;
    view: ViewObj;
  };
}

interface SetActiveViews {
  type: typeof SET_ACTIVEVIEWS;
  payload: {
    db: string;
    activeViews: Array<any>;
  };
}

interface AddActiveView {
  type: typeof ADD_ACTIVEVIEW;
  payload: {
    db: string;
    activeView: ViewObj;
  };
}

interface DeleteActiveView {
  type: typeof DELETE_ACTIVEVIEW;
  payload: {
    db: string;
    activeView: string;
  };
}

interface SetAgents {
  type: typeof SET_AGENTS;
  payload: {
    db: string;
    agents: Array<any>;
  };
}

interface UpdateAgent {
  type: typeof UPDATE_AGENT;
  payload: {
    db: string;
    agent: AgentObj;
  };
}

interface SetActiveAgents {
  type: typeof SET_ACTIVEAGENTS;
  payload: {
    db: string;
    activeAgents: Array<any>;
  };
}

interface AddActiveAgent {
  type: typeof ADD_ACTIVEAGENT;
  payload: {
    db: string;
    activeAgent: AgentObj;
  };
}

interface DeleteActiveAgent {
  type: typeof DELETE_ACTIVEAGENT;
  payload: {
    db: string;
    activeAgent: string;
  };
}

interface CacheForms {
  type: typeof CACHE_MODES;
  payload: {
    db: string;
    nsfPath: string;
    formName: string;
    formModes: Array<any>;
  };
}

interface CacheFormFields {
  type: typeof CACHE_FORM_FIELDS;
  payload: {
    db: string;
    formName: string;
    fields: Array<any>;
  };
}

interface SetFormLoading {
  type: typeof FORM_LOADING;
  payload: boolean;
}

interface updateScope {
  type: typeof UPDATE_SCOPE;
  payload: Scope;
}

interface updateSchema {
  type: typeof UPDATE_SCHEMA;
  payload: Database;
}

interface UpdateSchema {
  type: typeof UPDATE_SCHEMA;
  payload: Database;
}

interface FetchAvailableDatabases {
  type: typeof FETCH_AVAILABLE_DATABASES;
  payload: any;
}

interface AddAvailableDatabase {
  type: typeof ADD_AVAILABLE_DATABASE;
  payload: any;
}

interface FetchKeepDatabases {
  type: typeof FETCH_KEEP_DATABASES;
  payload: Array<Database>;
}

interface FetchKeepScopes {
  type: typeof FETCH_KEEP_SCOPES;
  payload: Array<Scope>;
}

interface FetchKeepPermissions {
  type: typeof FETCH_KEEP_PERMISSIONS;
  payload: {
    createDbMapping: boolean;
    deleteDbMapping: boolean;
  };
}

interface InitState {
  type: typeof INIT_STATE;
}

interface AddNewSchemaToState {
  type: typeof ADD_NEW_SCHEMA_TO_STATE;
  payload: {
    schemaName: string;
    nsfPath: string;
  };
}

interface ClearSchemaForm {
  type: typeof CLEAR_SCHEMA_FORM;
  payload: boolean
}

interface AppendFormData {
  type: typeof APPEND_FORM_DATA;
  payload: {
    dbIndex: number;
    data: Database;
  };
}

interface AppendConfiguredForm {
  type: typeof APPEND_CONFIGURED_FORM;
  payload: {
    formIndex: number;
    data: object;
  };
}

interface UnConfigForm {
  type: typeof UNCONFIG_FORM;
  payload: {
    schemaName: string;
    formName: string;
  };
}

interface ResetForm {
  type: typeof RESET_FORM;
  payload: {
    dbName: string;
  };
}

interface SetRetryCount {
  type: typeof SET_RETRY_COUNT;
  payload: number;
}

interface SaveReadResult {
  type: typeof SAVE_READ_RESULT;
  payload: string;
}

interface SaveWriteResult {
  type: typeof SAVE_WRITE_RESULT;
  payload: string;
}

interface SaveDeleteResult {
  type: typeof SAVE_DELETE_RESULT;
  payload: string;
}

interface SaveLoadResult {
  type: typeof SAVE_LOAD_RESULT;
  payload: string;
}

interface SaveSaveResult {
  type: typeof SAVE_SAVE_RESULT;
  payload: string;
}

interface ClearFormulaResults {
  type: typeof CLEAR_FORMULA_RESULTS;
}

interface ClearDatabasePullResult {
  type: typeof CLEAR_DATABASEPULL_RESULT;
}

interface SetOnlyShowSchemaWithScopes {
  type: typeof SET_ONLY_SHOW_SCHEMAS_WITH_SCOPES;
  payload: boolean;
}

/**
 * Store Database error for display in the UI
 */
interface SetDBError {
  type: typeof SET_DB_ERROR;
  payload: string;
}

/**
 * Clear database error
 */
interface ClearDBError {
  type: typeof CLEAR_DB_ERROR;
}

export interface ViewObj {
  viewName: string;
  viewAlias?: string;
  viewUnid: string;
  viewActive: boolean;
  viewUpdated?: boolean;
}

export interface AgentObj {
  agentName: string;
  agentAlias?: string;
  agentUnid: string;
  agentActive: boolean;
}

interface SetOnlyShowSchemasWithScopes {
  type: typeof SET_ONLY_SHOW_SCHEMAS_WITH_SCOPES;
  payload: boolean;
}

interface ViewsError {
  type: typeof VIEWS_ERROR;
  payload: boolean;
}
interface AgentsError {
  type: typeof AGENTS_ERROR;
  payload: boolean;
}

interface UpdateError {
  type: typeof UPDATE_ERROR;
  payload: boolean;
}

export interface SetFormName {
  type: typeof SET_FORM_NAME;
  payload: string
}

export type DatabaseActionTypes =
  | AddSchema
  | AddScope
  | AddNsfDesign
  | updateScope
  | updateSchema
  | FetchAvailableDatabases
  | AddNewSchemaToState
  | AppendFormData
  | SetPullDatabase
  | SetPullScope
  | SetFormLoading
  | FetchKeepDatabases
  | FetchKeepScopes
  | DeleteScope
  | DeleteSchema
  | FetchDBConfig
  | SetForms
  | SetCurrentForms
  | SetLoadedForm
  | SetLoadedFields
  | SetActiveForm
  | AddActiveFields
  | SetViews
  | UpdateView
  | SetActiveViews
  | AddActiveView
  | DeleteActiveView
  | SetAgents
  | UpdateAgent
  | SetActiveAgents
  | AddActiveAgent
  | DeleteActiveAgent
  | CacheFormFields
  | CacheForms
  | SetRetryCount
  | SetDbIndex
  | AppendConfiguredForm
  | UnConfigForm
  | ResetForm
  | SaveReadResult
  | SaveWriteResult
  | ClearForms
  | SetDBError
  | ClearDBError
  | SaveDeleteResult
  | SaveLoadResult
  | SaveSaveResult
  | ClearFormulaResults
  | ClearDatabasePullResult
  | SetOnlyShowSchemasWithScopes
  | InitState
  | FetchKeepPermissions
  | ClearSchemaForm
  | AddAvailableDatabase
  | ViewsError
  | AgentsError
  | UpdateError
  | SetFormName;
