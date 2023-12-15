/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import produce from 'immer';
import {
  DBState,
  ADD_SCHEMA,
  ADD_SCOPE,
  DatabaseActionTypes,
  FETCH_AVAILABLE_DATABASES,
  ADD_NEW_SCHEMA_TO_STATE,
  APPEND_FORM_DATA,
  SET_PULLED_DATABASE,
  SET_PULLED_SCOPE,
  FORM_LOADING,
  FETCH_KEEP_DATABASES,
  ADD_AVAILABLE_DATABASE,
  FETCH_KEEP_SCOPES,
  DELETE_SCHEMA,
  DELETE_SCOPE,
  FETCH_DB_CONFIG,
  UPDATE_SCHEMA,
  UPDATE_SCOPE,
  SET_FORMS,
  SET_CURRENTFORMS,
  SET_LOADEDFORM,
  SET_LOADEDFIELDS,
  SET_ACTIVEFORM,
  SET_VIEWS,
  ADD_ACTIVEFIELDS,
  UPDATE_VIEW,
  SET_ACTIVEVIEWS,
  ADD_ACTIVEVIEW,
  DELETE_ACTIVEVIEW,
  SET_AGENTS,
  UPDATE_AGENT,
  SET_ACTIVEAGENTS,
  ADD_ACTIVEAGENT,
  DELETE_ACTIVEAGENT,
  CACHE_MODES,
  CACHE_FORM_FIELDS,
  SET_RETRY_COUNT,
  SET_DB_INDEX,
  APPEND_CONFIGURED_FORM,
  RESET_FORM,
  SAVE_READ_RESULT,
  SAVE_WRITE_RESULT,
  SAVE_DELETE_RESULT,
  SAVE_LOAD_RESULT,
  SAVE_SAVE_RESULT,
  CLEAR_FORMULA_RESULTS,
  SET_DB_ERROR,
  CLEAR_DB_ERROR,
  CLEAR_DATABASEPULL_RESULT,
  CLEAR_FORMS,
  UNCONFIG_FORM,
  ADD_NSF_DESIGN,
  SET_ONLY_SHOW_SCHEMAS_WITH_SCOPES,
  FETCH_KEEP_PERMISSIONS,
  INIT_STATE,
  CLEAR_SCHEMA_FORM,
  VIEWS_ERROR,
  AGENTS_ERROR,
  UPDATE_ERROR,
  SET_FORM_NAME,
  SET_FOLDERS,
} from './types';
import { getDatabaseIndex, getScopeIndex } from './scripts';

