/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import type { ReactiveController, ReactiveControllerHost } from 'lit';

export interface FormControllerOptions<T extends object> {
  initialValues: T;
  onSubmit: (values: T) => void | Promise<void>;
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
    this.host.requestUpdate();
  }

  setValues(next: Partial<T>): void {
    this._values = { ...this._values, ...next };
    this.host.requestUpdate();
  }

  reset(): void {
    this._values = { ...this.options.initialValues };
    this.host.requestUpdate();
  }
}
