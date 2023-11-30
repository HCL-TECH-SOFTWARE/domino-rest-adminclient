/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import produce from 'immer';
import {
  ApplicationStates,
  GET_APPS,
  AppsActionTypes,
  status,
  DELETE_APP,
  EXECUTING,
  ADD_APP,
  SET_PULLED_APP,
  TOGGLE_DELETE_DIALOG,
  DROP_UPDATE,
  UPDATE_APP,
  SET_APP_ERROR,
  CLEAR_APP_ERROR,
  INIT_STATE,
} from './types';

const initialState: ApplicationStates = {
  apps: [],
  status: false,
  appPull: false,
  appError: false,
  appErrorMessage: '',
  deleteDialogOpen: false,
};

export default function appsReducer(
  state = initialState,
  action: AppsActionTypes
): ApplicationStates {
  switch (action.type) {
    case EXECUTING:
      return {
        ...state,
        status: action.payload,
      };
    case GET_APPS:
      return {
        ...state,
        apps: action.payload,
      };
    case ADD_APP:
      return produce(state, (draft: ApplicationStates) => {
        draft.apps.push(action.payload);
      });
    case DROP_UPDATE:
      return produce(state, (draft: ApplicationStates) => {
        const {
          appId,
          destination: { droppableId },
        } = action.payload;
        const appIndex = state.apps.findIndex(app => app.appId === appId);

        draft.apps[appIndex] = {
          ...state.apps[appIndex],
          appStatus: status[droppableId],
        };
      });
    case UPDATE_APP:
      return produce(state, (draft: ApplicationStates) => {
        const { appId } = action.payload;
        const appIndex = state.apps.findIndex(app => app.appId === appId);
        draft.apps[appIndex] = action.payload;
      });
    case DELETE_APP:
      return produce(state, (draft: ApplicationStates) => {
        const appIndex = state.apps.findIndex(
          app => app.appId === action.payload
        );
        draft.apps.splice(appIndex, 1);
      });
    case SET_PULLED_APP:
      return {
        ...state,
        appPull: action.payload,
      };
    case TOGGLE_DELETE_DIALOG:
      return {
        ...state,
        deleteDialogOpen: !state.deleteDialogOpen,     
      };
    // Store an Application error for display in the UI
    case SET_APP_ERROR:
      return {
        ...state,
        appError: true,
        appErrorMessage: action.payload,     
     };
    // Clear an Application error
    case CLEAR_APP_ERROR:
       return {
         ...state,
         appError: false,
         appErrorMessage: '',
       };
    case INIT_STATE:
      return {
        ...initialState
      };
    default:
      return state;
  }
}
