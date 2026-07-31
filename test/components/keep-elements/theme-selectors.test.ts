/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

/**
 * #682: `keep-button` guarded its dark-mode override with `:host([data-theme='dark'])`.
 *
 * That selector requires the attribute on the custom element itself. Nothing sets it —
 * `services/theme-service.ts` writes `document.body.dataset.theme`, and no consumer
 * passes `data-theme` down to an element. So the rule never matched, and the styling it
 * carried had never rendered once. The other themed elements all use the `:host-context`
 * form against `body`, which does match.
 *
 * The failure mode is why this is a source scan rather than a rendering assertion: a
 * selector that never matches produces no error, no warning and no visual difference
 * from "this element has no dark styling". There is nothing to observe at runtime.
 */
const ELEMENTS_DIR = resolve(process.cwd(), 'src/components/keep-elements');

const sources = readdirSync(ELEMENTS_DIR)
  .filter((name) => name.endsWith('.ts'))
  .map((name) => ({ name, text: readFileSync(join(ELEMENTS_DIR, name), 'utf8') }));

/** Strip whole-line comments so the explanatory note in keep-button.ts is not an offender. */
const code = (text: string) =>
  text
    .split('\n')
    .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
    .join('\n');

describe('keep-element theme selectors', () => {
  it('finds element sources to scan', () => {
    expect(sources.length).toBeGreaterThan(20);
  });

  it('uses no :host([data-theme=…]) selector, which can never match', () => {
    const offenders = sources
      .filter(({ text }) => /:host\(\s*\[data-theme/.test(code(text)))
      .map(({ name }) => name);
    expect(
      offenders,
      `these guard dark mode on an attribute nothing sets, so the rule never fires: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('still gives the elements that theme themselves a working dark mode', () => {
    // Guards the inverse: a bulk edit that "fixed" the above by deleting dark support
    // everywhere would otherwise pass the previous assertion silently.
    //
    // This used to count :host-context(body[data-theme=…]) blocks alone, and required at
    // least six. #708 inverted that: dark mode now comes from --wa-color-* tokens, which
    // resolve at :root/.wa-dark and inherit through the shadow boundary, so a *falling*
    // :host-context count is progress rather than regression. What must not fall is the
    // number of elements that theme themselves by one route or the other.
    const themed = sources.filter(
      ({ text }) =>
        /:host-context\(\s*body\[data-theme/.test(code(text)) ||
        /var\(--wa-color-(surface|text|border)/.test(code(text)),
    );
    expect(themed.length).toBeGreaterThanOrEqual(12);
  });

  /*
   * #708: the elements' chrome colours are --wa-color-* tokens, not light-dark()
   * literals. The exception is the JSON viewer's syntax palette — VS Code's editor
   * colours, which are not UI chrome and have no WA semantic token to point at.
   *
   * Worth guarding because a light-dark() literal is invisible in review: it looks
   * theme-aware, so a new one reads as correct while quietly reintroducing a fourth
   * place the palette is written down.
   */
  const EDITOR_PALETTE_FILES = ['keep-source.ts', 'keep-source-header.ts', 'keep-autocomplete.ts'];

  it('uses tokens rather than light-dark() literals outside the editor palette', () => {
    const offenders = sources
      .filter(({ name }) => !EDITOR_PALETTE_FILES.includes(name))
      .filter(({ text }) => /light-dark\(\s*[^)\s]/.test(code(text)))
      .map(({ name }) => name);
    expect(
      offenders,
      `these still hardcode a light/dark colour pair instead of a --wa-color-* token: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('keeps the editor palette as literals on purpose', () => {
    // The inverse guard: if someone tokenizes these, the JSON viewer's syntax
    // highlighting silently becomes UI-grey and this test says why it should not.
    const source = sources.find(({ name }) => name === 'keep-source.ts')!;
    expect(code(source.text)).toMatch(/light-dark\(#0451A5, #9CDCFE\)/);
  });

  it('keep-button carries no dark-mode override', () => {
    // The #682 decision: removed rather than repaired, so turning it on is a deliberate
    // future change and not a side effect. Flip this test if that treatment is added back.
    const button = sources.find(({ name }) => name === 'keep-button.ts')!;
    expect(button).toBeDefined();
    expect(code(button.text)).not.toMatch(/data-theme/);
  });
});
