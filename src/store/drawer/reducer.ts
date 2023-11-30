/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import {
  DrawerActionTypes,
  DrawerState,
  TOGGLE_DRAWER,
  TOGGLE_APPLICATION_DRAWER,
  TOGGLE_QUICKCONFIG_DRAWER,
  INIT_STATE,
  TOGGLE_CONSENTS_DRAWER,
} from './types';

const initialState: DrawerState = {
  visible: false,
  applicationDrawer: false,
  quickConfigDrawer: false,
  consentsDrawer: false,
};

export default function drawerReducer(
  state = initialState,
  action: DrawerActionTypes
): DrawerState {
  switch (action.type) {
    case TOGGLE_DRAWER:
      return {
        ...state,
        visible: !state.visible,
      };
    case TOGGLE_APPLICATION_DRAWER:
      return {
        ...state,
        applicationDrawer: !state.applicationDrawer,
      };
    case TOGGLE_QUICKCONFIG_DRAWER:
      return {
        ...state,
        quickConfigDrawer: !state.quickConfigDrawer,
      };
    case TOGGLE_CONSENTS_DRAWER:
      return {
        ...state,
        consentsDrawer: !state.consentsDrawer,
      }
    case INIT_STATE:
      return {
        ...initialState
      };
    default:
      return state;
  }
}