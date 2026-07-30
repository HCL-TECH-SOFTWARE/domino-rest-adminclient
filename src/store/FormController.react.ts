/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { useLayoutEffect, useRef, useState } from 'react';
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { FormController, type FormControllerOptions } from './FormController';

/**
 * A React host for `FormController` (#717) — the counterpart of `useFormik`.
 *
 * ### Why this exists
 *
 * `FormController` is a Lit `ReactiveController`: its constructor takes a
 * `ReactiveControllerHost` and it reports every mutation through `host.requestUpdate()`. A
 * React function component is not one, so **a `.tsx` file cannot use the primitive at all**.
 * Without this file, "remove Formik" and "convert to Lit" are a single inseparable operation
 * per file, and #806 tier D is the only place either can happen — 15 files, the largest 1,008
 * lines, each carrying five transformations at once.
 *
 * This decouples them. A container swaps `useFormik` for `useFormController`, keeps its MUI,
 * its `react-redux` and its `.tsx`, and the Formik axis is finished for that file. Two things
 * follow that are worth more than the adapter costs:
 *
 * 1. **The primitive gets exercised before anything is rewritten around it.** #807 shipped it
 *    with a green unit suite and zero production users, and a controller that has not met a
 *    real form is a design guess. Meeting five of them while the components are still React
 *    means changing `FormController` is cheap.
 * 2. **`formik` leaves `package.json` far sooner** — and with it `lodash` *and* `lodash-es`,
 *    which nothing else in the tree depends on. Under one-commit-per-file that wait is 15
 *    full conversions long.
 *
 * ### Lifetime
 *
 * **Temporary by construction.** Every consumer is a file #806 tier D will convert to a Lit
 * element, and a Lit element hosts the controller itself. When the last `.tsx` consumer goes,
 * this file is deleted rather than migrated — like `router/react.tsx`, which #813 wrote in the
 * same shape for the same reason and which goes with the last React view.
 *
 * ### Not a general Lit-in-React bridge
 *
 * `ReactHost` is faithful enough to host any controller — it drives `hostConnected` and
 * `hostDisconnected` properly, so a `StoreController` given to it would subscribe and
 * unsubscribe correctly rather than silently never subscribing. That is defensiveness, not an
 * invitation: `react-redux` still works for the store side, and `useFormController` is the only
 * thing here meant to be called.
 *
 * @internal Exported solely so the host contract can be tested. `FormController` has an empty
 * `hostConnected` and no `hostDisconnected`, so a host that never called either would break
 * nothing observable through the hook — exactly the silent hole worth pinning directly.
 */
export class ReactHost implements ReactiveControllerHost {
  private readonly controllers = new Set<ReactiveController>();
  private connected = false;
  /** The unresolved half of `updateComplete`, or undefined when no render is pending. */
  private pending?: { promise: Promise<boolean>; resolve: (value: boolean) => void };

  constructor(private readonly rerender: () => void) {}

  addController(controller: ReactiveController): void {
    this.controllers.add(controller);
    // Mirrors `ReactiveElement.addController`, which calls `hostConnected` immediately when
    // the element is already connected. A controller constructed during the first render is
    // added before `connect()`, so this branch is for anything added later.
    if (this.connected) controller.hostConnected?.();
  }

  removeController(controller: ReactiveController): void {
    // Lit's `removeController` only deletes — it does **not** call `hostDisconnected`. Matched
    // deliberately: a controller has to behave the same under either host, and a bridge that
    // is "more correct" than the real thing is its own kind of bug.
    this.controllers.delete(controller);
  }

  requestUpdate(): void {
    // Arm `updateComplete` before asking React to render, so a caller that mutates and then
    // awaits sees an unresolved promise rather than a stale resolved one.
    this.arm();
    this.rerender();
  }

  /**
   * Resolves once React has committed the render that `requestUpdate()` asked for.
   *
   * Honest rather than a stub: `FormController` never awaits it, but the host contract
   * promises it, and a test that awaits it should be waiting for a real commit. Resolved
   * immediately when nothing is pending, which is what Lit does.
   */
  get updateComplete(): Promise<boolean> {
    return this.pending?.promise ?? Promise.resolve(true);
  }

