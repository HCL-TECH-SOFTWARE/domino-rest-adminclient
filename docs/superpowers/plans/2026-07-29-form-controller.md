# FormController Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `FormController` — the Formik replacement — so #806 tier D is unblocked.

**Architecture:** One Lit reactive controller, ~100 lines, same shape as `src/store/StoreController.ts`. It owns values and validation errors; it never touches element internals. Components read `controller.errors.x` and set `aria-invalid`/`hint` themselves, exactly as `LoginPage.tsx` does today.

**Tech Stack:** Lit 3 `ReactiveController`, yup ^1.7.1 (already a dependency), vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-07-29-form-controller-design.md` — read it once. It records why this is small, and what was cut.

## Global Constraints

- **No file conversion in this PR.** The issue's gate: `FormController` is green before a single tier-D file is touched. Do not edit any of the 15 Formik files.
- Copyright header on every new file, year 2026 (`test/copyright-headers.test.ts` enforces it):
  ```
  /* ========================================================================== *
   * Copyright (C) 2026 HCL America Inc.                                        *
   * All rights reserved.                                                       *
   * Licensed under Apache 2 License.                                           *
   * ========================================================================== */
  ```
- **Keep it small.** `StoreController.ts` is 87 lines and most of it is comments explaining *why*. Match that. If the implementation is growing past ~120 lines, stop and report — it means something is being built that the survey did not ask for.
- All four gates before any commit: `npm run lint`, `npm run typecheck`, `npm run build`, `npx vitest run`.
- **Do not** build: `<Field>`, `<FieldArray>`, `withFormik`, `setFieldError`, `status`, `submitCount`, `enableReinitialize`, async/field-level validation, bracket paths, arrays. Nothing in the 15 files uses them.

---

### Task 1: Values

**Files:**
- Create: `src/store/FormController.ts`
- Test: `test/store/FormController.test.ts`

**Produces** (Task 2 builds on these): `FormController<T>`, `FormControllerOptions<T>`, `values`, `setValue`, `setValues`, `reset`.

- [ ] **Step 1: Write the failing tests**

```ts
/* …copyright header… */
import { describe, expect, it, vi } from 'vitest';
import { LitElement } from 'lit';
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
    expect(INITIAL.name).toBe('');
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
```

- [ ] **Step 2: Run — expect failure**

`npx vitest run test/store/FormController.test.ts` → fails, module not found.

- [ ] **Step 3: Implement**

```ts
/* …copyright header… */
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
```

- [ ] **Step 4: Run — expect pass**, then all four gates.

- [ ] **Step 5: Commit**

```bash
git add src/store/FormController.ts test/store/FormController.test.ts
git commit -m "Add FormController's value half (#807)"
```

---

### Task 2: Validation and submit

**Files:**
- Modify: `src/store/FormController.ts`
- Modify: `test/store/FormController.test.ts`

**Consumes:** everything from Task 1.
**Produces:** `schema` option, `errors`, `submitted`, `submitting`, `submit()`.

- [ ] **Step 1: Write the failing tests** (append to the existing file)

```ts
import * as yup from 'yup';

const schema = yup.object({
  name: yup.string().required('Name is required').min(3, 'Too short'),
});

class ValidatingHost extends LitElement {
  onSubmit = vi.fn();
  form = new FormController<Values>(this, { initialValues: INITIAL, schema, onSubmit: this.onSubmit });
}
customElements.define('validating-host', ValidatingHost);

const validating = () => new ValidatingHost();

