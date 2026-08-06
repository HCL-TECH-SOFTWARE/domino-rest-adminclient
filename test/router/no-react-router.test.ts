/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const rel = (file: string) => file.slice(ROOT.length + 1).replace(/\\/g, '/');

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

/** An import from either package — `react-router-dom` re-exports `react-router`. */
const ROUTER_IMPORT = /\bfrom\s+['"]react-router(-dom)?['"]/;

const packageJson = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));

/**
 * G1 for #716: the app has its own router and the dependency is gone.
 *
 * This is a security gate, not a style one. There is **no forward fix in the 7.x line** for
 * the advisory `react-router-dom` carried — 7.18.1 is the newest published, the first
 * non-vulnerable release is `react-router@8.3.0`, and `react-router-dom` has no 8.x — so a
 * reintroduction cannot be resolved by a version bump. It has to be caught at the import.
 *
 * `npm audit` reported 2 high-severity findings before this removal and 0 after; a
 * dependency added back by a future PR would silently restore both, and `npm audit` is not
 * something the test suite runs.
 */
describe('react-router is gone (#716 G1)', () => {
  it('is imported by nothing in src/ or test/', () => {
    const offenders = SOURCES.filter((file) => ROUTER_IMPORT.test(read(file)));
    expect(offenders).toEqual([]);
  });

  it('is not a declared dependency', () => {
    const declared = { ...packageJson.dependencies, ...packageJson.devDependencies };
    expect(Object.keys(declared).filter((name) => name.startsWith('react-router'))).toEqual([]);
  });

  it('is not in the lockfile, so it is not a transitive dependency either', () => {
    const lock = JSON.parse(readFileSync(resolve(ROOT, 'package-lock.json'), 'utf8'));
    const installed = Object.keys(lock.packages ?? {}).filter((path) =>
      /(^|\/)node_modules\/react-router(-dom)?$/.test(path)
    );
    expect(installed).toEqual([]);
  });

  /** The replacement has to actually be in place, or the assertions above pass vacuously. */
  it('has been replaced by the in-repo router', () => {
    expect(SOURCES).toContain('src/router/router.ts');
    expect(SOURCES.filter((f) => ROUTER_IMPORT.test(read(f).replace(/router\/react/g, '')))).toEqual(
      []
    );
  });
});
