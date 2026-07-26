import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { ICONS, FA_LIBRARY } from '../../src/services/icon-library';

/**
 * Guards the failure mode this module was written to eliminate: an icon whose name
 * doesn't resolve renders an *empty glyph* rather than throwing, so the button keeps
 * its box and its click handler and the breakage is invisible in a passing test run.
 * These tests make an unresolvable icon a hard failure instead.
 */
describe('icon-library', () => {
  const COMPONENTS = ['src/components/keep-elements/keep-source.ts', 'src/components/keep-elements/keep-source-header.ts'];

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

  it('bundles every icon name the source components ask for', () => {
    const requested = new Set<string>();
    for (const file of COMPONENTS) {
      const src = readFileSync(resolve(process.cwd(), file), 'utf8');
      for (const m of src.matchAll(/<wa-icon\b[^>]*\bname="([a-z0-9-]+)"/g)) {
        requested.add(m[1]);
      }
    }

    expect(requested.size, 'no wa-icon names found — did the markup change?').toBeGreaterThan(0);

    const missing = [...requested].filter((name) => !ICONS[name]);
    expect(missing, `icon names used in markup but absent from ICONS: ${missing.join(', ')}`).toEqual([]);
  });

  it('no longer resolves icons through the IMG_DIR asset path', () => {
    // `src="${IMG_DIR}/..."` hardcodes /admin/img and renders blank anywhere the app
    // isn't mounted at /admin/ — the original bug.
    for (const file of COMPONENTS) {
      const src = readFileSync(resolve(process.cwd(), file), 'utf8');
      expect(src, `${file} still resolves icons via IMG_DIR`).not.toMatch(/<wa-icon\b[^>]*\bsrc=/);
    }
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
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) return walk(path);
        return /\.tsx?$/.test(entry.name) ? [path] : [];
      });

    const sources = walk(resolve(process.cwd(), 'src'));

    /**
     * Whole-line comments only. Stripping from `//` to end-of-line would also eat the
     * tail of any URL literal — including the `webawesome@3.6.0` this guard exists to
     * catch — so trailing comments are deliberately left in.
     */
    const code = (file: string) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
        .join('\n');

    it('finds source files to scan', () => {
      expect(sources.length).toBeGreaterThan(100);
    });

    it('pins no WebAwesome version in a URL', () => {
      const offenders = sources.filter((file) => /webawesome@\d+\.\d+\.\d+/.test(code(file)));
      expect(offenders, `hardcoded WebAwesome version in: ${offenders.join(', ')}`).toEqual([]);
    });

    it('calls setBasePath nowhere', () => {
      const offenders = sources.filter((file) => /\bsetBasePath\s*\(/.test(code(file)));
      expect(offenders, `setBasePath() called in: ${offenders.join(', ')}`).toEqual([]);
    });
  });
});
