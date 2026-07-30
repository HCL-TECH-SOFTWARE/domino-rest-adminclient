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
 * A field of `T`, or one level of dot-path into a nested object of `T` — exactly the set
 * `setValue` accepts, and the keys `errors` and `touched` are keyed on (#935).
 *
 * `keyof T & string` alone would have been wrong. A nested yup rule reports a dotted path
 * (`additionalModes.odata`) that no top-level key covers, and `submit()` unions those paths
 * into `touched`, so half the live entries would not have type-checked. One level, because
 * that is all `setValue` writes: `setValue('a.b.c', v)` puts a literal `'b.c'` key inside `a`.
 *
 * Arrays are left as bare keys. Spreading their indices and `length` into the union would
 * offer `tags.0` and `tags.length` as field names, which `setValue` cannot honour.
 */
export type FormPath<T> = {
  [K in keyof T & string]: NonNullable<T[K]> extends readonly unknown[]
    ? K
    : NonNullable<T[K]> extends object
      ? K | `${K}.${keyof NonNullable<T[K]> & string}`
      : K;
}[keyof T & string];

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
 *
 * ### Error timing
 *
 * A field reports itself on its own blur (`handleBlur`) or on the first submit attempt,
 * whichever comes first. That is what the Formik markup in these files *described* and never
 * did: none of the 15 wired `handleBlur`, so `touched` only ever flipped on submit and every
 * message waited for the Add button. Wiring `@blur` is per-field work in the converted
 * element; the primitive side is `touched` + `handleBlur` + `validateField`.
 */
/**
 * A copy of `map` without `key`.
 *
 * Not the rest-destructure this replaces. `const { [key]: _drop, ...rest } = map` types `rest`
 * as `Omit<Partial<Record<FormPath<T>, V>>, FormPath<T>>`, and once the key is a union
 * TypeScript cannot see that back as the original map type — it reduces the remaining keys to
 * `never` and rejects the assignment.
 */
function without<K extends PropertyKey, V>(
  map: Partial<Record<K, V>>,
  key: K,
): Partial<Record<K, V>> {
  const next = { ...map };
  delete next[key];
  return next;
}

export class FormController<T extends object> implements ReactiveController {
  private _values: T;
  private _extras: Record<string, unknown> = {};
  private _errors: Partial<Record<FormPath<T>, string>> = {};
  private _touched: Partial<Record<FormPath<T>, boolean>> = {};
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
  setValue(path: FormPath<T>, value: unknown): void {
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
    if (path in this._errors) this._errors = without(this._errors, path);
    this.host.requestUpdate();
  }

  /**
   * Merge `next` over the current values. Keys absent from `next` keep what they had.
   *
   * The right default, and the only one until #935: a form restoring one row of a record, or
   * writing back a field it just computed, means "these, and leave the rest". When the whole
   * object is the new truth — a parsed file, a preloaded payload — that is `replaceValues`.
   */
  setValues(next: Partial<T>): void {
    this._values = { ...this._values, ...next };
    this.host.requestUpdate();
  }

  /**
   * Replace the values wholesale: keys absent from `next` go back to nothing rather than
   * keeping what they had (#935).
   *
   * The import case needs this and `setValues` cannot express it. The React file-import path
   * spread a parsed `.json` straight into the values object, so a key the file omitted was
   * *meant* to disappear; done as a merge it silently keeps whatever the previous file, or the
   * user, had put there.
   *
   * Takes a whole `T`, not a `Partial<T>`, because "replace" and "partial" do not belong in
   * the same call — a partial replace is how you get a form with holes in it. A file that
   * carries only some of the fields should be read into a complete `T` by the caller, which is
   * where the defaults for the rest actually live.
   *
   * Errors and touched are left alone, exactly as `setValues` leaves them: this reports new
   * values, not a new form. Use `reset()` for that.
   */
  replaceValues(next: T): void {
    this._values = { ...next };
    this.host.requestUpdate();
  }

  /**
   * Fields the form carries but does not own — and therefore has no control, no validation
   * rule and no place in `T` for (#935).
   *
   * An imported payload is the case this exists for. The file names fields belonging to the
   * record that this particular form does not edit; they have to survive the round trip, and
   * with a typed `T` they have nowhere to live. Without this, each converting form invents a
   * private bag, spreads it under the values when building its payload, and remembers to clear
   * it in `reset()` — bookkeeping that is per-form and easy to get wrong.
   *
   * Deliberately untyped: it is the escape hatch, and `Record<string, unknown>` is an honest
   * description of "whatever the file had". Anything the form actually owns belongs in `T`.
   *
   * The payload is `{ ...form.extras, ...form.values }` — extras underneath, so a field the
   * form owns always wins over a stale copy of it in the imported data. Left to the caller,
   * which owns the rest of the payload shape anyway.
   */
  get extras(): Readonly<Record<string, unknown>> {
    return this._extras;
  }

  /** Replace the carried-but-not-owned fields. Cleared by `reset()`, like everything else. */
  setExtras(next: Record<string, unknown>): void {
    this._extras = { ...next };
    this.host.requestUpdate();
  }

  reset(): void {
    this._values = { ...this.options.initialValues };
    this._extras = {};
    this._errors = {};
    this._touched = {};
    this._submitted = false;
    this._submitting = false;
    // Frees the form for a new submit even mid-flight, which is what `addSchema`'s
    // `resetCallback` does from inside a converted `onSubmit`. The abandoned run is still
    // running; `_generation` is what stops it clearing the next run's flags when it settles.
    this._inFlight = undefined;
    this._generation += 1;
    this.host.requestUpdate();
  }

  /**
   * Field messages. A field appears here once it has been validated and failed — on its own
   * blur, or on a submit attempt, whichever comes first. Untouched fields are absent, so
   * `errors.x` alone never shows a message for a field the user has not reached yet.
   */
  get errors(): Readonly<Partial<Record<FormPath<T>, string>>> {
    return this._errors;
  }

  /**
   * Which fields the user has finished with — set by `handleBlur`, and set for every field
   * by a submit attempt, mirroring Formik's `SUBMIT_ATTEMPT` reducer.
   *
   * **This is the display gate:** `touched.x && errors.x`. `errors` is already per-field
   * (see above), so the gate is belt-and-braces for a blur-driven error — but it is load
   * bearing after `setValue` clears an error while the field stays touched, and it is the
   * flag a form needs to re-validate on input once a field has been visited.
   *
   * The 15 Formik files could not use it: `handleBlur` was wired nowhere in any of them, so
   * their `touched.x` only ever became true on submit and `submitted` was the honest name for
   * what they meant. Converted forms wire `@blur` and get the behaviour the markup implied.
   */
  get touched(): Readonly<Partial<Record<FormPath<T>, boolean>>> {
    return this._touched;
  }

  /**
   * Whether `submit()` has been called. Prefer `touched.x && errors.x` for a field message;
   * this is for form-level state ("show the summary", "the user has tried once").
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
   * Mark a field finished-with and validate it. Wire this to an input's blur:
   *
   * ```ts
   * @blur=${() => void this.form.handleBlur('schemaName')}
   * ```
   *
   * The returned promise is there so a test can await it; template handlers discard it. It
   * rejects only if the schema itself crashed — see `validateField`.
   */
  handleBlur(path: FormPath<T>): Promise<void> {
    this._touched = { ...this._touched, [path]: true };
    this.host.requestUpdate();
    return this.validateField(path);
  }

  /**
   * Re-check one field and update only its message, leaving every other entry in `errors`
   * alone. Does not mark anything touched — `handleBlur` does that.
   *
   * The **whole** schema runs, not just this field's rules, because a `.test()` may read a
   * sibling field or state outside the form (the "unique schema name" rule reads both). Only
   * `path`'s result is kept. That costs one extra pass per blur and buys correctness for
   * cross-field rules, which is the trade every one of the five real forms needs.
   *
   * Rejects if the schema crashed, for #890's reason: a validator that threw has told us
   * nothing about this field, so clearing its error would be a lie. The existing entry is
   * left as it was.
   */
  async validateField(path: FormPath<T>): Promise<void> {
    const found = await this.validate();
    const message = found[path];
    if (message === undefined) {
      if (!(path in this._errors)) return;
      this._errors = without(this._errors, path);
    } else {
      if (this._errors[path] === message) return;
      this._errors = { ...this._errors, [path]: message };
    }
    this.host.requestUpdate();
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
      // Every field counts as touched once the user has pressed submit, so the whole error
      // map becomes visible at once. Formik did this in its SUBMIT_ATTEMPT reducer
      // (`touched: setNestedObjectValues(state.values, true)`) and forms rely on it: a
      // required field the user never focused has to report itself on the first press.
      //
      // Error paths are unioned in, not just the value keys, because a nested rule reports a
      // dotted path (`additionalModes.odata`) that no top-level key would cover.
      this._touched = { ...this._touched };
      const keys = [...Object.keys(this._values), ...Object.keys(this._errors)];
      for (const key of keys) this._touched[key as FormPath<T>] = true;
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

  private async validate(): Promise<Partial<Record<FormPath<T>, string>>> {
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
      // The one place a plain string becomes a FormPath<T>. yup reports whatever its schema
      // was built with, and nothing types that against `T` — so this is the boundary where the
      // two are asserted to agree, rather than a cast sprinkled through the readers.
      return found as Partial<Record<FormPath<T>, string>>;
    }
  }
}
