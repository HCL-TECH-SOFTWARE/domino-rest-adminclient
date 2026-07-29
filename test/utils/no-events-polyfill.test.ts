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

/** Either specifier — the bare one resolves to the npm polyfill, the prefixed one to Node. */
const EVENTS_IMPORT = /\bfrom\s+['"](node:)?events['"]|\brequire\(\s*['"](node:)?events['"]\s*\)/;

const packageJson = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'));

/**
 * #826 — `events` was a runtime dependency carried for one nine-line file.
 *
 * Worth a guard rather than trusting the build, because the failure mode is quiet in
 * both directions. Re-adding the package makes `import EventEmitter from 'events'`
 * resolve again and build clean; writing `node:events` instead does not even need the
 * package, because Vite externalises Node builtins for the browser and the module
 * arrives as a stub that throws only when a method is called. Neither shows up as a
 * build failure, and both put a Node shim back into browser code.
 *
 * The replacement is `EventTarget` + `CustomEvent`, which is what every Lit element in
 * this tree already speaks.
 */
describe('the events polyfill is gone (#826)', () => {
  it('is imported by nothing in src/ or test/', () => {
    expect(SOURCES.filter((file) => EVENTS_IMPORT.test(read(file)))).toEqual([]);
  });

  it('is not a declared dependency', () => {
    const declared = { ...packageJson.dependencies, ...packageJson.devDependencies };
    expect(Object.keys(declared)).not.toContain('events');
  });

  it('is not in the lockfile, so nothing pulls it in transitively either', () => {
    const lock = JSON.parse(readFileSync(resolve(ROOT, 'package-lock.json'), 'utf8'));
    const installed = Object.keys(lock.packages ?? {}).filter((path) =>
      /(^|\/)node_modules\/events$/.test(path),
    );
    expect(installed).toEqual([]);
  });

  /** Without this the assertions above would also pass if token-emitter were deleted. */
  it('has been replaced by EventTarget in token-emitter', () => {
    const source = read('src/utils/token-emitter.ts');
    expect(source).toContain('new EventTarget()');
    expect(source).toContain('{ once: true }');
  });
});
