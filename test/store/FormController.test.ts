/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it, vi } from 'vitest';
import { LitElement } from 'lit';
import * as yup from 'yup';
import { FormController } from '../../src/store/FormController';

interface Values { name: string; count: number; additionalModes: { odata: boolean; dql: boolean } }

const INITIAL: Values = { name: '', count: 0, additionalModes: { odata: false, dql: false } };

/** A real host, so `requestUpdate` is the real thing rather than a spy on nothing. */
class HostElement extends LitElement {
  form = new FormController<Values>(this, { initialValues: INITIAL, onSubmit: vi.fn() });
}
customElements.define('form-host', HostElement);

const host = () => new HostElement();

describe('FormController — values', () => {
  it('starts at initialValues', () => {
    expect(host().form.values).toEqual(INITIAL);
  });

  it('does not share structure with initialValues', () => {
    const el = host();
    el.form.setValue('name', 'changed');
    el.form.setValue('additionalModes.odata', true);
    expect(INITIAL.name).toBe('');
    // The nested object is only ever shallow-copied, so this is the assertion that
    // actually exercises it: a `setValue` that mutated the shared nested parent in
    // place, instead of replacing it, would flip this too.
    expect(INITIAL.additionalModes.odata).toBe(false);
  });

  it('sets a top-level key', () => {
    const el = host();
    el.form.setValue('name', 'Ada');
    expect(el.form.values.name).toBe('Ada');
  });

  it('sets a one-level dot path into the nested object, not a literal key', () => {
    const el = host();
    el.form.setValue('additionalModes.odata', true);
    expect(el.form.values.additionalModes).toEqual({ odata: true, dql: false });
    expect((el.form.values as Record<string, unknown>)['additionalModes.odata']).toBeUndefined();
  });

  it('leaves siblings alone when setting a nested key', () => {
    const el = host();
    el.form.setValue('additionalModes.dql', true);
    expect(el.form.values.additionalModes.odata).toBe(false);
  });

  it('requests a host update on setValue', () => {
    const el = host();
    const spy = vi.spyOn(el, 'requestUpdate');
    el.form.setValue('name', 'Ada');
    expect(spy).toHaveBeenCalled();
  });

  it('bulk-replaces with setValues and keeps unnamed keys', () => {
    const el = host();
    el.form.setValues({ name: 'Ada', count: 3 });
    expect(el.form.values).toEqual({ ...INITIAL, name: 'Ada', count: 3 });
  });

  it('restores initialValues on reset', () => {
    const el = host();
    el.form.setValue('name', 'Ada');
    el.form.setValue('additionalModes.odata', true);
    el.form.reset();
    expect(el.form.values).toEqual(INITIAL);
  });
});

// Type-only, never called: proves `values` is `Readonly<T>` at compile time. `tsc -b` still
// checks an unused function's body, so this fails the build the day the getter is widened —
// vitest never executes it.
function _assertValuesIsReadonly(el: HostElement): void {
  // @ts-expect-error `values` is Readonly<T> — assignment through it must be a compile error.
  el.form.values.name = 'nope';
}
void _assertValuesIsReadonly; // referenced, never called — silences "declared but never read"

const schema = yup.object({
  name: yup.string().required('Name is required').min(3, 'Too short'),
});

class ValidatingHost extends LitElement {
  onSubmit = vi.fn();
  form = new FormController<Values>(this, { initialValues: INITIAL, schema, onSubmit: this.onSubmit });
}
customElements.define('validating-host', ValidatingHost);

const validating = () => new ValidatingHost();

const twoFieldSchema = yup.object({
  name: yup.string().required('Name is required'),
  count: yup.number().min(1, 'Too few'),
});

class TwoFieldHost extends LitElement {
  form = new FormController<Values>(this, { initialValues: INITIAL, schema: twoFieldSchema, onSubmit: vi.fn() });
}
customElements.define('two-field-host', TwoFieldHost);

const twoField = () => new TwoFieldHost();

