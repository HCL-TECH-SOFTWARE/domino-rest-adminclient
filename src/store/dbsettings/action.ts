/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { TOGGLE_DBSETTING_DIALOG } from './types';

export function toggleSettings() {
  return {
    type: TOGGLE_DBSETTING_DIALOG,
  };
}
