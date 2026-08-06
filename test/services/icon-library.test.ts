/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { ICONS, FA_LIBRARY } from '../../src/services/icon-library';

const walk = (dir: string, match: RegExp): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path, match);
    return match.test(entry.name) ? [path] : [];
  });

const SRC = resolve(process.cwd(), 'src');
const SOURCES = walk(SRC, /\.tsx?$/);
/** Stylesheets are scanned too: a `url()` is an asset reference the .tsx scans cannot see. */
const STYLESHEETS = walk(SRC, /\.css$/);

/**
 * File contents with whole-line comments removed, so a doc comment quoting the very
 * markup these guards forbid doesn't report itself as an offender.
 *
 * Whole-line comments only. Stripping from `//` to end-of-line would also eat the tail
 * of any URL literal — including the `webawesome@3.6.0` one guard exists to catch — so
 * trailing comments are deliberately left in.
 */
const read = (file: string) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
    .join('\n');

/** Every `<wa-icon ...>` opening tag in the file. Attribute values contain no `>`. */
const waIconTags = (source: string) => [...source.matchAll(/<wa-icon\b[^>]*>/g)].map((m) => m[0]);

/** Repo-relative, so a failure message points at something greppable. */
const rel = (file: string) => file.slice(resolve(process.cwd()).length + 1);

/**
 * Guards the failure mode this module was written to eliminate: an icon whose name
 * doesn't resolve renders an *empty glyph* rather than throwing, so the button keeps
 * its box and its click handler and the breakage is invisible in a passing test run.
 * These tests make an unresolvable icon a hard failure instead.
 *
 * The scans cover all of `src/` rather than a hand-maintained file list, so a newly
 * added icon is checked without anyone remembering to register the component here.
 */