describe('FormController — validation', () => {
  it('reports no errors before the first submit, even when invalid', () => {
    const el = validating();
    expect(el.form.errors).toEqual({});
    expect(el.form.submitted).toBe(false);
    // Editing a still-invalid field must not trigger validation either — only submit() does.
    el.form.setValue('name', 'x'); // still invalid: min(3)
    expect(el.form.errors).toEqual({});
  });

  it('populates errors on submit and does not call onSubmit', async () => {
    const el = validating();
    await el.form.submit();
    expect(el.form.errors.name).toBe('Name is required');
    expect(el.onSubmit).not.toHaveBeenCalled();
    expect(el.form.submitted).toBe(true);
  });

  it('reports every failing field, not just the first', async () => {
    const el = twoField();
    await el.form.submit();
    expect(Object.keys(el.form.errors).sort()).toEqual(['count', 'name']);
  });

  it('calls onSubmit with the values when valid', async () => {
    const el = validating();
    el.form.setValue('name', 'Ada');
    await el.form.submit();
    expect(el.onSubmit).toHaveBeenCalledWith({ ...INITIAL, name: 'Ada' });
    expect(el.form.errors).toEqual({});
  });

  it('clears a field error when that field is edited', async () => {
    const el = validating();
    await el.form.submit();
    expect(el.form.errors.name).toBeDefined();
    el.form.setValue('name', 'Ada');
    expect(el.form.errors.name).toBeUndefined();
  });

  it('leaves other fields errors alone when one is edited', async () => {
    const el = twoField();
    await el.form.submit();
    el.form.setValue('name', 'Ada');
    expect(el.form.errors.count).toBe('Too few');
  });

  it('always calls onSubmit when there is no schema', async () => {
    const onSubmit = vi.fn();
    class H extends LitElement {
      form = new FormController<Values>(this, { initialValues: INITIAL, onSubmit });
    }
    customElements.define('schemaless-host', H);
    await new H().form.submit();
    expect(onSubmit).toHaveBeenCalled();
  });

  it('is submitting while onSubmit is pending and not after', async () => {
    let seenWhileCalled: boolean | undefined;
    // Resolver bound at construction time (the Promise executor runs synchronously), not
    // inside `onSubmit` — so releasing it never races `submit()`'s own await ordering.
    let release!: () => void;
    const pending = new Promise<void>((r) => { release = r; });
    // Read `submitting` from inside `onSubmit` itself, not from a tick count in the test:
    // this stays correct regardless of how many microtasks validation takes first.
    const onSubmit = vi.fn(() => {
      seenWhileCalled = el.form.submitting;
      return pending;
    });
    class H extends LitElement {
      form = new FormController<Values>(this, { initialValues: INITIAL, onSubmit });
    }
    customElements.define('pending-host', H);
    const el = new H();
    const done = el.form.submit();
    release();
    await done;
    expect(seenWhileCalled).toBe(true);
    expect(el.form.submitting).toBe(false);
  });

  it('does not stay stuck submitting when onSubmit rejects', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('nope'));
    class H extends LitElement {
      form = new FormController<Values>(this, { initialValues: INITIAL, onSubmit });
    }
    customElements.define('rejecting-host', H);
    const el = new H();
    await expect(el.form.submit()).rejects.toThrow('nope');
    expect(el.form.submitting).toBe(false);
  });

  it('clears errors and submitted on reset', async () => {
    const el = validating();
    await el.form.submit();
    el.form.reset();
    expect(el.form.errors).toEqual({});
    expect(el.form.submitted).toBe(false);
  });

  it('clears submitting on reset even mid-flight', () => {
    // Never resolves — this test only cares about the state while submit() is in flight,
    // so nothing needs to settle it.
    const onSubmit = vi.fn(() => new Promise<void>(() => {}));
    class H extends LitElement {
      form = new FormController<Values>(this, { initialValues: INITIAL, onSubmit });
    }
    customElements.define('reset-mid-flight-host', H);
    const el = new H();
    void el.form.submit();
    expect(el.form.submitting).toBe(true);
    el.form.reset();
    expect(el.form.submitting).toBe(false);
  });
});

/**
 * #890 — a crashing validator is not a passing validator.
 *
 * `validate()` reads field messages out of a yup rejection's `inner` array, and an empty map is
 * how it says "valid". `inner ?? []` therefore turned any non-`ValidationError` into a phantom
 * success and `submit()` wrote unvalidated values — reachable from any `.test()` closure that
 * reads state outside the form, which is what `AddImportDialog`'s uniqueness check does.
 */
