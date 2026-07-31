/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { Router, memoryHistory } from '../../../src/router/router';
import { setRouterForTest } from '../../../src/router/instance';
import { store } from '../../../src/store/store';
import { setNavItems } from '../../../src/store/account/reducer';
import { setPullDatabase } from '../../../src/store/databases/reducer';
// Value import, not `import type`: the assertions read `.styles` off the class, and the default
// import registers the element as a side effect either way.
import SideNav from '../../../src/components/keep-elements/keep-side-nav';

/**
 * The two thunks the element fires are replaced with marker actions. Both are network calls
 * with their own tests; what is worth asserting here is that the element reaches for them at
 * the right moment, which a marker shows and a real thunk (parked on a token that never
 * arrives) would not.
 */
const SHOW_PAGES = { type: 'test/showPages' } as const;
const FETCH_DATABASES = { type: 'test/fetchKeepDatabases' } as const;

vi.mock('../../../src/store/account/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/account/action')>()),
  showPages: () => SHOW_PAGES,
}));

vi.mock('../../../src/store/databases/action', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../src/store/databases/action')>()),
  fetchKeepDatabases: () => FETCH_DATABASES,
}));

const TAG = 'keep-side-nav';
const BASE = '/admin/ui';

/**
 * `SideNav.tsx` had no test of its own, so nothing was carried over. What is asserted here is
 * the behaviour the framework list, the router's nav link and four stylesheet rules used to
 * supply between them.
 *
 * The router is installed on the module singleton rather than handed to the element (#709).
 * It still has to be built here rather than left to `setupTests.ts`, because these assertions
 * read hrefs and the global one carries no basename — `setRouterForTest` disposes whatever it
 * replaces, and the global `afterEach` disposes this one.
 */
