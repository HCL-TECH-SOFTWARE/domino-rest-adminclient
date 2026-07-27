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

  it('still has the working :host-context form on the elements that theme themselves', () => {
    // Guards the inverse: a bulk edit that "fixed" the above by deleting dark support
    // everywhere would otherwise pass the previous assertion silently.
    const themed = sources.filter(({ text }) => /:host-context\(\s*body\[data-theme/.test(code(text)));
    expect(themed.length).toBeGreaterThanOrEqual(6);
  });

  it('keep-button carries no dark-mode override', () => {
    // The #682 decision: removed rather than repaired, so turning it on is a deliberate
    // future change and not a side effect. Flip this test if that treatment is added back.
    const button = sources.find(({ name }) => name === 'keep-button.ts')!;
    expect(button).toBeDefined();
    expect(code(button.text)).not.toMatch(/data-theme/);
  });
});
