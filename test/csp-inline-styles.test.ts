/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * #685 — no `style` attributes in source, because the shipped CSP blocks them.
 *
 * `jar/config/config.json` sends **`style-src-attr 'none'`** on both SPA entries. Measured
 * in Chrome against exactly that policy, with the real components:
 *
 * | How the style gets there | Applies? |
 * |---|---|
 * | `element.setAttribute('style', …)` | **no** |
 * | Lit **interpolated** `style="${…}"` — an `AttributePart`, i.e. `setAttribute` | **no** |
 * | Lit **static** `style="…"` — cloned with the template, never re-parsed | yes |
 * | `element.style.setProperty(…)` — the CSSOM | yes |
 *
 * That split is why this survived so long. The static attributes worked, so the pattern
 * looked fine; the interpolated ones silently did not, and a blocked style attribute is
 * invisible — it sits in the DOM, inspects correctly, and simply has no effect. Three sites
 * were live defects: `keep-default-card`'s status dot rendered with no colour, its ACL
 * label with no colour, and `keep-autocomplete`'s caret never rotated.
 *
 * The guard covers the static ones too. They work today only by virtue of being cloned
 * rather than set, and are one interpolation away from breaking the same silent way — and
 * a rule of "no style attributes" is enforceable where "no *interpolated* style attributes"
 * is not.
 *
 * `styleMap` is not an escape hatch: its first render returns a string that Lit sets as an
 * attribute, and only subsequent updates go through `style.setProperty`.
 */

const ROOT = resolve(process.cwd());

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

/**
 * `.ts`/`.tsx` only. The `.svg` assets under `src` also carry `style` attributes, but they
 * are served as their own documents under the `/admin/*` policy, which has no
 * `style-src-attr` directive — and they are generated artwork, not hand-maintained source.
 */
const SOURCES = walk(resolve(ROOT, 'src'))
  .filter((f) => /\.tsx?$/.test(f))
  .map((f) => ({ file: f.slice(ROOT.length + 1), text: readFileSync(f, 'utf8') }));

const read = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

/** Comments stripped, so the notes explaining this rule are not read as violations of it. */
const code = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('no CSP-blocked inline styles (#685)', () => {
  it('finds source files to scan', () => {
    expect(SOURCES.length).toBeGreaterThan(100);
  });

  it('has no style attribute anywhere in src', () => {
    const found = SOURCES.filter(({ text }) => /\sstyle="/.test(code(text))).map(({ file }) => file);
    expect(found, `style attributes are back in: ${found.join(', ')}`).toEqual([]);
  });

  it('sets no style attribute imperatively either', () => {
    // The other half of the same rule: `setAttribute('style', …)` is blocked identically.
    const found = SOURCES.filter(({ text }) => /setAttribute\(\s*['"]style['"]/.test(code(text))).map(
      ({ file }) => file,
    );
    expect(found, `setAttribute('style') in: ${found.join(', ')}`).toEqual([]);
  });

  it('does not reach for styleMap as a workaround', () => {
    // It looks like the CSSOM route but is not, on first render. If a future change needs
    // dynamic values, use a class, or `style.setProperty` in `updated()`.
    const found = SOURCES.filter(({ text }) => /styleMap/.test(code(text))).map(({ file }) => file);
    expect(found, `styleMap does not survive style-src-attr 'none': ${found.join(', ')}`).toEqual(
      [],
    );
  });

  it('still forbids style attributes in the shipped policy', () => {
    // If someone relaxes the directive instead of fixing a call site, this guard would
    // otherwise keep passing while the reason for it quietly disappeared.
    const config = read('jar/config/config.json');
    const spa = [...config.matchAll(/"csp"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
    const guarded = spa.filter((csp) => /style-src-attr\s+'none'/.test(csp));
    expect(guarded.length, 'no entry sends style-src-attr \'none\' any more').toBeGreaterThan(0);
  });
});
