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
    protected readonly options: FormControllerOptions<T>,
  ) {
    host.addController(this);
    // Shallow copy is enough: setValue never mutates in place, it replaces.
    this._values = { ...options.initialValues };
  }

  /**
   * Readonly on purpose. Five tier-D files assign `formik.values.x = y` directly, which
   * never notified anything — it only appeared to work when an unrelated render followed.
   * `Readonly<T>` makes those a compile error instead of a race.
   */
  get values(): Readonly<T> {
    return this._values;
  }

  /**
   * `ReactiveController`'s callbacks are all optional, which makes it a "weak type" —
   * TypeScript refuses to pass an object implementing none of them to `addController`
   * (TS2559), the same rule that rejects `{}` for any all-optional interface. This
   * controller has no lifecycle work yet, so the hook is a no-op; Task 2 is free to give
   * it a body, or leave it, without touching this class's shape.
   */
  hostConnected(): void {}

  /** `path` is either a key or one level of dot-path (`additionalModes.odata`). */
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
    // A field being fixed stops showing its old error, matching LoginPage.
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
  get errors(): Readonly<Record<string, string>> {
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

  get submitting(): boolean {
    return this._submitting;
  }

  async submit(): Promise<void> {
    this._submitted = true;
    // Gated, not an unconditional `await this.validate()`: `await` never resolves
    // synchronously, so skipping it when there is no schema keeps this path synchronous
    // up to `_submitting = true` — see the "is submitting while pending" test.
    if (this.options.schema) {
      this._errors = await this.validate();
      this.host.requestUpdate();
      if (Object.keys(this._errors).length > 0) return;
    }

    this._submitting = true;
    this.host.requestUpdate();
    try {
      await this.options.onSubmit(this._values);
    } finally {
      // `finally`, not a trailing statement: a rejected onSubmit must not leave the form
      // stuck submitting with its buttons disabled.
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
