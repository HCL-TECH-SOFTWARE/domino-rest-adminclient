/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { combineReducers } from '@reduxjs/toolkit';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * #994 — the store reaches Redux through one door: `@reduxjs/toolkit`.
 *
 * ## This is not a removal gate, and that is the whole point
 *
 * The five siblings this follows in shape — `react-removed`, `no-css-in-js`,
 * `no-events-polyfill`, `no-react-router`, `mui-removed` — all say "this package is gone".
 * This one says the opposite: **Redux is present, required, and running the store.** What
 * changed in #994 is only which specifier reaches it. `@reduxjs/toolkit`'s `dist/index.d.ts`
 * opens with `export * from 'redux'`, so `Dispatch`, `AnyAction`, `UnknownAction` and
 * `combineReducers` are all reachable from the package the store already depends on, and 20
 * import statements across 19 files were reaching past it to name `redux` directly.
 *
 * So the assertion below about the lockfile is **inverted** relative to its siblings: they
 * assert the package is not installed, this asserts that it still is. Dropping the direct
 * declaration is not a bundle win and must not be read as one — nothing was uninstalled, and
 * `node_modules/redux` is byte-identical before and after. What improves is that there is one
 * documented way to reach these types, instead of two files importing the same three names
 * from two packages.
 *
 * ## Why a guard at all
 *
 * Nothing fails when this regresses. `import { Dispatch } from 'redux'` resolves, compiles,
 * lints and runs exactly as well as the `@reduxjs/toolkit` spelling, because it is the same
 * module — npm keeps the transitive copy at the tree root. The split is invisible until
 * someone bumps one of the two and wonders why the types disagree.
 *
 * ## Scanning import forms, with comments stripped
 *
 * The repo documents its own migration in prose, and this docblock is the proof: it names
 * `redux` a dozen times. A raw substring scan would make writing that history a test failure.
 * Comment lines are dropped and only import and `require` *forms* are matched — the same rule
 * `no-css-in-js.test.ts` and `react-removed.test.ts` follow.
 *
 * ## `AnyAction` is not banned here
 *
 * Redux 5 deprecates it for `UnknownAction`, and #994 moved the tree's one use — the fourth
 * type argument of `getCurrentIdpLogin`'s `ThunkAction` in `store/account/action.ts`. Banning
 * the name would be a rule about a symbol this repo no longer writes, enforced by a scan that
 * cannot tell a type argument from the word in a sentence. `store/index.ts` already types
 * `AppDispatch` with `UnknownAction`, which is the statement that matters, and it is checked
 * by `typed-dispatch.test.ts`.
 */

const ROOT = resolve(process.cwd());

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const SOURCES = ['src', 'test']
  .flatMap((dir) => walk(resolve(ROOT, dir)))
  .filter((file) => /\.tsx?$/.test(file))
  .map((file) => file.slice(ROOT.length + 1));

/** Comment lines stripped, so the prose above is not itself a hit. */
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

/** `redux` itself, and any subpath of it. Not `redux-thunk`, which is a different package. */
const DIRECT = /^redux(\/|$)/;

const packageJson = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const lock = JSON.parse(readFileSync(resolve(ROOT, 'package-lock.json'), 'utf8')) as {
  packages?: Record<string, { version?: string; dependencies?: Record<string, string> }>;
};

describe('the store imports Redux through @reduxjs/toolkit (#994)', () => {
  it('can see the imports it is scanning for', () => {
    // Anti-vacuity. Two of the three cases below expect an empty result, so a scanner that
    // stopped matching anything would make them pass. This names packages the tree certainly
    // does import, in the two shapes that matter — a `from` and a bare specifier.
    const all = SOURCES.flatMap((file) => importsOf(read(file)));
    expect(all.some((spec) => spec === '@reduxjs/toolkit')).toBe(true);
    expect(all.some((spec) => spec === 'lit')).toBe(true);
    expect(SOURCES.length).toBeGreaterThan(100);
  });

  it('is imported directly by nothing in src/ or test/', () => {
    const offenders = SOURCES.flatMap((file) =>
      importsOf(read(file))
        .filter((spec) => DIRECT.test(spec))
        .map((spec) => `${file}: ${spec}`),
    );

    expect(
      offenders,
      `these import redux directly: ${offenders.join(', ')}\n\n` +
        'Every symbol redux exports is re-exported by @reduxjs/toolkit, which the store ' +
        'already depends on. Import Dispatch, UnknownAction and combineReducers from there.',
    ).toEqual([]);
  });

  it('is not a declared dependency', () => {
    // The import scan passes on its own while the declaration stays, and a declaration is
    // what lets the direct spelling resolve on a fresh clone without anyone noticing.
    const declared = [
      ...Object.keys(packageJson.dependencies ?? {}),
      ...Object.keys(packageJson.devDependencies ?? {}),
    ];

    expect(declared).not.toContain('redux');
  });

  it('is still installed, transitively through @reduxjs/toolkit', () => {
    // Inverted on purpose — see the docblock. #994 removed a declaration, not a package, and
    // this is what stops the change being read as a bundle win. It is also the real risk in
    // the other direction: with no direct declaration left, RTK is the only thing keeping
    // redux in the tree, and 19 files now take their types from it.
    expect(lock.packages?.['node_modules/redux']?.version).toBeDefined();
    expect(lock.packages?.['node_modules/@reduxjs/toolkit']?.dependencies).toHaveProperty(
      'redux',
    );
  });

  it('really re-exports the value the store moved, not just its type', () => {
    // `combineReducers` is the one runtime import of the four symbols #994 repointed; the
    // rest are types and vanish at build time. `tsc -b` would catch a missing type export,
    // but only a runtime check catches a declaration that promises a value the bundle does
    // not carry — which is the failure mode of a re-export chain.
    expect(typeof combineReducers).toBe('function');
  });
});