describe('keep-side-nav', () => {
  let router: Router;
  let dispatched: unknown[];

  beforeEach(() => {
    router = setRouterForTest(new Router({ base: BASE, history: memoryHistory(['/']) }));
    dispatched = [];
    store.dispatch(setNavItems({ databases: false, apps: false }));
    store.dispatch(setPullDatabase(false));
  });

  afterEach(() => {
    cleanupLit();
    vi.restoreAllMocks();
  });

  const record = () => {
    const original = store.dispatch.bind(store);
    vi.spyOn(store, 'dispatch').mockImplementation(((action: unknown) => {
      dispatched.push(action);
      return original(action as never);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    }) as any);
  };

  const mount = (props: Partial<SideNav> = {}) => mountLit<SideNav>(TAG, props);

  /** A store dispatch reaches the element through `StoreController.requestUpdate()`. */
  const settle = async (el: SideNav) => {
    for (let i = 0; i < 3; i++) {
      await Promise.resolve();
      await el.updateComplete;
    }
  };

  const links = (el: SideNav) => [...el.shadowRoot!.querySelectorAll<HTMLAnchorElement>('a.item')];
  const labels = (el: SideNav) =>
    [...el.shadowRoot!.querySelectorAll('.label')].map((n) => n.textContent!.trim());
  const linkTo = (el: SideNav, uri: string) =>
    links(el).find((a) => a.getAttribute('href') === `${BASE}${uri}`)!;

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders the always-on entries and the Quick Config button', async () => {
    const el = await mount();
    expect(labels(el)).toEqual(['Overview', 'Quick Config']);
    expect(el.shadowRoot!.querySelector('button.item')).toBeTruthy();
  });

  it('adds the database entries only when the deployment allows them', async () => {
    const el = await mount();
    store.dispatch(setNavItems({ databases: true, apps: false }));
    await settle(el);
    expect(labels(el)).toEqual(['Overview', 'Schemas', 'Scopes', 'Quick Config']);
  });

  it('adds the application entries only when the deployment allows them', async () => {
    const el = await mount();
    store.dispatch(setNavItems({ databases: false, apps: true }));
    await settle(el);
    expect(labels(el)).toEqual(['Overview', 'Quick Config', 'Applications', 'Consents']);
  });

  it('never renders Mail — it is disabled pending LABS-1214 (#698)', async () => {
    // The `false` switch is preserved as a switch, not deleted, so re-enabling the page needs
    // no work here. Lit prints a bare `false` as the text "false", which is why the branch is a
    // ternary rather than the `&&` the JSX used.
    const el = await mount();
    store.dispatch(setNavItems({ databases: true, apps: true }));
    await settle(el);
    expect(labels(el)).not.toContain('Mail');
    expect(el.shadowRoot!.textContent).not.toContain('false');
  });

  it('publishes the deployment page list once, on mount', async () => {
    record();
    const el = await mount();
    await settle(el);
    expect(dispatched.filter((a) => a === SHOW_PAGES)).toHaveLength(1);
  });

  it('writes hrefs through the router, basename included', async () => {
    // Nothing is passed in: the element reaches the module singleton through its own
    // controller (#709). Two tests used to cover the property being absent — an href that
    // fell back to the bare path, and a click that did nothing — and both branches are
    // deleted rather than moved, because `RouterController` always has a router to read and
    // there is no longer a reachable state in which it does not.
    const el = await mount();
    expect(linkTo(el, '/')).toBeTruthy();
    expect(links(el).every((a) => a.getAttribute('href')!.startsWith(BASE))).toBe(true);
  });

  it('takes no router property — that was the last one in the app (#709)', () => {
    // A property would be re-applied by `@lit/react` on every shell render with no dirty
    // check, and would fight the controller's own subscription. The guard is on the element
    // rather than on the shell because the shell is where it would be *passed*, and a
    // property nothing sets is invisible there.
    // `expanded` is the control: it proves both probes can see a property that is declared,
    // so the two negatives below are not the reactive-property machinery being invisible to
    // them. Without it this case passes on any typo.
    expect('expanded' in SideNav.prototype).toBe(true);
    expect(SideNav.elementProperties.has('expanded')).toBe(true);

    expect('router' in SideNav.prototype).toBe(false);
    expect(SideNav.elementProperties.has('router')).toBe(false);
  });

  it('marks the current route with aria-current, and only that one', async () => {
    store.dispatch(setNavItems({ databases: true, apps: false }));
    router.navigate('/schema');
    const el = await mount();
    await settle(el);

    const current = links(el).filter((a) => a.getAttribute('aria-current') === 'page');
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute('href')).toBe(`${BASE}/schema`);
  });

  it('keeps the parent entry lit on a child route', async () => {
    // "At or below" — /schema/orders.nsf/Alpha is still Schemas.
    store.dispatch(setNavItems({ databases: true, apps: false }));
    router.navigate('/schema/orders.nsf/Alpha');
    const el = await mount();
    await settle(el);
    expect(linkTo(el, '/schema').getAttribute('aria-current')).toBe('page');
  });

  it('treats / as exact, or it would match every route', async () => {
    store.dispatch(setNavItems({ databases: true, apps: false }));
    router.navigate('/schema');
    const el = await mount();
    await settle(el);
    expect(linkTo(el, '/').hasAttribute('aria-current')).toBe(false);
  });

  it('follows the router when navigation happens elsewhere', async () => {
    store.dispatch(setNavItems({ databases: true, apps: false }));
    const el = await mount();
    await settle(el);
    expect(linkTo(el, '/').getAttribute('aria-current')).toBe('page');

    router.navigate('/scope');
    await settle(el);
    expect(linkTo(el, '/').hasAttribute('aria-current')).toBe(false);
    expect(linkTo(el, '/scope').getAttribute('aria-current')).toBe('page');
  });

  it('stops subscribing to the router when it leaves the document', async () => {
    const el = await mount();
    await settle(el);
    el.remove();
    router.navigate('/scope');
    await settle(el);
    // Still showing the location it had when it was detached.
    expect(linkTo(el, '/').getAttribute('aria-current')).toBe('page');
  });

  it('navigates client-side on a plain click', async () => {
    store.dispatch(setNavItems({ databases: true, apps: false }));
    const el = await mount();
    await settle(el);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    linkTo(el, '/scope').dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(router.location().pathname).toBe('/scope');
  });

  it('leaves a modified click to the browser, so new-tab still works', async () => {
    store.dispatch(setNavItems({ databases: true, apps: false }));
    const el = await mount();
    await settle(el);

    for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey'] as const) {
      const event = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        [modifier]: true,
      });
      linkTo(el, '/scope').dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
    }

    const middle = new MouseEvent('click', { bubbles: true, cancelable: true, button: 1 });
    linkTo(el, '/scope').dispatchEvent(middle);
    expect(middle.defaultPrevented).toBe(false);
    expect(router.location().pathname).toBe('/');
  });

  it('does not swallow a click the navigation guard has already claimed', async () => {
    // The guard runs on the capture phase and calls preventDefault before this handler sees
    // the event; navigating anyway would discard the user's unsaved work.
    const el = await mount();
    await settle(el);

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    event.preventDefault();
    linkTo(el, '/').dispatchEvent(event);
    expect(router.location().pathname).toBe('/');
  });

  it('prefetches a route chunk after the hover-intent delay, and not before', async () => {
    vi.useFakeTimers();
    try {
      store.dispatch(setNavItems({ databases: true, apps: false }));
      const el = await mount();
      await settle(el);
      const prefetch = vi.spyOn(router, 'prefetch').mockReturnValue(undefined);

      linkTo(el, '/scope').dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(79);
      expect(prefetch).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(prefetch).toHaveBeenCalledWith('/scope');
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancels the intent when the pointer moves on', async () => {
    vi.useFakeTimers();
    try {
      const el = await mount();
      const prefetch = vi.spyOn(router, 'prefetch').mockReturnValue(undefined);

      const link = linkTo(el, '/');
      link.dispatchEvent(new Event('pointerenter'));
      link.dispatchEvent(new Event('pointerleave'));
      vi.advanceTimersByTime(200);
      expect(prefetch).not.toHaveBeenCalled();

      // …and cancelling twice is not an error.
      link.dispatchEvent(new Event('pointerleave'));
    } finally {
      vi.useRealTimers();
    }
  });

  it('prefetches on focus too, or keyboard users get none of it', async () => {
    vi.useFakeTimers();
    try {
      const el = await mount();
      const prefetch = vi.spyOn(router, 'prefetch').mockReturnValue(undefined);
      const link = linkTo(el, '/');

      link.dispatchEvent(new Event('focus'));
      vi.advanceTimersByTime(80);
      expect(prefetch).toHaveBeenCalledWith('/');

      // A second hover while one is already pending does not stack a second timer.
      prefetch.mockClear();
      link.dispatchEvent(new Event('pointerenter'));
      link.dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(80);
      expect(prefetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('Quick Config fills the database list on first open, then stops', async () => {
    record();
    const el = await mount();
    await settle(el);

    el.shadowRoot!.querySelector<HTMLButtonElement>('button.item')!.click();
    expect(dispatched).toContain(FETCH_DATABASES);
    expect(store.getState().drawer.quickConfigDrawer).toBe(true);

    dispatched.length = 0;
    store.dispatch(setPullDatabase(true));
    el.shadowRoot!.querySelector<HTMLButtonElement>('button.item')!.click();
    expect(dispatched).not.toContain(FETCH_DATABASES);
    expect(store.getState().drawer.quickConfigDrawer).toBe(false);
  });

  it('gives every entry a tooltip, on the right', async () => {
    store.dispatch(setNavItems({ databases: true, apps: true }));
    const el = await mount();
    await settle(el);

    const tips = [...el.shadowRoot!.querySelectorAll('keep-tooltip')];
    expect(tips).toHaveLength(6);
    expect(tips.map((t) => t.getAttribute('content'))).toEqual([
      'Overview',
      'Schemas',
      'Scopes',
      'Quick Config',
      'Applications',
      'Consents',
    ]);
    expect(tips.every((t) => t.getAttribute('placement') === 'right')).toBe(true);
  });

  it('sizes and centres the glyphs the way a nav rail needs', async () => {
    const el = await mount();
    const icons = [...el.shadowRoot!.querySelectorAll('wa-icon')];
    expect(icons).toHaveLength(2);
    // A library is always named, or Web Awesome silently fetches from the Font Awesome CDN.
    expect(icons.every((i) => i.getAttribute('library') === 'fa')).toBe(true);
    // The 1.25em box that lines glyphs of different natural width up in a column.
    expect(icons.every((i) => i.getAttribute('canvas') === 'fixed')).toBe(true);
    // Decorative: the label beside each one is the accessible name.
    expect(icons.every((i) => !i.hasAttribute('label'))).toBe(true);
    expect(SideNav.styles.toString()).toContain('font-size: var(--wa-font-size-xl)');
  });

  it('switches the separator with the rail, and nothing else', async () => {
    const collapsed = await mount({ expanded: false });
    expect(collapsed.shadowRoot!.querySelector('.spacer')!.className).toContain('collapsed');

    const expanded = await mount({ expanded: true });
    expect(expanded.shadowRoot!.querySelector('.spacer')!.className).toContain('expanded');
    expect(labels(expanded)).toEqual(labels(collapsed));
  });

  it('is a labelled list with one tab stop per entry', async () => {
    store.dispatch(setNavItems({ databases: true, apps: true }));
    const el = await mount();
    await settle(el);

    expect(el.shadowRoot!.querySelector('nav')!.getAttribute('aria-label')).toBe('Main');
    expect(el.shadowRoot!.querySelectorAll('ul > li')).toHaveLength(6);
    // The old markup nested a focusable button inside each anchor, so Tab stopped twice per
    // route; and the separator above the first item was an empty focusable button.
    expect(el.shadowRoot!.querySelectorAll('[tabindex]')).toHaveLength(0);
    expect(el.shadowRoot!.querySelector('.spacer')!.matches('button')).toBe(false);
  });

  it('paints the four rules the old stylesheet asked for and no longer got', async () => {
    // Each names a framework class the installed major stopped emitting, so each had silently
    // stopped matching. A shadow root has to state them or drop them; these are stated.
    const styles = SideNav.styles.toString();
    // 1. label and 3. Quick Config glyph — white on the gradient rather than near-black.
    expect(styles).toContain('color: var(--keep-sidenav-on)');
    // 2. hover.
    expect(styles).toContain('background: var(--keep-sidenav-hover)');
    // 4. the current entry, driven by the same aria-current the links carry.
    expect(styles).toMatch(/\[aria-current='page'\][^}]*--keep-sidenav-active/);
    expect(styles).toMatch(/\[aria-current='page'\][^}]*--keep-sidenav-border/);
  });

  it('restates what does not cross the shadow boundary', async () => {
    const styles = SideNav.styles.toString();
    // The document's border-box reset.
    expect(styles).toMatch(/box-sizing:\s*border-box/);
    // The user-agent list bullets and 40px inline padding, which a bare ul keeps in here.
    expect(styles).toMatch(/list-style:\s*none/);
    // The 56px icon column, so no glyph peeks through the 57px rail mid-animation.
    expect(styles).toMatch(/min-width:\s*56px/);
  });
});
