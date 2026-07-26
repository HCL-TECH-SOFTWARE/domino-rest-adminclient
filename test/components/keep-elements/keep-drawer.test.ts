import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-drawer';
import type Drawer from '../../../src/components/keep-elements/keep-drawer';

const TAG = 'keep-drawer';

const waDrawer = (el: Drawer) => el.shadowRoot!.querySelector('wa-drawer')!;

describe('keep-drawer', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a wa-drawer', async () => {
    const el = await mountLit<Drawer>(TAG);
    expect(waDrawer(el)).toBeTruthy();
  });

  it('applies the default label to the wa-drawer', async () => {
    const el = await mountLit<Drawer>(TAG);
    expect(waDrawer(el).getAttribute('label')).toBe('Drawer Label');
  });

  it('reflects the label property onto the wa-drawer', async () => {
    const el = await mountLit<Drawer>(TAG, { label: 'My Drawer' });
    expect(waDrawer(el).getAttribute('label')).toBe('My Drawer');
  });

  it('is closed by default (no open attribute on the wa-drawer)', async () => {
    const el = await mountLit<Drawer>(TAG);
    expect(waDrawer(el).hasAttribute('open')).toBe(false);
  });

  it('reflects the open state onto the wa-drawer', async () => {
    const el = await mountLit<Drawer>(TAG, { open: true });
    expect(waDrawer(el).hasAttribute('open')).toBe(true);
  });

  it('projects light-DOM children through a default slot', async () => {
    const el = await mountLit<Drawer>(TAG);
    expect(el.shadowRoot!.querySelector('slot')).toBeTruthy();
  });

  it('defaults the buttons property to an empty array', async () => {
    const el = await mountLit<Drawer>(TAG);
    expect(el.buttons).toEqual([]);
  });

  it('accepts a buttons array as a reactive property', async () => {
    const buttons = [{ label: 'Save' }, { label: 'Cancel' }];
    const el = await mountLit<Drawer>(TAG, { buttons });
    expect(el.buttons).toEqual(buttons);
  });

  it('invokes closeFn when the wa-drawer fires wa-after-hide', async () => {
    const closeFn = vi.fn();
    const el = await mountLit<Drawer>(TAG, { closeFn });
    waDrawer(el).dispatchEvent(new Event('wa-after-hide'));
    expect(closeFn).toHaveBeenCalledTimes(1);
  });
});
