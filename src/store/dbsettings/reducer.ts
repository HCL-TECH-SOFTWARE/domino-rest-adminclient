/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import {
  DBSettingDialogState,
  DBSettingActionTypes,
  TOGGLE_DBSETTING_DIALOG,
} from './types';

const initialState: DBSettingDialogState = {
  visible: false,
};

export default function dbSettingReducer(
  state = initialState,
  action: DBSettingActionTypes
): DBSettingDialogState {
  switch (action.type) {
    case TOGGLE_DBSETTING_DIALOG:
      return {
        ...state,
        visible: !state.visible,
      };
    default:
      return state;
  }
}
