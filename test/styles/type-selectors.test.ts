/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The two document-scope sheets may not add a *bare type selector*.
 *
 * This is the shape of bug #907 was. `keep-overrides.css` carried
 *
 *     img { background: #383838; border-radius: 8px; padding: 10px; … }
 *
 * under a `/* DefaultCard base styles *​/` heading, written for the app icon in the
 * default card. That card is a Lit element, so the rule that actually styles the icon is
 * the copy inside `keep-default-card.ts`'s `static styles` — document CSS does not cross a
 * shadow boundary. What the document copy did reach was every *other* `<img>` in the app:
 * the homepage tiles, both logos and the import-dialog icons, each getting a 10px
 * `#383838` frame. `#383838` is mode-invariant, so it hid against the dark card in dark
 * mode and read as a black border in light mode, which is how it was reported.
 *
 * Two properties make this class of rule expensive out of proportion to its size:
 *
 * - It is written for one component and reaches every element of that type, so its blast
 *   radius is nothing like what the surrounding heading implies.
 * - It cannot reach the component it was written for once that component converts to a Lit
 *   element, and nothing about the rule changes when that happens. It goes from
 *   load-bearing to purely harmful with no edit and no diff to review. #806 converts more
 *   screens, so this will keep coming up.
 *
 * A ratchet rather than a ban: the four that already exist are listed below with what they
 * reach today. Adding a fifth fails here.
 */

const ROOT = resolve(process.cwd());

/** Both hand-written document-scope sheets. `dark-mode.css` is excluded for the reason
 *  given in dead-selectors.test.ts — it is mostly `.Mui*` overrides.
 *
 *  `styles.css` is the larger of the two by an order of magnitude and has none at all,
 *  which is why it is in scope at zero cost: it is the sheet most likely to grow one. */
const SHEETS = ['src/styles/styles.css', 'src/styles/keep-overrides.css'];

/**
 * Bare type selectors that predate #907. Each is the same shape and is left alone here
 * because correcting it changes a screen this test cannot see (the suite runs with
 * `css: false`), so each needs its own browser check.
 */
const ALLOWED: Record<string, string> = {
  // Both duplicated inside keep-default-card.ts's static styles, like `img` was. `<text>`
  // is not an HTML element; the app uses it as a bare tag in JSX and Lit templates, so
  // these do reach something — AddImportDialog's option titles, among others.
  text: 'duplicated in keep-default-card.ts; reaches <text> tags across the app',
  'text, strong': 'duplicated in keep-default-card.ts; reaches <text>/<strong> app-wide',
  // Reaches Section.tsx's `<section className="diagram">` on the homepage, where
  // `overflow: hidden` and `white-space: nowrap` are unlikely to be wanted.
  section: 'duplicated in keep-default-card.ts; reaches Section.tsx’s diagram <section>',
  // Dead rather than harmful: every wa-card in the tree is inside a keep-* shadow root
  // (keep-tip, keep-default-card), so this reaches nothing at all.
  'wa-card': 'reaches no element — every wa-card in the tree is inside a shadow root',
};

/**
 * Top-level selectors, found by their indentation: a rule at column 0 is top-level and a
 * nested one (`&:hover`) is indented. Same trick as dead-selectors.test.ts, and the same
 * reason — these sheets are hand-written and consistently formatted, and a real CSS parser
 * would be a dependency to catch one thing.
 */
const topLevelSelectors = (css: string) =>
  [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/^([^{}@/\s][^{}]*?)\s*\{/gm)].map((match) =>
    match[1].trim().replace(/\s+/g, ' '),
  );

/** True when every comma-separated part is a bare element name — no class, id or attribute. */
const isBareType = (selector: string) =>
  selector.split(',').every((part) => /^[a-zA-Z][a-zA-Z0-9-]*$/.test(part.trim()));

describe('document-scope sheets add no new bare type selector (#907)', () => {
  const sheets = SHEETS.map((path) => ({
    path,
    selectors: topLevelSelectors(readFileSync(resolve(ROOT, path), 'utf8')),
  }));

  it('finds both sheets and their rules', () => {
    // A bad path or a broken regex would make every assertion below vacuously pass.
    //
    // Per-sheet only. There was an aggregate `> 300` here as well; it is removed rather than
    // lowered, because it was redundant for this test's stated purpose and actively harmful
    // to it. The purpose is non-vacuity, and the per-sheet floor is the *stronger* check —
    // an aggregate can be satisfied while one sheet parses to nothing, which is precisely the
    // failure it was meant to catch.
    //
    // What the aggregate actually tracked was the size of the stylesheet, which #806 shrinks
    // every wave as screens move into shadow roots. It had already been edited once for that
    // reason and was about to be edited a third time — a number that must be re-set whenever
    // the thing it measures legitimately changes is not a guard, it is a chore that trains
    // people to move floors.
    for (const { path, selectors } of sheets) {
      expect(selectors.length, `no top-level rules parsed out of ${path}`).toBeGreaterThan(20);
    }
  });

  it.each(SHEETS)('%s adds none beyond the four that predate #907', (path) => {
    const { selectors } = sheets.find((sheet) => sheet.path === path)!;
    const unlisted = [...new Set(selectors.filter(isBareType))].filter((s) => !(s in ALLOWED));

    expect(
      unlisted,
      `${path} adds ${unlisted.length} bare type selector(s): ${unlisted.join(' / ')}.\n` +
        'A bare type selector reaches every element of that type in the light DOM, which is ' +
        'almost never the intent, and reaches nothing inside a keep-* shadow root, which is ' +
        'usually where the component it was written for now lives. Scope it to a class, or ' +
        "move it into the element's own `static styles`. See the note at the top of this file.",
    ).toEqual([]);
  });

  /**
   * Spelled out separately from the ratchet above so a reintroduction fails by name. This
   * is the one that shipped: it is the reason the homepage tiles had a black frame in light
   * mode, and — because the box-sizing reset does not cross a shadow boundary either, so
   * the slotted anchor's `<img>` inherits `content-box` from the `<slot>` — the reason
   * `width: 100%` plus 10px of padding overflowed wa-card's media box by 20px.
   */
  it('never again styles img in document scope', () => {
    for (const { path, selectors } of sheets) {
      expect(
        selectors.filter(isBareType),
        `${path} styles every <img> in the app again (#907). The default card's icon is ` +
          "styled by the copy in keep-default-card.ts's static styles; a document-scope " +
          'rule cannot reach it and hits the homepage tiles and both logos instead.',
      ).not.toContain('img');
    }
  });
});
