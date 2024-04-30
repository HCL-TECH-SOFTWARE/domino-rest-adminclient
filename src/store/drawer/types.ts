/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

// Describing the shape of the Databases's slice of state
export interface DrawerState {
  visible: boolean;
  applicationDrawer: boolean;
  appFilterDrawer: boolean;
  quickConfigDrawer: boolean;
  consentsDrawer: boolean;
}
// Describing the different ACTION NAMES available
export const TOGGLE_DRAWER = 'TOGGLE_DRAWER';
export const TOGGLE_APPLICATION_DRAWER = 'TOGGLE_APPLICATION_DRAWER';
export const TOGGLE_APPLICATION_FILTER_DRAWER = 'TOGGLE_APPLICATION_FILTER_DRAWER';
export const TOGGLE_QUICKCONFIG_DRAWER = 'TOGGLE_QUICKCONFIG_DRAWER';
export const TOGGLE_CONSENTS_DRAWER = 'TOGGLE_CONSENTS_DRAWER';

export const INIT_STATE = 'INIT_STATE';

interface ToggleDrawer {
  type: typeof TOGGLE_DRAWER;
}

interface ToggleApplicationDrawer {
  type: typeof TOGGLE_APPLICATION_DRAWER;
}

interface ToggleApplicationFilterDrawer {
  type: typeof TOGGLE_APPLICATION_FILTER_DRAWER;
}

interface ToggleQuickConfigDrawer {
  type: typeof TOGGLE_QUICKCONFIG_DRAWER;
}

interface ToggleConsentsDrawer {
  type: typeof TOGGLE_CONSENTS_DRAWER;
}

interface InitState {
  type: typeof INIT_STATE;
}

export type DrawerActionTypes = 
  ToggleDrawer | 
  ToggleApplicationDrawer | 
  ToggleApplicationFilterDrawer | 
  ToggleQuickConfigDrawer | 
  ToggleConsentsDrawer | 
  InitState;
