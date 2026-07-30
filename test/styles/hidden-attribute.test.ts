/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * `hidden` has to hide, and in this app it did not.
 *
 * The login page's submit control — the hidden native `<button>` that makes Enter in a
 * field log in (#809), since `keep-button` renders its `<wa-button>` into a shadow root
 * and can never be a submitter — rendered as a dark 29×37 square between LOG IN and the
 * copyright.
 *
 * It is not the button that is wrong. WebAwesome's `native.css` styles bare form controls:
 *
 *     @layer wa-native {
 *       button, input[type='button'], … {
 *         &:not(input[type='file']), &::file-selector-button {
 *           display: inline-flex;
 *           height: var(--wa-form-control-height);
 *           …
 *
 * `[hidden] { display: none }` is a *user-agent* rule, and every author declaration beats
 * the user-agent origin no matter which layer it sits in. So any bare `<button hidden>`,
 * `<label hidden>`, `<summary hidden>` or `<input type="file" hidden>` in the light DOM is
 * visible, sized and filled — app-wide, not just on the login page. Nothing warns: the
 * markup is correct HTML and the sheet that breaks it is three `@import`s deep in a
 * dependency.
 *
 * `keep-overrides.css` restores it. `!important` because `hidden` is an absolute
 * statement — the point is that no later rule, ours or WebAwesome's, can outrank it.
 *
 * ⚠️ **The cascade itself is not checked here and cannot be.** The suite runs with
 * `css: false` and jsdom implements neither `@layer` nor `@import`, so no assertion in
 * this file distinguishes a rule that wins from one that loses. What it pins is the pair:
 * the upstream cause, and the override that answers it. Verified in Chrome against the dev
 * server — see the PR.
 */

const ROOT = resolve(process.cwd());

const OVERRIDES = readFileSync(resolve(ROOT, 'src/styles/keep-overrides.css'), 'utf8');
const NATIVE = readFileSync(
  resolve(ROOT, 'node_modules/@awesome.me/webawesome/dist/styles/native.css'),
  'utf8',
);

describe('[hidden] hides (#809 regression)', () => {
  it('finds both sheets', () => {
    // A bad path would make every assertion below vacuously pass.
    expect(OVERRIDES.length).toBeGreaterThan(1_000);
    expect(NATIVE.length).toBeGreaterThan(10_000);
  });

  /**
   * The reason the override exists. If WebAwesome ever stops setting `display` on bare
   * buttons, this fails and the override below becomes a dead rule to delete rather than
   * one more line nobody dares touch — the same standard `dead-selectors.test.ts` holds
   * the hand-written sheets to.
   */
  it('is still broken upstream: native.css gives bare buttons a display', () => {
    const buttons = NATIVE.slice(NATIVE.indexOf('/* #region Buttons'));
    expect(buttons).toMatch(/^\s*button,$/m);
    expect(buttons.slice(0, buttons.indexOf('/* #endregion */'))).toMatch(
      /display:\s*inline-flex/,
    );
    expect(NATIVE).toMatch(/@layer\s+wa-native\s*\{/);
  });

  it('restores it in keep-overrides.css, unconditionally', () => {
    const rule = OVERRIDES.match(/^\[hidden\]\s*\{([^}]*)\}/m);
    expect(
      rule,
      'keep-overrides.css no longer resets [hidden]. WebAwesome\'s native.css gives bare ' +
        '<button>/<label>/<summary> a display from an author-origin layer, which outranks ' +
        'the user-agent [hidden] rule — every hidden one of them becomes visible, ' +
        'starting with the login form\'s submit control (#809).',
    ).not.toBeNull();
    expect(rule![1]).toMatch(/display:\s*none\s*!important/);
  });

  /** Unlayered, so it outranks `@layer wa-native` rather than racing it on source order. */
  it('adds no cascade layer that would put it back in the race', () => {
    expect(OVERRIDES).not.toMatch(/@layer/);
  });
});
