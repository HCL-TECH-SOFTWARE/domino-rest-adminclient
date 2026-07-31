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
   * The point of #708 is that this palette existed in three places at once, so pin the
   * remaining two to each other: editing one without the other fails here rather than
   * showing up as a colour that is subtly wrong in one half of the app.
   *
   * #709 has since removed getTheme()'s only consumer — src/theme.ts fed it to MUI's
   * createTheme(), and both are gone — so this is now a stylesheet pinned to a JS object
   * that nothing in src reads. The pin is kept rather than deleted because these are the
   * literals a reviewer checks the dark palette against, but getTheme() and
   * KEEP_ADMIN_BASE_COLOR (below) are dead exports now and deleting them, with this
   * describe block, is the honest end of #708. It is left as its own change: it moves
   * coverage on src/store/**, which this pass has no way to measure.
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
    const others = ['keep-overrides.css', 'styles.css'];
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
    for (const file of ['keep-overrides.css', 'styles.css']) {
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

describe('keep-theme.css — white-on-brand clears WCAG AA in both modes (#910)', () => {
  /*
   * `--keep-surface-brand` is a fill that carries white text, at four sites. Three are
   * 24px; `.drawer-available-databases-text` is **18px at weight 400**, which WCAG 2.1
   * counts as normal text (large is ≥18pt/24px, or ≥14pt/18.66px bold). So the pair has to
   * clear **4.5:1**, not the 3.0 the old comment in keep-theme.css claimed.
   *
   * It did not: the dark half read brand-60 and measured 3.21. This computes the number
   * from the stylesheet instead of trusting a comment, because the comment was wrong for
   * as long as it existed and nothing could tell.
   */
  const lightBlock = CSS.slice(CSS.indexOf(':root'), CSS.indexOf(':root.wa-dark'));
  const darkRoot = CSS.slice(CSS.indexOf(':root.wa-dark'));

  /** Relative luminance per WCAG 2.1, from a #rrggbb string. */
  const luminance = (hex: string) => {
    const n = hex.replace('#', '');
    const [r, g, b] = [0, 2, 4]
      .map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const contrastWithWhite = (hex: string) => {
    const lo = luminance(hex);
    return (1.05) / (lo + 0.05);
  };

  /**
   * Resolve a ramp step to a hex. The dark block overrides only some steps, so an
   * unresolved one falls back to the light declaration, exactly as the cascade does.
   *
   * Throws rather than expects, so the return type is a plain `string` — an `expect` does
   * not narrow `string | undefined`, and threading the union through the arithmetic below
   * would obscure it.
   */
  const resolveStep = (block: string, step: string): string => {
    const hex = declared(block, step) ?? declared(lightBlock, step);
    if (!hex || !/^#[0-9a-f]{6}$/.test(hex)) {
      throw new Error(`could not resolve ${step} to a hex (got ${String(hex)})`);
    }
    return hex;
  };

  /** Follow `--keep-surface-brand` to the ramp step it names, and that step to a hex. */
  const resolveSurfaceBrand = (mode: 'light' | 'dark') => {
    const block = mode === 'dark' ? darkRoot : lightBlock;
    const decl = /--keep-surface-brand:\s*var\((--wa-color-brand-[0-9]+)\)/.exec(block);
    if (!decl) throw new Error(`${mode}: --keep-surface-brand is not a brand ramp step`);
    return { step: decl[1], hex: resolveStep(block, decl[1]) };
  };

  for (const mode of ['light', 'dark'] as const) {
    it(`white text on the brand fill clears 4.5:1 in ${mode} mode`, () => {
      const { step, hex } = resolveSurfaceBrand(mode);
      const ratio = contrastWithWhite(hex);
      expect(
        ratio,
        `${mode}: --keep-surface-brand is ${step} (${hex}), giving white text ` +
          `${ratio.toFixed(2)}:1. The 18px consumer needs 4.5:1 — pick a darker ramp step.`,
      ).toBeGreaterThanOrEqual(4.5);
    });
  }

  it('the surface half is a darker step than the text half in dark mode', () => {
    // The two roles pull in opposite directions, which is the whole reason #765 split them.
    // Pinning the direction stops a future edit from collapsing them back onto one step.
    const surface = resolveSurfaceBrand('dark');
    const textDecl = /--keep-text-brand:\s*var\((--wa-color-brand-[0-9]+)\)/.exec(darkRoot);
    if (!textDecl) throw new Error('dark: --keep-text-brand is not a brand ramp step');
    const textHex = resolveStep(darkRoot, textDecl[1]);
    expect(luminance(surface.hex)).toBeLessThan(luminance(textHex));
  });
});

describe('the document sheet does not style elements that can style themselves (#765)', () => {
  /*
   * `dark-mode.css` used to restate, from the document, what 15 element rules already say
   * inside their own shadow roots. #708 tokenized the elements; those became dead weight, and
   * worse than dead weight: a `light-dark()` in a `::part` rule is evaluated in the *shadow
   * tree's* color-scheme context — the inheritance gap #708 documented — so the global copy
   * could resolve to the wrong branch while the element's own rule resolved correctly.
   *
   * That file is now deleted (#924, #959). #969 had already removed its 53 `.Mui*` selectors
   * with the last MUI package; of the 22 left, most named classes that had moved into a shadow
   * root, seven declarations were the invalid `light-dark(inherit, …)`, and its
   * `body[data-theme="dark"]` block had never parsed at all — a stray U+FEFF in front of the
   * selector took the whole block with it. Only the scrollbar and link rules still matched
   * light DOM, and those moved to `styles.css`.
   *
   * The guard outlives the file, retargeted at `styles.css`, because the rule it encodes has
   * not changed: **style an element inside the element.** The document sheet existed for MUI,
   * which has no shadow root and cannot style itself — and MUI is gone entirely now.
   */
  const DOC = readFileSync(join(__dirname, '../../src/styles/styles.css'), 'utf8').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );

  it('has no rule whose selectors are all wa-* or keep-* elements', () => {
    const offenders: string[] = [];
    for (const [, selector] of DOC.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
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
