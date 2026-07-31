/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * The exit gate for #825 — no CSS-in-JS, in the source or in the manifest.
 *
 * The issue asked for this as a **ratchet**: scan `src` for the three package families,
 * commit the file count, and lower it each pull request. It is written as a floor of zero
 * instead, because the count was already zero when the gate came to be written — the layer
 * was retired by the component migration rather than by a sweep, one file at a time, as
 * every re-measurement on the issue predicted. A ratchet whose number is zero is just an
 * assertion that it stays there.
 *
 * ## Why the scan is for imports, not for the word
 *
 * `grep -rn 'styled' src` answers **32** on the commit this landed on, and every one of
 * them is a provenance comment: "was the InputContainer styled.div", "was styled(Paper) —
 * a MUI raised surface". Counting text rather than imports is how three separate
 * measurements in this programme came out an order of magnitude high (#930 is the same
 * defect in the dead-selector guard). So this matches import and require forms only, and
 * the comments are free to keep saying where a rule came from.
 *
 * ## The three families, and why each is listed
 *
 *  - `@linaria/*` — `styled` is a React component factory: `@linaria/react`'s dist calls
 *    `React.createElement` and `React.forwardRef`. It could never have survived React
 *    removal, which is the correction this issue carried from the day it was filed against
 *    report 04's "Keep — styling survives React removal".
 *  - `@wyw-in-js/*` — the build half. It only ever existed to extract Linaria.
 *  - `@emotion/*` — never directly imported here; they were `@mui/material`'s default
 *    styling engine, declared as optional peers. They left with MUI (#709).
 */

const ROOT = resolve(process.cwd());

/** Package prefixes that must not appear in an import, or in the manifest. */
const BANNED = ['@linaria/', '@wyw-in-js/', '@emotion/'];

/** `import … from 'x'`, `import 'x'`, `import('x')`, `require('x')` — nothing in a comment. */
const importsOf = (source: string): string[] => {
  const specifiers: string[] = [];
  const patterns = [
    /(?:^|\n)\s*import\s+(?:[^'"]*?\bfrom\s*)?['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  }
  return specifiers;
};

const sourceFiles = (dir: string): string[] =>
  readdirSync(resolve(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });

describe('the CSS-in-JS layer is gone (#825)', () => {
  it('finds source files to scan at all, or every case below passes vacuously', () => {
    expect(sourceFiles('src').length).toBeGreaterThan(100);
  });

  it('has no src file importing Linaria, wyw or Emotion', () => {
    const offenders = sourceFiles('src')
      .map((file) => ({
        file,
        hits: importsOf(readFileSync(resolve(ROOT, file), 'utf8')).filter((specifier) =>
          BANNED.some((banned) => specifier.startsWith(banned)),
        ),
      }))
      .filter((entry) => entry.hits.length > 0);

    expect(
      offenders.map((entry) => `${entry.file} → ${entry.hits.join(', ')}`),
      'a CSS-in-JS import is back; styling belongs in a Lit element static styles block',
    ).toEqual([]);
  });

  it('declares none of them in package.json', () => {
    const manifest = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const declared = [
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.devDependencies ?? {}),
    ].filter((name) => BANNED.some((banned) => name.startsWith(banned)));

    expect(declared, 'the packages are removed; a re-added entry is a dependency nobody uses').toEqual(
      [],
    );
  });

  // The other half of the manifest check — that neither build config registers the wyw
  // plugin — lives in `test/decorator-config.test.ts`, next to the `accessor` bug that is
  // the reason it matters rather than next to the styling story.
});