describe('icon-library', () => {
  it('finds source files to scan', () => {
    expect(SOURCES.length).toBeGreaterThan(100);
  });

  it('exposes an explicit library name for markup to ask for', () => {
    expect(FA_LIBRARY).toBe('fa');
    expect(FA_LIBRARY).not.toBe('default');
  });

  it('also registers over the default library, so no icon can reach the CDN', async () => {
    // `FA_LIBRARY` stays "fa" for markup to name explicitly, but the same resolver is
    // registered over "default" as well. Four of WebAwesome 3.10's own `<wa-icon>` tags
    // pass no library — one of them is `<wa-page>`'s navigation toggle, which this app
    // mounts on every authenticated screen. Left on the stock resolver those fetch from
    // ka-f.fontawesome.com, which `connect-src *` permits, so the dependency is silent.
    const { getIconLibrary } = await import(
      '@awesome.me/webawesome/dist/components/icon/library.js'
    );
    await import('../../src/services/icon-library');

    const fallback = getIconLibrary('default');
    expect(fallback, 'the default icon library is not registered').toBeTruthy();
    // `IconLibraryResolver` takes (name, family, variant, autoWidth). Ours reads only the
    // first — a narrower function is assignable — but the call site still owes all four.
    expect(fallback!.resolver('bars', 'classic', 'solid', false)).toBe(ICONS.bars);
  });

  it('bundles the glyph WebAwesome asks for by itself', () => {
    // `<wa-page>`'s navigation toggle renders `<wa-icon name="bars">` from inside
    // node_modules. No scan of `src/` can see it, so it is pinned by name here — the
    // whole point of overriding the default library is defeated if it resolves to ''.
    expect(ICONS.bars).toBeTruthy();
  });

  it('maps every icon to a non-empty bundled URL', () => {
    expect(Object.keys(ICONS).length).toBeGreaterThan(0);
    for (const [name, url] of Object.entries(ICONS)) {
      expect(url, `icon "${name}" resolved to an empty URL`).toBeTruthy();
    }
  });

  it('bundles every icon name the markup asks for', () => {
    const missing: string[] = [];
    for (const file of SOURCES) {
      for (const tag of waIconTags(read(file))) {
        // Literal names only — `name="${node.icon}"` is resolved at runtime and is
        // covered by the resolver's warning instead.
        const name = tag.match(/\bname="([a-z0-9-]+)"/)?.[1];
        if (name && !ICONS[name]) missing.push(`${rel(file)}: ${name}`);
      }
    }
    expect(missing, `icon names used in markup but absent from ICONS:\n${missing.join('\n')}`).toEqual([]);
  });

  it('bundles every icon name passed to keep-button', () => {
    // `<KeepButton icon="...">` renders a `<wa-icon>` through this library, so an
    // unregistered name is the same silent empty glyph one level removed.
    const missing: string[] = [];
    for (const file of SOURCES.filter((f) => f.endsWith('.tsx'))) {
      for (const m of read(file).matchAll(/\bicon="([a-z0-9-]+)"/g)) {
        if (!ICONS[m[1]]) missing.push(`${rel(file)}: ${m[1]}`);
      }
    }
    expect(missing, `keep-button icon names absent from ICONS:\n${missing.join('\n')}`).toEqual([]);
  });

  it('bundles every icon name passed to KeepIcon', () => {
    // `<KeepIcon name='…'>` is the .tsx spelling of `<wa-icon library="fa" name="…">`
    // (#718). It renders the glyph as a *property*, so the `<wa-icon …>` tag scans above
    // cannot see it — without this, ~115 converted call sites would be exempt from the
    // one check that catches an unregistered name. Both quote styles: JSX here is single.
    const missing: string[] = [];
    for (const file of SOURCES.filter((f) => f.endsWith('.tsx'))) {
      for (const tag of read(file).matchAll(/<KeepIcon\b[^>]*>/g)) {
        const name = tag[0].match(/\bname=['"]([a-z0-9-]+)['"]/)?.[1];
        if (name && !ICONS[name]) missing.push(`${rel(file)}: ${name}`);
      }
    }
    expect(missing, `KeepIcon glyph names absent from ICONS:\n${missing.join('\n')}`).toEqual([]);
  });

  /**
   * The glyphs staged for #946's sweep of hand-drawn `<svg>`.
   *
   * Named rather than left to the generic "every icon maps to a non-empty URL" check above,
   * because these are the one group in the registry with **no call site yet** — so that check
   * is the only thing standing between them and a typo'd or renamed Font Awesome file, and it
   * would report `undefined` for a name nobody has written in markup anywhere. Listing them
   * also makes the set greppable from the issue.
   *
   * Delete this with the entries if #946 is abandoned.
   */
  it('bundles the glyphs staged for the inline-svg sweep', () => {
    for (const name of [
      'angles-left',
      'angles-right',
      'circle-exclamation',
      'circle-play',
      'filter',
    ]) {
      expect(ICONS[name], `"${name}" is staged for #946 but not bundled`).toBeTruthy();
    }
  });

  /**
   * #718 consolidated four icon systems onto `wa-icon`. Two of them are now uninstalled,
   * and this is what keeps them uninstalled: re-adding either is a one-line import that
   * would otherwise pass every other check in the repo.
   *
   * Scans `src/` and the manifest, deliberately not `test/`, because several test files
   * explain in prose what the migration replaced and naming a thing you removed should not
   * read as having it back.
   */
  describe('the retired icon systems stay retired', () => {
    const RETIRED = ['@mui/icons-material', 'react-icons'];

    it('is imported nowhere in src', () => {
      const offenders: string[] = [];
      for (const file of SOURCES) {
        const source = read(file);
        for (const pkg of RETIRED) {
          if (source.includes(pkg)) offenders.push(`${rel(file)}: ${pkg}`);
        }
      }
      expect(offenders, `a retired icon package is back:\n${offenders.join('\n')}`).toEqual([]);
    });

    it('is not a dependency', () => {
      const manifest = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8'));
      const declared = { ...manifest.dependencies, ...manifest.devDependencies };
      expect(RETIRED.filter((pkg) => pkg in declared)).toEqual([]);
    });
  });

  it('routes every named icon through this library rather than the Font Awesome CDN', () => {
    // A `<wa-icon name="...">` without `library` falls through to Web Awesome's default
    // resolver, which fetches from ka-f.fontawesome.com at runtime. That is the external
    // dependency this module exists to remove, and it fails silently behind a CSP.
    const offenders: string[] = [];
    for (const file of SOURCES) {
      for (const tag of waIconTags(read(file))) {
        if (/\bname=/.test(tag) && !/\blibrary=/.test(tag)) offenders.push(`${rel(file)}: ${tag}`);
      }
    }
    expect(offenders, `wa-icon with a name but no library:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('resolves no icon through the IMG_DIR asset path', () => {
    // `src="${IMG_DIR}/..."` hardcodes /admin/img and renders blank anywhere the app
    // isn't mounted at /admin/ — the original bug. Data URIs are fine: they are inline.
    const offenders: string[] = [];
    for (const file of SOURCES) {
      for (const tag of waIconTags(read(file))) {
        if (/IMG_DIR/.test(tag)) offenders.push(`${rel(file)}: ${tag}`);
      }
    }
    expect(offenders, `wa-icon still resolving via IMG_DIR:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('references no public/img/shoelace glyph', () => {
    // Those files are a stale copy of Font Awesome 6.7.2. The bundled dependency is the
    // single source of glyphs now, so a reference to that directory is a regression.
    const offenders = SOURCES.filter((file) => /img\/shoelace\//.test(read(file))).map(rel);
    expect(offenders, `public/img/shoelace referenced in: ${offenders.join(', ')}`).toEqual([]);
  });

  /**
   * #700 finished the job the icon library started. The `wa-icon` checks above only ever
   * looked inside `<wa-icon>` tags, but the same silent breakage applied to every other
   * image: `<img src="/admin/img/KeepNewIcon.png">`, the login page's CSS background and
   * the home-page block diagram all 404'd to `index.html` outside an `/admin/` mount and
   * rendered as nothing. Each is now an `import`, so Vite emits it next to the app bundle
   * and its URL follows the base the bundle itself loaded from.
   *
   * These scan the source rather than the DOM: the failure is a URL that resolves to HTML
   * at runtime, which jsdom will not reproduce and a passing render test cannot see.
   */
  describe('app image assets', () => {
    it('hardcodes no /admin asset path', () => {
      // Deliberately keyed on a file extension, not on the `/admin/` prefix alone:
      // `<Router basename="/admin/ui">` is a real mount-point declaration and must not
      // trip this. It is an asset *URL* baked into the source that is the problem.
      const ASSET_URL = /\/admin\/[a-z0-9/_-]*\.(?:png|jpe?g|svg|gif|webp|ico|css)\b/gi;
      const offenders: string[] = [];
      for (const file of SOURCES) {
        for (const m of read(file).matchAll(ASSET_URL)) offenders.push(`${rel(file)}: ${m[0]}`);
      }
      expect(offenders, `hardcoded /admin/ asset path:\n${offenders.join('\n')}`).toEqual([]);
    });

    it('finds stylesheets to scan', () => {
      expect(STYLESHEETS.length).toBeGreaterThan(0);
    });

    it('uses no root-absolute url() in a stylesheet', () => {
      // The gap that hid this one: `.login-castle-bg` pointed at `url('/img/castlebg.jpg')`
      // in styles.css, which the .tsx-only scans never looked at. A leading `/` also opts
      // out of Vite's asset rewriting, so the URL is frozen against the site root and the
      // background silently does not paint under the packaged /admin mount.
      const offenders: string[] = [];
      for (const file of STYLESHEETS) {
        for (const m of readFileSync(file, 'utf8').matchAll(/url\(\s*['"]?(\/[^'")\s]+)/g)) {
          offenders.push(`${rel(file)}: ${m[1]}`);
        }
      }
      expect(offenders, `root-absolute url() in a stylesheet:\n${offenders.join('\n')}`).toEqual([]);
    });

    it('exports no IMG_DIR from config.dev', async () => {
      // The constant every one of those paths was built from. Re-adding it is the most
      // likely way this regresses, and it would not trip the scan above on its own.
      const config = await import('../../src/config.dev');
      expect(Object.keys(config)).not.toContain('IMG_DIR');
    });
  });

  /**
   * P0-9: two `setBasePath()` calls pinned WebAwesome assets to a `3.6.0` CDN tree
   * while `3.10.0` was installed — one of them pointing at a *file* rather than a
   * directory, the other mutating that global from inside a component constructor.
   *
   * Both were inert: in WebAwesome 3.x the base path is read only by the autoloader,
   * and this app imports its components explicitly. Being inert is exactly why the
   * version skew survived a major upgrade unnoticed, so the check is on the source
   * rather than on behaviour — there is no behaviour to assert.
   */
  describe('WebAwesome asset paths', () => {
    it('pins no WebAwesome version in a URL', () => {
      const offenders = SOURCES.filter((file) => /webawesome@\d+\.\d+\.\d+/.test(read(file))).map(rel);
      expect(offenders, `hardcoded WebAwesome version in: ${offenders.join(', ')}`).toEqual([]);
    });

    it('calls setBasePath nowhere', () => {
      const offenders = SOURCES.filter((file) => /\bsetBasePath\s*\(/.test(read(file))).map(rel);
      expect(offenders, `setBasePath() called in: ${offenders.join(', ')}`).toEqual([]);
    });

    it('names no icon CDN host', () => {
      const offenders = SOURCES.filter((file) => /ka-[fp]\.fontawesome\.com|cdn\.jsdelivr\.net/.test(read(file))).map(
        rel
      );
      expect(offenders, `icon CDN host referenced in: ${offenders.join(', ')}`).toEqual([]);
    });
  });

  describe('icon resolver function', () => {
    it('resolves valid icon names through the registered default library', async () => {
      const { getIconLibrary } = await import(
        '@awesome.me/webawesome/dist/components/icon/library.js'
      );
      await import('../../src/services/icon-library');

      const defaultLibrary = getIconLibrary('default');
      expect(defaultLibrary).toBeTruthy();

      // Test that a valid icon resolves to a non-empty string
      const resolvedIcon = defaultLibrary!.resolver('bars', 'classic', 'solid', false);
      expect(resolvedIcon).toBeTruthy();
      expect(typeof resolvedIcon).toBe('string');
    });

    it('returns empty string for unregistered icon names', async () => {
      const { getIconLibrary } = await import(
        '@awesome.me/webawesome/dist/components/icon/library.js'
      );
      await import('../../src/services/icon-library');

      const defaultLibrary = getIconLibrary('default');
      expect(defaultLibrary).toBeTruthy();

      // Test that an invalid icon resolves to an empty string
      const resolvedIcon = defaultLibrary!.resolver('nonexistent-icon-xyz-123', 'classic', 'solid', false);
      expect(resolvedIcon).toBe('');
    });
  });
});
