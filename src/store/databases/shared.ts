/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { SET_DB_ERROR, CLEAR_DB_ERROR } from './types';
import { getLogger } from '../../services/log-service';

/**
 * Shared by every module in this folder. Split out of `action.ts` in #711 so the
 * concern modules depend on this rather than on each other — with these four here
 * the module graph is a tree, and adding a module cannot introduce a cycle.
 */
export const log = getLogger('store/databases');
export function getErrorMsg(error: any) {
  if (error) {
    if (error.response && error.response.statusText) return error.response.statusText;
    if (error.message) return error.message;
  }
  return '';
}

/**
 * Store Database error to display in the UI
 */
export function setDBError(message: string) {
  return {
    type: SET_DB_ERROR,
    payload: message
  };
}

/**
 * Clear Database error
 */
export function clearDBError() {
  return {
    type: CLEAR_DB_ERROR
  };
}
