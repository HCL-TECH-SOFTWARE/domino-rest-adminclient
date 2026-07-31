/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * #987 — the appearance boot keeps its own chunk and its own `<script>` tag.
 *
 * `src/appearance-boot.ts` writes the theme class from `localStorage` and has to land before
 * the first paint (#707). Vite emits **one entry chunk per HTML page** however many
 * `<script type="module" src>` tags it finds, so declaring it in `index.html` — the obvious
 * thing, and what shipped from #707 until now — concatenated an 81-byte write into ~90 kB of
 * application. Measured both ways; moving the tag between `<head>` and `<body>` changed not one
 * byte of the output.
 *
 * Two things hold the fix in place, and this file is the weaker of them. The stronger is that
 * `appearanceBootScript()` **throws** if the entry chunk is missing, which fails the build.
 * What that cannot catch is the tag coming *back* into `index.html`: the plugin would still
 * find its chunk, still inject its tag, and the HTML copy would quietly be folded into the app
 * entry again — two tags in the output, the second of them useless. Hence the scan below.
 *
 * A source scan and not a build assertion, because a build costs ~15s and this needs to run in
 * the ordinary suite. The build is where the arrangement is actually exercised.
 */

const ROOT = resolve(process.cwd());
const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8');

const html = read('index.html');
const config = read('vite.config.mts');

/** HTML comments dropped, so the note explaining the absent tag is not read as the tag. */
const markup = (text: string) => text.replace(/<!--[\s\S]*?-->/g, '');

/** Block and line comments dropped, for the same reason on the config side. */
const code = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('the appearance boot is its own entry (#987)', () => {
  it('finds the files it guards', () => {
    // A bad path would make every case below vacuous.
    expect(markup(html)).toContain('<keep-app></keep-app>');
    expect(code(config)).toContain('defineConfig');
  });

  it('declares no script tag for it in index.html', () => {
    const tags = [...markup(html).matchAll(/<script\b[^>]*src="([^"]+)"/g)].map((m) => m[1]);

    expect(
      tags.filter((src) => src.includes('appearance-boot')),
      'index.html declares a tag for the appearance boot again. Vite folds every module ' +
        'script on a page into one entry chunk, so this puts an 81-byte theme write back ' +
        'inside ~90 kB of application and it cannot run until all of it arrives (#987, #707). ' +
        'The tag is injected by appearanceBootScript() in vite.config.mts.',
    ).toEqual([]);

    // The app entry stays declared here — it is the page's real entry and Vite rewrites it.
    expect(tags).toContain('/src/index.ts');
  });

  it('declares it as a Rollup input, which is what gives it a chunk', () => {
    const build = code(config);
    expect(build).toMatch(/rollupOptions:\s*\{\s*input:/);
    expect(build).toMatch(/path:\s*'src\/appearance-boot\.ts'/);
  });

  it('injects the tag ahead of the entry Vite injects', () => {
    // `head-prepend` is what puts it before Vite's own script tag. Both are `type="module"`
    // and therefore deferred, so document order is execution order — plain `head` would append
    // *after* the entry and reverse it.
    const build = code(config);
    expect(build).toMatch(/injectTo:\s*'head-prepend'/);
    expect(build).toContain("tag: 'script'");
    expect(build).toContain("rel: 'modulepreload'");
  });
});
