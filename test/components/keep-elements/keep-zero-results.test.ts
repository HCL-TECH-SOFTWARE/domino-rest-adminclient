/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-zero-results';
import type ZeroResults from '../../../src/components/keep-elements/keep-zero-results';

const TAG = 'keep-zero-results';

const panel = (el: ZeroResults) => el.shadowRoot!.querySelector('.panel')!;
const main = (el: ZeroResults) => el.shadowRoot!.querySelector('.main')!;
const secondary = (el: ZeroResults) => el.shadowRoot!.querySelector('.secondary')!;

describe('keep-zero-results', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders both labels', async () => {
    const el = await mountLit<ZeroResults>(TAG, {
      mainLabel: 'Sorry, no result found',
      secondaryLabel: 'What you searched for does not exist.',
    });
    expect(main(el).textContent).toContain('Sorry, no result found');
    expect(secondary(el).textContent).toContain('What you searched for does not exist.');
  });

  it('announces the empty state through a status live region', async () => {
    const el = await mountLit<ZeroResults>(TAG, { mainLabel: 'none' });
    // The list this replaces just disappeared; a screen-reader user gets no other signal
    // (#713).
    expect(panel(el).getAttribute('role')).toBe('status');
  });

  it('updates when the labels change', async () => {
    const el = await mountLit<ZeroResults>(TAG, { mainLabel: 'first' });
    el.mainLabel = 'second';
    await el.updateComplete;
    expect(main(el).textContent).toContain('second');
    expect(main(el).textContent).not.toContain('first');
  });

  it('renders empty labels rather than "undefined" with nothing set', async () => {
    const el = await mountLit<ZeroResults>(TAG);
    expect(main(el).textContent!.trim()).toBe('');
    expect(secondary(el).textContent!.trim()).toBe('');
  });
});
