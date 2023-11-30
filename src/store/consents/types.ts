/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

// Describing the shape of the Consent State
export interface ConsentState {
  consents: Array<Consent>;
  deleteConsentDialog: boolean;
  deleteUnid: string;
}

export interface Consent {
  username: string,
  scope: string,
  client_id: string,
  unid: string,
  redirect_uri: string,
  code_expires_at: string,
  refresh_token_expires_at: string,
  scope_claim: string,
  scope_description: string,
  scope_logo_url: string,
}

// Describing the different ACTION NAMES available
export const SET_CONSENTS = 'SET_CONSENTS';
export const DELETE_CONSENT = 'DELETE_CONSENT';
export const TOGGLE_DELETE_CONSENT = 'TOGGLE_DELETE_CONSENT';
export const INIT_STATE = 'INIT_STATE';

interface SetConsents {
  type: typeof SET_CONSENTS;
  payload: Array<Consent>
}

interface DeleteConsent {
  type: typeof DELETE_CONSENT;
  payload: Consent
}

interface ToggleDeleteConsent {
  type: typeof TOGGLE_DELETE_CONSENT;
  payload: string
}

interface InitConsentsState {
  type: typeof INIT_STATE;
}

export type ConsentActionTypes = SetConsents | DeleteConsent | ToggleDeleteConsent | InitConsentsState;
