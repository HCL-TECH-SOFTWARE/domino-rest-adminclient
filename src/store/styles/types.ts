/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

// Application Theming/Styling Store

export interface StylesState {
  databaseSize: number;
  accessModeFullscreen: boolean;
  isMobile: boolean;
  themeMode: string;
}

export const ADJUST_DATABASE_STYLE = 'ADJUST_DATABASE_STYLE';
export const RESET_DATABASE_STYLE = 'RESET_DATABASE_STYLE';
export const SET_MOBILE_VIEWPORT = 'SET_MOBILE_VIEWPORT';
export const TOGGLE_FULLSCREEN = 'TOGGLE_FULLSCREEN';
export const SWITCH_THEME = 'SWITCH_THEME';

interface AdjustDatabaseStyle {
  type: typeof ADJUST_DATABASE_STYLE;
  payload: number;
}

interface ToggleFullScreen {
  type: typeof TOGGLE_FULLSCREEN;
}

interface SwitchTheme {
  type: typeof SWITCH_THEME;
  payload: string;
}

interface SetMobileViewport {
  type: typeof SET_MOBILE_VIEWPORT;
  payload: boolean;
}

export type StylesActionTypes =
  | AdjustDatabaseStyle
  | ToggleFullScreen
  | SetMobileViewport
  | SwitchTheme;
