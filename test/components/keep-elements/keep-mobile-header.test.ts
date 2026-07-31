/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
// Value imports, not `import type`: the assertions below read `.styles` off the classes, and
// the default import registers the element as a side effect either way.
import MobileHeader from '../../../src/components/keep-elements/keep-mobile-header';
import PageRouters from '../../../src/components/keep-elements/keep-page-routers';

describe('keep-mobile-header', () => {
  const TAG = 'keep-mobile-header';
  const bar = (el: MobileHeader) => el.shadowRoot!.querySelector('header.bar')!;

  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders the bar as a header element', async () => {
    const el = await mountLit<MobileHeader>(TAG);
    expect(bar(el).tagName).toBe('HEADER');
  });

  it('states the 56px height rather than inferring it', async () => {
    const el = await mountLit<MobileHeader>(TAG);
    // wa-page measures this region and publishes --header-height from it; Views subtracts that
    // from the viewport. app-shell.test.ts pins the same number from the source side.
    expect(MobileHeader.styles.toString()).toMatch(/height:\s*56px/);
    expect(bar(el)).toBeTruthy();
  });

  it('gives the logo an accessible name', async () => {
    const el = await mountLit<MobileHeader>(TAG);
    const logo = el.shadowRoot!.querySelector('img')!;
    expect(logo.getAttribute('alt')).toBe('HCL Domino REST API Icon');
    expect(logo.getAttribute('src')).toBeTruthy();
  });

  it('exposes an unnamed slot for the still-React ProfileMenuDialog', async () => {
    const el = await mountLit<MobileHeader>(TAG);
    // Unnamed on purpose: ProfileMenuDialog forwards no props, so a `slot` attribute passed to
    // it as a React prop would be dropped and the content never assigned.
    const slot = el.shadowRoot!.querySelector('slot')!;
    expect(slot).toBeTruthy();
    expect(slot.hasAttribute('name')).toBe(false);
  });

  it('projects whatever the shell puts in it, inside the profile box', async () => {
    const el = document.createElement('keep-mobile-header');
    el.innerHTML = '<div id="probe"></div>';
    document.body.appendChild(el);
    await el.updateComplete;
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('.profile slot')!;
    expect(slot.assignedElements().map((n) => n.id)).toEqual(['probe']);
  });

  it('does not reproduce the keep-icon class, which nothing defines', async () => {
    const el = await mountLit<MobileHeader>(TAG);
    expect(el.shadowRoot!.querySelector('.keep-icon')).toBeNull();
  });
});

/*
 * `keep-homepage` had a block here, and it moved to `keep-homepage.test.ts` in #806 wave 8.
 *
 * It was three cases about a container with a slot. The element is the whole `/` screen now —
 * `home/sections/Section.tsx` and `Tip.tsx` folded into it — so it has a suite of its own,
 * carrying the two cases that still mean something. The third asserted that a still-React
 * child was projected through the default slot; there is no React child and no slot left, and
 * what replaced it is asserted there as rendered tiles.
 */

describe('keep-page-routers', () => {
  const TAG = 'keep-page-routers';

  afterEach(cleanupLit);

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('keeps the 60px strip and hides it on mobile', () => {
    const styles = PageRouters.styles.toString();
    expect(styles).toMatch(/height:\s*60px/);
    expect(styles).toMatch(/max-width:\s*768px/);
    expect(styles).toMatch(/display:\s*none/);
  });

  it('drops the arrow-left rule, which matched nothing', () => {
    // Also unmovable: a rule reaching into a slotted child cannot live in this shadow root,
    // since ::slotted() matches only the slotted node and not its descendants.
    expect(PageRouters.styles.toString()).not.toContain('arrow-left');
  });

  it('projects its still-React child through the default slot', async () => {
    const el = document.createElement('keep-page-routers');
    el.innerHTML = '<div id="breadcrumbs"></div>';
    document.body.appendChild(el);
    await el.updateComplete;
    const slot = el.shadowRoot!.querySelector<HTMLSlotElement>('slot')!;
    expect(slot.assignedElements().map((n) => n.id)).toEqual(['breadcrumbs']);
  });
});
