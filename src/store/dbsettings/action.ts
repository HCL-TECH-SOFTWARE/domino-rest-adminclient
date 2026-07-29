/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * `createSlice` generates this action creator now (#710). The module stays so its two
 * callers keep the import path and the name they already use:
 * `components/forms/FormsContainer.tsx` and `store/databases/action.ts`.
 */
export { toggleSettings } from './reducer';
