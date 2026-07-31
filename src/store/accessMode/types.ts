/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * The shared field state of the schema-management (access mode) screen.
 *
 * This was `components/access/AccessContext.tsx` — a `React.createContext({})` carrying a
 * `[state, setState]` pair that `AccessMode.tsx` provided and `SingleFieldContainer.tsx`
 * consumed. #806 decision 1 (reports/04 §3): a React context becomes a store slice, not a
 * `@lit/context` provider. There is one store in this app and it is already a module
 * singleton, so a Lit element reaches it through `StoreController` (or, when it needs a
 * one-shot read rather than a subscription, through `store` directly) with no provider to
 * re-plumb.
 *
 * Shared mutable page state held as `[value, setValue]` is what a slice is, so the
 * translation is direct: `state` is {@link AccessModeState.fields} and `setState` is
 * `setAccessFields`.
 */

/**
 * One field row of a mode.
 *
 * Deliberately open. The objects here are assembled from three places that do not agree on
 * a shape — the schema API's mode fields, the design API's form fields, and the
 * `{ id, content, ...field }` decoration `AccessMode.tsx` adds — and every consumer already
 * reads them as `any`. Narrowing it is worth doing, but it is a change to the access
 * screens rather than to this slice, so it is not smuggled in here.
 */
export type AccessField = Record<string, any>;

export interface AccessModeState {
  /**
   * Droppable id → the fields currently in that column.
   *
   * There has only ever been one key, generated with `uuid()`; the map shape and the
   * `Object.keys(state)[0]` reads all over `AccessMode.tsx` are what is left of a
   * two-column drag-and-drop layout. Preserved exactly, because the reads are.
   */
  fields: Record<string, AccessField[]>;
}

// The global reset broadcast. Not this slice's action — see the note in reducer.ts.
export const INIT_STATE = 'INIT_STATE';
