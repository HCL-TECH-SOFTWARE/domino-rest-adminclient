/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import interceptorReducer, { setCallStatus } from '../../../src/store/interceptor/reducer';
import type { InterceptorState } from '../../../src/store/interceptor/types';

const initial: InterceptorState = {
  response: {
    status: 200,
    statusText: '',
  },
};

describe('interceptorReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(interceptorReducer(undefined, { type: '@@UNKNOWN' })).toEqual(initial);
  });

  it('setCallStatus replaces response with the payload', () => {
    const response = { status: 404, statusText: 'Not Found' };
    const next = interceptorReducer(initial, setCallStatus(response));
    expect(next.response).toEqual(response);
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    const response = { status: 500, statusText: 'Server Error' };
    expect(() => interceptorReducer(frozen, setCallStatus(response))).not.toThrow();
    expect(interceptorReducer(frozen, setCallStatus(response))).not.toBe(frozen);
    expect(frozen.response.status).toBe(200);
  });
});