describe('FormController — validation', () => {
  it('reports no errors before the first submit, even when invalid', () => {
    const el = validating();
    expect(el.form.errors).toEqual({});
    expect(el.form.submitted).toBe(false);
  });

  it('populates errors on submit and does not call onSubmit', async () => {
    const el = validating();
    await el.form.submit();
    expect(el.form.errors.name).toBe('Name is required');
    expect(el.onSubmit).not.toHaveBeenCalled();
    expect(el.form.submitted).toBe(true);
  });

  it('reports every failing field, not just the first', async () => {
    const two = yup.object({
      name: yup.string().required('Name is required'),
      count: yup.number().min(1, 'Too few'),
    });
    class H extends LitElement {
      form = new FormController<Values>(this, { initialValues: INITIAL, schema: two, onSubmit: vi.fn() });
    }
    customElements.define('two-error-host', H);
    const el = new H();
    await el.form.submit();
    expect(Object.keys(el.form.errors).sort()).toEqual(['count', 'name']);
  });

  it('calls onSubmit with the values when valid', async () => {
    const el = validating();
    el.form.setValue('name', 'Ada');
    await el.form.submit();
    expect(el.onSubmit).toHaveBeenCalledWith(el.form.values);
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
    const two = yup.object({
      name: yup.string().required('Name is required'),
      count: yup.number().min(1, 'Too few'),
    });
    class H extends LitElement {
      form = new FormController<Values>(this, { initialValues: INITIAL, schema: two, onSubmit: vi.fn() });
    }
    customElements.define('sibling-error-host', H);
    const el = new H();
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
    let release!: () => void;
    const onSubmit = vi.fn(() => new Promise<void>((r) => { release = r; }));
    class H extends LitElement {
      form = new FormController<Values>(this, { initialValues: INITIAL, onSubmit });
    }
    customElements.define('pending-host', H);
    const el = new H();
    const done = el.form.submit();
    expect(el.form.submitting).toBe(true);
    release();
    await done;
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

  it('clears errors, submitted and submitting on reset', async () => {
    const el = validating();
    await el.form.submit();
    el.form.reset();
    expect(el.form.errors).toEqual({});
    expect(el.form.submitted).toBe(false);
    expect(el.form.submitting).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect failure** (no `errors`/`submit` yet).

- [ ] **Step 3: Implement**

Add to `FormControllerOptions`: `schema?: import('yup').ObjectSchema<any>;`

Add to the class:

```ts
  private _errors: Record<string, string> = {};
  private _submitted = false;
  private _submitting = false;

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
    this._errors = await this.validate();
    this.host.requestUpdate();
    if (Object.keys(this._errors).length > 0) return;

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
```

In `setValue`, after updating `_values` and before `requestUpdate()`:

```ts
    // A field being fixed stops showing its old error, matching LoginPage.
    if (path in this._errors) {
      const { [path]: _removed, ...rest } = this._errors;
      this._errors = rest;
    }
```

In `reset()`, also clear `_errors = {}`, `_submitted = false`, `_submitting = false`.

- [ ] **Step 4: Run — expect pass**, then all four gates.

- [ ] **Step 5: Commit**

```bash
git add src/store/FormController.ts test/store/FormController.test.ts
git commit -m "Add FormController validation and submit (#807)"
```

---

### Task 3: Verify and open the PR

- [ ] **Step 1:** All four gates clean: `npm run lint`, `npm run typecheck`, `npm run build`, `npx vitest run`.
- [ ] **Step 2:** Confirm the issue's gate — no tier-D file changed: `git diff --name-only origin/new_code...HEAD` lists only the controller, its test, the spec and this plan.
- [ ] **Step 3:** Confirm coverage floors for `src/store/**` still pass: `npx vitest run --coverage`.
- [ ] **Step 4:** Open the PR against `new_code` with `closes #807` in the body, noting that #806 tier D is now unblocked and that `AppStack.tsx` / `kanban/AppCard.tsx` are dead code to delete rather than convert.

## Self-Review

**Spec coverage.** Every capability in the spec's "must be supported" table has a task: values/setValue (1), setValues (1), reset (1+2), submit (2), schema (2), submit-gated errors (2), dot paths (1). The instance-passed-as-a-prop case needs no code — it is an object.

**Placeholders.** None; both tasks carry complete code.

**Type consistency.** `FormControllerOptions<T>` gains `schema` in Task 2 and is used under that name in both. `values`/`errors`/`submitted`/`submitting` are getters throughout.
