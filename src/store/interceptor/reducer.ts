/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import {
  InterceptorState,
  InterceptorActionTypes,
  SET_CALL_STATUS,
} from './types';

const initialState: InterceptorState = {
  response: {
    status: 200,
    statusText: '',
  },
};

export default function interceptorReducer(
  state = initialState,
  action: InterceptorActionTypes
): InterceptorState {
  switch (action.type) {
    case SET_CALL_STATUS:
      return {
        ...state,
        response: action.payload,
      };
    default:
      return state;
  }
}
