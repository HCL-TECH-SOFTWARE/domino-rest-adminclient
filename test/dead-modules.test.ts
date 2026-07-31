/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

/**
 * No module under `src/` may be unreachable from an entry point.
 *
 * The sibling of `test/styles/dead-selectors.test.ts`, for modules rather than CSS rules,
 * and it exists because #806 wave 5 nearly converted 393 lines of code no user can run.
 *
 * `applications/AppStack.tsx` was imported by nothing. `kanban/AppCard.tsx` was imported
 * only by `AppStack`. Both read as live at a glance, because `Kanban.tsx` renders a Linaria
 * `styled.div` it calls `AppStackContainer` — a different thing with a near-identical name.
 * They were on the conversion list as two ordinary tier-D files: 328 and 65 lines, two of
 * the nine remaining Formik importers, two MUI importers.
 *
 * What makes this expensive is not the wasted conversion. It is that a dead module is
 * indistinguishable from a live one, so:
 *
 * - it lands in the migration metrics as work completed, and the metrics are what we use to
 *   decide the size of the next wave;
 * - it keeps its tests, which pass, which is read as evidence the screen works;
 * - and it can be the *only* writer of a flag something live still reads. `AppCard` held the
 *   only `setFormContext('Edit')` in the tree, so with it unreachable the application form
 *   has no reachable path on which editing updates rather than creates (#939). Nothing about
 *   `AppCard`'s own source says so.
 *
 * TypeScript will not catch this: every one of these files compiles, exports a valid
 * component and type-checks against its own imports. Being imported by nobody is not an
 * error, it is just a fact about the graph — so the graph is what this test walks.
 *
 * A ratchet, not a ban: the modules that are deliberately unreachable are listed below with
 * the reason and the issue that will land them. Adding an unlisted one fails here.
 */

const ROOT = resolve(process.cwd());
const SRC = join(ROOT, 'src');

/**
 * Both entry points, because `index.html` loads two module scripts. `src/index.ts` is the
 * appearance boot code from #707 — it runs before React renders to avoid a theme flash, and
 * it is imported by nothing, which is exactly what an entry point looks like to this walk.
 * Omitting it would report it, and everything only it reaches, as dead.
 */
const ENTRIES = ['src/index.tsx', 'src/index.ts'];

/**
 * Unreachable on purpose. Each needs a reason and, where the resolution is known, the issue
 * that closes it — an allowlist whose entries only say "allowed" degrades into a list of
 * things nobody dares remove.
 */
const ALLOWED: Record<string, string> = {
  // The `/mail` placeholder screen. Its route is parked in a note on `keep-views`' route
  // table behind LABS-1214 (#698) and the sidenav entry sits behind a `false &&`. Converted in
  // #806 tier A rather than deleted, so that re-enabling the page is a routing change and
  // not a rewrite. It deliberately has no `@lit/react` wrapper — when the route returns it
  // returns as one more entry in that table.
  'src/components/keep-elements/keep-mail.ts':
    'parked screen — route disabled pending #698, kept converted so re-enabling is routing only',

  // `src/store/FormController.react.ts` was listed here until #719 deleted it. Report 04 §8
  // scheduled it for P4 and it arrived: the adapter served one pair of files for half an hour
  // before they converted to Lit, and #717 closed with Formik gone, so it had no future users
  // either. Its coverage gate went in the same commit, as that entry's own note required.
};

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const files = walk(SRC).filter((path) => /\.tsx?$/.test(path) && !path.endsWith('.d.ts'));

/**
 * Whole-line comments dropped before the import scan.
 *
 * Prose resurrects a module otherwise: a docblock in `keep-views.ts` that *described* the
 * parked `/mail` route by writing its lazy import out in full made `keep-mail.ts` read as
 * reachable, and this file's own allowlist check was the only thing that noticed. The sibling
 * scans in `keep-element-wrappers.test.ts` and `shell-dead-code.test.ts` strip comments for
 * the same reason.
 */
const code = (text: string) =>
  text
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
    .join('\n');

