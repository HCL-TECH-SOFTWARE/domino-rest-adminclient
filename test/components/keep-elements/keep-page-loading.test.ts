/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
// Value import, not `import type`: importing the module registers the element, and the
// layout assertions below read `.styles` off the class. The suite runs with `css: false`,
// so a rule that went missing is invisible to the DOM — reading the stylesheet source is
// the only way to catch it here.
import PageLoading from '../../../src/components/keep-elements/keep-page-loading';

const TAG = 'keep-page-loading';

const caption = (el: PageLoading) => el.shadowRoot!.querySelector('p')!;
const dots = (el: PageLoading) => el.shadowRoot!.querySelector('.dots')!;

describe('keep-page-loading', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders four dots', async () => {
    const el = await mountLit<PageLoading>(TAG);
    expect(dots(el).querySelectorAll('div')).toHaveLength(4);
  });

  it('announces the caption through a status live region', async () => {
    const el = await mountLit<PageLoading>(TAG, { message: 'Loading Applications' });
    // role="status" carries an implicit aria-live="polite" (#713).
    expect(caption(el).getAttribute('role')).toBe('status');
    expect(caption(el).textContent).toContain('Loading Applications');
  });

  it('hides the decorative dots from assistive tech', async () => {
    const el = await mountLit<PageLoading>(TAG, { message: 'x' });
    expect(dots(el).getAttribute('aria-hidden')).toBe('true');
  });

  it('updates the caption when the message changes', async () => {
    const el = await mountLit<PageLoading>(TAG, { message: 'first' });
    el.message = 'second';
    await el.updateComplete;
    expect(caption(el).textContent).toContain('second');
    expect(caption(el).textContent).not.toContain('first');
  });

  it('renders an empty caption rather than "undefined" with no message set', async () => {
    const el = await mountLit<PageLoading>(TAG);
    expect(caption(el).textContent!.trim()).toBe('');
  });

  describe('empty caption', () => {
    it('marks the caption empty when there is no message', async () => {
      const el = await mountLit<PageLoading>(TAG);
      // The live region has to exist before the text arrives, so it is always rendered.
      // The class is what stops its block margin pushing the dots off centre.
      expect(caption(el).classList.contains('empty')).toBe(true);
    });

    it('carries no class attribute at all once a message is set', async () => {
      const el = await mountLit<PageLoading>(TAG, { message: 'Loading Applications' });
      expect(caption(el).hasAttribute('class')).toBe(false);
    });

    it('drops the empty marker when a message arrives', async () => {
      const el = await mountLit<PageLoading>(TAG);
      el.message = 'Loading form modes';
      await el.updateComplete;
      expect(caption(el).hasAttribute('class')).toBe(false);
    });

    it('restores the empty marker when the message is cleared', async () => {
      const el = await mountLit<PageLoading>(TAG, { message: 'Loading form modes' });
      el.message = '';
      await el.updateComplete;
      expect(caption(el).classList.contains('empty')).toBe(true);
    });

    it('collapses the empty caption margin', () => {
      expect(PageLoading.styles.toString()).toMatch(/p\.empty\s*\{[^}]*margin:\s*0/);
    });
  });

  describe('contained variant', () => {
    it('overlays the page by default', async () => {
      const el = await mountLit<PageLoading>(TAG);
      expect(el.contained).toBe(false);
      expect(el.hasAttribute('contained')).toBe(false);
    });

    it('reflects `contained` to an attribute, because the two layouts are pure CSS', async () => {
      const el = await mountLit<PageLoading>(TAG, { contained: true });
      expect(el.hasAttribute('contained')).toBe(true);

      el.contained = false;
      await el.updateComplete;
      expect(el.hasAttribute('contained')).toBe(false);
    });

    it('reads the attribute back as a boolean', async () => {
      const el = await mountLit<PageLoading>(TAG);
      el.setAttribute('contained', '');
      await el.updateComplete;
      expect(el.contained).toBe(true);
    });

    it('leaves normal flow and fills its parent instead of overlaying', () => {
      const styles = PageLoading.styles.toString();
      // The default host is `position: absolute; height: calc(100vh - 100px)`. Dropped into
      // a panel unchanged it escapes the panel and covers the page — this rule is the whole
      // reason `GenericLoading` could be folded into this element.
      expect(styles).toMatch(/:host\(\[contained\]\)\s*\{[^}]*position:\s*static/);
      expect(styles).toMatch(/:host\(\[contained\]\)\s*\{[^}]*height:\s*100%/);
    });

    it('does not paint the mobile white backdrop over a contained instance', () => {
      const styles = PageLoading.styles.toString();
      // `background: white` is mode-invariant, so on a contained instance it would be a
      // light patch inside a dark panel. It must stay scoped to the overlay variant.
      expect(styles).toMatch(/:host\(:not\(\[contained\]\)\)\s*\{\s*background:\s*white/);
      expect(styles.match(/background:\s*white/g)).toHaveLength(1);
    });
  });
});
