/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { LitElement } from 'lit';
import * as Yup from 'yup';
import { FormController } from '../../src/store/FormController';
import { cleanupLit, mountLit } from '../test-utils/lit';

/**
 * #807 shipped `FormController` with unit tests and **zero production users**. Every remaining
 * tier-D file in #806 needs it *and* `StoreController` at once, and the largest is
 * `access/TabsAccess.tsx` at 1,008 lines. These tests exist so the primitive is measured against
 * what the real forms actually demand **before** a 400-line component is rewritten around it —
 * the same order #771 used, where PR #846 characterised the tables before migrating them.
 *
 * The demands are taken from the five files that genuinely own a form (`useFormik` or
 * `<Formik>`): `database/QuickConfigFormContainer`, `database/ScopeFormContainer`,
 * `database/AddImportDialog`, `applications/kanban/Kanban` and `access/TabsAccess`. The other
 * nine `formik` files only *receive* a `FormikProps` and forward it — they are couriers, not
 * users, and converting one proves nothing about this class.
 *
 * Where a test documents a **gap** rather than a capability, it says so. Those are the inputs to
 * whatever #717 has to add before tier D can be finished.
 */

interface SchemaForm {
  schemaName: string;
  description: string;
  nsfPath: string;
  isActive: boolean;
  dqlFormula: { formulaType: string; formula: string };
  owners: string[];
}

const INITIAL: SchemaForm = {
  schemaName: '',
  description: '',
  nsfPath: '',
  isActive: true,
  dqlFormula: { formulaType: 'domino', formula: '@True' },
  owners: [],
};

/** A host that reports how often the controller asked it to re-render. */
class FormHost extends LitElement {
  renders = 0;
  form = new FormController<SchemaForm>(this, {
    initialValues: INITIAL,
    onSubmit: () => {},
  });

  render() {
    this.renders++;
    return null;
  }
}
customElements.define('test-form-host', FormHost);

const host = () => mountLit<FormHost>('test-form-host');

/** The shape `AddImportDialog` builds: `.test()` closures that read state outside the form. */
const schemaFor = (existing: string[], nsfPath: () => string) =>
  Yup.object().shape({
    schemaName: Yup.string()
      .required('Schema name is required.')
      .min(3, 'Schema name should contain at least 3 characters.')
      .test('unique', 'Schema name already exists in this database!', (value) =>
        !existing.includes(`${nsfPath()}:${value}`),
      ),
    description: Yup.string().required('Please provide a short description!'),
  }) as Yup.AnyObjectSchema;

