/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * `theme.ts` may not carry a `components` override for an MUI component nothing imports.
 *
 * The theme's whole effect is its palette plus these overrides — `useTheme()` has no
 * callers — so an override for an absent component is not merely unused, it is the only
 * kind of dead code here that cannot be spotted by reading the file. `MuiTooltip` sat at
 * the top of the list styling a tooltip the app stopped importing some time ago.
 *
 * Five were removed when this test was written (`MuiTooltip`, `MuiBadge`, `MuiDialogTitle`,
 * `MuiInputBase`, `MuiFormLabel`). The point of the test is the ones that come *next*:
 * #806 removes MUI components file by file, and the last importer of a type can go in a PR
 * that has no reason to look at `theme.ts`. `MuiTab` dropped from 4 importers to 2 in the
 * hours between measuring this and writing it.
 *
 * When this fails, delete the named override. It cannot be affecting anything.
 *
 * Note what this does **not** claim: that the remaining overrides are correct, or that the
 * theme is still needed. Those seven are load-bearing precisely because they are the only
 * thing giving the remaining MUI surface its dark-mode colours — see #709 in
 * `docs/reports/06-waves.md`.
 */

const ROOT = resolve(process.cwd());
const THEME = 'src/theme.ts';

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

const sources = walk(resolve(ROOT, 'src'))
  .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('theme.ts'))
  .map((f) => ({ file: f.slice(ROOT.length + 1), text: readFileSync(f, 'utf8') }));

/** `MuiButton:` … the keys of the theme's `components` map. */
const overrides = [...readFileSync(resolve(ROOT, THEME), 'utf8').matchAll(/^\s{6}(Mui[A-Za-z]+):/gm)].map(
  (m) => m[1],
);

/**
 * Whether any source file imports the MUI component an override is named for.
 *
 * Both import shapes count: the deep path `@mui/material/Button`, and the barrel
 * `{ Button } from '@mui/material'`. A bare mention of the word is not enough — `Paper`
 * and `Switch` are ordinary English, and `Tooltip` is also the name of a Keep element.
 */
const isImported = (component: string): boolean => {
  const deep = new RegExp(`from\\s+['"]@mui/material/${component}['"]`);
  const barrel = new RegExp(`import\\s*\\{[^}]*\\b${component}\\b[^}]*\\}\\s*from\\s*['"]@mui/material['"]`, 's');
  return sources.some(({ text }) => deep.test(text) || barrel.test(text));
};

describe('theme.ts component overrides', () => {
  it('finds the overrides to check', () => {
    // Guards the regex above: a formatting change that stopped it matching would make
    // every case below pass vacuously.
    expect(overrides.length).toBeGreaterThan(0);
    expect(overrides).toContain('MuiButton');
  });

  it('overrides no component the app has stopped importing', () => {
    const dead = overrides.filter((name) => !isImported(name.replace(/^Mui/, '')));

    expect(
      dead,
      `these override components nothing imports — delete them from ${THEME}: ${dead.join(', ')}`,
    ).toEqual([]);
  });
});
