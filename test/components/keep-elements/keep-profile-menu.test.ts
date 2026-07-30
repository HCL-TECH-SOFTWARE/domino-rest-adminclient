/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { FA_LIBRARY } from '../../../src/services/icon-library';
// Registered here, statically, on purpose. The element fetches this module off the eager
// path (see load-popover.ts), so in a test nothing would have upgraded `wa-popover` by the
// time `updateComplete` resolves. Importing it directly keeps registration synchronous, so
// no assertion has to await a dynamic import.
import '@awesome.me/webawesome/dist/components/popover/popover.js';
import ProfileMenu from '../../../src/components/keep-elements/keep-profile-menu';

/**
 * `keep-option-list` dispatches the real logout thunk, which fires a network request before
 * it clears the session. Replaced the same way its own suite replaces it: only `logout`, so
 * the rest of the store graph stays real, and with a plain action so `store.dispatch` runs.
 */
vi.mock('../../../src/store/account/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/account/action')>()),
  logout: vi.fn(() => ({ type: 'test/logout' })),
}));

/**
 * jsdom 30 implements no `<dialog>` methods at all. `test/setupTests.ts` supplies `showModal`
 * and `close`; `wa-popover` opens with the non-modal `show()`, which nothing supplies, so
 * without this the popover's update throws an unhandled rejection and never opens.
 *
 * Setting the attribute rather than a no-op keeps `dialog.open` honest for anything that
 * reads it. See the report: this belongs beside its two siblings in `setupTests.ts`.
 */
beforeAll(() => {
  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = function () {
      this.setAttribute('open', '');
    };
  }
});

const TAG = 'keep-profile-menu';

type Popover = HTMLElement & { open: boolean };

const trigger = (el: ProfileMenu) =>
  el.shadowRoot!.querySelector<HTMLButtonElement>('button.avatar')!;
const popover = (el: ProfileMenu) => el.shadowRoot!.querySelector<Popover>('wa-popover')!;
const tooltip = (el: ProfileMenu) => el.shadowRoot!.querySelector('keep-tooltip')!;
const optionLists = (el: ProfileMenu) => [...el.shadowRoot!.querySelectorAll('keep-option-list')];
const signOutIn = (list: Element) =>
  list.shadowRoot!.querySelector<HTMLButtonElement>('[data-testid="signOut"]')!;
const text = (el: ProfileMenu, selector: string) =>
  [...el.shadowRoot!.querySelectorAll(selector)].map((node) => node.textContent);

/** Long enough for wa-popover's open/close, which awaits an animation frame. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

/** A Keep bearer token, as the non-IdP login flow stores it. */
const keepToken = (sub: string) =>
  JSON.stringify({ claims: { iss: 'keep', sub, permissions: [] }, expSeconds: 1, issueDate: 1 });

