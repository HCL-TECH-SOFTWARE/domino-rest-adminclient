/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * The Keep elements may not style a WebAwesome part that does not exist, or set a
 * `--wa-*` custom property that WebAwesome does not define.
 *
 * Both mistakes are **completely silent**. A `::part()` naming a part the component does
 * not expose matches nothing; a `var()` read of an undefined custom property falls back,
 * and *setting* one is simply ignored. Nothing warns, the build is green, and the rule sits
 * there looking like theming. The suite cannot see it either — `css: false`.
 *
 * Seven were found when this test was written, across five elements:
 *
 *   wa-callout::part(base)                keep-alert      real parts: icon, message
 *   wa-callout::part(body)                keep-alert
 *   wa-card::part(base)                   keep-default-card   real: media, header, body, footer
 *   wa-drawer::part(panel)                keep-drawer     the panel is exposed as `dialog`
 *   wa-input::part(form-control-label)    keep-input-date real: label
 *   --wa-panel-background-color           keep-tip, keep-default-card
 *   --wa-panel-border-color               keep-tip, keep-default-card
 *
 * The last two were the expensive ones. `wa-card` reads `--wa-color-surface-*`,
 * `--wa-panel-border-radius` and `--wa-shadow-s`; it has never read a
 * `--wa-panel-background-color`, and only `--wa-panel-border-radius`, `-border-style` and
 * `-border-width` exist at all. Both cards therefore fell back to WebAwesome's defaults —
 * which in **light** mode means `--wa-color-surface-raised`, and that is `white`, the same
 * as the page. The schema, scope and overview cards were near-invisible in light mode for
 * as long as those declarations had been there, and they read as deliberate theming.
 *
 * Both checks are driven by WebAwesome's own shipped metadata rather than a hand-written
 * list, so a version bump that renames a part or retires a token fails here rather than
 * silently switching a rule off.
 */

const ROOT = resolve(process.cwd());
const ELEMENTS = 'src/components/keep-elements';
const WA = 'node_modules/@awesome.me/webawesome/dist';

/**
 * Comments are stripped before scanning, and that is not a nicety.
 *
 * Every one of these rules gets a comment explaining what it replaced, and those comments
 * name the dead selector. Scanning raw text reports the explanation as a fresh offence —
 * which is exactly what happened while writing this.
 */
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const elementSources = readdirSync(resolve(ROOT, ELEMENTS))
  .filter((name) => name.endsWith('.ts'))
  .map((name) => ({ file: `${ELEMENTS}/${name}`, text: code(readFileSync(resolve(ROOT, ELEMENTS, name), 'utf8')) }));

/** tag → the parts it exposes, from WebAwesome's custom-elements manifest. */
const partsByTag: Record<string, Set<string>> = {};
{
  const manifest = JSON.parse(readFileSync(resolve(ROOT, WA, 'custom-elements.json'), 'utf8'));
  for (const module of manifest.modules ?? []) {
    for (const decl of module.declarations ?? []) {
      if (decl.tagName) {
        partsByTag[decl.tagName] = new Set((decl.cssParts ?? []).map((p: { name: string }) => p.name));
      }
    }
  }
}

/** Every `--wa-*` name WebAwesome defines, from its stylesheets and the manifest. */
const waTokens = new Set<string>();
{
  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? walk(path) : [path];
    });
  for (const file of walk(resolve(ROOT, WA, 'styles')).filter((f) => f.endsWith('.css'))) {
    for (const m of readFileSync(file, 'utf8').matchAll(/(--wa-[a-z0-9-]+)\s*:/g)) waTokens.add(m[1]);
  }
  const manifest = JSON.parse(readFileSync(resolve(ROOT, WA, 'custom-elements.json'), 'utf8'));
  for (const module of manifest.modules ?? []) {
    for (const decl of module.declarations ?? []) {
      for (const prop of decl.cssProperties ?? []) waTokens.add(prop.name);
    }
  }
}

describe('WebAwesome usage in the Keep elements', () => {
  it('reads WebAwesome metadata rather than a hand-written list', () => {
    // If either source stops parsing, every case below passes vacuously.
    expect(Object.keys(partsByTag).length).toBeGreaterThan(20);
    // `actions` joined the other four when Web Awesome went to 3.11.0. Still pinned as an
    // exact set rather than relaxed to a subset check: the point of the canary is that it
    // notices metadata changing shape, so an upgrade adding a part *should* stop here and
    // be looked at once.
    expect(partsByTag['wa-card']).toEqual(new Set(['media', 'header', 'body', 'footer', 'actions']));
    expect(waTokens.size).toBeGreaterThan(200);
    expect(elementSources.length).toBeGreaterThan(20);
  });

  it('styles no ::part() the component does not expose', () => {
    const offenders: string[] = [];

    for (const { file, text } of elementSources) {
      for (const m of text.matchAll(/(wa-[a-z-]+)::part\(([a-z-]+)\)/g)) {
        const [, tag, part] = m;
        const known = partsByTag[tag];
        // An unknown tag means WebAwesome renamed or dropped the component — also worth
        // failing on, but reported differently so the cause is not guessed at.
        if (!known) {
          offenders.push(`${file}: ${tag} is not a WebAwesome component`);
        } else if (!known.has(part)) {
          offenders.push(`${file}: ${tag}::part(${part}) — real parts: ${[...known].join(', ')}`);
        }
      }
    }

    expect(offenders, `these ::part() selectors match nothing:\n  ${offenders.join('\n  ')}`).toEqual([]);
  });

  it('sets no --wa-* custom property WebAwesome does not define', () => {
    const offenders: string[] = [];

    for (const { file, text } of elementSources) {
      // A *declaration*, not a `var()` read: `  --wa-foo: …`.
      for (const m of text.matchAll(/^[ \t]*(--wa-[a-z0-9-]+)\s*:/gm)) {
        if (!waTokens.has(m[1])) offenders.push(`${file}: ${m[1]}`);
      }
    }

    expect(
      offenders,
      `these custom properties do not exist, so setting them does nothing:\n  ${offenders.join('\n  ')}`,
    ).toEqual([]);
  });
});