describe('FormController against the five real forms', () => {
  afterEach(cleanupLit);

  it('writes a nested field through one level of dot path', async () => {
    // Every one of the five carries at least one nested object: dqlFormula here,
    // additionalModes in TabsAccess.
    const el = await host();
    el.form.setValue('dqlFormula.formula', '@False');
    expect(el.form.values.dqlFormula.formula).toBe('@False');
    expect(el.form.values.dqlFormula.formulaType).toBe('domino');
  });

  it('does not corrupt initialValues when a nested field is written', async () => {
    // The docblock warns that the nested object is shared with initialValues until setValue
    // replaces it. This pins that setValue does replace, so a second host starts clean.
    const first = await host();
    first.form.setValue('dqlFormula.formula', '@False');
    cleanupLit();
    const second = await host();
    expect(second.form.values.dqlFormula.formula).toBe('@True');
  });

  it('merges a partial setValues, which is what the file-import path needs', async () => {
    // AddImportDialog parses a .json schema and calls setValues with whatever it contains.
    const el = await host();
    el.form.setValues({ schemaName: 'imported', nsfPath: 'demo.nsf' });
    expect(el.form.values.schemaName).toBe('imported');
    expect(el.form.values.description).toBe('');
    expect(el.form.values.dqlFormula).toEqual({ formulaType: 'domino', formula: '@True' });
  });

  it('validates against a schema whose rules close over data outside the form', async () => {
    // The "unique schema name" rule reads the databases slice and another field's value. This
    // is the demand that would break a validator taking only `values`.
    let nsfPath = 'demo.nsf';
    const el = await mountLit<FormHost>('test-form-host');
    const form = new FormController<SchemaForm>(el, {
      initialValues: { ...INITIAL, schemaName: 'taken', description: 'ok' },
      onSubmit: () => {},
      schema: schemaFor(['demo.nsf:taken'], () => nsfPath),
    });

    await form.submit();
    expect(form.errors.schemaName).toContain('already exists');

    // change the *other* field and the same value becomes valid
    nsfPath = 'other.nsf';
    await form.submit();
    expect(form.errors.schemaName).toBeUndefined();
  });

  it('keys errors by field name and reports every failure at once', async () => {
    const el = await mountLit<FormHost>('test-form-host');
    const form = new FormController<SchemaForm>(el, {
      initialValues: INITIAL,
      onSubmit: () => {},
      schema: schemaFor([], () => ''),
    });
    await form.submit();
    expect(Object.keys(form.errors).sort()).toEqual(['description', 'schemaName']);
  });

  it('does not call onSubmit when validation fails', async () => {
    const onSubmit = vi.fn();
    const el = await mountLit<FormHost>('test-form-host');
    const form = new FormController<SchemaForm>(el, {
      initialValues: INITIAL,
      onSubmit,
      schema: schemaFor([], () => ''),
    });
    await form.submit();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(form.submitted).toBe(true);
  });

  it('clears a field error as soon as that field is edited', async () => {
    // What replaces Formik's validateOnChange for the error a user is fixing.
    const el = await mountLit<FormHost>('test-form-host');
    const form = new FormController<SchemaForm>(el, {
      initialValues: INITIAL,
      onSubmit: () => {},
      schema: schemaFor([], () => ''),
    });
    await form.submit();
    expect(form.errors.schemaName).toBeDefined();
    form.setValue('schemaName', 'abc');
    expect(form.errors.schemaName).toBeUndefined();
    expect(form.errors.description).toBeDefined();
  });

  it('resets values, errors and submitted together', async () => {
    // Three of the five call resetForm() from a thunk callback after a successful save.
    const el = await mountLit<FormHost>('test-form-host');
    const form = new FormController<SchemaForm>(el, {
      initialValues: INITIAL,
      onSubmit: () => {},
      schema: schemaFor([], () => ''),
    });
    form.setValue('schemaName', 'x');
    await form.submit();
    form.reset();
    expect(form.values).toEqual(INITIAL);
    expect(form.errors).toEqual({});
    expect(form.submitted).toBe(false);
  });

  it('asks the host to re-render on every mutation', async () => {
    const el = await host();
    await el.updateComplete;
    const before = el.renders;
    el.form.setValue('schemaName', 'a');
    await el.updateComplete;
    el.form.setValues({ description: 'b' });
    await el.updateComplete;
    el.form.reset();
    await el.updateComplete;
    expect(el.renders).toBeGreaterThan(before);
  });

  it('a double-clicked save is one write, not two', async () => {
    // Was the gap this file recorded, fixed in #887: peak concurrency was 2, so every one of the
    // five form owners turned a double click into two dispatches of a mutating thunk -- two
    // *creates* for addSchema and addApplication. `submitting` was never the caller's defence,
    // because the second click can land before the re-render that would disable the button.
    let running = 0;
    let peak = 0;
    let calls = 0;
    const el = await mountLit<FormHost>('test-form-host');
    const form = new FormController<SchemaForm>(el, {
      initialValues: INITIAL,
      onSubmit: async () => {
        calls += 1;
        running += 1;
        peak = Math.max(peak, running);
        await Promise.resolve();
        running -= 1;
      },
    });
    await Promise.all([form.submit(), form.submit()]);
    expect(peak).toBe(1);
    expect(calls).toBe(1);
  });

  // ---- gaps, recorded rather than worked around -------------------------------------------

  it('GAP: has no per-field touched, so errors can only appear after a submit', async () => {
    const el = await mountLit<FormHost>('test-form-host');
    const form = new FormController<SchemaForm>(el, {
      initialValues: INITIAL,
      onSubmit: () => {},
      schema: schemaFor([], () => ''),
    });
    // Formik's `!!errors.x && touched.x` guard exists because errors are computed eagerly and
    // must be hidden until the user has been near the field. Here they are computed *at
    // submit*, so the guard collapses to `errors.x` — but it also means a converted form shows
    // nothing until the first submit attempt, where Formik showed it on blur.
    expect(form.errors).toEqual({});
    expect('touched' in form).toBe(false);
    await form.submit();
    expect(Object.keys(form.errors).length).toBeGreaterThan(0);
  });

  it('GAP: no handleChange, so each field needs its own listener', async () => {
    // Formik hands one `handleChange` to every input and reads `name`. Converted forms wire
    // `@input=${(e) => form.setValue('field', e.target.value)}` per field, which is more code
    // but removes the name-string indirection.
    const el = await host();
    expect('handleChange' in el.form).toBe(false);
    expect(typeof el.form.setValue).toBe('function');
  });

});
