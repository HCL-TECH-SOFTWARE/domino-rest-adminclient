/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/** The part of a fetch response this slice records. */
export interface IResponseProp {
  status: number;
  statusText: string;
}

/** Shape of the interceptor slice of state. */
export interface InterceptorState {
  response: IResponseProp;
}