describe('FormController — a validator that throws', () => {
  const crashingSchema = yup.object({
    name: yup.string().test('boom', 'unused', () => {
      throw new TypeError('existing is undefined');
    }),
  }) as yup.AnyObjectSchema;

  const crashingHost = (tag: string, onSubmit = vi.fn()) => {
    class H extends LitElement {
      form = new FormController<Values>(this, { initialValues: INITIAL, schema: crashingSchema, onSubmit });
    }
    customElements.define(tag, H);
    return { el: new H(), onSubmit };
  };

  it('does not report the crash as a valid form', async () => {
    const { el, onSubmit } = crashingHost('validator-crash-host');
    await expect(el.form.submit()).rejects.toThrow('existing is undefined');
    // The defect: `errors` was `{}` and this had been called, POSTing unvalidated values.
    expect(onSubmit).not.toHaveBeenCalled();
    expect(el.form.errors).toEqual({});
  });

  it('leaves the form usable, not stuck submitting', async () => {
    const { el } = crashingHost('validator-crash-usable-host');
    await expect(el.form.submit()).rejects.toThrow(TypeError);
    expect(el.form.submitting).toBe(false);
    // And re-entry has not latched either — the crash is retryable like any other rejection.
    await expect(el.form.submit()).rejects.toThrow(TypeError);
  });

  it('still reports ordinary validation failures as errors rather than throwing', async () => {
    // The rethrow keys off a missing `inner`, so it must not catch real ValidationErrors.
    const onSubmit = vi.fn();
    class H extends LitElement {
      form = new FormController<Values>(this, { initialValues: INITIAL, schema: twoFieldSchema, onSubmit });
    }
    customElements.define('validator-normal-host', H);
    const el = new H();
    await expect(el.form.submit()).resolves.toBeUndefined();
    expect(el.form.errors).toEqual({ name: 'Name is required', count: 'Too few' });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

/**
 * #887 — one write per press.
 *
 * `submit()` used to run its whole body on every call, so a double-clicked Save dispatched a
 * mutating thunk twice: for `addSchema` and `addApplication` that is two creates, not an
 * idempotent retry. A disabled button cannot be the defence, because the second click can land
 * before the re-render that disables it.
 */
describe('FormController — submit is not re-entrant', () => {
  /** A macrotask, which drains every pending microtask — so no test here counts await ticks. */
  const flush = () => new Promise<void>((resolve) => { setTimeout(resolve, 0); });

  /** A host whose `onSubmit` blocks until the returned `release` for that call is invoked. */
  const gatedHost = (tag: string) => {
    const releases: Array<() => void> = [];
    const onSubmit = vi.fn(() => new Promise<void>((r) => { releases.push(r); }));
    class H extends LitElement {
      form = new FormController<Values>(this, { initialValues: INITIAL, onSubmit });
    }
    customElements.define(tag, H);
    return { el: new H(), onSubmit, releases };
  };

  it('calls onSubmit once when submitted twice concurrently', async () => {
    const { el, onSubmit, releases } = gatedHost('reentry-once-host');
    const first = el.form.submit();
    const second = el.form.submit();
    await flush();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    releases[0]();
    await Promise.all([first, second]);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('hands the second caller the in-flight promise, so awaiting it means the submit finished', async () => {
    // Not an early `return`: that would resolve the second caller immediately with `errors`
    // still empty from the unfinished first run, and a dialog doing
    // `await submit(); if (no errors) close()` would close over a POST still in flight.
    const { el, releases } = gatedHost('reentry-same-promise-host');
    const first = el.form.submit();
    expect(el.form.submit()).toBe(first);

    let secondSettled = false;
    const second = el.form.submit().then(() => { secondSettled = true; });
    await flush();
    expect(secondSettled).toBe(false);

    releases[0]();
    await Promise.all([first, second]);
    expect(secondSettled).toBe(true);
  });

  it('accepts a fresh submit once the first has settled', async () => {
    const { el, onSubmit, releases } = gatedHost('reentry-reopens-host');
    const first = el.form.submit();
    await flush();
    releases[0]();
    await first;

    const again = el.form.submit();
    expect(again).not.toBe(first);
    await flush();
    expect(onSubmit).toHaveBeenCalledTimes(2);
    releases[1]();
    await again;
    expect(el.form.submitting).toBe(false);
  });

  it('does not latch when validation fails', async () => {
    // Validation failing returns early, before onSubmit — the guard has to clear on that path
    // too, or a form with one invalid field could never be submitted again.
    const onSubmit = vi.fn();
    class H extends LitElement {
      form = new FormController<Values>(this, { initialValues: INITIAL, schema: twoFieldSchema, onSubmit });
    }
    customElements.define('reentry-invalid-host', H);
    const el = new H();
    await el.form.submit();
    expect(onSubmit).not.toHaveBeenCalled();

    el.form.setValue('name', 'ok');
    el.form.setValue('count', 3);
    await el.form.submit();
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('does not latch when onSubmit rejects, and both callers see the rejection', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('nope'));
    class H extends LitElement {
      form = new FormController<Values>(this, { initialValues: INITIAL, onSubmit });
    }
    customElements.define('reentry-rejecting-host', H);
    const el = new H();
    const first = el.form.submit();
    const second = el.form.submit();
    await expect(first).rejects.toThrow('nope');
    await expect(second).rejects.toThrow('nope');
    expect(onSubmit).toHaveBeenCalledTimes(1);

    // A failed write must be retryable.
    await expect(el.form.submit()).rejects.toThrow('nope');
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });

  it('lets a run abandoned by reset settle without disturbing the run that replaced it', async () => {
    // Not hypothetical: `addSchema` invokes its `resetCallback` after the POST resolves
    // (`store/databases/schemas.ts`), so a converted `onSubmit` that awaits that dispatch gets
    // reset() *mid-flight* — and reset() deliberately frees the form. Without the generation
    // guard, the abandoned run's `finally` would then clear the new run's flags and reopen
    // re-entry for the next click, in the one form where a double create is worst.
    const { el, onSubmit, releases } = gatedHost('reentry-reset-host');
    const abandoned = el.form.submit();
    await flush();
    el.form.reset();
    expect(el.form.submitting).toBe(false);

    const current = el.form.submit();
    await flush();
    expect(onSubmit).toHaveBeenCalledTimes(2);

    releases[0]();
    await abandoned;
    expect(el.form.submitting).toBe(true);
    expect(el.form.submit()).toBe(current);

    releases[1]();
    await current;
    expect(el.form.submitting).toBe(false);
  });
});
