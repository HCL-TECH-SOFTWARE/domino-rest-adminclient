/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

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
