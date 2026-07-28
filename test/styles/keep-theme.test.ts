// Copyright (C) 2026 HCL America Inc.
// Licensed under the Apache 2.0 License (https://www.apache.org/licenses/LICENSE-2.0.txt)

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getTheme } from '../../src/store/styles/action';

/*
 * These assertions are deliberately *static* — they parse keep-theme.css as text
 * rather than resolving tokens in a live document.
 *
 * Two things make the runtime version vacuous in this suite: vitest runs with
 * `css: false`, so no stylesheet is ever loaded, and this jsdom has no canvas
 * backend, so `resolveWaColors()` takes its documented "no 2D canvas" early-out
 * and returns `{}`. A test written that way passes without checking anything.
 *
 * Resolved values are verified in a real engine instead — see the browser
 * measurement described in the #708 PR body. What is worth guarding here is the
 * pairing below, which no browser check would catch.
 */

const CSS = readFileSync(join(__dirname, '../../src/styles/keep-theme.css'), 'utf8');

/** The declarations inside `:root.wa-dark { … }`. */
const darkBlock = (() => {
  const start = CSS.indexOf(':root.wa-dark');
  expect(start, ':root.wa-dark block not found in keep-theme.css').toBeGreaterThan(-1);
  const open = CSS.indexOf('{', start);
  return CSS.slice(open + 1, CSS.indexOf('}', open));
})();

const declared = (block: string, token: string) =>
  block.match(new RegExp(`${token}\\s*:\\s*([^;]+);`))?.[1]?.trim().toLowerCase();

describe('keep-theme.css — pinned dark semantic tokens (#708)', () => {
  /*
   * The point of #708 is that this palette existed in three places at once. Two of
   * them still do while getTheme() has a consumer (src/theme.ts, until #709 removes
   * MUI), so pin them to each other: editing one without the other fails here rather
   * than showing up as a colour that is subtly wrong in one half of the app.
   */
  const dark = getTheme('dark');

  it.each([
    ['--wa-color-surface-lowered', dark.bodyColor, 'page background'],
    ['--wa-color-surface-default', dark.primary, 'default surface'],
    ['--wa-color-surface-raised', dark.secondary, 'raised surface (cards)'],
    ['--wa-color-surface-border', dark.borderColor, 'borders'],
    ['--wa-color-text-normal', dark.textColorPrimary, 'body text'],
  ])('%s matches getTheme("dark") — %s', (token, expected) => {
    expect(declared(darkBlock, token)).toBe(String(expected).toLowerCase());
  });

  it('pins text-loud to pure white', () => {
    expect(declared(darkBlock, '--wa-color-text-loud')).toBe('#ffffff');
  });

  /*
   * The single-source-of-truth guard. keep-theme.css is the only file allowed to
   * define these; a redefinition anywhere else silently wins or loses by import
   * order, which is exactly the failure #706 fixed for the brand ramp.
   */
  it('is the only stylesheet defining the semantic surface/text tokens', () => {
    const others = ['keep-overrides.css', 'dark-mode.css', 'styles.css'];
    const tokens = [
      '--wa-color-surface-lowered',
      '--wa-color-surface-default',
      '--wa-color-surface-raised',
      '--wa-color-surface-border',
      '--wa-color-text-normal',
      '--wa-color-text-loud',
    ];
    for (const file of others) {
      const css = readFileSync(join(__dirname, '../../src/styles', file), 'utf8');
      for (const token of tokens) {
        expect(
          new RegExp(`${token}\\s*:`).test(css),
          `${file} must not define ${token} — keep-theme.css owns it`,
        ).toBe(false);
      }
    }
  });
});

describe('getTheme (#708)', () => {
  it('has no unreachable skin branches', () => {
    // 'hcl' was a third skin nothing could select: localStorage only ever receives
    // 'dark' or 'default' (SideNav + LoginPage toggles), so the branch was dead and
    // was removed rather than tokenized. Any unknown value must fall to the default.
    expect(getTheme('hcl')).toEqual(getTheme('default'));
    expect(getTheme('anything-else')).toEqual(getTheme('default'));
  });
});
