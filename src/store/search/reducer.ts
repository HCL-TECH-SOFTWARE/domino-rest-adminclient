/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import {
  SearchState,
  SearchActionTypes,
  TOGGLE_SEARCH,
  CLOSE_SEARCH,
} from './types';

const initialState: SearchState = {
  show: false,
};

export default function searchReducer(
  state = initialState,
  action: SearchActionTypes
): SearchState {
  switch (action.type) {
    case TOGGLE_SEARCH:
      return {
        ...state,
        show: !state.show,
      };
    case CLOSE_SEARCH:
      return {
        ...state,
        show: false,
      };
    default:
      return state;
  }
}
