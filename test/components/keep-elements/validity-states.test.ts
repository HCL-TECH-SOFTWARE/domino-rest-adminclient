/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-input-text';
import '../../../src/components/keep-elements/keep-input-password';
import type InputText from '../../../src/components/keep-elements/keep-input-text';
import type InputPassword from '../../../src/components/keep-elements/keep-input-password';

/**
 * #742: every invalid/valid field style in this repo was keyed on `[data-user-invalid]` or
 * `[data-user-valid]` — the **Shoelace 2.x** convention. WebAwesome 3.x publishes validity
 * as CSS *custom states*: its form controls call `customStates.set('user-invalid', …)`,
 * which writes into `ElementInternals.states` and is matched by `:state(user-invalid)`.
 * The string `data-user-invalid` appears zero times in WebAwesome's runtime bundle, so all
 * 18 of those selectors were dead. The only invalid styling that ever appeared came from
 * `LoginPage` setting the attribute by hand — on the wrong field, and with a value of
 * `"false"` that still matched, because `[attr]` tests presence.
 *
 * The source scans exist for the same reason #682's do: a selector that never matches
 * produces no error, no warning, and looks exactly like "this element has no invalid
 * styling". There is nothing to observe at runtime.
 *
 * The behavioural tests assert that WebAwesome *sets the state*, not that a style rule
 * matched it — jsdom does not implement the `:state()` selector. They are only meaningful
 * because of two fixes that landed with this change: `vitest.config.ts` now resolves the
 * `browser` export condition (Lit's `isServer` was `true`, which left WebAwesome's
 * validator list empty) and `test/setupTests.ts` installs a faithful `attachInternals`
 * instead of one whose `states.has()` always answered `false`.
 */

const walk = (dir: string, match: RegExp): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path, match);
    return match.test(entry.name) ? [path] : [];
  });

const SRC = resolve(process.cwd(), 'src');
/** Stylesheets included: `keep-overrides.css` carried one of the dead selectors. */
const FILES = [...walk(SRC, /\.tsx?$/), ...walk(SRC, /\.css$/)];

/**
 * File contents with comments removed, so the notes explaining *why* the attribute form is
 * wrong are not reported as offenders.
 *
 * This strips complete block comments, unlike the line-based strippers in
 * `theme-selectors.test.ts` and `icon-library.test.ts`. The #742 notes quote
 * `wa-input[data-user-invalid]` mid-paragraph, on continuation lines beginning with
 * neither `//` nor `*`, which a line-based filter leaves behind. `//` comments are cut
 * only when not preceded by `:`, so `https://` URLs survive.
 */
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const SOURCES = FILES.map((file) => ({ file: file.slice(resolve(process.cwd()).length + 1), text: readFileSync(file, 'utf8') }));

