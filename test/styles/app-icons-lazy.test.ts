/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(process.cwd());
const SRC = resolve(ROOT, 'src');

/** The one module allowed to reach the payloads, and only through `import()`. */
const LOADER = 'src/services/app-icons.ts';

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const rel = (file: string) => file.slice(ROOT.length + 1);

const SOURCES = walk(SRC)
  .filter((f) => /\.tsx?$/.test(f))
  .map(rel);

/** Comment lines stripped, so the prose in `app-icons.ts` doesn't report itself. */
const read = (file: string) =>
  readFileSync(resolve(ROOT, file), 'utf8')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
    .join('\n');

/**
 * A static `import … from '…/styles/app-icons'` — the thing that pins the module to the
 * entry chunk. Both spellings are covered: the `'./app-icons'` a sibling in `src/styles/`
 * would write, and the `'…/styles/app-icons'` everyone else would. Deliberately narrow
 * enough not to flag `services/app-icons` (the loader, which is the supported import) or
 * `styles/app-icon-names` (names only, and eager on purpose).
 */
const STATIC_IMPORT = /\bfrom\s+'(?:[^']*\/styles\/app-icons|\.\/app-icons)'/;

/**
 * #772 moved `styles/app-icons.ts` — 221 KB of base64, ~62 KB gzip, ~13 % of the entry
 * chunk — behind a dynamic `import()` in `services/app-icons.ts`.
 *
 * A single static import anywhere in `src/` silently undoes that: the bundler folds the
 * module straight back into the entry chunk, the lazy chunk still gets emitted, and
 * everything keeps working. Nothing fails, nothing looks wrong in review, and the payload
 * is back on the critical path. That is exactly the kind of regression that needs a test
 * rather than a convention, because the symptom is invisible without measuring the build.
 *
 * The fix, if this fails: import from `services/app-icons` instead — `APP_ICON_NAMES` for
 * names, `useAppIcons()` / `appIconUri()` / `appIconPayload()` for payloads.
 */
describe('app-icons stays off the entry chunk', () => {
  it('is imported statically by nothing in src/', () => {
    const offenders = SOURCES.filter((file) => file !== LOADER && STATIC_IMPORT.test(read(file)));
    expect(offenders).toEqual([]);
  });

  it('is reached from the loader by a dynamic import', () => {
    expect(read(LOADER)).toMatch(/import\('\.\.\/styles\/app-icons'\)/);
  });

  it('has no static import of the payloads in the loader either', () => {
    expect(STATIC_IMPORT.test(read(LOADER))).toBe(false);
  });
});
