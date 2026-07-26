import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { ICONS, FA_LIBRARY } from '../../src/services/icon-library';

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });

const SOURCES = walk(resolve(process.cwd(), 'src'));

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

  it('is registered under an explicit library name, not "default"', () => {
    // Overriding "default" would change how Web Awesome's own components resolve
    // their internal icons.
    expect(FA_LIBRARY).toBe('fa');
    expect(FA_LIBRARY).not.toBe('default');
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
});
