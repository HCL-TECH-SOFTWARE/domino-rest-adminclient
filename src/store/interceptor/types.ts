/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { interceptorSlice } from './reducer';

/** The part of a fetch response this slice records. */
export interface IResponseProp {
  status: number;
  statusText: string;
}

/** Shape of the interceptor slice of state. */
export interface InterceptorState {
  response: IResponseProp;
}

/**
 * Back-compat alias for the hand-written action-type constant (#710).
 *
 * `createSlice` derives its own type string — `interceptor/setCallStatus`. See the longer
 * note in `dbsettings/types.ts`: this exists for one commit, to let the reducer test
 * dispatch unchanged and prove parity, and is deleted with it.
 */
export const SET_CALL_STATUS = interceptorSlice.actions.setCallStatus.type;
