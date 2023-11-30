/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import {
  StylesState,
  StylesActionTypes,
  ADJUST_DATABASE_STYLE,
  TOGGLE_FULLSCREEN,
  SET_MOBILE_VIEWPORT,
  SWITCH_THEME,
} from './types';

const theme = localStorage.getItem('theme') || 'default';

const initialState: StylesState = {
  databaseSize: 100,
  accessModeFullscreen: false,
  isMobile: false,
  themeMode: theme,
};

export default function stylesReducer(
  state = initialState,
  action: StylesActionTypes
): StylesState {
  switch (action.type) {
    case ADJUST_DATABASE_STYLE:
      return {
        ...state,
        databaseSize: action.payload,
      };
    case TOGGLE_FULLSCREEN:
      return {
        ...state,
        accessModeFullscreen: !state.accessModeFullscreen,
      };
    case SET_MOBILE_VIEWPORT:
      return {
        ...state,
        isMobile: true,
      };
    case SWITCH_THEME:
      return {
        ...state,
        themeMode: action.payload,
      };
    default:
      return state;
  }
}
