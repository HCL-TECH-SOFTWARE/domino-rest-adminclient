/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { deepEqual, isFieldEqual, isFormulaEqual, isKeyEqual } from '../../../src/components/access/mode-diff';

/**
 * #827 — `ModeCompare` compares more than two modes, and two of its three predicates
 * stopped after the first.
 *
 * `showRemove` flips on at `selectedModeNames.length > 2` and the dialog offers a mode
 * selector per column, so three-way and four-way comparison is a supported thing to do.
 * `isFieldEqual` and `isFormulaEqual` both carried their `return` **inside** the loop, so
 * they exited on iteration 1 having compared mode 1 against mode 2 and nothing else.
 * Every difference in modes 3+ was therefore reported as "no difference" — the field
 * rendered unhighlighted, the formula was left out of `diffFormulas`.
 *
 * `isKeyEqual` never had the bug, which is what makes it the reference: it assigns and
 * continues rather than returning. It is tested here too, so the three stay in step.
 *
 * The two-mode cases are the regression net for the extraction — they are what the
 * component did before, and they must not move.
 */

/** A mode's field list is looked up by `name`; only the keys under test need to differ. */
const field = (name: string, extra: Record<string, unknown> = {}) => ({ name, type: 'string', ...extra });

const mode = (modeName: string, fields: Array<unknown>, formulas: Record<string, unknown> = {}) =>
  ({ modeName, fields, ...formulas }) as any;

