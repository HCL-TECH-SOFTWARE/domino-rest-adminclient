/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-switch';
import type Switch from '../../../src/components/keep-elements/keep-switch';

const TAG = 'keep-switch';

const waSwitch = (el: Switch) => el.shadowRoot!.querySelector('wa-switch')!;

describe('keep-switch', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a wa-switch in the shadow root', async () => {
    const el = await mountLit<Switch>(TAG);
    expect(waSwitch(el)).toBeTruthy();
  });

  it('projects light-DOM children through a default slot', async () => {
    const el = await mountLit<Switch>(TAG);
    expect(el.shadowRoot!.querySelector('slot')).toBeTruthy();
  });

  it('invokes the onToggle callback on a wa-change event', async () => {
    const cb = vi.fn();
    const el = await mountLit<Switch>(TAG, { onToggle: cb });
    waSwitch(el).dispatchEvent(new Event('wa-change'));
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