const initialState: DBState = {
  databases: [],
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
 * reducer.ts provides a Redux Reducer for the  Database page
 *
 * @author Michael Angelo Silva
 * @author Neil Schultz
 * @author Qian Liang
 *
 */

export default function databaseReducer(
  state = initialState,
  action: DatabaseActionTypes
): DBState {
  switch (action.type) {
    case FETCH_KEEP_DATABASES:
      return {
        ...state,
        databases: action.payload,
      };
    case FETCH_KEEP_SCOPES:
      return {
        ...state,
        scopes: action.payload.filter((scope) => scope.apiName !== 'keepconfig'),
      };
    case FETCH_AVAILABLE_DATABASES:
      return {
        ...state,
        availableDatabases: action.payload,
      };
    case ADD_AVAILABLE_DATABASE:
      let updatedList = state.availableDatabases ? [...state.availableDatabases, action.payload] : [action.payload];
      return {
        ...state,
        availableDatabases: updatedList
      };    
    case ADD_NEW_SCHEMA_TO_STATE:
      // Save resource to avoid fetching all database again after new schema created every time
      const { schemaName, nsfPath } = action.payload;
      return produce(state, (draft: DBState) => {
        const index = state.availableDatabases.findIndex(db => db.nsfpath === nsfPath);
        draft.availableDatabases[index].apinames.push(schemaName);
      });
    case CLEAR_SCHEMA_FORM:
      return {
        ...state,
        clearSchemaForm: action.payload
      }
    case VIEWS_ERROR:
      return {
        ...state,
        updateViewError: action.payload
      }
    case AGENTS_ERROR:
      return {
        ...state,
        updateAgentError: action.payload
      }
    case UPDATE_ERROR:
      return {
        ...state,
        updateSchemaError: action.payload
      }
    case FETCH_DB_CONFIG:
      return produce(state, (draft: DBState) => {
        const dbIndex = getDatabaseIndex(
          state.databases,
          action.payload.apiName,
          action.payload.nsfPath
        );
        draft.contextViewIndex = dbIndex;
        draft.databases[dbIndex] = action.payload;
      });
    case ADD_SCHEMA:
      return produce(state, (draft: DBState) => {
        draft.databases.push(action.payload);
      });
    case ADD_SCOPE:
      return produce(state, (draft: DBState) => {
        draft.scopes.push(action.payload);
      });
    case UPDATE_SCOPE:
      return produce(state, (draft: DBState) => {
        const scopeIndex = getScopeIndex(state.scopes, action.payload.apiName);
        draft.scopes[scopeIndex] = action.payload;
      });
    case DELETE_SCHEMA:
      return produce(state, (draft: DBState) => {
        const dbIndex = getDatabaseIndex(state.databases, action.payload.schemaName, action.payload.nsfPath);
        draft.databases.splice(dbIndex, 1);
      });
    case DELETE_SCOPE:
      return produce(state, (draft: DBState) => {
        const dbIndex = getScopeIndex(state.scopes, action.payload);
        draft.scopes.splice(dbIndex, 1);
      });
    case UPDATE_SCHEMA:
      return produce(state, (draft: DBState) => {
        const dbIndex = getDatabaseIndex(
          state.databases,
          action.payload.schemaName,
          action.payload.nsfPath
        );
        if (dbIndex>=0) {
          draft.databases[dbIndex] = action.payload;
        } else {
          draft.databases.push(action.payload);
        }
      });
    case SET_PULLED_DATABASE:
      return {
        ...state,
        databasePull: action.payload,
        scopePull: action.payload,
      };
    case SET_PULLED_SCOPE:
      return {
        ...state,
        scopePull: action.payload,
      };
    case FORM_LOADING:
      return {
        ...state,
        formLoading: action.payload,
      };
    case APPEND_FORM_DATA:
      return produce(state, (draft: DBState) => {
        draft.databases[action.payload.dbIndex] = action.payload.data;
      });
    case SET_FORMS:
      const { db, forms } = action.payload;
      const dbIndex = getDatabaseIndex(state.databases, db, action.payload.nsfPath);
      return produce(state, (draft: DBState) => {
        if (dbIndex !== -1) {
          draft.databases[dbIndex].forms = forms;
        }
      });
    case SET_CURRENTFORMS:
      return produce(state, (draft: DBState) => {
        draft.forms = action.payload.forms ;
      });
    case CACHE_MODES:
      return produce(state, (draft: DBState) => {
        const { formName, formModes } = action.payload;
        const index = getDatabaseIndex(state.databases, action.payload.db, action.payload.nsfPath);
        draft.databases[index].isModeFetch = true;
      });
    case CACHE_FORM_FIELDS:
      return produce(state, (draft: DBState) => {
      });
    case SET_RETRY_COUNT:
      return {
        ...state,
        retryCount: action.payload,
      };
    case APPEND_CONFIGURED_FORM:
      return produce(state, (draft: DBState) => {
        draft.forms[action.payload.formIndex].formModes.push(action.payload.data);
      });
    case UNCONFIG_FORM:
      return produce(state, (draft: DBState) => {
        const index = draft.forms.findIndex((value) => (value.dbName === action.payload.schemaName && value.formName === action.payload.formName))
        draft.forms[index].formModes = [];
      });    
    case SET_DB_INDEX:
      return {
        ...state,
        contextViewIndex: action.payload,
      };
    case RESET_FORM:
      return produce(state, (draft: DBState) => {
        const sliceForms = state.forms.filter(
          (form) => form.dbName !== action.payload.dbName
        );
        draft.forms = sliceForms;
      });

    // Mark a Form field list as loaded
    case SET_LOADEDFORM:
      return produce(state, (draft: DBState) => {
        draft.loadedForm = action.payload.formName;
      });

    // Set the list of Loaded Fields
    case SET_LOADEDFIELDS:
      return produce(state, (draft: DBState) => {      
          draft.loadedFields = action.payload.fields;
      });

    // Mark a Form field list as active
    case SET_ACTIVEFORM:
      return produce(state, (draft: DBState) => {
        draft.activeForm = action.payload.formName;
      });

    // Add a new list of Active Fields
    case ADD_ACTIVEFIELDS:
      return produce(state, (draft: DBState) => {
        // Look for a possible duplicate before adding
        const formIndex = state.activeFields.findIndex(
          (form) => form.formName === action.payload.activeFields.formName
        );
        if (formIndex === -1) {
          draft.activeFields.push(action.payload.activeFields);
        }
        else if (state.activeFields[formIndex] !== action.payload.activeFields) {
          draft.activeFields[formIndex] = action.payload.activeFields;
        }
      });
    // Save the list of Views
    case SET_VIEWS:
      return produce(state, (draft: DBState) => {
        action.payload.views.forEach((view) => {
          view.viewActive = view.viewActive ? true : false;
          for (let ii = 0; ii < draft.activeViews.length; ii++) {
            if (view.viewUnid === draft.activeViews[ii].viewUnid) {
              view.viewActive = true;
              view.viewUpdated = draft.activeViews[ii].viewUpdated ? true : false;
              break;
            }
          }
        });
        draft.views = action.payload.views;
      });
    // Update Active Status of an View
    case UPDATE_VIEW:
      return produce(state, (draft: DBState) => {
        const viewIndex = state.views.findIndex(
          (view) => view.viewUnid === action.payload.view.viewUnid
        );
        if (viewIndex !== -1) {
          draft.views[viewIndex] = action.payload.view;
        }
      });
    // Save the list of Active Views
    case SET_ACTIVEVIEWS:
      return produce(state, (draft: DBState) => {
        draft.activeViews = action.payload.activeViews;
      });
    // Add a new active View
    case ADD_ACTIVEVIEW:
      return produce(state, (draft: DBState) => {
        // Look for possible duplicate before adding
        const viewIndex = state.activeViews.findIndex(
          (view) => view.viewUnid === action.payload.activeView.viewUnid
        );
        if (viewIndex === -1) {
          draft.activeViews.push(action.payload.activeView);
        }
      });
    // Delete an Active View
    case DELETE_ACTIVEVIEW:
      return produce(state, (draft: DBState) => {
        const viewIndex = state.activeViews.findIndex(
          (view) => view.viewUnid === action.payload.activeView
        );
        if (viewIndex !== -1) {
          draft.activeViews.splice(viewIndex, 1);
        }
      });
    case SET_FOLDERS:
      return produce(state, (draft: DBState) => {
        action.payload.folders.forEach((folder) => {
          folder.viewActive = folder.viewActive ? true : false;
          for (let ii = 0; ii < draft.activeViews.length; ii++) {
            if (folder.viewUnid === draft.activeViews[ii].viewUnid) {
              folder.viewActive = true;
              folder.viewUpdated = draft.activeViews[ii].viewUpdated ? true : false;
              break;
            }
          }
        });
        draft.folders = action.payload.folders;
      });
    // Save the list of Agents
    case SET_AGENTS:
      return produce(state, (draft: DBState) => {
        action.payload.agents.forEach((agent) => {
          agent.agentActive = false;
          for (let ii = 0; ii < draft.activeAgents.length; ii++) {
            if (agent.agentUnid === draft.activeAgents[ii].agentUnid) {
              agent.agentActive = true;
              break;
            }
          }
        });
        draft.agents = action.payload.agents;
      });
    // Update Active Status of an Agent
    case UPDATE_AGENT:
      return produce(state, (draft: DBState) => {
        const agentIndex = state.agents.findIndex(
          (agent) => agent.agentUnid === action.payload.agent.agentUnid
        );
        if (agentIndex !== -1) {
          draft.agents[agentIndex] = action.payload.agent;
        }
      });
    // Save the list of Active Agents
    case SET_ACTIVEAGENTS:
      return produce(state, (draft: DBState) => {
        draft.activeAgents = action.payload.activeAgents;
      });
    // Add a new active Agent
    case ADD_ACTIVEAGENT:
      return produce(state, (draft: DBState) => {
        // Look for possible duplicate before adding
        const agentIndex = state.activeAgents.findIndex(
          (agent) => agent.agentUnid === action.payload.activeAgent.agentUnid
        );
        if (agentIndex === -1) {
          draft.activeAgents.push(action.payload.activeAgent);
        }
      });
    // Delete an Active Agent
    case DELETE_ACTIVEAGENT:
      return produce(state, (draft: DBState) => {
        const agentIndex = state.activeAgents.findIndex(
          (agent) => agent.agentUnid === action.payload.activeAgent
        );
        if (agentIndex !== -1) {
          draft.activeAgents.splice(agentIndex, 1);
        }
      });
    // Set selected form name
    case SET_FORM_NAME:
      return {
        ...state,
        formName: action.payload,
      }
    // Save the results from a Read formula test
    case SAVE_READ_RESULT:
      return {
        ...state,
        displayTestResults: true,
        displayReadResults: true,
        readFormulaResults: action.payload,
      };
    // Save the results from a Write formula test
    case SAVE_WRITE_RESULT:
      return {
        ...state,
        displayTestResults: true,
        displayWriteResults: true,
        writeFormulaResults: action.payload,
      };
    // Save the results from a Delete formula test
    case SAVE_DELETE_RESULT:
      return {
        ...state,
        displayTestResults: true,
        displayDeleteResults: true,
        deleteFormulaResults: action.payload,
      };
    // Save the results from a Load formula test
    case SAVE_LOAD_RESULT:
      return {
        ...state,
        displayTestResults: true,
        displayLoadResults: true,
        loadFormulaResults: action.payload,
      };
    // Save the results from a Save formula test
    case SAVE_SAVE_RESULT:
      return {
        ...state,
        displayTestResults: true,
        displaySaveResults: true,
        saveFormulaResults: action.payload,
      };
    // Clears all the results from the Formula tests
    case CLEAR_FORMULA_RESULTS:
      return {
        ...state,
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
      };

    // Store Databse error to display in the UI
    case SET_DB_ERROR:
      return {
        ...state,
        dbError: true,
        dbErrorMessage: action.payload,
      };

    // Clear database error
    case CLEAR_DB_ERROR:
      return {
        ...state,
        dbError: false,
        dbErrorMessage: '',
      };

    // Setting databasepull value as false
    case CLEAR_DATABASEPULL_RESULT:
      return {
        ...state,
        databasePull: false,
        scopePull: false,
      };

    // Clear the results of forms
    case CLEAR_FORMS:
      return {
        ...state,
        forms: [],
      };
      
    // 
    case ADD_NSF_DESIGN:
      return {
        ...state,
        nsfDesigns: {
          ...state.nsfDesigns,
          [action.payload.nsfPath]: { 
            ...state.nsfDesigns[action.payload.nsfPath],
            ...action.payload.nsfDesign
          },
        },
      };
      
    // Set only show schemas configured with scopes filter
    case SET_ONLY_SHOW_SCHEMAS_WITH_SCOPES:
      return {
        ...state,
        onlyShowSchemasWithScopes: action.payload,
      };
    // 
    case FETCH_KEEP_PERMISSIONS:
      return {
        ...state,
        permissions: {
          createDbMapping: action.payload.createDbMapping,
          deleteDbMapping: action.payload.deleteDbMapping,
        },
      };
    case INIT_STATE:
      return {
        ...initialState
      };
    default:
      return state;
  }
}
