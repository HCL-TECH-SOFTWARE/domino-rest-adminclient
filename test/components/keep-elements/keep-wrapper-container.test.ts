/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-wrapper-container';
import type WrapperContainer from '../../../src/components/keep-elements/keep-wrapper-container';

const TAG = 'keep-wrapper-container';

/**
 * The element replaces a bare Linaria `styled.div`, so its whole job is to be a box with a
 * slot. The suite runs with `css: false`, so the rules themselves are unverifiable here —
 * what is checked is that children are projected rather than swallowed, which is the one way
 * a slot-only element can actually break.
 */
describe('keep-wrapper-container', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a single default slot', async () => {
    const el = await mountLit<WrapperContainer>(TAG);
    const slots = el.shadowRoot!.querySelectorAll('slot');
    expect(slots).toHaveLength(1);
    expect(slots[0].hasAttribute('name')).toBe(false);
  });

  it('projects its light-DOM children into that slot', async () => {
    const el = await mountLit<WrapperContainer>(TAG);
    const child = document.createElement('p');
    child.textContent = 'page body';
    el.appendChild(child);
    await el.updateComplete;

    const slot = el.shadowRoot!.querySelector('slot')!;
    expect(slot.assignedElements()).toEqual([child]);
  });
});
