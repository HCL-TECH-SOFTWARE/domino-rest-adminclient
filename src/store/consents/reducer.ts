/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import {
  Consent,
  ConsentActionTypes,
  ConsentState,
  DELETE_CONSENT,
  INIT_STATE,
  SET_CONSENTS,
  TOGGLE_DELETE_CONSENT,
} from './types';

const initialState: ConsentState = {
  consents: [],
  deleteConsentDialog: false,
  deleteUnid: '',
  appName: '',
  username: '',
  scope: '',
};

export default function consentsReducer(
  state = initialState,
  action: ConsentActionTypes
): ConsentState {
  switch (action.type) {
    case SET_CONSENTS:
      return {
        ...state,
        consents: action.payload,
      };
    case DELETE_CONSENT:
      let deletedConsent = action.payload;
      let newConsents = state.consents.filter((consent: Consent) => consent.client_id !== deletedConsent.client_id);
      return {
        ...state,
        consents: newConsents,
        deleteUnid: '',
      }
    case TOGGLE_DELETE_CONSENT:
      return {
        ...state,
        deleteConsentDialog: !state.deleteConsentDialog,
        deleteUnid: action.payload,
        appName: action.payload,
        username: action.payload,
        scope: action.payload,
      }
    case INIT_STATE:
      return {
        ...initialState
      };
    default:
      return state;
  }
}