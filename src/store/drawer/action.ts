/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import {
  TOGGLE_DRAWER,
  TOGGLE_APPLICATION_DRAWER,
  TOGGLE_QUICKCONFIG_DRAWER,
  TOGGLE_CONSENTS_DRAWER,
} from './types';

export function toggleDrawer() {
  return {
    type: TOGGLE_DRAWER,
  };
}

export function toggleApplicationDrawer() {
  return {
    type: TOGGLE_APPLICATION_DRAWER,
  };
}

export function toggleQuickConfigDrawer() {
  return {
    type: TOGGLE_QUICKCONFIG_DRAWER,
  };
}

export function toggleConsentsDrawer() {
  return {
    type: TOGGLE_CONSENTS_DRAWER,
  };
}

