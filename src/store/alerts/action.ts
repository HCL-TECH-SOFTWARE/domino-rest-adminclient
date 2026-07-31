/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * `createSlice` generates these action creators now (#710). The module stays so
 * its callers keep the import path and the names they already use — `toggleAlert`
 * is reached from roughly 100 call sites across the store and the components.
 */
export { toggleAlert, closeSnackbar } from './reducer';
