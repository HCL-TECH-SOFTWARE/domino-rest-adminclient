/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { KeepHistory, ADD_HISTORY } from './types';

export function addHistory(history: KeepHistory) {
  return {
    type: ADD_HISTORY,
    payload: history,
  };
}