describe('keep-profile-menu', () => {
  beforeEach(() => {
    localStorage.setItem('user_token', keepToken('CN=John Doe/O=Acme'));
  });

  afterEach(() => {
    localStorage.removeItem('user_token');
    cleanupLit();
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('shows the signed-in user and their role, in the rail and in the card', async () => {
    const el = await mountLit<ProfileMenu>(TAG, { expanded: true });
    // Two of each: the inline block and the popover card render the same pair.
    expect(text(el, '.name')).toEqual(['John Doe', 'John Doe']);
    expect(text(el, '.role')).toEqual(['Administrator', 'Administrator']);
  });

  it('renders an empty name rather than failing when there is no token', async () => {
    localStorage.removeItem('user_token');
    const el = await mountLit<ProfileMenu>(TAG, { expanded: true });
    expect(text(el, '.name')).toEqual(['', '']);
  });

  /* It was a div with a click handler: no role, no keyboard path, no name of its own. */
  it('makes the avatar a real button that names itself and declares its popup', async () => {
    const el = await mountLit<ProfileMenu>(TAG);
    expect(trigger(el).getAttribute('type')).toBe('button');
    expect(trigger(el).getAttribute('aria-label')).toBe('Profile');
    expect(trigger(el).getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
  });

  it('keeps the profileIcon test hook the React version carried', async () => {
    const el = await mountLit<ProfileMenu>(TAG);
    expect(trigger(el).getAttribute('data-testid')).toBe('profileIcon');
  });

  it('renders the avatar glyph from the bundled library, never the CDN', async () => {
    const el = await mountLit<ProfileMenu>(TAG);
    const icon = trigger(el).querySelector('wa-icon')!;
    expect(icon.getAttribute('library')).toBe(FA_LIBRARY);
    expect(icon.getAttribute('name')).toBe('circle-user');
    // The 1em box the icon set this replaced drew, rather than WebAwesome's 1.25em default.
    expect(icon.getAttribute('canvas')).toBe('auto');
    // Decorative: the button around it is what carries the name.
    expect(icon.hasAttribute('label')).toBe(false);
  });

  /*
   * The avatar opens nothing while the rail is open — the Sign Out button is already on
   * screen. `inert` says so without destroying the node, which is what keeps the width
   * transitions this component exists for from being cut short.
   */
  it('makes the avatar inert while the rail is expanded, and live while it is collapsed', async () => {
    const el = await mountLit<ProfileMenu>(TAG, { expanded: true });
    expect(trigger(el).hasAttribute('inert')).toBe(true);

    el.expanded = false;
    await el.updateComplete;
    expect(trigger(el).hasAttribute('inert')).toBe(false);
  });

  it('keeps one avatar node across a rail toggle, so the transition is not cut short', async () => {
    const el = await mountLit<ProfileMenu>(TAG, { expanded: false });
    const before = trigger(el);

    el.expanded = true;
    await el.updateComplete;

    expect(trigger(el)).toBe(before);
  });

  it('offers the Profile tooltip only on the collapsed rail', async () => {
    const el = await mountLit<ProfileMenu>(TAG, { expanded: false });
    expect(tooltip(el).getAttribute('content')).toBe('Profile');

    el.expanded = true;
    await el.updateComplete;
    // keep-tooltip renders nothing for empty content, which is how the open rail suppressed it.
    expect(tooltip(el).getAttribute('content')).toBe('');
  });

  it('marks the container so the rail state drives the layout from CSS', async () => {
    const el = await mountLit<ProfileMenu>(TAG, { expanded: false });
    expect(el.shadowRoot!.querySelector('.profile')!.classList.contains('collapsed')).toBe(true);

    el.expanded = true;
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('.profile')!.classList.contains('expanded')).toBe(true);
  });

  it('offers Sign Out inline and inside the popover card', async () => {
    const el = await mountLit<ProfileMenu>(TAG);
    expect(optionLists(el)).toHaveLength(2);
    expect(optionLists(el)[1].closest('wa-popover')).toBeTruthy();
  });

  describe('the collapsed-rail popover', () => {
    it('opens from the avatar and reports the state on the trigger', async () => {
      const el = await mountLit<ProfileMenu>(TAG, { expanded: false });
      expect(popover(el).open).toBe(false);

      trigger(el).click();
      await settle();
      await el.updateComplete;

      expect(popover(el).open).toBe(true);
      expect(trigger(el).getAttribute('aria-expanded')).toBe('true');
    });

    /* The click-away wrapper it replaces did this much; Escape and focus return are new. */
    it('dismisses on a click outside and clears the trigger state', async () => {
      const el = await mountLit<ProfileMenu>(TAG, { expanded: false });
      trigger(el).click();
      await settle();

      document.body.click();
      await settle();
      await el.updateComplete;

      expect(popover(el).open).toBe(false);
      expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
    });

    it('dismisses on Escape', async () => {
      const el = await mountLit<ProfileMenu>(TAG, { expanded: false });
      trigger(el).click();
      await settle();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await settle();

      expect(popover(el).open).toBe(false);
    });

    /*
     * Crossing the mobile breakpoint forces the expanded rendering with no click anywhere, so
     * the outside-click dismissal above cannot fire. Left open, the card would duplicate the
     * Sign Out button that has just appeared inline.
     */
    it('closes itself when the rail expands without a click', async () => {
      const el = await mountLit<ProfileMenu>(TAG, { expanded: false });
      trigger(el).click();
      await settle();
      expect(popover(el).open).toBe(true);

      el.expanded = true;
      await el.updateComplete;

      expect(popover(el).open).toBe(false);
    });
  });

  /*
   * The one behavioural change this conversion makes: the redirect used to happen in this
   * component, which was React and could call the router. It now happens one level further
   * up, in the shell, which means the event `keep-option-list` emits has to cross two shadow
   * roots to get there. `KeepElement.emit` composes it, so it does — and if that ever stops
   * being true, signing out leaves the user on a page they are no longer authenticated for.
   */
  describe('the logout event reaching the shell', () => {
    it('surfaces on the host when Sign Out is used inline', async () => {
      const el = await mountLit<ProfileMenu>(TAG, { expanded: true });
      const onLogout = vi.fn();
      el.addEventListener('logout', onLogout);

      signOutIn(optionLists(el)[0]).click();

      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('surfaces on the host when Sign Out is used from the popover card', async () => {
      const el = await mountLit<ProfileMenu>(TAG, { expanded: false });
      const onLogout = vi.fn();
      el.addEventListener('logout', onLogout);

      signOutIn(optionLists(el)[1]).click();

      expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('keeps going past the host, which is where the wrapper listens', async () => {
      const el = await mountLit<ProfileMenu>(TAG, { expanded: true });
      const onLogout = vi.fn();
      document.body.addEventListener('logout', onLogout);

      signOutIn(optionLists(el)[0]).click();

      document.body.removeEventListener('logout', onLogout);
      expect(onLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('colour on a gradient that has no dark variant', () => {
    const styles = ProfileMenu.styles.toString();

    /*
     * `.color-text-primary` gave these labels #000 in light and #e0e0e0 in dark. The sidenav
     * gradient does not change with the appearance, and this block sits at its pale end
     * (#8cc7f9): #000 is 11.7:1 there and #e0e0e0 is 1.35:1. A mode-aware token is the wrong
     * tool when the background is not mode-aware, so the value is a literal and dark mode
     * renders what light mode always did.
     */
    it('states one text colour for both appearances', () => {
      expect(styles).toMatch(/\.profile\s*\{[^}]*color:\s*#000/);
    });

    it('reads a mode-aware surface for the popover card, which is not on the gradient', () => {
      expect(styles).toMatch(/--wa-color-surface-raised/);
      expect(styles).toMatch(/--wa-color-text-normal/);
    });

    /* #924: `light-dark()` is rejected across the elements; asserted here too because this is
       exactly the file where reaching for it would be tempting. */
    it('uses no light-dark() literal', () => {
      expect(styles).not.toMatch(/light-dark\(/);
    });
  });

  /*
   * `.weight-700` is not defined by any stylesheet in the tree — only `.weight-300`, `-400`
   * and `-500` exist — so the username has never rendered bold. Reproducing the class name's
   * intent would be a visual change nobody asked for, so the conversion drops it, the same
   * way keep-mobile-header dropped the `keep-icon` class that also defined nothing.
   */
  it('does not make the username bold, which the dead class never did', () => {
    expect(ProfileMenu.styles.toString()).not.toMatch(/font-weight/);
  });
});
