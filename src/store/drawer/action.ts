/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * `createSlice` generates these action creators now (#710). The module stays so
 * its callers keep the import path and the names they already use.
 */
export {
  toggleDrawer,
  toggleApplicationDrawer,
  toggleAppFilterDrawer,
  toggleQuickConfigDrawer,
  toggleConsentsDrawer,
} from './reducer';
