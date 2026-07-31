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
 * `useAppDispatch()` returned `AppDispatch`, which carries the thunk overload, so no cast was
 * needed and argument checking was back.
 *
 * ## The hook is gone; the rule it enforced is not
 *
 * `src/store/hooks.ts` was one line — `useDispatch.withTypes<AppDispatch>()` — and #719
 * deleted it with the rest of react-redux. Every element reaches `store.dispatch` directly
 * now, and that dispatch is `configureStore`'s own, which has carried the thunk overload all
 * along. So the typing this issue was about is no longer something a wrapper provides; it is a
 * property of the store.
 *
 * What still needs a guard is the *cast*, which is where the damage was: `dispatch(thunk() as
 * any)` compiles today exactly as it did in 2024, and erases checking of the thunk's own
 * arguments while it silences the complaint. The `useDispatch` case below is kept and
 * tightened rather than dropped — with no binding layer left, the allowlist is empty and the
 * rule is simply that the name does not appear.
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

/** Where `AppDispatch` is declared, and the file the last case reads. */
const STORE = 'src/store/index.ts';

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
    // The canary used to be `src/store/hooks.ts`, which #719 deleted — a non-vacuity check
    // that names the file a migration is removing fails at the moment the migration succeeds.
    // `store/index.ts` is where `AppDispatch` itself lives and outlives any binding layer.
    expect(SOURCES.map((s) => s.file)).toContain(STORE);
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

  it('reaches the store directly, never through react-redux', () => {
    // Allowlisted to `src/store/hooks.ts` until #719 deleted that file with react-redux. With
    // no binding layer the rule needs no exception, which is the stronger form of it.
    const found = offenders(/\buseDispatch\b/);
    expect(found, `untyped useDispatch is back in: ${found.join(', ')}`).toEqual([]);
  });

  it('exports the typed dispatch from the store, framework-agnostically', () => {
    const store = readFileSync(resolve(ROOT, STORE), 'utf8');
    expect(store).toMatch(/export type AppDispatch\s*=\s*ThunkDispatch</);
    expect(code(store)).not.toMatch(/react-redux/);
  });
});
