/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

export interface IResponseProp {
  status: number;
  statusText: string;
}

export interface InterceptorState {
  response: IResponseProp;
}

export const SET_CALL_STATUS = 'SET_CALL_STATUS';

export interface SetCallStatus {
  type: typeof SET_CALL_STATUS;
  payload: IResponseProp;
}

export type InterceptorActionTypes = SetCallStatus;