/**
 * Resolve a relative specifier the way the bundler does, including the `.js`-for-`.ts` form.
 *
 * That last case is not cosmetic. An earlier version of this walk omitted it and reported
 * `services/wa-color.ts`, `wa-typography.ts` and `editor-theme.ts` as dead — all three are
 * imported by `keep-monaco-editor.ts`, which spells them `'../../services/wa-color.js'`. A
 * dead-code check that over-reports is worse than none: it gets muted.
 */
const resolveSpecifier = (fromFile: string, specifier: string): string | undefined => {
  const base = resolve(dirname(fromFile), specifier);
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
  if (base.endsWith('.js')) candidates.push(`${base.slice(0, -3)}.ts`, `${base.slice(0, -3)}.tsx`);
  if (base.endsWith('.jsx')) candidates.push(`${base.slice(0, -4)}.tsx`);
  return candidates.find((candidate) => files.includes(candidate));
};

/**
 * Three import forms, and the third is the one that matters here: a custom element is pulled
 * in for its `@customElement` side effect as a bare `import './keep-thing'`, with nothing
 * bound. Miss it and every Lit element in the tree looks unreachable.
 */
const importsOf = (file: string): string[] => {
  const source = code(readFileSync(file, 'utf8'));
  const specifiers = [
    ...[...source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)].map((m) => m[1]),
    ...[...source.matchAll(/import\(\s*['"](\.[^'"]+)['"]\s*\)/g)].map((m) => m[1]),
    ...[...source.matchAll(/^\s*import\s+['"](\.[^'"]+)['"]/gm)].map((m) => m[1]),
  ];
  return specifiers
    .map((specifier) => resolveSpecifier(file, specifier))
    .filter((path): path is string => path !== undefined);
};

const reachable = (): Set<string> => {
  const seen = new Set<string>();
  const stack = ENTRIES.map((entry) => join(ROOT, entry)).filter((entry) => files.includes(entry));
  while (stack.length > 0) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    stack.push(...importsOf(file));
  }
  return seen;
};

describe('every src module is reachable from an entry point', () => {
  const seen = reachable();

  it('finds both entry points and walks a real graph', () => {
    // A typo'd entry, or a resolver that matches nothing, would make the assertion below
    // report the entire tree — which reads as catastrophe rather than as a broken test, and
    // would be muted rather than fixed. Assert the walk actually went somewhere first.
    for (const entry of ENTRIES) {
      expect(files, `entry point ${entry} does not exist`).toContain(join(ROOT, entry));
    }
    expect(seen.size, 'the walk reached almost nothing — the resolver is broken').toBeGreaterThan(
      files.length / 2,
    );
  });

  it('lists no module that nothing imports', () => {
    const unreachable = files
      .filter((file) => !seen.has(file))
      .map((file) => relative(ROOT, file))
      .filter((path) => !(path in ALLOWED));

    expect(
      unreachable,
      `${unreachable.length} module(s) under src/ are imported by nothing and reachable from ` +
        `neither entry point:\n  ${unreachable.join('\n  ')}\n\n` +
        'A module nothing imports is not run by any user, but it still compiles, still ' +
        'type-checks, still passes its tests and still counts in the migration metrics. ' +
        'Delete it, or wire it up. If it is unreachable on purpose — a parked screen, a ' +
        'scheduled deletion — add it to ALLOWED in this file with the reason and the issue.',
    ).toEqual([]);
  });

  it('keeps the allowlist honest', () => {
    // An allowlist entry for a file that no longer exists, or that has since been wired up,
    // is stale. Both cases are silent: the check still passes and the note still reads as
    // current, which is how an allowlist turns into folklore.
    for (const [path, reason] of Object.entries(ALLOWED)) {
      const absolute = join(ROOT, path);
      expect(files, `ALLOWED lists ${path}, which no longer exists — drop the entry`).toContain(
        absolute,
      );
      expect(
        seen.has(absolute),
        `ALLOWED lists ${path} as deliberately unreachable, but something imports it now — ` +
          'drop the entry',
      ).toBe(false);
      expect(reason.length, `ALLOWED entry for ${path} needs a real reason`).toBeGreaterThan(20);
    }
  });
});
