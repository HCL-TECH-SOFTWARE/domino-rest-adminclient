/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KEEP_ADMIN_BASE_COLOR } from '../../src/config.dev';
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

/*
 * Comments are stripped first. This file is heavily commented and the comments name
 * the tokens they explain, so `--wa-color-brand-50: …` inside prose would otherwise
 * be matched as a declaration — which is exactly what happened while #765 was being
 * written.
 */
const CSS = readFileSync(join(__dirname, '../../src/styles/keep-theme.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
);

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

describe('keep-theme.css — the brand ramp is the only purple (#765)', () => {
  /*
   * The CSS side of the app reads var(--wa-color-brand-50). MUI cannot: getTheme()
   * hands createTheme() plain strings, so KEEP_ADMIN_BASE_COLOR has to repeat the
   * value as JS. Repeating it is how the app ended up with four purples in the first
   * place, so pin the copy to the original.
   */
  const lightBlock = CSS.slice(CSS.indexOf(':root'), CSS.indexOf(':root.wa-dark'));

  it('KEEP_ADMIN_BASE_COLOR equals --wa-color-brand-50', () => {
    expect(KEEP_ADMIN_BASE_COLOR.toLowerCase()).toBe(declared(lightBlock, '--wa-color-brand-50'));
  });

  it('is the only stylesheet defining the brand ramp or the new keep-* tokens', () => {
    const tokens = [
      '--wa-color-brand-50',
      '--wa-color-brand-on',
      '--keep-surface-accent',
      '--keep-surface-highlight',
      '--keep-color-danger-text',
      '--keep-tooltip-surface',
    ];
    for (const file of ['keep-overrides.css', 'dark-mode.css', 'styles.css']) {
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

describe('dark-mode.css — element styling belongs in the element (#765)', () => {
  /*
   * dark-mode.css used to restate, from the document, what 15 element rules
   * already say inside their own shadow roots. #708 tokenized the elements; these
   * became dead weight, and worse than dead weight: a `light-dark()` in a `::part`
   * rule is evaluated in the *shadow tree's* color-scheme context, which is the
   * inheritance gap #708 documented — so the global copy could resolve to the wrong
   * branch while the element's own rule resolved correctly.
   *
   * Deleting them was verified to change nothing: every wa-* part and keep-* host
   * computes the same colour before and after, measured in Chrome through the
   * keep-* wrappers the app actually renders. (Probing a *bare* <wa-drawer> or
   * <wa-card> shows a difference, but the app never mounts one — they only exist
   * inside keep-drawer and keep-default-card, which style their own parts.)
   *
   * The rule this encodes: style an element inside the element. The document sheet
   * is for MUI, which has no shadow root and cannot style itself.
   */
  const DARK = readFileSync(join(__dirname, '../../src/styles/dark-mode.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );

  it('has no rule whose selectors are all wa-* or keep-* elements', () => {
    const offenders: string[] = [];
    for (const [, selector] of DARK.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
      const parts = selector
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length && parts.every((p) => /^(wa|keep)-[a-z-]+(::part\([a-z-]+\))?$/.test(p))) {
        offenders.push(parts.join(', '));
      }
    }
    expect(offenders, 'move these into the element that owns them').toEqual([]);
  });
});

describe('Web Awesome token names (#765)', () => {
  /*
   * Shoelace-era names have now been found three times: #706 (--wa-color-brand-600/
   * 500/700), #708 (--wa-color-neutral-700/-1000/-0/-950 and --wa-font-size-small/
   * -medium/-large) and #765 (--wa-color-danger-600/300/700, success ditto).
   *
   * They fail *silently*, in two different ways, which is why they keep surviving
   * review:
   *
   *   var(--wa-color-danger-600, red)  the fallback always wins, so the code looks
   *                                    token-driven while being hardcoded
   *   var(--wa-color-danger-600)       no fallback, so the declaration is invalid at
   *                                    computed-value time and is dropped entirely —
   *                                    the style simply never renders
   *
   * The second is what made the `:state(user-invalid)` border invisible even after
   * #744 fixed the selector it hangs off. `css: false` means no runtime test can see
   * a painted colour, so scan the source instead.
   *
   * Web Awesome 3.x scales: colour steps are 05…95, font sizes are 2xs…5xl plus
   * `smaller`/`larger` and s/m/l. Anything else does not exist.
   */
  const SRC = join(__dirname, '../../src');

  /** Every `var(--wa-…)` read across src, with the file it came from. */
  const reads = (() => {
    const out: { file: string; token: string }[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(ts|tsx|css)$/.test(entry.name)) {
          const text = readFileSync(full, 'utf8');
          for (const m of text.matchAll(/var\(\s*(--wa-[a-z0-9-]+)/g)) {
            out.push({ file: relative(SRC, full), token: m[1] });
          }
        }
      }
    };
    walk(SRC);
    return out;
  })();

  it('finds token reads to scan', () => {
    expect(reads.length).toBeGreaterThan(100);
  });

  it('never reads a colour step outside WA\'s 05…95 scale', () => {
    const bad = reads.filter(({ token }) => /^--wa-color-[a-z]+-(0|\d{3,4})$/.test(token));
    expect(
      bad.map((b) => `${b.file}: ${b.token}`),
      'Shoelace-era 3-digit colour steps do not exist in WA 3.x',
    ).toEqual([]);
  });

  it('never reads a font size outside WA\'s scale', () => {
    const bad = reads.filter(({ token }) => /^--wa-font-size-(small|medium|large)$/.test(token));
    expect(
      bad.map((b) => `${b.file}: ${b.token}`),
      'WA has --wa-font-size-{2xs…5xl,smaller,larger,s,m,l} — not small/medium/large',
    ).toEqual([]);
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
