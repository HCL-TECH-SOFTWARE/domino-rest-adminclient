/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import type { AppState } from '../index';

/*
 * Both of these return a primitive, on purpose.
 *
 * `StoreController` compares selector results with `Object.is`, so a selector that builds
 * an object — `({ isDirty, pendingPath })` — is never equal to its previous result and
 * re-renders its host on *every* store change. A Lit element that guards a form will want
 * one of these, and it can subscribe to it safely.
 */

/** Whether the screen on show has unsaved changes. */
export const selectIsDirty = (state: AppState): boolean => state.navigationGuard.isDirty;

/**
 * The navigation being held, or `null`.
 *
 * Also the answer to "is the dialog up" — see the note on `NavigationGuardState.pendingPath`.
 */
export const selectPendingPath = (state: AppState): string | null =>
  state.navigationGuard.pendingPath;
