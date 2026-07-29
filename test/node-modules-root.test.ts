/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, realpathSync } from 'node:fs';
import { resolve, sep } from 'node:path';

/**
 * Guards that dependencies resolve from a `node_modules` **inside** the Vite root.
 *
 * Node's resolver walks *up* the filesystem; Vite's `server.fs` check does not. Those two
 * disagree in exactly one situation, and it is one this repo hits routinely: a git
 * worktree created under `.claude/worktrees/<name>` lives inside the main checkout, so a
 * worktree that was never `npm ci`-ed still resolves every package — from the main
 * checkout, one level up and outside the Vite root.
 *
 * Bare JS imports survive that. Vitest externalizes them and Node loads them off disk
 * without asking Vite. Asset imports do not: `src/services/icon-library.ts` pulls in 17
 * Font Awesome SVGs with `?url`, those go through Vite's `loadAndTransform`, and a path
 * outside the root is refused. Every suite that transitively imports the icon library —
 * 18 of them — dies with
 *
 *     Error: Denied ID /…/node_modules/@fortawesome/…/arrows-rotate.svg?url
 *
 * which names a file, a query suffix and a permission, but never the actual problem. This
 * test states it in one line instead.
 *
 * **The fix is `npm ci` in the worktree — not widening `server.fs.allow` to the parent.**
 * That workaround makes the error disappear while resolving every dependency from
 * whatever branch the main checkout happens to have out, against a different
 * `package-lock.json` than the one under test. A green suite would then say nothing about
 * the branch it was run on.
 *
 * When `icon-library.ts` stops using `?url` this guard has no subject left; the last case
 * below fails so it gets deleted rather than quietly kept.
 */

const ROOT = realpathSync(resolve(process.cwd()));
const require = createRequire(resolve(ROOT, 'test/'));

/** The package supplying the `?url` assets, i.e. the one Vite has to be allowed to read. */
const ASSET_PACKAGE = '@fortawesome/fontawesome-free/package.json';

describe('node_modules resolves inside the Vite root', () => {
  it(`resolves ${ASSET_PACKAGE} below the project root`, () => {
    const resolved = realpathSync(require.resolve(ASSET_PACKAGE));

    expect(
      resolved.startsWith(ROOT + sep),
      `Dependencies are resolving from outside the Vite root.\n\n` +
        `  root:     ${ROOT}\n` +
        `  resolved: ${resolved}\n\n` +
        `This worktree has no node_modules of its own, so Node walked up and found the\n` +
        `main checkout's. Asset imports (?url) will fail with "Denied ID …" in 18 suites.\n\n` +
        `Run \`npm ci\` in this worktree. Do not widen server.fs.allow — that resolves\n` +
        `dependencies against a different package-lock.json than the branch under test.`,
    ).toBe(true);
  });

  it('still has a `?url` import to protect', () => {
    // If this fails, Vite no longer has to serve anything out of node_modules and the
    // whole file can go.
    const source = readFileSync(resolve(ROOT, 'src/services/icon-library.ts'), 'utf8');
    expect(source).toContain('.svg?url');
  });
});
