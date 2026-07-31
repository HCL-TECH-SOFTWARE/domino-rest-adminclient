/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { html } from 'lit';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { Router, memoryHistory } from '../../../src/router/router';
import { setRouterForTest } from '../../../src/router/instance';
import { store } from '../../../src/store/store';
import { switchTheme } from '../../../src/store/styles/action';
import AppShell, {
  MOBILE_BREAKPOINT_PX,
} from '../../../src/components/keep-elements/keep-app-shell';

const TAG = 'keep-app-shell';

/**
 * `AppShell.tsx`'s Lit replacement (#719 half 2).
 *
 * The React component had no test of its own — `test/app-shell.test.ts` covers the shell by
 * scanning source and CSS, and its preamble explains why: the suite runs with `css: false` and
 * jsdom has no layout engine, so a render can say a `<div slot="navigation">` exists but not
 * that it is 242px wide. Everything geometric is still verified in a browser.
 *
 * What a render *can* establish, and what that scan cannot, is behaviour: which regions exist
 * on which side of the breakpoint, that the collapse state reaches both the class the
 * stylesheet reads and the element that renders the rail, that the appearance toggle writes
 * all three of its destinations, and that a `logout` from two shadow roots down arrives here
 * as a navigation.
 *
 * ## `matchMedia` is stubbed per test, before the element is constructed
 *
 * The shell reads `window.matchMedia` in a field initialiser, so a stub installed after
 * `document.createElement` would never be seen. jsdom's own implementation always answers
 * `matches: false`, which would make every case below a desktop one.
 */

/** The listeners the current stub has handed out, so a test can move the viewport. */
let mediaListeners: Array<() => void>;

