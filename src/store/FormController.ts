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

  async submit(): Promise<void> {
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
      this._submitting = false;
      this.host.requestUpdate();
    }
  }

  private async validate(): Promise<Record<string, string>> {
    const { schema } = this.options;
    if (!schema) return {};
    try {
      await schema.validate(this._values, { abortEarly: false });
      return {};
    } catch (error) {
      // abortEarly: false collects every failure in `inner`; first message per field wins.
      const found: Record<string, string> = {};
      for (const issue of (error as { inner?: Array<{ path?: string; message: string }> }).inner ?? []) {
        if (issue.path && !(issue.path in found)) found[issue.path] = issue.message;
      }
      return found;
    }
  }
}
