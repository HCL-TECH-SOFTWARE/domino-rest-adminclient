import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * #707 — the appearance boot script in `index.html`.
 *
 * Nothing else in this suite covers `index.html`: it is not a module, so it is never
 * imported, and `applyAppearance`'s tests exercise `theme-service.ts` instead. That is how
 * the script came to be moved into `src/index.tsx`, where it could no longer do its job.
 *
 * Module code cannot run until the entry chunk has been fetched and evaluated, and the
 * document has nothing paintable before React renders. Measured against a `vite preview`
 * build over throttled Fast 3G with an empty cache:
 *
 *                        in src/index.tsx     inline in index.html
 *     stylesheet ready         2293 ms              2427 ms
 *     entry chunk ready        5378 ms              5503 ms
 *     first paint              5468 ms              2968 ms
 *
 * Inline, the canvas paints as soon as the stylesheet lands rather than waiting ~2.5 s more
 * for the chunk — and paints *dark* for a dark-mode user instead of the browser's default
 * white. These guards keep it inline, ordered before the module, and symmetric.
 */

const ROOT = process.cwd();
const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
const entry = readFileSync(resolve(ROOT, 'src/index.tsx'), 'utf8');

/** The inline `<script>` (no `src`) in index.html — the boot script. */
const bootScript = (() => {
  const match = html.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/);
  return match?.[1] ?? '';
})();

/** Contents with comments stripped, so the notes are not mistaken for code. */
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('appearance boot script (#707)', () => {
  it('exists as an inline script in index.html', () => {
    expect(bootScript.trim()).not.toBe('');
  });

  it('sets all three appearance carriers', () => {
    // The same three `services/theme-service.ts#applyAppearance` writes. Any one missing
    // leaves the page half-themed until React mounts.
    const script = code(bootScript);
    expect(script, 'missing the .wa-dark class Web Awesome and keep-monaco-editor read').toMatch(/wa-dark/);
    expect(script, 'missing colorScheme — this is what colours the canvas before CSS').toMatch(/colorScheme/);
    expect(script, "missing body.dataset.theme — the keep-* :host-context rules read it").toMatch(/dataset\.theme/);
  });

  it('runs before the module script', () => {
    // Ordering is the whole point: after the module tag it would gain nothing over living
    // inside the bundle.
    const inlineAt = html.search(/<script(?![^>]*\bsrc=)/);
    const moduleAt = html.search(/<script[^>]*\btype="module"/);
    expect(inlineAt).toBeGreaterThan(-1);
    expect(moduleAt).toBeGreaterThan(-1);
    expect(inlineAt, 'the boot script must precede the module script').toBeLessThan(moduleAt);
  });

  it('is symmetric across light and dark', () => {
    // It used to write body.dataset.theme only on the dark branch, which left
    // theme-service as the only thing that ever cleared it — so a light-mode first load had
    // no data-theme at all. One unconditional assignment each, no if/else pair.
    const script = code(bootScript);
    expect(script.match(/dataset\.theme\s*=/g) ?? []).toHaveLength(1);
    expect(script.match(/colorScheme\s*=/g) ?? []).toHaveLength(1);
    expect(script, 'use classList.toggle(…, dark) rather than add/remove branches').toMatch(
      /classList\.toggle\(\s*['"]wa-dark['"]/,
    );
  });

  it('keeps the script out of the entry module', () => {
    // Where it must not drift back to.
    const script = code(entry);
    expect(script, 'appearance writes belong in index.html, not the bundle').not.toMatch(
      /wa-dark|colorScheme|dataset\.theme/,
    );
  });

  it('stays terse, because it is render-blocking HTML', () => {
    // Vite does not minify inline scripts in index.html, so every byte of comment here
    // ships on the critical path. The first version of this note cost 1.2 kB of the 2.8 kB
    // document; the rationale lives in services/theme-service.ts instead.
    expect(Buffer.byteLength(html, 'utf8')).toBeLessThan(2000);
  });
});
