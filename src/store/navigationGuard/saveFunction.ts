/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * The save function the unsaved-changes dialog calls, as a module singleton.
 *
 * This is the half of the old `NavigationGuardContext` that is *not* state. It was a
 * `useRef` in the provider, and it stays a reference rather than becoming a field of the
 * slice for one reason: it is a closure. A store holds values that can be serialised,
 * compared and replayed, and Redux Toolkit's own serialisability check exists to say so.
 *
 * Promoting the ref from component scope to module scope is what the slice makes possible
 * — the registrant and the caller no longer have to share a React subtree — and is the
 * same trade the store itself makes (see `store.ts`): one app, one guard, so a singleton
 * is simpler than a provider, and a Lit element can reach it without one.
 *
 * The screen that registers a function is responsible for clearing it when it unmounts;
 * `AccessMode.tsx` does that in the cleanup of the effect that sets it. A stale function
 * left behind would be called against an unmounted screen.
 */
let saveFunction: (() => Promise<void>) | null = null;

/** Register the function, or pass `null` to clear it. */
export const setSaveFunction = (fn: (() => Promise<void>) | null): void => {
  saveFunction = fn;
};

/**
 * Run the registered save, if there is one.
 *
 * Resolving rather than throwing when nothing is registered is deliberate: the dialog's
 * Save button must still let the user leave. A screen that marked itself dirty without
 * registering a save has a bug, but refusing to navigate is not the place to report it.
 */
export const runSaveFunction = async (): Promise<void> => {
  await saveFunction?.();
};
