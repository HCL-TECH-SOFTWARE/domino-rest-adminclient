/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { Router, memoryHistory } from '../../../src/router/router';
import { getRouter, setRouterForTest } from '../../../src/router/instance';
import { store } from '../../../src/store/store';
import { allowNavigation, setNavigationDirty } from '../../../src/store/navigationGuard/action';
// The unsaved-changes guard, converted in this same wave. The bare import is what registers
// it — what is under test is the listener it installs on `document`, not the element itself,
// so the default binding below is only ever used in type position and would be erased alone.
import '../../../src/components/keep-elements/keep-navigation-guard';
import type NavigationGuard from '../../../src/components/keep-elements/keep-navigation-guard';
// A value import, not `import type`: the style assertions read `.styles` off the class, which
// is also what keeps the import from being erased — an erased one takes the module's
// `@customElement` side effect with it and every test here fails on a null shadow root.
import Tip from '../../../src/components/keep-elements/keep-tip';

/**
 * `keep-tip` — one overview tile, and the first element in the tree to render its own
 * in-app anchor inside a shadow root.
 *
 * It replaces `home/sections/Tip.tsx` and `test/components/home/Tip.test.tsx`. Every
 * assertion that file made is carried over; two of them are carried over **inverted**,
 * because what they pinned was the workaround rather than the requirement:
 *
 * - "keeps the anchor in the light DOM, where the navigation guard can see it" is now
 *   "keeps the anchor in the shadow root, where the navigation guard can *still* see it".
 *   The old file's reasoning quoted a `closest('a[href]')` implementation that #884/#901
 *   replaced with `composedPath()` — the requirement was always "the guard must catch this
 *   click", and that is what is asserted below, against the real guard rather than against
 *   the DOM shape it used to need.
 * - "prefetches on hover" dispatched at the `<img>`, because the anchor wrapped it and
 *   React's synthetic enter/leave carried the event up. Nothing wraps anything now: the
 *   anchor's stretched `::after` is what the pointer meets anywhere on the tile, so the
 *   hover is dispatched at the anchor and the overlay that makes that faithful is asserted
 *   separately.
 *
 * The two assertions about `sidenav/Routes` themselves moved to `keep-homepage.test.ts`,
 * which is the element that now reads that table.
 */

const TAG = 'keep-tip';
const BASE = '/admin/ui';

/** Comments are part of `cssText`, and every rule here has one above it. */
const styleText = () => Tip.styles.toString().replace(/\/\*[\s\S]*?\*\//g, '');

/** The declarations of the first top-level rule whose selector is exactly `selector`. */
const ruleBody = (selector: string): string => {
  const css = styleText();
  const at = css.indexOf(`${selector} {`);
  expect(at, `no rule for ${selector} in keep-tip's styles`).toBeGreaterThan(-1);
  const open = css.indexOf('{', at);
  return css.slice(open + 1, css.indexOf('}', open));
};

const anchorOf = (el: Tip) => el.shadowRoot!.querySelector('a')!;

/**
 * A real click, the way a browser dispatches one: composed, so it leaves the shadow tree.
 *
 * `handled` is read at the anchor, *after* the element's own listener and before the
 * silencer below — so it says whether the app took the click, not whether this helper did.
 * jsdom logs an unimplemented-navigation error for any click it is left to perform, so the
 * ones the app deliberately leaves alone are cancelled once they are past everything that
 * had an opinion.
 */
const clickAnchor = (el: Tip, init: MouseEventInit = {}): { event: MouseEvent; handled: boolean } => {
  const anchor = anchorOf(el);
  let handled = false;
  const record = (event: Event) => {
    handled = event.defaultPrevented;
  };
  const silence = (event: Event) => event.preventDefault();
  anchor.addEventListener('click', record);
  document.addEventListener('click', silence);
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    composed: true,
    ...init,
  });
  try {
    anchor.dispatchEvent(event);
  } finally {
    anchor.removeEventListener('click', record);
    document.removeEventListener('click', silence);
  }
  return { event, handled };
};