  /** Called from a layout effect after every commit. */
  commit(): void {
    const pending = this.pending;
    this.pending = undefined;
    pending?.resolve(true);
  }

  connect(): void {
    if (this.connected) return;
    this.connected = true;
    for (const controller of this.controllers) controller.hostConnected?.();
  }

  disconnect(): void {
    if (!this.connected) return;
    this.connected = false;
    for (const controller of this.controllers) controller.hostDisconnected?.();
    // An unmounted host never commits again, so anything awaiting `updateComplete` would wait
    // for ever. Settle it here instead of leaking a pending promise per unmount.
    this.commit();
  }

  private arm(): void {
    if (this.pending) return;
    let resolve!: (value: boolean) => void;
    const promise = new Promise<boolean>((r) => {
      resolve = r;
    });
    this.pending = { promise, resolve };
  }
}

/**
 * Hosts one `FormController` for the lifetime of the component, and re-renders on every
 * mutation. Drop-in shaped like `useFormik`, so a conversion is a rename plus the call-site
 * changes `FormController`'s narrower API forces:
 *
 * ```tsx
 * // before
 * const formik = useFormik({ initialValues, validationSchema: Schema, onSubmit });
 * <TextField name="scopeName" value={formik.values.scopeName} onChange={formik.handleChange} />
 * {formik.errors.scopeName && formik.touched.scopeName ? … : null}
 *
 * // after
 * const form = useFormController({ initialValues, schema: Schema, onSubmit });
 * <TextField value={form.values.scopeName}
 *            onChange={(e) => form.setValue('scopeName', e.target.value)} />
 * {form.submitted && form.errors.scopeName ? … : null}
 * ```
 *
 * ### Which options are read once, and which are read fresh
 *
 * This is the whole hazard of wrapping a class built for a long-lived host in a hook that runs
 * on every render, so it is stated rather than left to be discovered:
 *
 * | Option | When it is read | Why |
 * |---|---|---|
 * | `onSubmit` | **fresh, on every submit** | it closes over props, state and `dispatch`. Capturing the first render's closure would submit with values the user has since changed — a stale-closure bug that shows up as a save that writes the wrong thing, only sometimes. |
 * | `schema` | **fresh, on every submit** | a yup `.test()` may close over data outside the form, which `AddImportDialog`'s "unique schema name" rule does. A captured schema validates against a stale slice. |
 * | `initialValues` | **once**, at construction | matches Formik, whose `enableReinitialize` defaults to `false`. It is only re-read by `reset()`, so a form whose initial values arrive with a selected record resets to the *first* record — Formik did the same, so this is faithful rather than fixed. If a converted edit form needs otherwise, that is a change worth its own issue. |
 *
 * The freshness is delivered by a getter and a delegating closure on the options object rather
 * than by rebuilding the controller, because rebuilding would throw away the values the user
 * has typed on every parent render.
 */
export function useFormController<T extends object>(
  options: FormControllerOptions<T>,
): FormController<T> {
  const [, bump] = useState(0);
  const latest = useRef(options);

  // Lazy ref init: the controller must survive every render, and constructing one per render
  // would discard the form. Nothing here escapes the ref, so the render stays side-effect free
  // — `addController` is a no-op until `connect()`.
  const held = useRef<{ host: ReactHost; form: FormController<T> } | null>(null);
  if (held.current === null) {
    const host = new ReactHost(() => bump((n) => n + 1));
    const { initialValues } = options;
    held.current = {
      host,
      form: new FormController<T>(host, {
        initialValues,
        get schema() {
          return latest.current.schema;
        },
        onSubmit: (values) => latest.current.onSubmit(values),
      }),
    };
  }
  const { host, form } = held.current;

  // Layout effects, not passive ones: both of these must be in place before the browser can
  // dispatch a user event against the render just committed. A passive effect can be deferred
  // past paint, which would let a click submit through the *previous* render's `onSubmit`.
  useLayoutEffect(() => {
    latest.current = options;
  });

  useLayoutEffect(() => {
    host.connect();
    return () => host.disconnect();
  }, [host]);

  useLayoutEffect(() => {
    host.commit();
  });

  return form;
}