describe('deepEqual', () => {
  it('accepts identical primitives and rejects different ones', () => {
    expect(deepEqual('a', 'a')).toBe(true);
    expect(deepEqual('a', 'b')).toBe(false);
    expect(deepEqual(1, '1')).toBe(false);
  });

  it('rejects when one side is null', () => {
    expect(deepEqual(null, {})).toBe(false);
    expect(deepEqual({}, null)).toBe(false);
    expect(deepEqual(null, null)).toBe(true);
  });

  it('compares by key count, so an extra key is a difference', () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it('recurses into nested objects and arrays', () => {
    expect(deepEqual({ a: { b: [1, 2] } }, { a: { b: [1, 2] } })).toBe(true);
    expect(deepEqual({ a: { b: [1, 2] } }, { a: { b: [1, 3] } })).toBe(false);
  });
});

describe('isFieldEqual', () => {
  const compare = (modes: Array<any>, names: Array<string>) => isFieldEqual(modes, names, 'subject');

  it('accepts a field identical in two modes', () => {
    const modes = [mode('A', [field('subject')]), mode('B', [field('subject')])];
    expect(compare(modes, ['A', 'B'])).toBe(true);
  });

  it('rejects a field that differs between two modes', () => {
    const modes = [mode('A', [field('subject', { type: 'string' })]), mode('B', [field('subject', { type: 'number' })])];
    expect(compare(modes, ['A', 'B'])).toBe(false);
  });

  // The bug. Modes 1 and 2 agree, so the old code returned true on iteration 1 and never
  // looked at mode 3 — where the field actually differs.
  it('sees a difference in the third mode', () => {
    const modes = [
      mode('A', [field('subject', { type: 'string' })]),
      mode('B', [field('subject', { type: 'string' })]),
      mode('C', [field('subject', { type: 'number' })]),
    ];
    expect(compare(modes, ['A', 'B', 'C'])).toBe(false);
  });

  it('sees a difference in the fourth mode', () => {
    const modes = [
      mode('A', [field('subject')]),
      mode('B', [field('subject')]),
      mode('C', [field('subject')]),
      mode('D', [field('subject', { fieldAccess: 'RW' })]),
    ];
    expect(compare(modes, ['A', 'B', 'C', 'D'])).toBe(false);
  });

  it('still accepts a field identical across four modes', () => {
    const modes = ['A', 'B', 'C', 'D'].map((n) => mode(n, [field('subject')]));
    expect(compare(modes, ['A', 'B', 'C', 'D'])).toBe(true);
  });

  it('rejects when a later mode does not carry the field at all', () => {
    const modes = [
      mode('A', [field('subject')]),
      mode('B', [field('subject')]),
      mode('C', [field('other')]),
    ];
    expect(compare(modes, ['A', 'B', 'C'])).toBe(false);
  });

  it('rejects an empty column, which is a mode the user has not chosen yet', () => {
    const modes = [mode('A', [field('subject')]), mode('B', [field('subject')])];
    expect(compare(modes, ['A', 'B', ''])).toBe(false);
  });
});

describe('isFormulaEqual', () => {
  const compare = (modes: Array<any>, names: Array<string>) => isFormulaEqual(modes, names, 'onLoad');

  it('accepts a formula identical in two modes', () => {
    const modes = [mode('A', [], { onLoad: '@All' }), mode('B', [], { onLoad: '@All' })];
    expect(compare(modes, ['A', 'B'])).toBe(true);
  });

  it('rejects a formula that differs between two modes', () => {
    const modes = [mode('A', [], { onLoad: '@All' }), mode('B', [], { onLoad: '@None' })];
    expect(compare(modes, ['A', 'B'])).toBe(false);
  });

  // The case #827 was filed for.
  it('sees a difference in the third mode', () => {
    const modes = [
      mode('A', [], { onLoad: '@All' }),
      mode('B', [], { onLoad: '@All' }),
      mode('C', [], { onLoad: '@None' }),
    ];
    expect(compare(modes, ['A', 'B', 'C'])).toBe(false);
  });

  it('still accepts a formula identical across four modes', () => {
    const modes = ['A', 'B', 'C', 'D'].map((n) => mode(n, [], { onLoad: '@All' }));
    expect(compare(modes, ['A', 'B', 'C', 'D'])).toBe(true);
  });

  /**
   * `JSON.parse(JSON.stringify(undefined))` throws `SyntaxError: "undefined" is not valid
   * JSON`. That was always true here, but a mode missing a formula had to be the *second*
   * selected one to be reached while the function returned on iteration 1 — so fixing the
   * loop is what would have made the crash reachable. Hence `roundTrip`.
   */
  it('treats a formula missing from a later mode as a difference rather than throwing', () => {
    const modes = [
      mode('A', [], { onLoad: '@All' }),
      mode('B', [], { onLoad: '@All' }),
      mode('C', [], {}),
    ];
    expect(compare(modes, ['A', 'B', 'C'])).toBe(false);
  });

  it('treats a formula missing from every mode as no difference', () => {
    const modes = [mode('A', [], {}), mode('B', [], {}), mode('C', [], {})];
    expect(compare(modes, ['A', 'B', 'C'])).toBe(true);
  });

  it('does not throw when the base mode is the one missing the formula', () => {
    const modes = [mode('A', [], {}), mode('B', [], { onLoad: '@All' })];
    expect(compare(modes, ['A', 'B'])).toBe(false);
  });

  it('rejects an empty column', () => {
    const modes = [mode('A', [], { onLoad: '@All' }), mode('B', [], { onLoad: '@All' })];
    expect(compare(modes, ['A', 'B', ''])).toBe(false);
  });
});

describe('isKeyEqual', () => {
  const compare = (modes: Array<any>, names: Array<string>) => isKeyEqual(modes, names, 'subject', 'type');

  it('accepts a key with the same value in every mode', () => {
    const modes = ['A', 'B', 'C'].map((n) => mode(n, [field('subject', { type: 'string' })]));
    expect(compare(modes, ['A', 'B', 'C'])).toBe(true);
  });

  // Already correct before #827 — this is the behaviour the other two now match.
  it('sees a difference in the third mode', () => {
    const modes = [
      mode('A', [field('subject', { type: 'string' })]),
      mode('B', [field('subject', { type: 'string' })]),
      mode('C', [field('subject', { type: 'number' })]),
    ];
    expect(compare(modes, ['A', 'B', 'C'])).toBe(false);
  });

  it('rejects when the base mode does not carry the field', () => {
    const modes = [mode('A', [field('other')]), mode('B', [field('subject')])];
    expect(compare(modes, ['A', 'B'])).toBe(false);
  });

  it('rejects when the base field does not carry the key', () => {
    const modes = [mode('A', [{ name: 'subject' }]), mode('B', [field('subject')])];
    expect(compare(modes, ['A', 'B'])).toBe(false);
  });

  it('rejects when a later mode does not carry the field', () => {
    const modes = [mode('A', [field('subject')]), mode('B', [field('other')])];
    expect(compare(modes, ['A', 'B'])).toBe(false);
  });
});
