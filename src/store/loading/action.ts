/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * `createSlice` generates these action creators now (#710). The module stays so
 * its callers keep the import path and the names they already use.
 *
 * `toggleDetailsLoading` is new here only in the sense that it never had a
 * creator: `databases.ts` dispatched `{ type: TOGGLE_DETAILS_LOADING }` by hand.
 */
export {
  setLoading,
  toggleDetailsLoading,
  toggleConsentsLoading,
  toggleUsersLoading,
} from './reducer';
