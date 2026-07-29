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

const SOURCES = walk(resolve(ROOT, 'src'))
  .filter((f) => /\.tsx?$/.test(f))
  .map(rel);

/** Comment lines stripped, so the prose recording the removal is not itself a hit. */
const read = (file: string) =>
  readFileSync(resolve(ROOT, file), 'utf8')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
    .join('\n');

/**
 * #869 — the application-error machinery is gone, and stays gone.
 *
 * `appError` / `appErrorMessage` and their two action types were state nothing wrote.
 * `setAppError` and both its dispatch sites had been commented out — application failures
 * report through `toggleAlert` — so the only thing that ever reached the reducer cases was
 * `databases`' `SET_DB_ERROR`, which shared the value until #866 renamed it. Which means
 * `AppForm`'s "Error: Unable to save application" banner had only ever shown *database*
 * errors, and after #866 showed nothing at all.
 *
 * A source scan rather than a render test, because the two components involved —
 * `AppForm.tsx` and `kanban/Kanban.tsx` — have no render harness, and building one for a
 * deletion would be a larger and more fragile thing than the deletion itself. What is
 * asserted is exactly what was removed: no reader, no writer, no state.
 *
 * The reducer's own shape is pinned separately, in `reducer.test.ts`.
 */
describe('the application-error machinery is gone (#869)', () => {
  it('scans a plausible number of files, so the assertions cannot pass vacuously', () => {
    expect(SOURCES.length).toBeGreaterThan(100);
    expect(SOURCES).toContain('src/components/applications/AppForm.tsx');
    expect(SOURCES).toContain('src/components/applications/kanban/Kanban.tsx');
  });

  it('is read by no component', () => {
    // AppForm.tsx:74-75 selected both off `state.apps`; :149 rendered the banner.
    expect(SOURCES.filter((f) => /\bappError(Message)?\b/.test(read(f)))).toEqual([]);
  });

  it('is dispatched by nothing', () => {
    // Kanban.tsx dispatched clearAppError twice: from a Formik `validate` that did nothing
    // else, and from createAction. Both cleared a field nothing set.
    expect(SOURCES.filter((f) => /\b(set|clear)AppError\b/.test(read(f)))).toEqual([]);
  });

  it('declares neither action type', () => {
    expect(SOURCES.filter((f) => /\b(SET|CLEAR)_APP_ERROR\b/.test(read(f)))).toEqual([]);
  });
});
