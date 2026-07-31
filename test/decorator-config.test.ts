/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * #747 — the Lit elements use standard (TC39) decorators with the `accessor` keyword.
 *
 * Three settings have to agree for that to work, and they live in three files that no
 * single tool checks together:
 *
 *   - `tsconfig.app.json`   type-check only (`noEmit: true`). SWC never reads it.
 *   - `vite.config.mts`     runtime-authoritative for `npm run build` / `dev`.
 *   - `vitest.config.ts`    runtime-authoritative for this suite.
 *
 * The sharp edge is that `tsDecorators` in @vitejs/plugin-react-swc is only SWC's
 * **parser** flag — it does not choose decorator semantics. Semantics come from
 * `jsc.transform.decoratorVersion`, which SWC defaults to legacy ('2021-12'). Under that
 * default SWC emits `accessor` members *untransformed* rather than failing, so a config
 * that looks plausible produces a broken bundle.
 *
 * A missing `accessor` is loud — Lit's standard decorators throw "Unsupported decorator
 * location: field" at module load, in dev and production alike — but only once something
 * imports the element. This file fails in CI instead, with a message that says why.
 *
 * The other half is config drift: `vitest.config.ts` governs the tests and
 * `vite.config.mts` governs the shipped bundle. Edit one and not the other and the suite
 * stays green while the build breaks, which is exactly the asymmetry worth guarding.
 */

const ROOT = resolve(process.cwd());
const read = (file: string) => readFileSync(resolve(ROOT, file), 'utf8');

const ELEMENTS_DIR = 'src/components/keep-elements';

/**
 * Decorators that sit on a reactive field and therefore require `accessor`.
 *
 * The access modifier lives *inside* the lookahead on purpose. With it outside, the
 * optional group can match empty and the lookahead then inspects `private` instead of the
 * keyword after it — so every `private accessor` field reads as an offender.
 */
const FIELD_DECORATOR =
  /^\s*@(property|state|query)\((?:[^()]|\([^()]*\))*\)\s+(?!(?:private |protected |public )?accessor\b)/;

const elementFiles = readdirSync(resolve(ROOT, ELEMENTS_DIR))
  .filter((name) => name.endsWith('.ts'))
  .map((name) => join(ELEMENTS_DIR, name));

describe('#747 standard decorators', () => {
  it('has element sources to check', () => {
    expect(elementFiles.length).toBeGreaterThan(20);
  });

  it('declares every decorated field with `accessor`', () => {
    const offenders: string[] = [];

    for (const file of elementFiles) {
      read(file)
        .split('\n')
        .forEach((line, index) => {
          if (FIELD_DECORATOR.test(line)) offenders.push(`${file}:${index + 1}  ${line.trim()}`);
        });
    }

    // Without `accessor` the field shadows Lit's reactive accessor, and under standard
    // decorators Lit rejects it outright at class-definition time.
    expect(offenders).toEqual([]);
  });

  it('selects standard decorator semantics in both bundler configs', () => {
    for (const file of ['vite.config.mts', 'vitest.config.ts']) {
      const source = read(file);
      expect(source, `${file} must select standard decorators`).toContain(
        "decoratorVersion = '2022-03'",
      );
      // The parser flag. False makes SWC reject `@` outright.
      expect(source, `${file} must keep the SWC decorator parser on`).toMatch(
        /tsDecorators:\s*true/,
      );
      expect(source, `${file} must not pin the legacy class-field semantics`).not.toMatch(
        /useDefineForClassFields\s*=\s*false/,
      );
    }
  });

  it('keeps tsconfig.app.json off experimental decorators', () => {
    const source = read('tsconfig.app.json');
    expect(source).not.toMatch(/"experimentalDecorators"\s*:\s*true/);
    expect(source).not.toMatch(/"useDefineForClassFields"\s*:\s*false/);
  });

  // The Linaria half of this file is gone with #825.
  //
  // It asserted that both configs excluded `**/components/keep-elements/**` from the wyw
  // transform, because wyw's oxc type-stripper mis-desugars `accessor` into a reference to
  // an undeclared private field. That guard protected a plugin that no longer exists — the
  // whole `wyw()` registration was removed once the last `styled` block did — and an
  // assertion that a deleted config block contains a string can only fail.
  //
  // Its second half (no element may import `@linaria`) is not lost: it is subsumed, and
  // widened from `keep-elements/` to all of `src`, by
  // `test/styles/no-css-in-js.test.ts`.
});
