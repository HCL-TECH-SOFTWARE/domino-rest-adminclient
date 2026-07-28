/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import interceptorReducer from '../../../src/store/interceptor/reducer';
import { SET_CALL_STATUS, InterceptorState } from '../../../src/store/interceptor/types';

const initial: InterceptorState = {
  response: {
    status: 200,
    statusText: '',
  },
};

describe('interceptorReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(interceptorReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('SET_CALL_STATUS replaces response with the payload', () => {
    const response = { status: 404, statusText: 'Not Found' };
    const next = interceptorReducer(initial, { type: SET_CALL_STATUS, payload: response });
    expect(next.response).toEqual(response);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    const response = { status: 500, statusText: 'Server Error' };
    expect(() =>
      interceptorReducer(frozen, { type: SET_CALL_STATUS, payload: response }),
    ).not.toThrow();
    expect(interceptorReducer(frozen, { type: SET_CALL_STATUS, payload: response })).not.toBe(
      frozen,
    );
  });
});
