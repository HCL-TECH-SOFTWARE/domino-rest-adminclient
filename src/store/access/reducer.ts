/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import {
  INIT_STATE,
  SET_USERS,
  UserActionTypes,
  UserState,
} from './types';

const initialState: UserState = {
  users: null,
};

export default function usersReducer(
  state = initialState,
  action: UserActionTypes
): UserState {
  switch (action.type) {
    case SET_USERS:
      console.log(action.payload);
      return {
        ...state,
        users: action.payload,
      };
    case INIT_STATE:
      return initialState;
    default:
      return state;
  }
}
