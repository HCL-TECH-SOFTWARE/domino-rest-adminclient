/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Material UI is gone, and does not come back (#709).
 *
 * ## What this replaces
 *
 * This file was `dead-theme-overrides.test.ts`, which asserted that `theme.ts` carried no
 * `components` override for a component nothing imports. That guard did its job: it named
 * `MuiTooltip`, `MuiBadge`, `MuiDialogTitle`, `MuiInputBase` and `MuiFormLabel` when it was
 * written, then `MuiPaper` in #806 wave 5, `MuiButton`/`MuiCircularProgress`/`MuiTab` in wave
 * 6, `MuiBreadcrumbs` in #877, and `MuiSwitch` in wave 7 — the last one, which left the map
 * empty.
 *
 * Its subject no longer exists. `theme.ts` is deleted, so a test that reads it can only fail
 * on the file being absent, and reshaping it a third time to scan something else would keep a
 * name that describes a file nobody has. What that guard was really protecting — theming that
 * outlives the components it themes — is subsumed by the stronger statement below: an
 * override for an unimported component is impossible when the framework is not installed.
 *
 * ## Why this form of the assertion
 *
 * The rule from two waves of this migration is that a check which counts the thing being
 * removed is a countdown, not a guard: it passes while the work is unfinished and fails at
 * the moment it succeeds. `keep-login-page.test.ts` carried two of those — "exactly one
 * CssBaseline mount" and "theme.ts has a single importer" — and both are folded in here as
 * the zero they were counting down to. Zero is a fixed point; it needs no further edits, and
 * it is the only value at which "MUI is gone" is true.
 *
 * ## Scanning imports rather than the raw string
 *
 * Several files still *describe* the framework in prose, and one names a package literally:
 * `keep-input-date.ts` records which date picker it replaced. A raw substring scan would make
 * documenting the migration a test failure, which is the wrong incentive. So the patterns
 * below match import and require *forms* only.
 */

const ROOT = resolve(process.cwd());
const SELF = join('test', 'styles', 'mui-removed.test.ts');

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const sources = walk(resolve(ROOT, 'src'))
  .filter((f) => /\.(ts|tsx)$/.test(f))
  .map((f) => ({ file: f.slice(ROOT.length + 1), text: readFileSync(f, 'utf8') }));

/**
 * Every package a file pulls in: `from '<x>'`, a bare side-effect `import '<x>'`, a dynamic
 * `import('<x>')` and `require('<x>')`. Prose mentioning a package name does not match any of
 * them.
 */
const importsOf = (text: string): string[] => [
  ...[...text.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map((m) => m[1]),
  ...[...text.matchAll(/\bimport\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]),
  ...[...text.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]),
];

const GONE = [/^@mui\//, /^@emotion\//];

const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe('the Material UI theme layer is gone (#709)', () => {
  it('can see the imports it is scanning for', () => {
    // Anti-vacuity, and not a floor: the three cases below all assert an empty result, so a
    // regex that stopped matching anything would make every one of them pass. This names a
    // package the app certainly does import, in the two shapes that matter — a `from` and a
    // bare side-effect import — so a broken pattern fails here instead of hiding there.
    const all = sources.flatMap(({ text }) => importsOf(text));
    expect(all.some((spec) => spec.startsWith('@awesome.me/webawesome'))).toBe(true);
    expect(all.some((spec) => spec === 'lit')).toBe(true);
    expect(sources.length).toBeGreaterThan(100);
  });

  it('has no theme module left to import', () => {
    // `theme.ts` built a palette for `createTheme()` and nothing else; its `components` map
    // was empty by the time it went. `AppShell.tsx` was its only importer.
    expect(existsSync(resolve(ROOT, 'src/theme.ts'))).toBe(false);
  });

  it('imports neither the framework nor its style engine anywhere in src', () => {
    // Emotion was never imported directly — it was carried as a peer of the framework — so
    // the two are checked together and go together.
    const offenders = sources
      .flatMap(({ file, text }) => importsOf(text).map((spec) => ({ file, spec })))
      .filter(({ spec }) => GONE.some((pattern) => pattern.test(spec)))
      .map(({ file, spec }) => `${file}: ${spec}`);

    expect(offenders, `these still import a removed package: ${offenders.join(', ')}`).toEqual(
      [],
    );
  });

  it('depends on neither in package.json', () => {
    // The import scan above passes on its own the moment the last import goes; the packages
    // stay installed, and the next person adding a component finds them resolvable. This is
    // the half that makes the removal stick.
    const declared = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    const offenders = declared.filter((name) => GONE.some((pattern) => pattern.test(name)));
    expect(offenders, `still declared: ${offenders.join(', ')}`).toEqual([]);
  });

  it('mounts no global baseline component and no theme provider', () => {
    // The two app-wide ratchets that used to live in `keep-login-page.test.ts`, at the zero
    // they were counting down to. #743 removed the pair in `App.tsx`; #709 removed the pair
    // in `AppShell.tsx`, which was the last one.
    //
    // The document baseline is not lost with it: Web Awesome's `native.css` states the same
    // box-sizing reset and the same zeroed margins, and only ever lost to the copy on top
    // because Emotion injects unlayered and last while `native.css` sits in `@layer
    // wa-native`.
    const strip = (text: string) =>
      text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
    const offenders = sources
      .filter(({ file }) => !file.endsWith(SELF))
      .filter(({ text }) => /<(CssBaseline|ThemeProvider)[\s/>]/.test(strip(text)))
      .map(({ file }) => file);

    expect(offenders, `mounted in: ${offenders.join(', ')}`).toEqual([]);
  });
});
