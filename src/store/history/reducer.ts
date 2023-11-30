/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { HistoryState, KeepHistoryActionTypes, ADD_HISTORY } from './types';

const initialState: HistoryState = {
  histories: [
    { uri: '/', label: 'HCL Notes Admin' },
    { uri: 'server', label: 'Server' },
    { uri: 'keep-api', label: 'HCL Domino REST API' }
  ]
};

export default function historyReducer(
  state = initialState,
  action: KeepHistoryActionTypes
): HistoryState {
  switch (action.type) {
    case ADD_HISTORY:
      return {
        ...state,
        histories: [...state.histories, action.payload]
      };
    default:
      return state;
  }
}