const mount = (props: Partial<Tip> = {}) =>
  mountLit<Tip>(TAG, {
    heading: 'Database Management - REST API',
    description: 'CREATE/UPDATE SCHEMA',
    uri: '/schema',
    image: 'databasedev.jpg',
    ...props,
  });

/** The app's router for this test, with the deployment's basename so `href` is realistic. */
const atRoute = (entry = '/') =>
  setRouterForTest(new Router({ base: BASE, history: memoryHistory([entry]) }));

describe('keep-tip', () => {
  beforeEach(() => {
    atRoute();
  });

  afterEach(() => {
    cleanupLit();
    // The guard's slice is module state on the real store, so it outlives a test that left
    // the page dirty — and the next mount would install a capture listener nothing asked for.
    store.dispatch(allowNavigation());
    store.dispatch(setNavigationDirty(false));
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('renders the heading and description inside the card', async () => {
    const el = await mount();

    expect(el.shadowRoot!.textContent).toContain('Database Management - REST API');
    expect(el.shadowRoot!.textContent).toContain('CREATE/UPDATE SCHEMA');
    expect(el.shadowRoot!.querySelector('wa-card')).toBeTruthy();
  });

  it('puts the image in the card media slot, decorative', async () => {
    const el = await mount();
    const image = el.shadowRoot!.querySelector('img')!;

    expect(image.getAttribute('src')).toBe('databasedev.jpg');
    expect(image.getAttribute('slot')).toBe('media');
    // Empty alt on purpose: the heading and description beside it carry the meaning, and a
    // described image would announce the tile twice.
    expect(image.getAttribute('alt')).toBe('');
  });

  it('renders no media at all when it has no image', async () => {
    const el = await mount({ image: '' });

    expect(el.shadowRoot!.querySelector('img')).toBeNull();
    // …and an empty src would otherwise make the browser re-request the current page.
    expect(el.shadowRoot!.innerHTML).not.toContain('src=""');
  });

  describe('one link, one accessible name, whole tile clickable', () => {
    it('renders exactly one anchor, and it is the only one on the page', async () => {
      const el = await mount();

      expect(el.shadowRoot!.querySelectorAll('a')).toHaveLength(1);
      // The light DOM holds none: the old design slotted one in from the caller.
      expect(document.querySelectorAll('a')).toHaveLength(0);
    });

    it('names the link with the tile copy, not with the image', async () => {
      const el = await mount();
      const anchor = anchorOf(el);

      // The link's accessible name is its own content. Both lines are inside it, and the
      // image — which is not — contributes nothing through its empty alt.
      expect(anchor.textContent).toContain('Database Management - REST API');
      expect(anchor.textContent).toContain('CREATE/UPDATE SCHEMA');
      expect(anchor.querySelector('img')).toBeNull();
    });

    it('stretches the link over the whole card', async () => {
      const el = await mount();

      // The hit area is a pseudo-element on the anchor, resolved against the card. Both
      // halves are asserted: an overlay with no positioned ancestor covers the viewport,
      // and a positioned card with no overlay covers only two lines of text.
      const overlay = ruleBody('.tile::after');
      expect(overlay).toMatch(/content:\s*''/);
      expect(overlay).toMatch(/position:\s*absolute/);
      expect(overlay).toMatch(/inset:\s*0/);
      expect(ruleBody('wa-card')).toMatch(/position:\s*relative/);

      // Nothing in the light DOM can do this: ::slotted(a)::after matches nothing, which is
      // why the rule used to sit in a document-scope styled block.
      expect(styleText()).not.toContain('::slotted');
      expect(el.shadowRoot!.querySelector('.tile')).toBeTruthy();
    });

    it('rings the hit area on keyboard focus rather than the text', async () => {
      await mount();

      // The framework's own a:focus-visible rule is in a document layer and does not cross
      // the boundary, so an element that drops `outline: none` here has no indicator at all.
      expect(ruleBody('.tile:focus-visible::after')).toMatch(/outline:\s*var\(--wa-focus-ring\)/);
    });
  });

  describe('navigation', () => {
    it('links to the route with the basename applied', async () => {
      const el = await mount();

      expect(anchorOf(el).getAttribute('href')).toBe('/admin/ui/schema');
    });

    it('navigates client-side on a plain left click', async () => {
      const el = await mount();

      const { handled } = clickAnchor(el);

      expect(handled, 'the browser would otherwise reload the whole app').toBe(true);
      expect(getRouter().location().pathname).toBe('/schema');
    });

    it.each([
      ['a middle click', { button: 1 }],
      ['a command click', { metaKey: true }],
      ['a control click', { ctrlKey: true }],
      ['a shift click', { shiftKey: true }],
      ['an alt click', { altKey: true }],
    ])('leaves %s to the browser', async (_label, init) => {
      const el = await mount();

      const { handled } = clickAnchor(el, init);

      // Modified clicks open tabs and windows. Swallowing them would break that, and a real
      // href is the only reason they work at all.
      expect(handled).toBe(false);
      expect(getRouter().location().pathname).toBe('/');
    });

    it('does nothing further with a click something else already cancelled', async () => {
      const el = await mount();
      // Capture phase, or it would run *after* the element's own listener and prove nothing:
      // this is the shape the unsaved-changes guard arrives in, minus its stopPropagation.
      const cancel = (event: Event) => event.preventDefault();
      document.addEventListener('click', cancel, true);

      clickAnchor(el);
      document.removeEventListener('click', cancel, true);

      expect(getRouter().location().pathname).toBe('/');
    });
  });

  /**
   * **The claim the whole conversion rests on**, asserted against the real guard rather than
   * against a DOM shape that stands in for it.
   *
   * `home/sections/Tip.tsx` existed because a click from a shadow tree is retargeted, and the
   * guard was reading `e.target.closest('a[href]')` — which finds nothing once the anchor is
   * in here, so the unsaved-changes prompt would simply stop appearing. #884/#901 replaced
   * that traversal with `composedPath()`; these two tests are what says so, and the second is
   * the mutation check for the first — it demonstrates that the *old* traversal still fails on
   * exactly this click, so the pass above is `composedPath()` doing work and not the anchor
   * being reachable some other way.
   */
  describe('the unsaved-changes guard', () => {
    /**
     * Mount the real guard, dirty or clean.
     *
     * It installs its capture-phase listener only while something is dirty, so the flag is
     * set before the mount. The store is the app's own singleton — `keep-navigation-guard`
     * reaches it through a `StoreController` rather than through a provider.
     */
    const mountGuard = async (dirty: boolean) => {
      if (dirty) store.dispatch(setNavigationDirty(true));
      await mountLit<NavigationGuard>('keep-navigation-guard', { basename: BASE });
    };

    const pendingPath = () => store.getState().navigationGuard.pendingPath;

    it('sees an anchor inside this shadow root and blocks the navigation', async () => {
      await mountGuard(true);
      const el = await mount();

      const { event } = clickAnchor(el);

      // Blocked: the guard preventDefaults in the capture phase, stores where the click was
      // headed — basename stripped — and stops propagation, so nothing else sees the click.
      // Nothing but the guard can have prevented it: the element's handler never ran.
      expect(event.defaultPrevented).toBe(true);
      expect(pendingPath()).toBe('/schema');
      expect(getRouter().location().pathname).toBe('/');
    });

    it('lets the same click through when nothing is dirty', async () => {
      await mountGuard(false);
      const el = await mount();

      clickAnchor(el);

      expect(pendingPath()).toBeNull();
      expect(getRouter().location().pathname).toBe('/schema');
    });

    it('is invisible to the traversal #901 replaced, which is what makes this a real check', async () => {
      const el = await mount();
      let foundByClosest: Element | null | undefined;
      let foundByPath: EventTarget | undefined;
      const listener = (event: Event) => {
        // Verbatim the two traversals, on one and the same click.
        foundByClosest = (event.target as Element).closest('a[href]');
        foundByPath = event.composedPath().find((node) => node instanceof HTMLAnchorElement);
      };
      document.addEventListener('click', listener, true);

      clickAnchor(el);
      document.removeEventListener('click', listener, true);

      // `e.target` is the host, and the host has no anchor above it in the light DOM.
      expect(foundByClosest).toBeNull();
      expect(foundByPath).toBe(anchorOf(el));
    });
  });

  /**
   * Hover prefetching (#813), carried over from `Tip.test.tsx`.
   *
   * The old file hovered the `<img>` and relied on React's enter/leave semantics to reach the
   * anchor wrapping it. The image is a sibling now and `pointerenter` does not bubble, so the
   * event goes where a browser would actually send it: the anchor, whose `::after` covers the
   * card, so every point on the tile is over the link.
   */
  describe('hover prefetching', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      vi.useRealTimers();
      // `connection` is not a jsdom property, so it has to be removed rather than restored —
      // and it has to happen even when the assertion above it failed.
      Reflect.deleteProperty(navigator, 'connection');
    });

    const spyPrefetch = () => vi.spyOn(getRouter(), 'prefetch').mockReturnValue(undefined);

    /** Stand in for `navigator.connection`, which jsdom does not implement at all. */
    const onConnection = (value: unknown) =>
      Object.defineProperty(navigator, 'connection', { configurable: true, value });

    it('prefetches the route chunk once the pointer rests on the tile', async () => {
      const prefetch = spyPrefetch();
      const el = await mount();

      anchorOf(el).dispatchEvent(new Event('pointerenter'));
      expect(prefetch, 'a passing cursor must not fetch anything').not.toHaveBeenCalled();
      vi.advanceTimersByTime(80);

      expect(prefetch).toHaveBeenCalledWith('/schema');
    });

    it('prefetches on keyboard focus too', async () => {
      const prefetch = spyPrefetch();
      const el = await mount();

      anchorOf(el).dispatchEvent(new Event('focus'));
      vi.advanceTimersByTime(80);

      expect(prefetch).toHaveBeenCalledWith('/schema');
    });

    it.each([
      ['the pointer leaves first', 'pointerleave'],
      ['focus moves on first', 'blur'],
    ])('fetches nothing when %s', async (_label, leaveEvent) => {
      const prefetch = spyPrefetch();
      const el = await mount();

      anchorOf(el).dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(40);
      anchorOf(el).dispatchEvent(new Event(leaveEvent));
      vi.advanceTimersByTime(80);

      expect(prefetch).not.toHaveBeenCalled();
    });

    it('starts no second timer while one is already running', async () => {
      const prefetch = spyPrefetch();
      const el = await mount();

      anchorOf(el).dispatchEvent(new Event('pointerenter'));
      anchorOf(el).dispatchEvent(new Event('focus'));
      vi.advanceTimersByTime(160);

      expect(prefetch).toHaveBeenCalledTimes(1);
    });

    it('cancels a hover the tile is unmounted in the middle of', async () => {
      const prefetch = spyPrefetch();
      const el = await mount();

      anchorOf(el).dispatchEvent(new Event('pointerenter'));
      el.remove();
      vi.advanceTimersByTime(80);

      expect(prefetch).not.toHaveBeenCalled();
    });

    it.each([
      ['the connection asks for data saving', { saveData: true }],
      ['the link is 2g', { effectiveType: '2g' }],
      ['the link is slow 2g', { effectiveType: 'slow-2g' }],
    ])('spends no bandwidth when %s', async (_label, connection) => {
      const prefetch = spyPrefetch();
      onConnection(connection);
      const el = await mount();

      anchorOf(el).dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(80);

      expect(prefetch).not.toHaveBeenCalled();
    });

    it('prefetches on a connection that reports itself as fast', async () => {
      const prefetch = spyPrefetch();
      onConnection({ effectiveType: '4g' });
      const el = await mount();

      anchorOf(el).dispatchEvent(new Event('pointerenter'));
      vi.advanceTimersByTime(80);

      expect(prefetch).toHaveBeenCalledWith('/schema');
    });
  });
});
