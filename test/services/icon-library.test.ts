import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
});
