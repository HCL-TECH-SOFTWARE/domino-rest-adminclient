/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import '../../../src/components/keep-elements/keep-default-card';
import type DefaultCard from '../../../src/components/keep-elements/keep-default-card';

const TAG = 'keep-default-card';

const shadow = (el: DefaultCard) => el.shadowRoot!;
const waCard = (el: DefaultCard) => shadow(el).querySelector('wa-card')!;

describe('keep-default-card', () => {
  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders a wa-card shell with default content', async () => {
    const el = await mountLit<DefaultCard>(TAG);
    expect(waCard(el)).toBeTruthy();

    // Structural sections that always render.
    expect(shadow(el).querySelector('div.main')).toBeTruthy();
    expect(shadow(el).querySelector('section.titles')).toBeTruthy();
    expect(shadow(el).querySelector('section.description')).toBeTruthy();

    // No icon yet, so the slot holds a placeholder rather than an `img` with an empty
    // `src` — see the skeleton test below.
    expect(shadow(el).querySelector('div.icon img')).toBeNull();
    expect(shadow(el).querySelector('section.titles strong text')!.textContent!.trim()).toBe('');
  });

  /**
   * #772 moved the icon payloads into a lazily loaded chunk, so a card can mount with a
   * name it cannot yet resolve. Callers signal that by passing an empty `icon`, and the
   * card must not render `<img src="">` — that paints a broken-image glyph, then swaps,
   * which is precisely the flash the issue set out to avoid.
   */
  it('renders a skeleton, not an empty image, while the icon is unresolved', async () => {
    const el = await mountLit<DefaultCard>(TAG, { icon: '' });
    expect(shadow(el).querySelector('div.icon img')).toBeNull();
    expect(shadow(el).querySelector('div.icon .app-icon-skeleton')).toBeTruthy();
  });

  it('drops the skeleton once an icon arrives', async () => {
    const el = await mountLit<DefaultCard>(TAG, { icon: '' });
    expect(shadow(el).querySelector('div.icon .app-icon-skeleton')).toBeTruthy();

    el.icon = '/icons/db.svg';
    await el.updateComplete;

    expect(shadow(el).querySelector('div.icon .app-icon-skeleton')).toBeNull();
    expect(shadow(el).querySelector('div.icon img')!.getAttribute('src')).toBe('/icons/db.svg');
  });

  it('defaults the status dot to the "off" colour', async () => {
    const el = await mountLit<DefaultCard>(TAG);
    const status = shadow(el).querySelector('div.status') as HTMLElement;
    expect(status).toBeTruthy();
    // A class, not an inline colour: the production CSP sends style-src-attr 'none', which
    // blocks an interpolated style attribute, so the dot rendered colourless (#685). This
    // suite asserted the attribute — which jsdom always applies — so it confirmed the bug
    // instead of catching it.
    expect(status.classList.contains('inactive')).toBe(true);
    expect(status.classList.contains('active')).toBe(false);
    expect(status.hasAttribute('style')).toBe(false);
  });

  it('renders the status dot in the "on" colour when status is true', async () => {
    const el = await mountLit<DefaultCard>(TAG, { status: true });
    const status = shadow(el).querySelector('div.status') as HTMLElement;
    expect(status.classList.contains('active')).toBe(true);
    expect(status.classList.contains('inactive')).toBe(false);
  });

  it('reflects the title into the heading, and leaves the image to the button name', async () => {
    const el = await mountLit<DefaultCard>(TAG, { title: 'My Schema', icon: '/icons/db.svg' });
    expect(shadow(el).querySelector('section.titles strong text')!.textContent!.trim()).toBe(
      'My Schema',
    );
    // Decorative: the open button's name already carries the title, so alt text would read twice.
    expect(shadow(el).querySelector('div.icon img')!.getAttribute('alt')).toBe('');
  });

  it('reflects the subtitle into the titles section', async () => {
    const el = await mountLit<DefaultCard>(TAG, { subtitle: 'a subtitle' });
    expect(shadow(el).querySelector('section.titles text.medium')!.textContent!.trim()).toBe(
      'a subtitle',
    );
  });

  it('reflects the icon into the image src', async () => {
    const el = await mountLit<DefaultCard>(TAG, { icon: '/icons/db.svg' });
    expect(shadow(el).querySelector('div.icon img')!.getAttribute('src')).toBe('/icons/db.svg');
  });

  it('reflects the description into the description section', async () => {
    const el = await mountLit<DefaultCard>(TAG, { description: 'Long form text' });
    expect(shadow(el).querySelector('section.description text.medium')!.textContent!.trim()).toBe(
      'Long form text',
    );
  });

  it('renders no acl badge when acl is empty', async () => {
    const el = await mountLit<DefaultCard>(TAG);
    // Only the title strong is present; no acl strong.
    expect(shadow(el).querySelectorAll('section.titles strong').length).toBe(1);
  });

  it('renders an acl badge when acl is set', async () => {
    const el = await mountLit<DefaultCard>(TAG, { acl: '*Manager' });
    const strongs = shadow(el).querySelectorAll('section.titles strong');
    expect(strongs.length).toBe(2);
    const aclText = strongs[1].querySelector('text')!;
    expect(aclText.textContent!.trim()).toBe('*Manager');
    // Non-editor ACL is coloured green, via a class — see the note on the status dot.
    expect(aclText.classList.contains('acl-other')).toBe(true);
    expect(aclText.hasAttribute('style')).toBe(false);
  });

  it('colours an *Editor acl badge orange', async () => {
    const el = await mountLit<DefaultCard>(TAG, { acl: '*Editor' });
    const aclText = shadow(el).querySelectorAll('section.titles strong')[1].querySelector('text')!;
    expect(aclText.classList.contains('acl-editor')).toBe(true);
  });

  it('renders no delete affordance by default', async () => {
    const el = await mountLit<DefaultCard>(TAG);
    expect(shadow(el).querySelector('button.delete-button')).toBeNull();
  });

  it('renders the delete affordance when delete is true', async () => {
    const el = await mountLit<DefaultCard>(TAG, { delete: true });
    expect(shadow(el).querySelector('button.delete-button')).toBeTruthy();
  });

  it('invokes onDelete when the delete control is clicked', async () => {
    const onDelete = vi.fn();
    const el = await mountLit<DefaultCard>(TAG, { delete: true, onDelete });
    const affordance = shadow(el).querySelector('button.delete-button') as HTMLElement;
    expect(affordance).toBeTruthy();
    affordance.click();
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('stops propagation of the delete click to ancestors', async () => {
    const onDelete = vi.fn();
    const el = await mountLit<DefaultCard>(TAG, { delete: true, onDelete });
    const outer = vi.fn();
    el.addEventListener('click', outer);
    (shadow(el).querySelector('button.delete-button') as HTMLElement).click();
    expect(onDelete).toHaveBeenCalledTimes(1);
    // stopPropagation() keeps the click from reaching the host listener.
    expect(outer).not.toHaveBeenCalled();
  });

  describe('keyboard and assistive technology', () => {
    const open = (el: DefaultCard) => shadow(el).querySelector('.open') as HTMLElement;

    it('puts the card body in the tab order as a button named for the card', async () => {
      const el = await mountLit<DefaultCard>(TAG, { title: 'My Schema', subtitle: 'a/b.nsf' });
      expect(open(el).getAttribute('role')).toBe('button');
      expect(open(el).getAttribute('tabindex')).toBe('0');
      expect(open(el).getAttribute('aria-label')).toBe('My Schema, a/b.nsf');
    });

    it.each(['Enter', ' '])('raises a host click on %j, which is what the parents listen for', async (key) => {
      const el = await mountLit<DefaultCard>(TAG, { title: 'My Schema' });
      const clicked = vi.fn();
      el.addEventListener('click', clicked);
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      open(el).dispatchEvent(event);
      expect(clicked).toHaveBeenCalledTimes(1);
      // Space would otherwise scroll the page as well.
      expect(event.defaultPrevented).toBe(true);
    });

    it('ignores other keys, so Tab still leaves the card', async () => {
      const el = await mountLit<DefaultCard>(TAG, { title: 'My Schema' });
      const clicked = vi.fn();
      el.addEventListener('click', clicked);
      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      open(el).dispatchEvent(event);
      expect(clicked).not.toHaveBeenCalled();
      expect(event.defaultPrevented).toBe(false);
    });

    it('does not nest the delete button inside the open button', async () => {
      const el = await mountLit<DefaultCard>(TAG, { title: 'My Schema', delete: true });
      expect(open(el).querySelector('button')).toBeNull();
      expect(
        shadow(el).querySelector('button.delete-button')!.getAttribute('aria-label'),
      ).toBe('Delete My Schema');
    });

    it('names the status dot, so it is not carried by colour alone', async () => {
      const off = await mountLit<DefaultCard>(TAG, { title: 'x' });
      expect(shadow(off).querySelector('.status')!.getAttribute('aria-label')).toBe('Inactive');
      const on = await mountLit<DefaultCard>(TAG, { title: 'x', status: true });
      expect(shadow(on).querySelector('.status')!.getAttribute('aria-label')).toBe('Active');
    });
  });
});
