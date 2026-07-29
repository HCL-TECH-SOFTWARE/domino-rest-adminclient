/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { entryClosure } from '../scripts/bundle-budget.mjs';

/**
 * #813 — the walk behind the bundle budget gate.
 *
 * The gate's whole value rests on one distinction: `imports` is static and counts,
 * `dynamicImports` is lazy and does not. Get that backwards and the number becomes total
 * `dist` size, which *rises* when a split succeeds — so the gate would punish exactly the
 * work it exists to encourage, while a real regression on the critical path hid inside a
 * 15 MB total.
 *
 * That is not visible from a passing build, and reproducing it end to end costs a full
 * `vite build`. A synthetic manifest pins it in milliseconds.
 */

describe('entryClosure', () => {
  it('follows static imports transitively and collects css', () => {
    const manifest = {
      'index.html': { file: 'entry.js', isEntry: true, imports: ['a.ts'], css: ['entry.css'] },
      'a.ts': { file: 'a.js', imports: ['b.ts'], css: ['a.css'] },
      'b.ts': { file: 'b.js' },
    };

    expect(entryClosure(manifest)).toEqual(['a.css', 'a.js', 'b.js', 'entry.css', 'entry.js']);
  });

  it('never follows dynamicImports', () => {
    const manifest = {
      'index.html': {
        file: 'entry.js',
        isEntry: true,
        imports: ['eager.ts'],
        dynamicImports: ['monaco.ts'],
      },
      'eager.ts': { file: 'eager.js' },
      // Reachable only lazily, and importing something huge of its own — if the walk ever
      // follows dynamicImports, both land in the budget.
      'monaco.ts': { file: 'monaco.js', imports: ['worker.ts'] },
      'worker.ts': { file: 'worker.js' },
    };

    const files = entryClosure(manifest);

    expect(files).toEqual(['eager.js', 'entry.js']);
    expect(files).not.toContain('monaco.js');
    expect(files).not.toContain('worker.js');
  });

  it('counts a chunk shared by two importers once', () => {
    const manifest = {
      'index.html': { file: 'entry.js', isEntry: true, imports: ['a.ts', 'b.ts'] },
      'a.ts': { file: 'a.js', imports: ['shared.ts'] },
      'b.ts': { file: 'b.js', imports: ['shared.ts'] },
      'shared.ts': { file: 'shared.js' },
    };

    expect(entryClosure(manifest)).toEqual(['a.js', 'b.js', 'entry.js', 'shared.js']);
  });

  it('includes every entry when there is more than one', () => {
    const manifest = {
      'index.html': { file: 'main.js', isEntry: true },
      'admin.html': { file: 'admin.js', isEntry: true },
      'lazy.ts': { file: 'lazy.js' },
    };

    expect(entryClosure(manifest)).toEqual(['admin.js', 'main.js']);
  });

  it('terminates on a circular import graph', () => {
    const manifest = {
      'index.html': { file: 'entry.js', isEntry: true, imports: ['a.ts'] },
      'a.ts': { file: 'a.js', imports: ['b.ts'] },
      'b.ts': { file: 'b.js', imports: ['a.ts'] },
    };

    expect(entryClosure(manifest)).toEqual(['a.js', 'b.js', 'entry.js']);
  });

  it('skips an import with no manifest entry rather than throwing', () => {
    // Defensive: a Vite change that names a chunk it does not describe should not turn
    // this gate into a build failure with a stack trace.
    const manifest = {
      'index.html': { file: 'entry.js', isEntry: true, imports: ['missing.ts'] },
    };

    expect(() => entryClosure(manifest)).not.toThrow();
    expect(entryClosure(manifest)).toEqual(['entry.js']);
  });

  it('returns nothing when no chunk is marked as an entry', () => {
    // main() turns this into a non-zero exit rather than reporting a budget of 0.
    expect(entryClosure({ 'a.ts': { file: 'a.js' } })).toEqual([]);
  });
});
