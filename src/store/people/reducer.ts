/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc                                   *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { produce } from 'immer';
import {
  FETCH_ALL_USERS,
  UPDATE_USER,
  DELETE_USER,
  PeopleActionTypes,
  PeopleState,
  CLEAR_PEOPLE_ERROR,
  TOGGLE_DELETE_DIALOG,
  ADD_USER,
} from './types';

/**
 * reducer.ts is the Redux reducer for the People page
 *
 * @author Roopa HS
 * @author Mallisetty Subbaiah
 * @author Sudula Prakash
 */

// Initial People state
const initialState: PeopleState = {
  peoples: [],
  peopleError: false,
  peopleErrorMessage: '',
  drawerOpen: false,
  deleteDialogOpen: false,
};

/**
 * peopleReducer manages the state of the People page
 */
export default function peopleReducer(
  state = initialState,
  action: PeopleActionTypes
): PeopleState {
  switch (action.type) {
    // Fetch the list of People
    case FETCH_ALL_USERS:
      return {
        ...state,
        peoples: action.payload,
      };
    // Create new People
    case ADD_USER:
      return produce(state, (draft: PeopleState) => {
        draft.peoples.push(action.payload);
      });
    // Update People
    case UPDATE_USER:
      return produce(state, (draft: PeopleState) => {
        const personId = action.payload.id;
        const personIndex = state.peoples.findIndex(
          (people) => people.id === personId
        );
        draft.peoples[personIndex] = action.payload;
      });
    // Delete People
    case DELETE_USER:
      return produce(state, (draft: PeopleState) => {
        const peopleIndex = state.peoples.findIndex(
          (people) => people.id === action.payload
        );
        draft.peoples.splice(peopleIndex, 1);
      });
    case TOGGLE_DELETE_DIALOG:
      return {
        ...state,
        deleteDialogOpen: !state.deleteDialogOpen,
      };
    case CLEAR_PEOPLE_ERROR:
      return {
        ...state,
        peopleError: false,
        peopleErrorMessage: '',
      };
    default:
      return state;
  }
}
