/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import {
  TOGGLE_ALERT,
  CLOSE_SNACKBAR,
} from './types';

export function toggleAlert(message: string) {
  return {
    type: TOGGLE_ALERT,
    payload: message,
  };
}

export function closeSnackbar() {
  return {
    type: CLOSE_SNACKBAR,
  };
}
