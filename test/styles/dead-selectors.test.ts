/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * `styles.css` may not carry a class rule nothing applies.
 *
 * The sheet accumulated 28 of them. Five were orphaned by the People/Groups removal
 * (#770), three by rewrites on this branch — the contents trees, and the mobile header
 * whose hamburger `wa-page` now owns. The other twenty were already dead before the
 * migration began; `.schema-card-schema-name` and `.scope-card-acl-edited` still sat under
 * `SchemaCardV2.tsx` and `ScopeCardV2.tsx` headings for components that no longer exist.
 *
 * Nothing catches this on its own. CSS has no compiler, the bundler keeps every rule it is
 * handed, and review sees a plausible-looking selector under a plausible-looking heading.
 * The cost is not the bytes — it is that a dead rule is indistinguishable from a live one,
 * so the next person styling a screen matches or duplicates a name that controls nothing.
 * That will keep happening: #709, #717, #718 and #771 each delete more screens.
 *
 * Scope is deliberately this one sheet. It is the hand-written component-class sheet, so
 * every name in it should appear in source. `dark-mode.css` is mostly `.Mui*-root`
 * overrides — names MUI generates at runtime and no source file ever spells — and would
 * need an allowlist longer than the check.
 */

const ROOT = resolve(process.cwd());

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const SELF = 'test/styles/dead-selectors.test.ts';

/**
 * Source is searched as raw text rather than parsed. A class reaches an element through
 * `className`, a template literal, `classList.add`, a Lit template or a `styled` block, and
 * a parser tuned to one of those would miss the rest. Substring matching over-accepts, and
 * that is the safe direction: a false pass leaves a dead rule, a false failure sends
 * someone deleting a live one.
 */
const SOURCE = ['src', 'test']
  .flatMap((dir) => walk(resolve(ROOT, dir)))
  .filter((file) => /\.(tsx?|html)$/.test(file) && !file.endsWith(SELF))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

/** Top-level class rules — `.foo {` at column 0. */
const selectors = (css: string) =>
  [...css.matchAll(/^\.([a-zA-Z][a-zA-Z0-9_-]*)\s*\{/gm)].map((match) => match[1]);

describe('styles.css carries no rule nothing applies', () => {
  const css = readFileSync(resolve(ROOT, 'src/styles/styles.css'), 'utf8');

  it('finds the sheet and the source to check it against', () => {
    // A bad path would make every assertion below vacuously pass.
    expect(selectors(css).length).toBeGreaterThan(200);
    expect(SOURCE.length).toBeGreaterThan(100_000);
  });

  it('applies every class it defines', () => {
    const dead = [...new Set(selectors(css))].filter((name) => !SOURCE.includes(name));
    expect(
      dead,
      `styles.css defines ${dead.length} class(es) no source applies: ${dead.join(', ')}.\n` +
        'Delete the rule. If the class is genuinely applied somewhere this scan cannot see ' +
        '— a framework that generates it at runtime, say — add it here with the reason.',
    ).toEqual([]);
  });
});
