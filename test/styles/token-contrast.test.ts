/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The validation-text tokens have to clear WCAG AA where they are actually used (#944).
 *
 * ## Why this is a text scan rather than a runtime assertion
 *
 * The suite runs with `css: false` and jsdom has no layout or paint, so nothing here can read
 * a computed colour. `services/wa-color.ts` can — it resolves a `--wa-*` token by probe and
 * canvas readback — but only in a browser. So this resolves the chain from disk instead:
 *
 *     keep-theme.css   --keep-color-danger-text: var(--wa-color-danger-40)
 *     variants/danger  --wa-color-danger-40:     var(--wa-color-red-40)
 *     palettes/default --wa-color-red-40:        #b30532
 *
 * Checked against Chrome while #944 was fixed: every value this produces matches what the
 * browser computes, so the arithmetic is the same one a user experiences.
 *
 * ## Four backgrounds, not two
 *
 * That is the mistake this guards against, and it is the one that caused #944. The original
 * pair was measured against the two `surface-default` values — `#ffffff` and `#1e1e2e` — where
 * step 50 gave 4.59 and cleared AA honestly. But these are text colours and plenty of
 * consumers sit on the *page*, which is `#f5f5f5` light and `#181825` dark, and there step 50
 * is **4.20** — a small but real AA failure.
 *
 * So each mode is asserted against both of its backgrounds. A step is only safe if it clears
 * the *darker* of the two light backgrounds and the *lighter* of the two dark ones.
 */

const WA = 'node_modules/@awesome.me/webawesome/dist/styles';
const ROOT = join(__dirname, '../..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

/** WCAG 1.4.3 AA for normal-size text. Every consumer renders these at 16px/500. */
const AA_NORMAL_TEXT = 4.5;

/**
 * The backgrounds each mode must clear.
 *
 * `page` is `getTheme().bodyColor` from `store/styles/action.ts`; `surface` is
 * `--wa-color-surface-default`. Both are real: a validation message can sit on either.
 */
const BACKGROUNDS = {
  light: { page: '#f5f5f5', surface: '#ffffff' },
  dark: { page: '#181825', surface: '#1e1e2e' },
};

const luminance = (hex: string): number => {
  const [r, g, b] = hex
    .replace('#', '')
    .match(/\w\w/g)!
    .map((h) => parseInt(h, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Number((((hi + 0.05) / (lo + 0.05)).toFixed(2)));
};

/** The `:root` and `:root.wa-dark` blocks of keep-theme.css, split apart. */
const themeBlocks = (): { light: string; dark: string } => {
  const css = read('src/styles/keep-theme.css');
  const darkAt = css.indexOf(':root.wa-dark');
  expect(darkAt, 'keep-theme.css has no :root.wa-dark block').toBeGreaterThan(-1);
  return { light: css.slice(0, darkAt), dark: css.slice(darkAt) };
};

/** `--keep-color-danger-text: var(--wa-color-danger-40)` → `40`. */
const stepFor = (block: string, kind: 'danger' | 'success'): string => {
  const m = block.match(
    new RegExp(`--keep-color-${kind}-text:\\s*var\\(--wa-color-${kind}-(\\d+)\\)`),
  );
  expect(m, `no --keep-color-${kind}-text in this block`).not.toBeNull();
  return m![1];
};

/** `--wa-color-danger-40` → `--wa-color-red-40` → `#b30532`, both hops read from WA. */
const resolve = (kind: 'danger' | 'success', step: string): string => {
  const variant = read(`${WA}/color/variants/${kind}.css`);
  // The first block is `:where(:root)` — the default variant. Later blocks are opt-in classes.
  const hue = variant.match(new RegExp(`--wa-color-${kind}-${step}:\\s*var\\(--wa-color-(\\w+)-${step}\\)`));
  expect(hue, `${kind}-${step} is not mapped to a hue in WebAwesome`).not.toBeNull();

  const palette = read(`${WA}/color/palettes/default.css`);
  const hex = palette.match(new RegExp(`--wa-color-${hue![1]}-${step}:\\s*(#[0-9a-fA-F]{6})`));
  expect(hex, `${hue![1]}-${step} has no hex in the default palette`).not.toBeNull();
  return hex![1].toLowerCase();
};

describe('validation-text tokens clear AA where they are used (#944)', () => {
  it('resolves the token chain at all, or every case below passes vacuously', () => {
    const step = stepFor(themeBlocks().light, 'danger');
    expect(step).toMatch(/^\d+$/);
    expect(resolve('danger', step)).toMatch(/^#[0-9a-f]{6}$/);
  });

  for (const mode of ['light', 'dark'] as const) {
    for (const kind of ['danger', 'success'] as const) {
      it(`${mode} --keep-color-${kind}-text clears AA on the page and on a surface`, () => {
        const step = stepFor(themeBlocks()[mode], kind);
        const hex = resolve(kind, step);
        const { page, surface } = BACKGROUNDS[mode];

        expect(
          contrast(hex, page),
          `${kind}-${step} (${hex}) on the ${mode} page ${page} — AA needs ${AA_NORMAL_TEXT}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);

        expect(
          contrast(hex, surface),
          `${kind}-${step} (${hex}) on the ${mode} surface ${surface} — AA needs ${AA_NORMAL_TEXT}`,
        ).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
      });
    }
  }

  /**
   * The arithmetic itself, against a value measured in Chrome. Without this, a bug in
   * `luminance` or `contrast` would make every assertion above pass for the wrong reason.
   */
  it('computes the same ratios Chrome does', () => {
    expect(contrast('#b30532', '#f5f5f5')).toBe(6.45); // danger-40, the new light value
    expect(contrast('#dc3146', '#f5f5f5')).toBe(4.21); // danger-50, the value #944 rejected
    expect(contrast('#f3676c', '#181825')).toBe(5.82); // danger-60, the dark value
  });
});