/** Install a `matchMedia` that answers `matches` for the shell's own query, and nothing else. */
const stubViewport = (matches: boolean) => {
  mediaListeners = [];
  vi.stubGlobal(
    'matchMedia',
    (query: string) =>
      ({
        media: query,
        matches: query.includes(`${MOBILE_BREAKPOINT_PX}px`) ? matches : false,
        addEventListener: (_: string, fn: () => void) => mediaListeners.push(fn),
        removeEventListener: (_: string, fn: () => void) => {
          mediaListeners = mediaListeners.filter((listener) => listener !== fn);
        },
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
};

const page = (el: AppShell) => el.querySelector('wa-page')!;
const slot = (el: AppShell, name: string) => el.querySelector(`[slot='${name}']`);

describe('keep-app-shell', () => {
  let router: Router;

  beforeEach(() => {
    router = setRouterForTest(new Router({ history: memoryHistory(['/schema']) }));
    store.dispatch(switchTheme('default'));
    localStorage.removeItem('theme');
    stubViewport(false);
  });

  afterEach(() => {
    cleanupLit();
    vi.unstubAllGlobals();
  });

  describe('the render root', () => {
    it('renders into the light DOM', async () => {
      /*
       * The one element in the tree without a shadow root, and not for style: `app-shell.css`,
       * Web Awesome's `native.css` button rules and four utility classes in `styles.css` all
       * address this markup from document scope, and none of them crosses a shadow boundary.
       * `test/app-shell.test.ts` guards the source form of this; here is the effect.
       */
      const el = await mountLit<AppShell>(TAG);
      expect(el.shadowRoot).toBeNull();
      expect(page(el)).not.toBeNull();
    });

    it('carries no adopted stylesheets, because there is no root to adopt them into', async () => {
      const el = await mountLit<AppShell>(TAG);
      expect((AppShell as unknown as { styles?: unknown }).styles).toBeUndefined();
      expect(el.querySelector('style')).toBeNull();
    });
  });

  describe('the page element', () => {
    it('states the breakpoint wa-page compiles its own query from', async () => {
      const el = await mountLit<AppShell>(TAG);
      expect(page(el).getAttribute('mobile-breakpoint')).toBe(`${MOBILE_BREAKPOINT_PX}px`);
    });

    it('maps the four regions onto named slots', async () => {
      const el = await mountLit<AppShell>(TAG);
      expect(slot(el, 'navigation-header')).not.toBeNull();
      expect(slot(el, 'navigation')?.querySelector('keep-side-nav')).not.toBeNull();
      expect(slot(el, 'navigation-footer')?.querySelector('keep-profile-menu')).not.toBeNull();
    });

    it('keeps the toast and the footer outside the page element', async () => {
      // Both are fixed overlays. Slotted into `footer` they would add a grid row and change
      // every `calc(100vh - 23px)` in the app — see the element's class note.
      const el = await mountLit<AppShell>(TAG);
      expect(el.querySelector('keep-notification')?.closest('wa-page')).toBeNull();
      expect(el.querySelector('keep-footer')?.closest('wa-page')).toBeNull();
    });

    it('renders whatever main content it was handed, inside the page', async () => {
      const el = await mountLit<AppShell>(TAG, {
        main: html`<div id="probe">the router goes here</div>`,
      });
      const probe = el.querySelector('#probe');
      expect(probe).not.toBeNull();
      expect(probe!.closest('wa-page')).toBe(page(el));
    });

    it('renders nothing in the main region by default', async () => {
      // `nothing`, not a `<keep-views>` fallback. A slot's fallback content is real DOM, so
      // spelling the default that way would connect `keep-views` — and start its fetches — on
      // `/callback`, where it is not what is on screen.
      const el = await mountLit<AppShell>(TAG);
      expect(el.querySelector('keep-views')).toBeNull();
    });
  });

  describe('the collapse rail', () => {
    it('starts collapsed, in both places that carry the state', async () => {
      const el = await mountLit<AppShell>(TAG);
      // The class is what `app-shell.css` reads for `--menu-width`; the property is what the
      // sidenav renders from. Nothing but this element links the two.
      expect(page(el).classList.contains('nav-collapsed')).toBe(true);
      expect(el.querySelector('keep-side-nav')?.hasAttribute('expanded')).toBe(false);
    });

    it('expands both when the toggle is pressed', async () => {
      const el = await mountLit<AppShell>(TAG);
      const toggle = el.querySelector<HTMLButtonElement>('.nav-collapse-toggle')!;

      expect(toggle.getAttribute('aria-label')).toBe('expand menu');
      expect(toggle.getAttribute('aria-expanded')).toBe('false');

      toggle.click();
      await el.updateComplete;

      expect(page(el).classList.contains('nav-collapsed')).toBe(false);
      expect(el.querySelector('keep-side-nav')?.hasAttribute('expanded')).toBe(true);
      expect(
        el.querySelector('.nav-collapse-toggle')?.getAttribute('aria-label'),
      ).toBe('collapse menu');
      expect(
        el.querySelector('.nav-collapse-toggle')?.getAttribute('aria-expanded'),
      ).toBe('true');
    });

    it('shows the wordmark only when expanded', async () => {
      const el = await mountLit<AppShell>(TAG);
      expect(el.querySelector('.nav-title')).toBeNull();

      el.querySelector<HTMLButtonElement>('.nav-collapse-toggle')!.click();
      await el.updateComplete;

      // The three utility classes are `styles.css`'s, which is the reason this markup is not
      // in a shadow root at all.
      expect(el.querySelector('.nav-title')?.className).toContain('medium-text');
    });
  });

  describe('below the breakpoint', () => {
    it('adds the mobile header and the profile dialog inside it', async () => {
      stubViewport(true);
      const el = await mountLit<AppShell>(TAG);

      const header = slot(el, 'header');
      expect(header?.querySelector('keep-mobile-header')).not.toBeNull();
      // Slotted light DOM of keep-mobile-header, which is what its unnamed slot is for.
      expect(
        header?.querySelector('keep-mobile-header > keep-profile-menu-dialog'),
      ).not.toBeNull();
    });

    it('drops the rail toggle and forces the expanded rendering', async () => {
      // The rail is a desktop affordance: on mobile the nav lives in wa-page's drawer, where a
      // 57px rail would be nonsense.
      stubViewport(true);
      const el = await mountLit<AppShell>(TAG);

      expect(el.querySelector('.nav-collapse-toggle')).toBeNull();
      expect(el.querySelector('keep-side-nav')?.hasAttribute('expanded')).toBe(true);
      // …while the collapsed *choice* survives, so a trip through a narrow viewport and back
      // does not silently expand the desktop rail.
      expect(page(el).classList.contains('nav-collapsed')).toBe(true);
    });

    it('follows the viewport across the boundary without remounting', async () => {
      const el = await mountLit<AppShell>(TAG);
      expect(slot(el, 'header')).toBeNull();

      // Move the query the element is already holding rather than installing a new stub —
      // replacing it would leave the element subscribed to the old one, which is exactly the
      // bug this is here to catch.
      Object.defineProperty(
        (el as unknown as { viewport: MediaQueryList }).viewport,
        'matches',
        { value: true, configurable: true },
      );
      mediaListeners.forEach((fn) => fn());
      await el.updateComplete;

      expect(slot(el, 'header')).not.toBeNull();
    });

    it('stops listening once disconnected', async () => {
      const el = await mountLit<AppShell>(TAG);
      expect(mediaListeners).toHaveLength(1);
      el.remove();
      expect(mediaListeners).toHaveLength(0);
    });
  });

  describe('appearance', () => {
    it('applies the stored appearance to the document on first render', async () => {
      // Both, because the connect-time reconciliation below resolves a disagreement in
      // localStorage's favour — that is what it is for, and the next case is where it is
      // asserted.
      localStorage.setItem('theme', 'dark');
      store.dispatch(switchTheme('dark'));
      await mountLit<AppShell>(TAG);

      // All three destinations, because three different consumers read three different things.
      expect(document.documentElement.classList.contains('wa-dark')).toBe(true);
      expect(document.documentElement.style.colorScheme).toBe('dark');
      expect(document.body.dataset.theme).toBe('dark');
    });

    it('adopts what the login page left in localStorage', async () => {
      // The login screen toggles appearance without a store — it is rendered before the shell
      // exists — so the shell reconciles the two on connect.
      localStorage.setItem('theme', 'dark');
      const el = await mountLit<AppShell>(TAG);

      expect(store.getState().styles.themeMode).toBe('dark');
      expect(el.querySelector('wa-icon[name="moon"]')).not.toBeNull();
    });

    it('cycles light → dark → system → light across all three destinations', async () => {
      // Three settings since #962. `localStorage` is what `appearance-boot` reads on the next
      // load and what the system-preference listener consults; the store is what this element
      // renders from; the document is what the user sees. All three move together or the page
      // ends up disagreeing with itself.
      const el = await mountLit<AppShell>(TAG);
      const toggle = () => el.querySelector<HTMLButtonElement>('.nav-theme-toggle')!;
      const glyph = () => el.querySelector('wa-icon[name]')?.getAttribute('name');

      expect(glyph()).toBe('sun');

      for (const [stored, icon, dark] of [
        ['dark', 'moon', true],
        // `system` resolves against `matchMedia`, which the stub answers `false` for.
        ['system', 'robot', false],
        ['default', 'sun', false],
      ] as const) {
        toggle().click();
        await el.updateComplete;

        expect(store.getState().styles.themeMode).toBe(stored);
        expect(localStorage.getItem('theme')).toBe(stored);
        expect(glyph()).toBe(icon);
        expect(document.documentElement.classList.contains('wa-dark')).toBe(dark);
      }
    });

    it('names the action rather than the glyph, in both the tooltip and the icon', async () => {
      // The icon is the button's only content, so its accessible name has to say what pressing
      // it does — the glyph already shows which setting is current.
      const el = await mountLit<AppShell>(TAG);
      expect(el.querySelector('keep-tooltip')?.getAttribute('content')).toBe(
        'Switch to Dark Mode',
      );
      expect(el.querySelector('wa-icon[name="sun"]')?.getAttribute('label')).toBe(
        'Switch to Dark Mode',
      );
    });

    it('shows the robot and resolves the appearance when the setting is system', async () => {
      localStorage.setItem('theme', 'system');
      store.dispatch(switchTheme('system'));
      const el = await mountLit<AppShell>(TAG);

      expect(el.querySelector('wa-icon[name="robot"]')).not.toBeNull();
      expect(el.querySelector('keep-tooltip')?.getAttribute('content')).toBe(
        'Switch to Light Mode',
      );
      // The stub reports a light OS, so `system` resolves light — the setting is not itself an
      // appearance, which is the whole distinction #962 introduces.
      expect(document.documentElement.classList.contains('wa-dark')).toBe(false);
    });

    it('sizes both icons on the narrower canvas the wrapper used to default to', async () => {
      // Web Awesome's own default is `fixed`, a 1.25em box. `KeepIcon` defaulted to `auto`, so
      // taking WA's default here would widen the appearance toggle and overflow the 21px rail
      // tab. `css: false` means nothing else in this suite can see that.
      const el = await mountLit<AppShell>(TAG);
      for (const icon of el.querySelectorAll('wa-icon')) {
        expect(icon.getAttribute('canvas')).toBe('auto');
      }
    });
  });

  describe('logout', () => {
    it.each(['keep-profile-menu', 'keep-profile-menu-dialog'])(
      'goes home when %s reports one',
      async (tag) => {
        /*
         * Neither element emits this: `keep-option-list` clears the session and emits `logout`
         * two shadow roots down, and `KeepElement.emit` composes it, so it surfaces here. The
         * redirect is the shell's half of the job, and this is the only place it is bound.
         */
        stubViewport(tag === 'keep-profile-menu-dialog');
        const el = await mountLit<AppShell>(TAG);
        router.navigate('/schema');

        el.querySelector(tag)!.dispatchEvent(
          new CustomEvent('logout', { bubbles: true, composed: true }),
        );

        expect(router.location().pathname).toBe('/');
      },
    );
  });
});