/** `[data-user-invalid]` / `[data-user-valid]` used as a selector. */
const STALE_SELECTOR = /\[\s*data-user-(?:in)?valid\s*[\]=]/;
/** Setting either attribute by hand, which is what faked the styling before. */
const STALE_WRITE = /setAttribute\(\s*['"`]data-user-(?:in)?valid/;

/**
 * Mirrors `markValidity()` in `LoginPage.tsx`. WebAwesome derives the state from both
 * flags — `setCustomStates()` computes `user-invalid = !valid && hasInteracted` — and its
 * `reportValidity()` sets `hasInteracted` *after* validating, so a lone call never
 * produces `user-invalid`. Setting the flag first is what makes the state appear.
 */
const markValidity = (input: HTMLElementTagNameMap['wa-input']): boolean => {
  input.hasInteracted = true;
  return input.checkValidity();
};

const waInput = (el: InputText | InputPassword) => el.shadowRoot!.querySelector('wa-input')!;

describe('WebAwesome validity states (#742)', () => {
  afterEach(cleanupLit);

  it('finds source files to scan', () => {
    expect(SOURCES.length).toBeGreaterThan(100);
  });

  it('keys no validity styling on the Shoelace-era data attributes', () => {
    const offenders = SOURCES.filter(({ text }) => STALE_SELECTOR.test(code(text))).map(({ file }) => file);
    expect(
      offenders,
      `WebAwesome 3.x never sets these attributes, so the rule can never match. ` +
        `Use :state(user-invalid) / :state(user-valid): ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('never writes the validity attributes by hand', () => {
    const offenders = SOURCES.filter(({ text }) => STALE_WRITE.test(code(text))).map(({ file }) => file);
    expect(
      offenders,
      `validity is WebAwesome's to set — call checkValidity()/setCustomValidity() instead: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('styles the invalid state on the elements that had the dead rules', () => {
    // The inverse guard: deleting the styling altogether would satisfy the scans above
    // while losing the feature. Every file that carried a dead selector must now carry a
    // working one.
    //
    // `keep-input-base.ts` stands in for keep-input-text/-password, which were identical
    // and now share one stylesheet (#743). The two behavioural cases below drive both
    // subclasses, so the rule is still checked where it is used, not only where it lives.
    const expected = [
      'src/components/keep-elements/keep-input-base.ts',
      'src/components/keep-elements/keep-source.ts',
      'src/styles/keep-overrides.css',
    ];
    for (const file of expected) {
      const source = SOURCES.find((s) => s.file === file);
      expect(source, `${file} not found — was it renamed?`).toBeDefined();
      expect(code(source!.text), `${file} lost its invalid-state styling`).toMatch(/:state\(\s*user-invalid\s*\)/);
    }
  });

  it('forwards `required` to the inner wa-input', () => {
    // The precondition the styling depends on: without `required` reaching the native
    // input there is no constraint to violate and the state never engages.
    return mountLit<InputText>('keep-input-text', { label: 'Username', required: true }).then((el) => {
      const input = waInput(el);
      expect(input.required).toBe(true);
      const native = input.shadowRoot!.querySelector('input')!;
      expect(native.required).toBe(true);
      expect(native.validity.valueMissing).toBe(true);
    });
  });

  it('puts a blank required text field into the user-invalid state', async () => {
    const el = await mountLit<InputText>('keep-input-text', { label: 'Username', required: true });
    const input = waInput(el);

    expect(input.customStates.has('user-invalid')).toBe(false);
    expect(markValidity(input)).toBe(false);
    expect(input.customStates.has('user-invalid')).toBe(true);
  });

  it('puts a blank required password field into the user-invalid state', async () => {
    const el = await mountLit<InputPassword>('keep-input-password', { label: 'Password', required: true });
    const input = waInput(el);

    expect(markValidity(input)).toBe(false);
    expect(input.customStates.has('user-invalid')).toBe(true);
  });

  it('clears user-invalid once the field has a value', async () => {
    const el = await mountLit<InputText>('keep-input-text', { label: 'Username', required: true });
    const input = waInput(el);
    markValidity(input);

    const native = input.shadowRoot!.querySelector('input')!;
    native.value = 'someone';
    native.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;

    expect(markValidity(input)).toBe(true);
    expect(input.customStates.has('user-invalid')).toBe(false);
    expect(input.customStates.has('user-valid')).toBe(true);
  });

  it('marks a filled field invalid only via setCustomValidity, and clears it again', async () => {
    // The 401 path: the server rejected the pair, so neither field is constraint-invalid.
    const el = await mountLit<InputText>('keep-input-text', { label: 'Username', required: true });
    const input = waInput(el);
    const native = input.shadowRoot!.querySelector('input')!;
    native.value = 'someone';
    native.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(markValidity(input)).toBe(true);

    input.setCustomValidity('Incorrect username or password');
    expect(markValidity(input)).toBe(false);
    expect(input.customStates.has('user-invalid')).toBe(true);
    expect(input.validationMessage).toBe('Incorrect username or password');

    input.setCustomValidity('');
    expect(markValidity(input)).toBe(true);
    expect(input.customStates.has('user-invalid')).toBe(false);
  });
});
