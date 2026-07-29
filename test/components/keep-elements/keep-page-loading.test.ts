/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-page-loading';
import type PageLoading from '../../../src/components/keep-elements/keep-page-loading';

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
});
