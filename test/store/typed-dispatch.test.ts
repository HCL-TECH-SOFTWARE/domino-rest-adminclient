/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * #694 — `dispatch` is typed, so the casts around it stay gone.
 *
 * `useDispatch()` returns redux's plain `Dispatch`, which accepts action *objects* only.
 * Dispatching a thunk through it does not type-check, so 86 call sites carried
 * `dispatch(someThunk() as any)` and four carried `dispatch<any>(…)`. Those casts did not
 * only silence the thunk complaint — they erased checking of the thunk's own arguments,
 * so a renamed parameter or a dropped callback compiled cleanly at every one of them.
 *
 * `useAppDispatch()` (src/store/hooks.ts) returns `AppDispatch`, which carries the thunk
 * overload, so no cast is needed and argument checking is back.
 *
 * A source scan rather than a behavioural test: what needs preventing is a *reintroduction*.
 * Nothing fails at runtime when someone writes `as any` again — `tsc` stays green, which is
 * exactly why 86 of them accumulated — and code review does not catch it, because each one
 * looks locally like the surrounding lines.
 */

const ROOT = resolve(process.cwd());

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const SELF = 'test/store/typed-dispatch.test.ts';

/** The one file allowed to name `useDispatch`: it is the typed wrapper's implementation. */
const BINDING = 'src/store/hooks.ts';

const SOURCES = walk(resolve(ROOT, 'src'))
  .filter((f) => /\.tsx?$/.test(f))
  .map((f) => ({ file: f.slice(ROOT.length + 1), text: readFileSync(f, 'utf8') }));

/** Whole-line comments dropped, so prose describing the old pattern is not an offender. */
const code = (text: string) =>
  text
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
    .join('\n');

const offenders = (pattern: RegExp, allow: string[] = []) =>
  SOURCES.filter(({ file, text }) => !allow.includes(file) && pattern.test(code(text))).map(
    ({ file }) => file
  );

describe('dispatch is typed (#694)', () => {
  it('finds source files to scan', () => {
    expect(SOURCES.length).toBeGreaterThan(100);
    expect(SOURCES.map((s) => s.file)).toContain(BINDING);
    expect(SOURCES.map((s) => s.file)).not.toContain(SELF);
  });

  it('casts no thunk through dispatch', () => {
    // `dispatch(fetchThings() as any)` — the 86.
    const found = offenders(/dispatch\([^\n]*\bas any\)/i);
    expect(found, `dispatch(… as any) is back in: ${found.join(', ')}`).toEqual([]);
  });

  it('widens no dispatch through its type argument', () => {
    // `dispatch<any>(…)` — the other four. Same escape hatch, different spelling.
    const found = offenders(/\bdispatch\s*<\s*any\s*>\s*\(/);
    expect(found, `dispatch<any>(…) is back in: ${found.join(', ')}`).toEqual([]);
  });

  it('reaches the store through useAppDispatch, not useDispatch', () => {
    const found = offenders(/\buseDispatch\b/, [BINDING]);
    expect(found, `untyped useDispatch is back in: ${found.join(', ')}`).toEqual([]);
  });

  it('exports the typed dispatch from the store, and the hook from the binding layer', () => {
    const store = readFileSync(resolve(ROOT, 'src/store/index.ts'), 'utf8');
    expect(store).toMatch(/export type AppDispatch\s*=\s*ThunkDispatch</);
    // The store barrel stays framework-agnostic — #715 deletes hooks.ts, not this file.
    expect(code(store)).not.toMatch(/react-redux/);

    const hooks = readFileSync(resolve(ROOT, BINDING), 'utf8');
    expect(hooks).toMatch(/export const useAppDispatch\s*=\s*useDispatch\.withTypes<AppDispatch>\(\)/);
  });
});
