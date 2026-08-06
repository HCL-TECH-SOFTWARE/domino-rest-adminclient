/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import '@awesome.me/webawesome/dist/components/input/input.js';

/**
 * How this repo says "this field is wrong", and the two ways it has been said wrongly.
 *
 * **#742 — the dead attribute.** Every invalid/valid style was keyed on
 * `[data-user-invalid]` or `[data-user-valid]`, the **Shoelace 2.x** convention.
 * WebAwesome 3.x publishes validity as CSS *custom states* instead, and the string
 * `data-user-invalid` appears nowhere in its runtime, so all 18 of those selectors were
 * dead. The only invalid styling a user ever saw came from `LoginPage` setting the
 * attribute by hand — on the wrong field, and with a value of `"false"` that still
 * matched, because `[attr]` tests presence.
 *
 * **#743 — the awkward replacement.** Moving to `:state(user-invalid)` worked, but only
 * via a quirk: the state is derived from `!valid && hasInteracted`, and WebAwesome's own
 * `reportValidity()` sets that flag *after* validating, so engaging it meant setting
 * `hasInteracted` by hand first. That ordering ended up encoded in a `KeepInputBase` class
 * that existed largely to hold it. It also told assistive tech nothing — a custom state is
 * invisible to a screen reader.
 *
 * The login form now sets **`aria-invalid`** and puts the message in `hint`, which
 * `wa-input` already wires to the inner control's `aria-describedby`. It is a plain
 * attribute, styled by a plain selector, announced for free, and needs no element wrapper
 * to manage it.
 *
 * `keep-source` still uses `:state(user-invalid)` for its inline field editor, where
 * WebAwesome's own constraint validation drives the whole interaction. That is a
 * legitimate second use, not a leftover.
 *
 * A selector that never matches produces no error and no warning, and looks exactly like
 * "this element has no invalid styling" — hence the source scans.
 */

const walk = (dir: string, match: RegExp): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return walk(path, match);
    return match.test(entry.name) ? [path] : [];
  });

const ROOT = resolve(process.cwd());
const SRC = resolve(ROOT, 'src');
const FILES = [...walk(SRC, /\.tsx?$/), ...walk(SRC, /\.css$/)];

/**
 * File contents with comments removed, so the notes explaining *why* the old forms are
 * wrong are not reported as offenders. Block comments are stripped whole — the #742 notes
 * quote `wa-input[data-user-invalid]` on continuation lines beginning with neither `//`
 * nor `*`. `//` is cut only when not preceded by `:`, so `https://` URLs survive.
 */
const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

const SOURCES = FILES.map((file) => ({ file: file.slice(ROOT.length + 1).replace(/\\/g, '/'), text: readFileSync(file, 'utf8') }));

/** `[data-user-invalid]` / `[data-user-valid]` used as a selector. */
const STALE_SELECTOR = /\[\s*data-user-(?:in)?valid\s*[\]=]/;
/** Setting either attribute by hand, which is what faked the styling before. */
const STALE_WRITE = /setAttribute\(\s*['"`]data-user-(?:in)?valid/;

const TAG = 'wa-input';
type WaInput = HTMLElementTagNameMap['wa-input'];

const mount = async (props: Record<string, unknown> = {}): Promise<WaInput> => {
  const el = document.createElement(TAG) as WaInput;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
};

describe('how invalid fields are marked', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('finds source files to scan', () => {
    expect(SOURCES.length).toBeGreaterThan(100);
  });

  it('keys no validity styling on the Shoelace-era data attributes (#742)', () => {
    const offenders = SOURCES.filter(({ text }) => STALE_SELECTOR.test(code(text))).map(({ file }) => file);
    expect(
      offenders,
      `WebAwesome 3.x never sets these attributes, so the rule can never match: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('never writes the validity attributes by hand (#742)', () => {
    const offenders = SOURCES.filter(({ text }) => STALE_WRITE.test(code(text))).map(({ file }) => file);
    expect(
      offenders,
      `validity is the form's to decide and aria-invalid's to carry: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('styles aria-invalid globally, so no element wrapper has to (#743)', () => {
    // The inverse guard: deleting the styling would satisfy the scans above while losing
    // the feature. This rule is what `LoginPage`'s `aria-invalid` hangs on, and it lives
    // in one place now rather than in each element's shadow styles.
    const overrides = SOURCES.find(({ file }) => file === 'src/styles/keep-overrides.css');
    expect(overrides, 'keep-overrides.css not found — was it renamed?').toBeDefined();
    expect(code(overrides!.text)).toMatch(/wa-input\[aria-invalid=['"]true['"]\]::part\(base\)/);
  });

  it('leaves keep-source its own :state(user-invalid) pattern', () => {
    // Not a leftover: that editor drives WebAwesome's constraint validation directly, so
    // the custom state is the right hook there.
    const source = SOURCES.find(({ file }) => file === 'src/components/keep-elements/keep-source.ts');
    expect(code(source!.text)).toMatch(/:state\(\s*user-invalid\s*\)/);
  });

  it('forwards `required` to the native input', () => {
    // The precondition any validity story depends on.
    return mount({ label: 'Username', required: true }).then((el) => {
      const native = el.shadowRoot!.querySelector('input')!;
      expect(native.required).toBe(true);
      expect(native.validity.valueMissing).toBe(true);
    });
  });

  it('keeps an aria-invalid set on the host', async () => {
    // WebAwesome re-renders its shadow DOM on every property change; a host attribute set
    // by React has to survive that, or the styling would flicker off.
    const el = await mount({ label: 'Username' });
    el.setAttribute('aria-invalid', 'true');
    el.label = 'Username changed';
    await el.updateComplete;
    expect(el.getAttribute('aria-invalid')).toBe('true');
  });

  it('describes the control by its hint, so the message is announced', async () => {
    // Why the error text goes in `hint` rather than a sibling element: wa-input already
    // points the inner input's aria-describedby at it.
    const el = await mount({ label: 'Username', hint: 'Incorrect username or password' });
    const native = el.shadowRoot!.querySelector('input')!;
    const describedBy = native.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(el.shadowRoot!.getElementById(describedBy!)?.textContent).toContain(
      'Incorrect username or password',
    );
  });
});
