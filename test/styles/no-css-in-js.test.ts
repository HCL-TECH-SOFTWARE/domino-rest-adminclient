/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * #825 — the CSS-in-JS layer is gone: `@linaria/react` and its build half `@wyw-in-js/vite`.
 *
 * ## Why it needs a guard rather than trusting the build
 *
 * Nothing fails when this regresses. `@linaria/react` is a React component factory, so a
 * reintroduced `styled.div` type-checks, lints and renders; it just silently re-opens a
 * styling system the tree no longer uses. And without the `wyw` plugin the tagged template
 * never gets extracted at all — the component renders **unstyled**, with no error. A build
 * that works and a build that quietly drops styling look the same from CI.
 *
 * ## Why the package is asserted, not just the import
 *
 * The import scan passes on its own the moment the last import goes, while the package
 * stays installed and resolvable for the next person reaching for it. The declaration and
 * lockfile checks are the half that makes the removal stick — matching
 * `test/utils/no-events-polyfill.test.ts` (#826), which is the pattern this follows.
 *
 * ## Why `wyw` is checked in the configs too
 *
 * `@wyw-in-js/vite` is the only reason `@linaria/react` ever produced CSS, and it was
 * registered in two places that drift independently: `vite.config.mts` governs the shipped
 * bundle, `vitest.config.ts` governs this suite. Re-adding it to one is how the pair got
 * out of step before (see `decorator-config.test.ts`, which guards the same asymmetry for
 * decorators), so both are named here.
 *
 * Removing it was measured, not assumed: every eager chunk kept its content hash and the
 * built stylesheet compared byte-identical, which is what established that the plugin was
 * transforming 200+ files and emitting nothing.
 *
 * ## Scanning import *forms*, and stripping comments
 *
 * This tree documents the migration in prose. 28 files under `src` say `styled.` in a
 * comment recording what a Lit element replaced ("Was the FormContentContainer styled.div"),
 * and the configs above name `wyw` while explaining its absence. A raw substring scan would
 * make writing that history a test failure, which is the wrong incentive — so comment lines
 * are stripped and only import/require forms are matched.
 *
 * ## Stated as zero
 *
 * Deliberately not a ratchet. A check that counts the thing being removed is a countdown,
 * not a guard: it passes while the work is unfinished and fails at the moment it succeeds.
 * Zero is a fixed point, and it is the only value at which "the CSS-in-JS layer is gone"
 * is true. Same reasoning as `mui-removed.test.ts`.
 */

const ROOT = resolve(process.cwd());

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const rel = (file: string) => file.slice(ROOT.length + 1);

const SOURCES = ['src', 'test']
  .flatMap((dir) => walk(resolve(ROOT, dir)))
  .filter((f) => /\.tsx?$/.test(f))
  .map(rel);

/** Comment lines stripped, so the prose explaining the removal is not itself a hit. */
const read = (file: string) =>
  readFileSync(resolve(ROOT, file), 'utf8')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
    .join('\n');

/** `from '<x>'`, a bare side-effect `import '<x>'`, a dynamic `import('<x>')`, `require('<x>')`. */
const importsOf = (text: string): string[] => [
  ...[...text.matchAll(/\bfrom\s*['"]([^'"]+)['"]/g)].map((m) => m[1]),
  ...[...text.matchAll(/\bimport\s*\(?\s*['"]([^'"]+)['"]/g)].map((m) => m[1]),
  ...[...text.matchAll(/\brequire\s*\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1]),
];

const GONE = [/^@linaria\//, /^@wyw-in-js\//];

const packageJson = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

describe('the CSS-in-JS layer is gone (#825)', () => {
  it('can see the imports it is scanning for', () => {
    // Anti-vacuity, and not a floor: every assertion below expects an empty result, so a
    // regex that stopped matching anything would make all of them pass. This names two
    // packages the tree certainly does import, in the two shapes that matter — a `from`
    // and a bare specifier — so a broken pattern fails here instead of hiding there.
    const all = SOURCES.flatMap((file) => importsOf(read(file)));
    expect(all.some((spec) => spec.startsWith('@awesome.me/webawesome'))).toBe(true);
    expect(all.some((spec) => spec === 'lit')).toBe(true);
    expect(SOURCES.length).toBeGreaterThan(100);
  });

  it('is imported by nothing in src/ or test/', () => {
    const offenders = SOURCES.flatMap((file) =>
      importsOf(read(file))
        .filter((spec) => GONE.some((pattern) => pattern.test(spec)))
        .map((spec) => `${file}: ${spec}`),
    );

    expect(offenders, `these still import a removed package: ${offenders.join(', ')}`).toEqual(
      [],
    );
  });

  it('is not a declared dependency', () => {
    const declared = [
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {}),
    ];
    const offenders = declared.filter((name) => GONE.some((pattern) => pattern.test(name)));

    expect(offenders, `still declared: ${offenders.join(', ')}`).toEqual([]);
  });

  it('is not in the lockfile, so nothing pulls it in transitively either', () => {
    const lock = JSON.parse(readFileSync(resolve(ROOT, 'package-lock.json'), 'utf8')) as {
      packages?: Record<string, unknown>;
    };
    const installed = Object.keys(lock.packages ?? {}).filter((path) =>
      /(^|\/)node_modules\/(@linaria|@wyw-in-js)\//.test(path),
    );

    expect(installed, `still installed: ${installed.join(', ')}`).toEqual([]);
  });

  it('registers no Linaria transform in either config', () => {
    // Both, because they drift independently: vite.config.mts governs the shipped bundle
    // and vitest.config.ts governs this suite, so re-adding the plugin to one would leave
    // the other silently emitting different CSS.
    for (const file of ['vite.config.mts', 'vitest.config.ts']) {
      expect(importsOf(read(file)), `${file} must not register a Linaria transform`).toEqual(
        expect.not.arrayContaining([expect.stringMatching(/^@wyw-in-js\//)]),
      );
    }
  });
});
