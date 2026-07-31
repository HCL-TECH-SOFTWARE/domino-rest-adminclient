/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

/**
 * Every value this app interpolates into an API query string is percent-encoded (#978).
 *
 * The rule is one line long and the codebase disagreed with it at twenty-five of twenty-eight
 * sites. `nsfPath` went in raw almost everywhere:
 *
 * ```ts
 * fetch(`${SETUP_KEEP_API_URL}/designlist/forms?nsfPath=${nsfPath}`, …)
 * ```
 *
 * Most paths survive that. A space is repaired by the URL parser on the way out, and a `/` is
 * legal unencoded in a query value. What does not survive is anything that changes how the
 * query string *parses*: `&` starts the next parameter, `#` truncates the URL at the fragment,
 * `+` reads as a space on many servers. An NSF whose path contains one addresses a different
 * database, and the failure surfaces as a 404 that names nothing about encoding.
 *
 * ## Why a test rather than a convention
 *
 * The trap is that the same string is used for two purposes with opposite requirements. The
 * router decodes: `matchPath` runs `safeDecode` over every captured segment, so a route param
 * is decoded before any element sees it, and that decoded value is right for the design cache
 * — `nsfDesigns` is keyed on it, which is the lookup #933 fixed. It is wrong for the URL. The
 * two readings are one property apart, so `keep-field-list` held both at once: it read
 * `designs.value?.[this.nsfPath]` for the cache and passed `fullEncode(this.nsfPath)` into the
 * thunks, which then interpolated *that* raw. Nothing about either line looks wrong alone.
 *
 * So the invariant is stated where it can be checked: encode at the point of use, and let the
 * value stay decoded everywhere else.
 *
 * ## No allowlist
 *
 * Deliberately. Encoding a query value is correct at every endpoint regardless of what the
 * value means, so an exception could only ever record an oversight. #978 named `nsfPath`; the
 * other five sites this found — two `scopeName`, two `dataSource`, one `startsWith` — were
 * fixed with it rather than listed here, because a rule with five exceptions is not a rule.
 */

const ROOT = resolve(process.cwd());
const SRC = join(ROOT, 'src');

const sources = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sources(join(dir, entry.name))
      : /\.tsx?$/.test(entry.name)
        ? [join(dir, entry.name)]
        : [],
  );

/**
 * A query parameter whose value is interpolated: `?nsfPath=${…}`, `&configName=${…}`.
 *
 * The expression cannot itself contain a `}`, which holds for every URL in `src` — they are
 * identifiers, member chains and single calls, never object literals or nested templates.
 */
const PARAMETER = /[?&]([A-Za-z][A-Za-z0-9_]*)=\$\{([^}]*)\}/g;

/**
 * The template literals that build an API URL.
 *
 * Every request in `src` starts from one of the `*_KEEP_API_URL` constants — the sole
 * exception is `/adminui.json`, a static asset with no query string. That marker is what
 * separates a URL from the other two things that look like one to a regex: Lit's boolean
 * attribute binding, which is spelt `?disabled=${…}`, and a docblock quoting either.
 *
 * `keep-edit-view` splits its URL across two literals joined by `+` to stay inside the line
 * limit, so a literal also counts when nothing but whitespace and a `+` separates it from the
 * previous one — that is what the second half of a wrapped URL looks like, and it is where
 * the `nsfPath` of that request lives.
 */
const urlTemplates = (source: string): string[] => {
  const templates: string[] = [];
  let previousEnd = 0;
  let previousWasUrl = false;

  for (const match of source.matchAll(/`[^`]*`/g)) {
    const start = match.index ?? 0;
    // All three are annotated: each is derived from `previousWasUrl`, which is then assigned
    // from the last of them, and control-flow inference will not close that loop (TS7022).
    const continues: boolean =
      previousWasUrl && /^[\s+]*$/.test(source.slice(previousEnd, start));
    const isUrl: boolean = match[0].includes('KEEP_API_URL') || continues;

    if (isUrl) templates.push(match[0]);
    previousEnd = start + match[0].length;
    previousWasUrl = isUrl;
  }

  return templates;
};

const findings = sources(SRC).flatMap((file) =>
  urlTemplates(readFileSync(file, 'utf8')).flatMap((template) =>
    [...template.matchAll(PARAMETER)].map(([, name, expression]) => ({
      site: `${relative(ROOT, file)}  ${name}=\${${expression}}`,
      encoded: expression.startsWith('encodeQueryValue('),
    })),
  ),
);

describe('API query strings', () => {
  it('finds the URLs to check, so a walk that matched nothing cannot pass', () => {
    // Every guard that reads the source needs this: rename the URL constants, or change how a
    // request is built, and the rule below goes quiet rather than failing.
    expect(findings.length).toBeGreaterThanOrEqual(28);
  });

  it('percent-encodes every interpolated value', () => {
    expect(findings.filter((finding) => !finding.encoded).map((finding) => finding.site)).toEqual(
      [],
    );
  });

  it('reaches the sites #978 was opened about', () => {
    // Named rather than counted: `nsfPath` is the parameter the issue is about, and a walk
    // that silently stopped covering it would still satisfy the two rules above.
    const paths = findings.filter((finding) => finding.site.includes('nsfPath='));

    expect(paths.length).toBeGreaterThanOrEqual(23);
    expect(paths.every((finding) => finding.encoded)).toBe(true);
  });
});
