/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * `createSlice` generates all four creators; this module exists so components import them
 * from the same `store/<slice>/action` path every other slice uses.
 *
 * There are no thunks here. The slice holds screen state, not anything fetched — and the
 * one piece of behaviour that might look like a thunk, "navigate if nothing is dirty",
 * deliberately is not one: it ends in a router call, and the router is not reachable from
 * a store thunk.
 */
export {
  setNavigationDirty,
  blockNavigation,
  cancelNavigation,
  allowNavigation,
} from './reducer';
