/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * The unsaved-changes guard's state.
 *
 * This was `components/navigation/NavigationGuardContext.tsx` — a `React.createContext`
 * publishing three functions, backed by a `useState` pair and three refs. #806 decision 1
 * (reports/04 §3): a React context becomes a store slice, not a `@lit/context` provider.
 * There is one store in this app and it is already a module singleton, so a Lit element
 * reaches it through `StoreController` with no provider to re-plumb — which matters here
 * more than it did for `AccessContext`, because the components this guard protects are
 * exactly the ones #806 is converting.
 *
 * The split is state here, behaviour beside it. Two things the old provider held are
 * deliberately *not* in this slice:
 *
 * - **The registered save function** — a closure, and a store holds values that can be
 *   serialised, compared and replayed. It lives in `./saveFunction`.
 * - **The navigation itself** — the router is not the store's business. `NavigationGuard`
 *   reads {@link NavigationGuardState.pendingPath} and performs it.
 */
export interface NavigationGuardState {
  /** Whether the screen on show has unsaved changes. Set by the editing component. */
  isDirty: boolean;
  /**
   * The navigation being held while the dialog is up, or `null` when nothing is held.
   *
   * Doubles as the dialog's `open`: the dialog is shown for exactly the states in which a
   * navigation is pending, so a separate `dialogOpen` flag would be a second copy of this
   * one that could disagree with it.
   */
  pendingPath: string | null;
}

/**
 * The pending "navigation" for a back/forward press, which is a *history* move rather than
 * a path.
 *
 * A sentinel rather than a second field because `pendingPath` is already the one thing that
 * says whether anything is held; two fields would need keeping in step. It is not a
 * reachable route — no path contains an underscore, let alone four.
 */
export const BACK_NAVIGATION = '__BACK__';

// The global reset broadcast. Not this slice's action — see the note in reducer.ts.
export const INIT_STATE = 'INIT_STATE';
