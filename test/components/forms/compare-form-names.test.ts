/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { compareFormNames } from '../../../src/components/forms/FormsContainer';

/**
 * P0-5: the caller used to be `allForms.sort((a, b) => a.formName.toLowerCase() > ...)`
 * inside a bare `catch {}`. A single form with no `@name` threw out of the comparator,
 * Array#sort propagated it, and the swallowed error left the whole list in API order —
 * silently. These tests pin the two properties that make the catch unnecessary: it
 * never throws, and it still sorts.
 */
describe('compareFormNames', () => {
  const sorted = (names: (string | undefined)[]) =>
    names.map((formName) => ({ formName })).sort(compareFormNames).map((f) => f.formName);

  it('orders names alphabetically, ignoring case', () => {
    expect(sorted(['delta', 'Alpha', 'charlie', 'Bravo'])).toEqual(['Alpha', 'Bravo', 'charlie', 'delta']);
  });

  it('treats equal names as equal rather than always reordering them', () => {
    // The old comparator returned -1 for equal names, never 0.
    expect(compareFormNames({ formName: 'Same' }, { formName: 'same' })).toBe(0);
  });

  it('sorts a list containing a nameless form instead of throwing', () => {
    expect(() => sorted(['beta', undefined, 'alpha'])).not.toThrow();
    expect(sorted(['beta', undefined, 'alpha'])).toEqual([undefined, 'alpha', 'beta']);
  });

  it('survives a list of nothing but nameless forms', () => {
    expect(() => sorted([undefined, undefined])).not.toThrow();
  });

  it('is antisymmetric', () => {
    expect(compareFormNames({ formName: 'a' }, { formName: 'b' })).toBeLessThan(0);
    expect(compareFormNames({ formName: 'b' }, { formName: 'a' })).toBeGreaterThan(0);
  });
});
