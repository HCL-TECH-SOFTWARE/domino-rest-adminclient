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
// time `updateComplete` resolves. Importing it directly keeps registration synchronous.
import '@awesome.me/webawesome/dist/components/popover/popover.js';
import ProfileMenuDialog from '../../../src/components/keep-elements/keep-profile-menu-dialog';

/** See keep-profile-menu.test.ts — only `logout` is replaced, so the store graph stays real. */
vi.mock('../../../src/store/account/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/account/action')>()),
  logout: vi.fn(() => ({ type: 'test/logout' })),
}));

/** jsdom implements no `<dialog>` methods; `wa-popover` opens with the non-modal `show()`. */
beforeAll(() => {
  if (!HTMLDialogElement.prototype.show) {
    HTMLDialogElement.prototype.show = function () {
      this.setAttribute('open', '');
    };
  }
});

const TAG = 'keep-profile-menu-dialog';

type Popover = HTMLElement & { open: boolean };

const trigger = (el: ProfileMenuDialog) =>
  el.shadowRoot!.querySelector<HTMLButtonElement>('button.avatar')!;
const popover = (el: ProfileMenuDialog) => el.shadowRoot!.querySelector<Popover>('wa-popover')!;
const optionList = (el: ProfileMenuDialog) => el.shadowRoot!.querySelector('keep-option-list')!;
const signOut = (el: ProfileMenuDialog) =>
  optionList(el).shadowRoot!.querySelector<HTMLButtonElement>('[data-testid="signOut"]')!;

/** Long enough for wa-popover's open/close, which awaits an animation frame. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

const keepToken = (sub: string) =>
  JSON.stringify({ claims: { iss: 'keep', sub, permissions: [] }, expSeconds: 1, issueDate: 1 });

describe('keep-profile-menu-dialog', () => {
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

  it('shows the signed-in user and their role in the card', async () => {
    const el = await mountLit<ProfileMenuDialog>(TAG);
    expect(el.shadowRoot!.querySelector('.name')!.textContent).toBe('John Doe');
    expect(el.shadowRoot!.querySelector('.role')!.textContent).toBe('Administrator');
  });

  /*
   * The copy of the username reader that lived in this component had no `try`, so this input
   * threw during render and took the mobile header with it. Asserted from the element and not
   * only from the helper, because the header going blank is the failure anyone would see.
   */
  it('still renders when the stored token cannot be parsed', async () => {
    localStorage.setItem('user_token', 'not-json-at-all');
    const el = await mountLit<ProfileMenuDialog>(TAG);
    expect(trigger(el)).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.name')!.textContent).toBe('');
  });

  /* It was a bare glyph with a click handler: not focusable, and announced as an image. */
  it('makes the trigger a real button that names itself and declares its popup', async () => {
    const el = await mountLit<ProfileMenuDialog>(TAG);
    expect(trigger(el).getAttribute('type')).toBe('button');
    expect(trigger(el).getAttribute('aria-label')).toBe('Profile');
    expect(trigger(el).getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
  });

  /* Lost when the glyph became a React icon entry point with no room for it in its props. */
  it('restores the profileIcon test hook, on the control rather than the glyph', async () => {
    const el = await mountLit<ProfileMenuDialog>(TAG);
    expect(trigger(el).getAttribute('data-testid')).toBe('profileIcon');
  });

  it('renders the avatar glyph from the bundled library, never the CDN', async () => {
    const el = await mountLit<ProfileMenuDialog>(TAG);
    const icon = trigger(el).querySelector('wa-icon')!;
    expect(icon.getAttribute('library')).toBe(FA_LIBRARY);
    expect(icon.getAttribute('name')).toBe('circle-user');
    expect(icon.getAttribute('canvas')).toBe('auto');
    expect(icon.hasAttribute('label')).toBe(false);
  });

  it('keeps the Profile tooltip the header always had', async () => {
    const el = await mountLit<ProfileMenuDialog>(TAG);
    const tooltip = el.shadowRoot!.querySelector('keep-tooltip')!;
    expect(tooltip.getAttribute('content')).toBe('Profile');
  });

  it('hangs the card below the trigger, as the header popper did', async () => {
    const el = await mountLit<ProfileMenuDialog>(TAG);
    expect(popover(el).getAttribute('placement')).toBe('bottom-end');
  });

  describe('the card', () => {
    it('opens from the trigger and reports the state on it', async () => {
      const el = await mountLit<ProfileMenuDialog>(TAG);
      expect(popover(el).open).toBe(false);

      trigger(el).click();
      await settle();
      await el.updateComplete;

      expect(popover(el).open).toBe(true);
      expect(trigger(el).getAttribute('aria-expanded')).toBe('true');
    });

    it('dismisses on a click outside and clears the trigger state', async () => {
      const el = await mountLit<ProfileMenuDialog>(TAG);
      trigger(el).click();
      await settle();

      document.body.click();
      await settle();
      await el.updateComplete;

      expect(popover(el).open).toBe(false);
      expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
    });

    /* New: the click-away wrapper this replaces had no keyboard dismissal at all. */
    it('dismisses on Escape', async () => {
      const el = await mountLit<ProfileMenuDialog>(TAG);
      trigger(el).click();
      await settle();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await settle();

      expect(popover(el).open).toBe(false);
    });
  });

  /*
   * The redirect used to happen in this component, which was React and could reach the router.
   * It happens in the shell now, so the event has to cross both this shadow root and
   * keep-option-list's to get there.
   */
  it('lets the logout event out to the shell', async () => {
    const el = await mountLit<ProfileMenuDialog>(TAG);
    const onHost = vi.fn();
    const onDocument = vi.fn();
    el.addEventListener('logout', onHost);
    document.body.addEventListener('logout', onDocument);

    signOut(el).click();

    document.body.removeEventListener('logout', onDocument);
    expect(onHost).toHaveBeenCalledTimes(1);
    expect(onDocument).toHaveBeenCalledTimes(1);
  });

  describe('colour', () => {
    const styles = ProfileMenuDialog.styles.toString();

    /* Unlike the sidenav copy, nothing here sits on the mode-invariant gradient: the bar and
       the card are both WebAwesome surfaces, so both ends of the pair are tokens. */
    it('reads mode-aware tokens for both the bar glyph and the card', () => {
      expect(styles).toMatch(/--wa-color-text-normal/);
      expect(styles).toMatch(/--wa-color-surface-raised/);
    });

    it('uses no light-dark() literal', () => {
      expect(styles).not.toMatch(/light-dark\(/);
    });

    /* `.weight-700` names no rule in any stylesheet in the tree, so the name has never
       rendered bold and is not made bold here. */
    it('does not make the username bold, which the dead class never did', () => {
      expect(styles).not.toMatch(/font-weight/);
    });
  });
});
