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

  it('invokes the onToggle callback on the change event wa-switch actually emits', async () => {
    // Was `new Event('wa-change')`, hand-written to match a binding that was itself wrong —
    // so it passed while every "Show Active" filter in the app silently did nothing. Web
    // Awesome prefixes only events with no native equivalent; `wa-switch` emits plain
    // `change`. Binding to the prefixed name again fails this test.
    const cb = vi.fn();
    const el = await mountLit<Switch>(TAG, { onToggle: cb });
    waSwitch(el).dispatchEvent(new Event('change'));
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('ignores the prefixed name, so a regression cannot pass by dispatching it', async () => {
    const cb = vi.fn();
    const el = await mountLit<Switch>(TAG, { onToggle: cb });
    waSwitch(el).dispatchEvent(new Event('wa-change'));
    expect(cb).not.toHaveBeenCalled();
  });
});
