/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * Every `<wa-icon name=…>` names the bundled library.
 *
 * A `<wa-icon>` with no `library` falls through to Web Awesome's stock resolver, which fetches
 * the glyph from `ka-f.fontawesome.com`. That is the failure this guards, and its character is
 * why it needs guarding at all: the icon *renders*. The request is permitted by the
 * `connect-src` wildcard in the production policy, so CSP does not refuse it and nothing is
 * reported. The only symptom is a third-party request per icon, on a page whose whole point is
 * that it is served from one origin — and it is invisible in review, because the missing
 * attribute looks like every other omitted optional attribute.
 *
 * ## This is the half of `KeepIcon` worth keeping
 *
 * `components/keep-elements/react/KeepIcon.ts` applied `library` itself and deliberately did
 * not expose it as a prop, so no `.tsx` call site could unset it. Its own test said as much:
 * "the reason this component exists". #719 deleted the wrapper with the rest of React, and
 * with it the *structural* guarantee — the 115 call sites left write the tag directly in Lit
 * templates, where the attribute is one that can simply be forgotten.
 *
 * So the enforcement moves from a type signature to a scan. It is the weaker mechanism, which
 * is the honest trade: a Lit template can name any attribute it likes, and pretending
 * otherwise would need a wrapper element whose only job is to add one attribute.
 *
 * `src=` is exempt: that form points at a URL directly and never reaches a library resolver.
 * `keep-nsf-card` uses it for database icons served by the app itself.
 */

const ROOT = resolve(process.cwd());
const SRC = join(ROOT, 'src');

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });

/**
 * Comments dropped in all three spellings this repo uses.
 *
 * The `<!-- -->` case is not hypothetical: several element docblocks show a `<wa-icon>` inline
 * to explain a sizing decision, and `services/icon-library.ts` writes five of them out in
 * prose while documenting the resolver. Counting those would make this fail on its own
 * documentation.
 */
const code = (text: string) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const SOURCES = walk(SRC)
  .filter((file) => /\.tsx?$/.test(file))
  .map((file) => ({ file: file.slice(ROOT.length + 1), text: code(readFileSync(file, 'utf8')) }));

/** Every opening `<wa-icon …>` tag, attributes and all, across however many lines. */
const iconTags = SOURCES.flatMap(({ file, text }) =>
  [...text.matchAll(/<wa-icon\b[\s\S]*?>/g)].map((match) => ({
    file,
    tag: match[0].replace(/\s+/g, ' '),
  })),
);

describe('wa-icon always names its library', () => {
  it('finds the call sites to scan', () => {
    // A regex that matched nothing would make the case below pass with nothing checked. The
    // floor is far under the real count (115 at the time of writing) so that deleting a screen
    // does not fail this, but it is high enough that a broken scan cannot clear it.
    expect(iconTags.length, 'no <wa-icon> tags parsed out of src').toBeGreaterThan(50);
  });

  it('resolves every named glyph from the bundled library', () => {
    const offenders = iconTags
      .filter(({ tag }) => /\bname\s*=/.test(tag) && !/\blibrary\s*=/.test(tag))
      .map(({ file, tag }) => `${file}  ${tag}`);

    expect(
      offenders,
      `${offenders.length} <wa-icon> without a library:\n  ${offenders.join('\n  ')}\n\n` +
        "Add library=${FA_LIBRARY} from services/icon-library. Without it Web Awesome's stock " +
        'resolver fetches the glyph from ka-f.fontawesome.com — the icon still renders and the ' +
        'CSP connect-src wildcard permits the request, so nothing anywhere reports it.',
    ).toEqual([]);
  });
});
