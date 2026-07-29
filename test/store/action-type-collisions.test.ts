/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { rootReducer } from '../../src/store';
import { setDBError, clearDBError } from '../../src/store/databases/shared';
import { clearAppError } from '../../src/store/applications/action';

/**
 * #866 — one action type value, two slices reacting.
 *
 * `combineReducers` hands **every** action to **every** reducer, so two slices that
 * declare the same string are two slices that answer the same dispatch. Nothing about
 * that is a type error: the value is a bare string from declaration to `addCase`, so
 * TypeScript sees two unrelated constants that happen to be equal.
 *
 * This has already cost one production regression. #840 converted the dialog slice while
 * `TOGGLE_DELETE_DIALOG` was declared identically in `dialog/types.ts` *and*
 * `applications/types.ts`; namespacing one of them unhooked the other, and the
 * delete-application dialog could not open. It shipped, because every test passed.
 *
 * The lesson that produced this file: **grep the values, not the call sites.** A search
 * for `SET_DB_ERROR` finds nothing wrong — the collision is only visible if you compare
 * what the constants are *equal to*.
 */

const TYPES_DIR = resolve(process.cwd(), 'src/store');

/**
 * The global reset, and the one legitimate collision.
 *
 * Six slices declare `INIT_STATE = 'INIT_STATE'` and every one of them handles it, which
 * is the entire point — it clears the store on logout. Exempted by name rather than by
 * pattern, so a second intentional shared type has to be added here deliberately.
 */
const INTENTIONALLY_SHARED = new Set(['INIT_STATE']);

/** Every `export const NAME = 'VALUE'` in a slice's `types.ts`, with where it came from. */
const declarations = () => {
  const found: Array<{ slice: string; name: string; value: string }> = [];
  for (const slice of readdirSync(TYPES_DIR, { withFileTypes: true })) {
    if (!slice.isDirectory()) continue;
    let source: string;
    try {
      source = readFileSync(resolve(TYPES_DIR, slice.name, 'types.ts'), 'utf8');
    } catch {
      continue; // not every slice has a types.ts
    }
    for (const line of source.split('\n')) {
      const match = /^export const (\w+)\s*=\s*'([^']+)'/.exec(line);
      if (match) found.push({ slice: slice.name, name: match[1], value: match[2] });
    }
  }
  return found;
};

describe('action type values are unique across slices (#866)', () => {
  it('finds the declarations at all, so the assertions below cannot pass vacuously', () => {
    const all = declarations();
    expect(all.length).toBeGreaterThan(50);
    expect(all.map((d) => d.slice)).toContain('databases');
    expect(all.map((d) => d.value)).toContain('INIT_STATE');
  });

  it('declares no value in two different slices', () => {
    const bySlice = new Map<string, Set<string>>();
    for (const { slice, value } of declarations()) {
      if (INTENTIONALLY_SHARED.has(value)) continue;
      if (!bySlice.has(value)) bySlice.set(value, new Set());
      bySlice.get(value)!.add(slice);
    }

    const collisions = [...bySlice.entries()]
      .filter(([, slices]) => slices.size > 1)
      .map(([value, slices]) => `'${value}' in ${[...slices].sort().join(' + ')}`)
      .sort();

    expect(collisions).toEqual([]);
  });
});

/**
 * The consequence, asserted against the real root reducer rather than the declarations.
 *
 * The check above would still pass if someone reintroduced the collision by writing the
 * literal at the `addCase` instead of via a constant. These two say what actually matters
 * — that one slice's error is not the other's — whichever way it were reintroduced.
 */
describe('a database error stays in the databases slice (#866)', () => {
  const initial = () => rootReducer(undefined, { type: '@@INIT' } as never);

  it('setDBError does not raise the applications error', () => {
    const next = rootReducer(initial(), setDBError('a database problem') as never);

    expect(next.databases.dbError).toBe(true);
    expect(next.databases.dbErrorMessage).toBe('a database problem');
    // AppForm.tsx renders this as "Error: Unable to save application", carrying whatever
    // message the *database* call failed with.
    expect(next.apps.appError).toBe(false);
  });

  it('clearAppError does not clear the database error banner', () => {
    // ScopeForm and QuickConfigForm both render `dbError && dbErrorMessage`.
    const withError = rootReducer(initial(), setDBError('a database problem') as never);
    const next = rootReducer(withError, clearAppError() as never);

    expect(next.databases.dbError).toBe(true);
  });

  it('clearDBError does not clear the application error', () => {
    const appError = rootReducer(initial(), {
      type: 'apps/setAppError',
      payload: 'an application problem',
    } as never);
    const next = rootReducer(appError, clearDBError() as never);

    expect(next.apps.appError).toBe(appError.apps.appError);
  });
});
