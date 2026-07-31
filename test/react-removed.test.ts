/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * #719 — React is gone, and this is the gate that says so.
 *
 * The issue's own exit condition was `grep -rn "from 'react'" src` coming up empty. That
 * happened in half 2, when `App.tsx` and `AppShell.tsx` became `keep-app` and
 * `keep-app-shell`; `router/react.tsx`, `store/hooks.ts`, `index.tsx`'s `createRoot` and the
 * last twelve `@lit/react` wrappers went with them.
 *
 * ## This file replaces `keep-element-wrappers.test.ts`
 *
 * That guard walked `src/components/keep-elements/react/` and failed on any wrapper with no
 * React consumer left — which caught sixteen orphans in one pass and was the right check for
 * as long as the directory existed. It cannot survive the directory: `readdirSync` on a path
 * that is not there throws, and the suite reports a crashed file rather than a completed
 * migration.
 *
 * That is the shape this repo keeps meeting — a guard whose non-vacuity floor counts the very
 * thing being removed fails at the moment the work succeeds. `dead-selectors`,
 * `type-selectors`, `mui-removed` and `typed-dispatch` each hit it during #806. The fix is
 * always the same: restate the rule as an invariant that holds at zero. "No wrapper is
 * orphaned" becomes "there are no wrappers, because there is no React".
 *
 * ## What counts
 *
 * Import *forms*, not raw text. Every one of the notes above names `react`, `useDispatch` and
 * `@lit/react` in prose, and a text scan would report this file's own docblock. Comments are
 * stripped and only import and `require` statements are matched.
 */

const ROOT = resolve(process.cwd());
const SRC = join(ROOT, 'src');

/**
 * Every package the migration removed, and the one thing each was doing here:
 *
 * - `react` / `react-dom` — the view layer and its DOM renderer.
 * - `react-redux` — `<Provider>`, `useSelector`, `useDispatch`; replaced by `StoreController`
 *   over the module-singleton store (#715).
 * - `@lit/react` — `createComponent`, the wrapper that let React JSX render a `keep-*`
 *   element. Forty-six of them existed at the peak.
 * - `@testing-library/react` — only ever re-exported DOM Testing Library's `fireEvent`,
 *   `screen` and `within` for `test/test-utils/tables.ts`, which imports them from
 *   `@testing-library/dom` directly now.
 * - `@vitejs/plugin-react-swc` is deliberately **not** here: it is a build-time SWC transform,
 *   and the Lit elements need it for standard decorators and `accessor` (#747). It depends on
 *   `@swc/core` and nothing else — no `react`, no `react-refresh` runtime it cannot serve
 *   itself — so its name is now the only React left in the repository. `@linaria/react` was
 *   the other build-time package whose name said React; #825 removed it with the last
 *   `styled` block, which is also what stopped `react` being reinstalled as its peer.
 */
const BANNED = ['react', 'react-dom', 'react-redux', '@lit/react', '@testing-library/react'];

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

/** Whole-line comments dropped, so prose naming a package is not read as an import of it. */
const code = (text: string) =>
  text
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
    .join('\n');

const SOURCES = walk(SRC)
  .filter((file) => /\.tsx?$/.test(file))
  .map((file) => ({ file: file.slice(ROOT.length + 1), text: code(readFileSync(file, 'utf8')) }));

/**
 * A specifier, however it is spelled: `import x from 'p'`, `import 'p'`, `import('p')`,
 * `export … from 'p'`, `require('p')`. The subpath group is what catches `react-dom/client`
 * and `@lit/react/decorators.js`, which name no bare package on their own.
 */
const importsOf = (text: string): string[] =>
  [
    ...text.matchAll(/(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g),
  ].map((match) => match[1]);

const importers = (pkg: string) =>
  SOURCES.filter(({ text }) =>
    importsOf(text).some((spec) => spec === pkg || spec.startsWith(`${pkg}/`)),
  ).map(({ file }) => file);

describe('React is removed from src (#719)', () => {
  it('finds source files to scan', () => {
    // An empty list has no offenders, so every case below would pass vacuously.
    expect(SOURCES.length, 'no source files found — did src move?').toBeGreaterThan(100);
    expect(SOURCES.map((s) => s.file)).toContain('src/index.ts');
  });

  it.each(BANNED)('imports %s nowhere', (pkg) => {
    const found = importers(pkg);
    expect(
      found,
      `${pkg} is back in: ${found.join(', ')}\n\n` +
        'React was removed in #719. A Lit element reaches the store through StoreController, ' +
        'the router through RouterController, and needs no wrapper to be rendered — see ' +
        'keep-app.ts and keep-app-shell.ts for the two that used to be components.',
    ).toEqual([]);
  });

  it('has no .tsx left to compile', () => {
    // JSX has no consumer now. A single `.tsx` would still build — the SWC plugin that the
    // decorators need also parses JSX — so nothing else would report this.
    const jsx = SOURCES.filter(({ file }) => file.endsWith('.tsx')).map(({ file }) => file);
    expect(jsx, `JSX is back in: ${jsx.join(', ')}`).toEqual([]);
  });

  it('has no @lit/react wrapper directory', () => {
    // The directory `keep-element-wrappers.test.ts` used to walk. A wrapper is a component
    // -shaped door onto an element module; with no React there is nothing on the other side
    // of it, and a Lit template writes the tag directly.
    expect(existsSync(join(SRC, 'components/keep-elements/react'))).toBe(false);
    expect(existsSync(join(SRC, 'components/keep-elements/KeepElements.tsx'))).toBe(false);
  });

  it('declares none of them as a dependency', () => {
    // The source scan above passes just as well with the packages still installed, and an
    // unused dependency is one `npm install` away from being used again — plus it is what the
    // advisory scanners see.
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const declared = { ...pkg.dependencies, ...pkg.devDependencies };
    const found = BANNED.filter((name) => name in declared);
    expect(found, `package.json still declares: ${found.join(', ')}`).toEqual([]);
  });
});
