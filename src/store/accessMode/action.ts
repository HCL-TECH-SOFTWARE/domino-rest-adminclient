/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * `createSlice` generates both creators; this module exists so components import them from
 * the same `store/<slice>/action` path every other slice uses.
 *
 * There are no thunks here. The slice holds screen state, not anything fetched.
 */
export { setAccessFields, resetAccessFields } from './reducer';
