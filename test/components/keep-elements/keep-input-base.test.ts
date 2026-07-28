/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-input-text';
import '../../../src/components/keep-elements/keep-input-password';
import type { KeepInputBase } from '../../../src/components/keep-elements/keep-input-base';

/**
 * #743 part 2 — the public value/validity API that lets consumers stop reaching through
 * `keep-input-*`'s shadow root.
 *
 * `LoginPage` held 11 `?.shadowRoot.querySelector('wa-input')` reaches, two of them
 * unguarded writes, plus a local copy of the `hasInteracted`-before-`checkValidity()`
 * ordering that WebAwesome requires. Both are the element's business, so both moved onto
 * `KeepInputBase`.
 *
 * Every case runs against **both** subclasses: they now share one implementation, and a
 * suite that only exercised the text one would not notice the password one drifting.
 */

const CASES = [
  { tag: 'keep-input-text', label: 'keep-input-text' },
  { tag: 'keep-input-password', label: 'keep-input-password' },
] as const;

/** The wrapped control. Tests reach for it only to *drive* the element, never to assert. */
const waInput = (el: KeepInputBase) => el.shadowRoot!.querySelector('wa-input')!;

/** Type the way a user does, so WebAwesome updates its own value and fires `input`. */
const type = (el: KeepInputBase, text: string) => {
  const native = waInput(el).shadowRoot!.querySelector('input')!;
  native.value = text;
  native.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
};

describe.each(CASES)('$label — value and validity API (#743)', ({ tag }) => {
  afterEach(cleanupLit);

  const mount = (props: Partial<KeepInputBase> = {}) => mountLit<KeepInputBase>(tag, props);

  describe('value', () => {
    it('defaults to the empty string', async () => {
      const el = await mount();
      expect(el.value).toBe('');
    });

    it('pushes an assigned value down to the control', async () => {
      // The passkey prefill's one use: `usernameRef.current.value = storedUser`, which
      // used to be a write straight through two shadow roots.
      const el = await mount();
      el.value = 'prefilled';
      await el.updateComplete;
      expect(waInput(el).value).toBe('prefilled');
    });

    it('accepts a value set before the first render', async () => {
      const el = await mount({ value: 'from-props' });
      expect(waInput(el).value).toBe('from-props');
    });

    it('reads back what the user typed', async () => {
      const el = await mount();
      type(el, 'someone');
      expect(el.value).toBe('someone');
    });

    it('does not clobber the typed value on a later render', async () => {
      // `.value=` is a one-way binding from the property, so a re-render triggered by any
      // other property would reset the field if typing did not write back.
      const el = await mount();
      type(el, 'someone');
      el.label = 'Changed';
      await el.updateComplete;
      expect(waInput(el).value).toBe('someone');
      expect(el.value).toBe('someone');
    });
  });

  describe('checkValidity', () => {
    it('is true for an optional empty field', async () => {
      const el = await mount();
      expect(el.checkValidity()).toBe(true);
    });

    it('is false for a required empty field', async () => {
      const el = await mount({ required: true });
      expect(el.checkValidity()).toBe(false);
    });

    it('is true once a required field has a value', async () => {
      const el = await mount({ required: true });
      type(el, 'someone');
      expect(el.checkValidity()).toBe(true);
    });

    it('leaves the user-invalid state alone', async () => {
      // The difference from reportUserValidity: this one is a question, not a verdict.
      const el = await mount({ required: true });
      expect(el.checkValidity()).toBe(false);
      expect(waInput(el).customStates.has('user-invalid')).toBe(false);
    });
  });

  describe('reportUserValidity', () => {
    it('puts a failing field into the user-invalid state', async () => {
      const el = await mount({ required: true });
      expect(el.reportUserValidity()).toBe(false);
      expect(waInput(el).customStates.has('user-invalid')).toBe(true);
    });

    it('leaves a passing field out of it', async () => {
      const el = await mount({ required: true });
      type(el, 'someone');
      expect(el.reportUserValidity()).toBe(true);
      expect(waInput(el).customStates.has('user-invalid')).toBe(false);
    });

    it('sets no data-user-invalid attribute', async () => {
      // The Shoelace-era form (#742). Nothing in WebAwesome reads it.
      const el = await mount({ required: true });
      el.reportUserValidity();
      expect(waInput(el).hasAttribute('data-user-invalid')).toBe(false);
    });

    it('does not move focus', async () => {
      // Why it calls checkValidity() rather than WebAwesome's reportValidity(): a form
      // validates every field at once, and the native call would steal focus each time.
      const el = await mount({ required: true });
      const focus = vi.spyOn(waInput(el), 'focus');
      el.reportUserValidity();
      expect(focus).not.toHaveBeenCalled();
    });

    it('clears the state on a later, passing call', async () => {
      const el = await mount({ required: true });
      el.reportUserValidity();
      type(el, 'someone');
      expect(el.reportUserValidity()).toBe(true);
      expect(waInput(el).customStates.has('user-invalid')).toBe(false);
    });
  });

  describe('setCustomValidity', () => {
    it('invalidates an otherwise-valid field', async () => {
      // The 401 path: neither field breaks a constraint on its own, the server rejected
      // the pair.
      const el = await mount();
      type(el, 'someone');
      el.setCustomValidity('Incorrect username or password');
      expect(el.reportUserValidity()).toBe(false);
      expect(waInput(el).customStates.has('user-invalid')).toBe(true);
    });

    it('is cleared by an empty message', async () => {
      const el = await mount();
      type(el, 'someone');
      el.setCustomValidity('Incorrect username or password');
      el.setCustomValidity('');
      expect(el.reportUserValidity()).toBe(true);
      expect(waInput(el).customStates.has('user-invalid')).toBe(false);
    });
  });

  describe('before the first render', () => {
    // The element is upgraded but has not rendered, which is what an unguarded
    // `?.shadowRoot.querySelector(…).value` used to throw on.
    const unrendered = () => document.createElement(tag) as KeepInputBase;

    it('reports invalid rather than throwing', async () => {
      expect(unrendered().checkValidity()).toBe(false);
      expect(unrendered().reportUserValidity()).toBe(false);
    });

    it('accepts setCustomValidity as a no-op', async () => {
      expect(() => unrendered().setCustomValidity('nope')).not.toThrow();
    });

    it('still reads and writes value', async () => {
      const el = unrendered();
      el.value = 'early';
      expect(el.value).toBe('early');
    });
  });
});
