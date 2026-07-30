/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import type { ReactiveController, ReactiveControllerHost } from 'lit';

export interface FormControllerOptions<T extends object> {
  initialValues: T;
  onSubmit: (values: T) => void | Promise<void>;
  schema?: import('yup').AnyObjectSchema;
}

/**
 * Form state for a Lit element (#807) — the replacement for Formik.
 *
 * Formik's failure here was not its error map, which `LoginPage.tsx` still keeps happily.
 * It was that **Formik could not read the values**: the inputs are custom elements, so
 * `onSubmit` received whatever had last been assigned to them rather than what the user
 * typed. This controller owns the values outright, and `setValue` is the only way in.
 *
 * Deliberately small — see the design spec for the list of Formik features nothing in
 * this codebase uses, and which therefore do not exist here.
 */
export class FormController<T extends object> implements ReactiveController {
  private _values: T;
  private _errors: Record<string, string> = {};
  private _submitted = false;
  private _submitting = false;
  private _inFlight?: Promise<void>;
  /** Bumped by anything that frees the form, so a run settling late cannot clobber a newer one. */
  private _generation = 0;

  constructor(
    private readonly host: ReactiveControllerHost,
    private readonly options: FormControllerOptions<T>,
  ) {
    host.addController(this);
    // Shallow copy is enough: setValue never mutates in place, it replaces.
    this._values = { ...options.initialValues };
  }

  /**
   * Readonly on purpose. Five tier-D files assign `formik.values.x = y` directly, which
   * never notified anything — it only appeared to work when an unrelated render followed.
   * `Readonly<T>` makes those a compile error instead of a race.
   *
   * The guarantee is one level deep: a nested object (e.g. `additionalModes`) is the same
   * object as in `initialValues` until `setValue` replaces it, so assigning through a
   * nested property still compiles and corrupts `initialValues` — go through `setValue`.
   */
  get values(): Readonly<T> {
    return this._values;
  }

  /** No-op: `ReactiveController`'s all-optional members make it a "weak type" — implementing none fails `addController` (TS2559). */
  hostConnected(): void {}

  /**
   * `path` is either a key or one level of dot-path (`additionalModes.odata`). Only one
   * level: `setValue('a.b.c', v)` writes a literal `'b.c'` key into `a` — do not build
   * deeper paths.
   */
  setValue(path: string, value: unknown): void {
    const dot = path.indexOf('.');
    if (dot === -1) {
      this._values = { ...this._values, [path]: value };
    } else {
      const head = path.slice(0, dot);
      const tail = path.slice(dot + 1);
      const parent = (this._values as Record<string, unknown>)[head] as object;
      this._values = { ...this._values, [head]: { ...parent, [tail]: value } };
    }
    // Clears just this field's error, one at a time — LoginPage clears its whole map instead.
    if (path in this._errors) {
      const { [path]: _removed, ...rest } = this._errors;
      this._errors = rest;
    }
    this.host.requestUpdate();
  }

  setValues(next: Partial<T>): void {
    this._values = { ...this._values, ...next };
    this.host.requestUpdate();
  }

  reset(): void {
    this._values = { ...this.options.initialValues };
    this._errors = {};
    this._submitted = false;
    this._submitting = false;
    // Frees the form for a new submit even mid-flight, which is what `addSchema`'s
    // `resetCallback` does from inside a converted `onSubmit`. The abandoned run is still
    // running; `_generation` is what stops it clearing the next run's flags when it settles.
    this._inFlight = undefined;
    this._generation += 1;
    this.host.requestUpdate();
  }

  /** Field messages. Empty until `submit()` has run at least once. */
  get errors(): Readonly<Partial<Record<string, string>>> {
    return this._errors;
  }

  /**
   * Whether `submit()` has been called.
   *
   * This is what the 15 files' `formik.touched` actually meant: `handleBlur` was wired
   * nowhere, so "touched" only ever became true on a submit attempt. Named honestly here.
   */
  get submitted(): boolean {
    return this._submitted;
  }

  /** Whether `submit()` is in flight — from the call until it settles. A disabled submit
   *  button wants this: validation is part of the wait, not just `onSubmit`'s promise. */
  get submitting(): boolean {
    return this._submitting;
  }

  /**
   * Validate, then hand the values to `onSubmit`. One write per press (#887).
   *
   * **A second call while the first is in flight returns the first's promise** rather than
   * running the body again. All five form owners dispatch a mutating thunk from `onSubmit`,
   * and for `addSchema` and `addApplication` that is a *create* — a double-clicked Save was
   * two rows. `submitting` cannot be the caller's defence: the second click can land before
   * the re-render that would disable the button.
   *
   * Returning the in-flight promise rather than an early `return`, so `await submit()` means
   * "the submit finished" for every caller. Ignoring the second call instead would resolve it
   * immediately with `errors` still empty from the unfinished first run, and a dialog doing
   * `await submit(); if (no errors) close()` would close over a POST still in flight.
   */
  submit(): Promise<void> {
    if (this._inFlight) return this._inFlight;
    this._inFlight = this.run(this._generation);
    return this._inFlight;
  }

  private async run(generation: number): Promise<void> {
    this._submitted = true;
    this._submitting = true;
    this.host.requestUpdate();
    try {
      this._errors = await this.validate();
      if (Object.keys(this._errors).length > 0) return;
      await this.options.onSubmit(this._values);
    } finally {
      // `finally`, not a trailing statement: validation failing, or onSubmit rejecting,
      // must not leave the form stuck submitting with its buttons disabled.
      //
      // Guarded by generation, because `reset()` mid-flight already freed the form and a
      // newer run may own these flags by now. Clearing them unconditionally would reopen the
      // re-entry hole this method exists to close — one door further along.
      if (generation === this._generation) {
        this._submitting = false;
        this._inFlight = undefined;
        this.host.requestUpdate();
      }
    }
  }

  private async validate(): Promise<Record<string, string>> {
    const { schema } = this.options;
    if (!schema) return {};
    try {
      await schema.validate(this._values, { abortEarly: false });
      return {};
    } catch (error) {
      const issues = (error as { inner?: Array<{ path?: string; message: string }> }).inner;
      // A validator that *crashed* is not a validator that passed (#890). An empty map is how
      // this method says "valid", so swallowing a non-ValidationError sent `submit()` straight
      // on to `onSubmit` with unvalidated values — reachable from any `.test()` closure that
      // reads state outside the form, which is exactly what `AddImportDialog`'s does.
      if (!issues) throw error;
      // abortEarly: false collects every failure in `inner`; first message per field wins.
      const found: Record<string, string> = {};
      for (const issue of issues) {
        if (issue.path && !(issue.path in found)) found[issue.path] = issue.message;
      }
      return found;
    }
  }
}
