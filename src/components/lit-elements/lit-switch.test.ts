import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import './lit-switch';
import type Switch from './lit-switch';

const TAG = 'lit-switch';

const waSwitch = (el: Switch) => el.shadowRoot!.querySelector('wa-switch')!;

describe('lit-switch', () => {
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
