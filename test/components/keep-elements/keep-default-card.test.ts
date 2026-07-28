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

    // Empty defaults for the text-bearing slots.
    const img = shadow(el).querySelector('div.icon img')!;
    expect(img.getAttribute('src')).toBe('');
    expect(img.getAttribute('alt')).toBe('');
    expect(shadow(el).querySelector('section.titles strong text')!.textContent!.trim()).toBe('');
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

  it('reflects the title into the heading and image alt text', async () => {
    const el = await mountLit<DefaultCard>(TAG, { title: 'My Schema' });
    expect(shadow(el).querySelector('section.titles strong text')!.textContent!.trim()).toBe(
      'My Schema',
    );
    expect(shadow(el).querySelector('div.icon img')!.getAttribute('alt')).toBe('My Schema');
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
    expect(shadow(el).querySelector('div.delete')).toBeNull();
  });

  it('renders the delete affordance when delete is true', async () => {
    const el = await mountLit<DefaultCard>(TAG, { delete: true });
    expect(shadow(el).querySelector('div.delete')).toBeTruthy();
  });

  it('invokes onDelete when the delete control is clicked', async () => {
    const onDelete = vi.fn();
    const el = await mountLit<DefaultCard>(TAG, { delete: true, onDelete });
    const affordance = shadow(el).querySelector('div.delete') as HTMLElement;
    expect(affordance).toBeTruthy();
    // Click bubbles up to the handler on the enclosing section.delete.
    affordance.click();
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('stops propagation of the delete click to ancestors', async () => {
    const onDelete = vi.fn();
    const el = await mountLit<DefaultCard>(TAG, { delete: true, onDelete });
    const outer = vi.fn();
    el.addEventListener('click', outer);
    (shadow(el).querySelector('div.delete') as HTMLElement).click();
    expect(onDelete).toHaveBeenCalledTimes(1);
    // stopPropagation() keeps the click from reaching the host listener.
    expect(outer).not.toHaveBeenCalled();
  });
});
