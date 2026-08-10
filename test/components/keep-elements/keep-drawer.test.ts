/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

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

  describe('wa-hide event handling (dropdown-close prevention)', () => {
    it('prevents wa-hide when source is from a child element outside the shadow root', async () => {
      const el = await mountLit<Drawer>(TAG);
      const drawer = waDrawer(el);
      
      // Simulate a dropdown-item as an external element (not in shadow root)
      const fakeDropdownItem = document.createElement('wa-dropdown-item');
      
      const hideEvent = new CustomEvent('wa-hide', {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: { source: fakeDropdownItem },
      });

      drawer.dispatchEvent(hideEvent);
      expect(hideEvent.defaultPrevented).toBe(true);
    });

    it('allows wa-hide when source is inside the drawer shadow root (programmatic/Escape close)', async () => {
      const el = await mountLit<Drawer>(TAG);
      const drawer = waDrawer(el);

      // Simulate a real internal element from the drawer's shadow root
      // We'll create a fake internal dialog element
      const fakeInternalDialog = document.createElement('dialog');
      
      // Mock the shadowRoot to make contains return true for our fake element
      const originalShadowRoot = drawer.shadowRoot;
      const mockShadowRoot = {
        contains: (element: Element) => element === fakeInternalDialog,
        host: drawer,
      } as any;

      Object.defineProperty(drawer, 'shadowRoot', {
        value: mockShadowRoot,
        configurable: true,
      });

      const hideEvent = new CustomEvent('wa-hide', {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: { source: fakeInternalDialog },
      });

      drawer.dispatchEvent(hideEvent);
      expect(hideEvent.defaultPrevented).toBe(false);

      // Restore original shadowRoot
      Object.defineProperty(drawer, 'shadowRoot', {
        value: originalShadowRoot,
        configurable: true,
      });
    });

    it('prevents wa-hide when source detail is null or missing', async () => {
      const el = await mountLit<Drawer>(TAG);
      const drawer = waDrawer(el);

      // Test with null source
      const hideEvent1 = new CustomEvent('wa-hide', {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: { source: null },
      });

      drawer.dispatchEvent(hideEvent1);
      expect(hideEvent1.defaultPrevented).toBe(true);

      // Test with no detail
      const hideEvent2 = new CustomEvent('wa-hide', {
        bubbles: true,
        composed: true,
        cancelable: true,
        detail: {},
      });

      drawer.dispatchEvent(hideEvent2);
      expect(hideEvent2.defaultPrevented).toBe(true);
    });
  });

  describe('wa-after-hide event handling (only process drawer events)', () => {
    it('ignores wa-after-hide from child elements (does not invoke closeFn)', async () => {
      const closeFn = vi.fn();
      const el = await mountLit<Drawer>(TAG, { closeFn });
      const drawer = waDrawer(el);

      // Create a fake child element (dropdown)
      const fakeChild = document.createElement('wa-dropdown');
      drawer.appendChild(fakeChild);

      // Dispatch wa-after-hide from the child (bubbles up to drawer)
      const childHideEvent = new Event('wa-after-hide', { bubbles: true });
      Object.defineProperty(childHideEvent, 'target', {
        value: fakeChild,
        configurable: true,
      });

      drawer.dispatchEvent(childHideEvent);
      // closeFn should not be called because event.target is fakeChild, not drawer
      expect(closeFn).not.toHaveBeenCalled();

      fakeChild.remove();
    });

    it('invokes closeFn only when wa-after-hide target is the drawer itself', async () => {
      const closeFn = vi.fn();
      const el = await mountLit<Drawer>(TAG, { closeFn });
      const drawer = waDrawer(el);

      const drawerHideEvent = new Event('wa-after-hide', { bubbles: true });
      drawer.dispatchEvent(drawerHideEvent);

      expect(closeFn).toHaveBeenCalledTimes(1);
      expect(closeFn).toHaveBeenCalledWith(drawerHideEvent);
    });
  });
});
