/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * `createSlice` generates these action creators now (#710). The module stays so
 * its callers keep the import path and the names they already use — and there are
 * a lot of them: `setApiLoading` alone is dispatched from most of the databases
 * thunks.
 */
export {
  setApiLoading,
  toggleDeleteDialog,
  toggleErrorDialog,
  toggleResetViewDialog,
} from './reducer';
