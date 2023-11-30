/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { SET_CALL_STATUS, IResponseProp } from './types';

export function setCallStatus(response: IResponseProp) {
  return {
    type: SET_CALL_STATUS,
    payload: response,
  };
}
