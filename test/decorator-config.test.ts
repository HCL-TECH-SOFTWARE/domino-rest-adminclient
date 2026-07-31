/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { transform } from '@swc/core';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { standardDecorators } from '../scripts/standard-decorators.mjs';

/**
 * #747 — the Lit elements use standard (TC39) decorators with the `accessor` keyword.
 *
 * ## What changed in #996, and why this file got stronger rather than retargeted
 *
 * This used to assert the *strings* `decoratorVersion = '2022-03'` and `/tsDecorators:\s*true/`
 * in both bundler configs. That was the right check while the settings were two copy-pasted
 * literals in two files. #996 replaced `@vitejs/plugin-react-swc` with one shared module, so
 * the drift those string matches guarded against is now impossible by construction — and a
 * string match would have had to be rewritten to match the new spelling while testing strictly
 * less.
 *
 * So the core assertion is **behavioural**: run a fixture through the real transform and check
 * the `accessor` keyword is gone. That survives any future change of transform, spelling or
 * option shape, which no string match does.
 *
 * ## The failure mode this exists for is silent
 *
 * SWC's default is legacy decorators (`'2021-12'`). Under that default it does not error on
 * `accessor` — it emits the member **untransformed**, `@decorator` syntax and all. The build
 * still exits 0 and ships a bundle Chrome cannot parse (`Invalid or unexpected token`), so
 * `keep-app` never upgrades and the page is blank. Measured: 386 such fields with no transform,
 * 0 with it.
 *
 * That is why `emitsLegacyUntransformed` below is part of the test rather than a comment. It
 * runs the same fixture through SWC's *default* and asserts the keyword survives — which is
 * what proves the main assertion is discriminating rather than trivially true. Without it, a
 * fixture that simply contained no `accessor` would pass.
 *
 * ## Three files still have to agree
 *
 *   - `tsconfig.app.json`            type-check only (`noEmit`). SWC never reads it.
 *   - `scripts/standard-decorators.mts` the transform itself, for build, dev and this suite.
 *   - `vite.config.mts` / `vitest.config.ts`   must both register it.
 *
 * The last pair is what remains of the drift guard: sharing a module makes the *settings*
 * identical, but either config could still drop the registration, and the two govern different
 * things — the shipped bundle and this suite.
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

/** A decorated auto-accessor — the one construct the whole transform exists to handle. */
const FIXTURE = `
const dec = (value: unknown, context: unknown) => value;
export class Demo {
  @dec accessor label = 'x';
}
`;

/** The plugin's `transform`, called directly. It uses no plugin context, so this is safe. */
const runPlugin = async (code: string, id: string) => {
  const hook = standardDecorators().transform;
  const handler = typeof hook === 'function' ? hook : hook?.handler;
  if (!handler) throw new Error('the decorator plugin has no transform hook');
  return (await (handler as (c: string, i: string) => Promise<{ code: string } | null>)(
    code,
    id,
  )) as { code: string } | null;
};

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

  it('transforms the `accessor` keyword away', async () => {
    const result = await runPlugin(FIXTURE, resolve(ROOT, 'src/demo.ts'));

    expect(result, 'the plugin declined a .ts file').not.toBeNull();
    // The exact shape that breaks the bundle when it survives.
    expect(result!.code).not.toMatch(/\baccessor\s+label\b/);
    expect(result!.code).not.toMatch(/@dec\b/);
    // What standard semantics actually produce: the decorator runtime, and a real
    // getter/setter pair over a private field.
    expect(result!.code).toContain('_apply_decs_2203_r');
    expect(result!.code).toMatch(/get label\(\)/);
    expect(result!.code).toMatch(/set label\(/);
  });

  it('emits the keyword untransformed under SWC defaults, which is why the option matters', async () => {
    // Anti-vacuity for the case above, and a faithful reproduction of the silent failure:
    // same fixture, same parser, only `decoratorVersion` left at SWC's legacy default.
    const legacy = await transform(FIXTURE, {
      filename: 'demo.ts',
      swcrc: false,
      configFile: false,
      jsc: {
        target: 'esnext',
        parser: { syntax: 'typescript', tsx: false, decorators: true },
        transform: { useDefineForClassFields: true },
      },
    });

    expect(legacy.code).toMatch(/\baccessor\s+label\b/);
    expect(legacy.code).toMatch(/@dec\b/);
  });

  it('transforms only the files that can carry decorators', async () => {
    // Narrow on purpose. Anything this declines is still type-stripped by Vite's oxc pass,
    // so an over-narrow filter fails loudly on `accessor` rather than shipping a half
    // -transformed bundle. `.mts` is in because `vite.config.mts` is one.
    expect(await runPlugin(FIXTURE, '/app/src/x.ts'), '.ts must transform').not.toBeNull();
    expect(await runPlugin(FIXTURE, '/app/src/x.mts'), '.mts must transform').not.toBeNull();
    // Vite ids carry suffixes; the extension, not the raw id, decides.
    expect(await runPlugin(FIXTURE, '/app/src/x.ts?v=1'), 'a query must not hide .ts').not.toBeNull();
    // Dependencies ship compiled JavaScript that must not be re-parsed as TypeScript.
    expect(await runPlugin(FIXTURE, '/app/src/x.js'), '.js must be declined').toBeNull();
    expect(
      await runPlugin(FIXTURE, '/app/node_modules/p/x.ts'),
      'node_modules must be declined',
    ).toBeNull();
  });

  it('registers the shared transform in both bundler configs', () => {
    // Settings can no longer drift — there is one module — but a registration can still be
    // dropped from one config, and they govern different things: the shipped bundle and
    // this suite.
    for (const file of ['vite.config.mts', 'vitest.config.ts']) {
      const source = read(file);
      expect(source, `${file} must import the shared decorator transform`).toMatch(
        /from '\.\/scripts\/standard-decorators\.mjs'/,
      );
      expect(source, `${file} must register it`).toMatch(/standardDecorators\(\)/);
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
