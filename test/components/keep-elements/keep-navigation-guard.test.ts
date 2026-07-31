/* ========================================================================== *
 * Copyright (C) 2024, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@awesome.me/webawesome/dist/components/breadcrumb-item/breadcrumb-item.js';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { Router, memoryHistory } from '../../../src/router/router';
import { setRouterForTest } from '../../../src/router/instance';
import { store } from '../../../src/store/store';
import {
  allowNavigation,
  blockNavigation,
  setNavigationDirty,
} from '../../../src/store/navigationGuard/action';
import {
  runSaveFunction,
  setSaveFunction,
} from '../../../src/store/navigationGuard/saveFunction';
// The bare import is what registers the element: the default binding below is only ever used
// in type position, so on its own it is erased before the module can run.
import '../../../src/components/keep-elements/keep-navigation-guard';
// A value import, not `import type`: the class is compared by identity below as well as used
// in type position, and a type-only import would be erased (BRIEF §19).
import NavigationGuard from '../../../src/components/keep-elements/keep-navigation-guard';

/**
 * #884's unsaved-changes guard, converted from React in #806 wave 8.
 *
 * Every assertion of `test/components/navigation/NavigationGuard.test.tsx` is carried over.
 * Three things about the file changed with the conversion and nothing else did:
 *
 * - **The store is the real one.** The React suite nested a `Provider` holding a private store
 *   because `renderWithProviders` builds identity reducers; a Lit element reaches the module
 *   singleton instead, so the reset that suite got from a fresh store per render is a
 *   `beforeEach` here.
 * - **The dialog is in the guard's shadow root**, not a sibling in the document, so it is
 *   found through `el.shadowRoot` rather than `document`.
 * - **`useNavigationGuard` is gone**, so its two `guardedNavigate` cases have moved. The hook
 *   had no consumer in `src` — `keep-breadcrumb-router` writes those three lines itself, and
 *   `test/components/keep-elements/keep-breadcrumb-router.test.ts` asserts *both* of its
 *   branches — so what is pinned below is the half that belongs to the guard: a held
 *   navigation raises the dialog, and resolving it does what the store said was pending.
 *
 * The shadow-root case remains the gate for #884: it fails against `closest('a[href]')` and
 * passes on `composedPath()`. Two other agents are converting screens onto that behaviour.
 */

const TAG = 'keep-navigation-guard';

let router: Router;

/** Install a memory router at `route`, then mount the guard over it. */
const at = async (route = '/schema/db.nsf/Demo', props: { basename?: string } = {}) => {
  router = setRouterForTest(new Router({ history: memoryHistory([route]) }));
  return mountLit<NavigationGuard>(TAG, props);
};

/** Mount already dirty, which is the state in which the guard actually does anything. */
const dirtyAt = async (route?: string, props: { basename?: string } = {}) => {
  store.dispatch(setNavigationDirty(true));
  return at(route, props);
};

const dialogOf = (el: NavigationGuard) =>
  el.shadowRoot!.querySelector('keep-unsaved-changes-dialog') as
    | (HTMLElement & { open: boolean })
    | null;

/** The dialog's `open` is how the guard says "blocked" — it renders one, always. */
const isOpen = (el: NavigationGuard) => dialogOf(el)?.open ?? false;

/** Resolve the dialog the way a user would, and let the update that follows settle. */
const answer = async (el: NavigationGuard, event: 'save' | 'discard' | 'cancel') => {
  dialogOf(el)!.dispatchEvent(new CustomEvent(`dialog-${event}`, { bubbles: true, composed: true }));
  await el.updateComplete;
  // `dialog-save` is answered by an async handler, so one microtask turn is not enough: the
  // navigation happens after `runSaveFunction()` resolves.
  await Promise.resolve();
  await el.updateComplete;
};

/* ------------------------------------------------------------------ *
 *  Fixtures — anchors, in and out of shadow roots                     *
 * ------------------------------------------------------------------ */

/**
 * An anchor the guard can only reach through `composedPath()`.
 *
 * Synthetic on purpose: it stands in for what #806 produces as each screen converts, and
 * `wa-breadcrumb-item[href]`, exercised further down, is the real article.
 */
class ShadowAnchorHost extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' }).innerHTML =
      '<a href="/scope"><span id="inside">Scopes</span></a>';
  }
}
customElements.define('test-shadow-anchor', ShadowAnchorHost);

/** The same, behind a closed root — where `composedPath()` cannot reach either. */
class ClosedAnchorHost extends HTMLElement {
  /** The test needs a handle on a node it is not supposed to be able to find from outside. */
  readonly inner: HTMLElement;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'closed' });
    root.innerHTML = '<a href="/scope"><span>Scopes</span></a>';
    this.inner = root.querySelector('span') as HTMLElement;
  }
}
customElements.define('test-closed-anchor', ClosedAnchorHost);

const fixtures: HTMLElement[] = [];

const appendFixture = <T extends HTMLElement>(tag: string, lightDom = ''): T => {
  const host = document.createElement(tag) as T;
  if (lightDom) host.innerHTML = lightDom;
  document.body.append(host);
  fixtures.push(host);
  return host;
};

/** A bare anchor in the document, outside the guard's tree — no handler of its own. */
const appendAnchor = (href: string): HTMLAnchorElement => {
  const anchor = document.createElement('a');
  anchor.setAttribute('href', href);
  anchor.textContent = 'go';
  document.body.append(anchor);
  fixtures.push(anchor);
  return anchor;
};

/**
 * An in-app anchor that behaves the way the router's `Link` does: a handler **on the anchor**
 * cancels the browser navigation and moves the router instead.
 *
 * That placement is the point. The guard listens on `document` in the *capture* phase, so its
 * `stopPropagation()` keeps the event from ever reaching this handler. Move the guard to the
 * bubble phase and the anchor's handler runs first — the router moves *and* the dialog opens.
 */
const appendLink = (href: string): HTMLAnchorElement => {
  const anchor = appendAnchor(href);
  anchor.addEventListener('click', (e) => {
    e.preventDefault();
    router.navigate(href);
  });
  return anchor;
};

/**
 * Click something, with jsdom's unimplemented-navigation noise suppressed.
 *
 * `composed: true` is what a real click carries and what `composedPath()` needs: an
 * uncomposed event does not leave the shadow root it was dispatched in at all, so every
 * shadow-DOM case below would pass for the wrong reason.
 */
const clickThrough = (node: Element) => {
  const cancel = (e: Event) => e.preventDefault();
  document.addEventListener('click', cancel);
  try {
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
  } finally {
    document.removeEventListener('click', cancel);
  }
};

const beforeUnload = () => {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event;
};

const guardState = () => store.getState().navigationGuard;

beforeEach(() => {
  store.dispatch(setNavigationDirty(false));
  store.dispatch(allowNavigation());
  setSaveFunction(null);
});

afterEach(() => {
  cleanupLit();
  fixtures.forEach((host) => host.remove());
  fixtures.length = 0;
  // The save registration is module state and outlives a mount.
  setSaveFunction(null);
  router?.dispose();
  vi.restoreAllMocks();
});

describe('keep-navigation-guard', () => {
  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  describe('in-app link clicks', () => {
    it('blocks a dirty in-app link click and offers the dialog', async () => {
      const el = await dirtyAt();
      const link = appendLink('/scope');

      clickThrough(link);
      await el.updateComplete;

      expect(isOpen(el)).toBe(true);
      expect(guardState().pendingPath).toBe('/scope');
      expect(router.location().pathname).toBe('/schema/db.nsf/Demo');
    });

    it('lets the same click through when nothing is dirty', async () => {
      const el = await at();
      const link = appendLink('/scope');

      clickThrough(link);
      await el.updateComplete;

      expect(isOpen(el)).toBe(false);
      // The link's own handler navigated — the guard neither blocked nor interfered.
      expect(router.location().pathname).toBe('/scope');
    });

    /**
     * **The gate for #884.** `e.target` retargets to the host for anything inside a shadow root
     * and `closest()` walks light-DOM ancestors, so `closest('a[href]')` found nothing here and
     * the handler returned — no error, no failing test, the dialog simply stopped appearing.
     */
    it('blocks an anchor rendered inside a shadow root', async () => {
      const el = await dirtyAt();
      const host = appendFixture('test-shadow-anchor');

      clickThrough(host.shadowRoot!.querySelector('#inside')!);
      await el.updateComplete;

      expect(isOpen(el)).toBe(true);
    });

    /**
     * A *slotted* anchor is light DOM — it only looks like it lives in the component. It passes
     * under both traversals, and is pinned here because a traversal change must not move it.
     */
    it('blocks a slotted anchor, which was never the broken case', async () => {
      const el = await dirtyAt();
      appendFixture('test-shadow-anchor', '<a href="/scope" data-slotted>Scopes</a>');

      clickThrough(document.querySelector('a[data-slotted]')!);
      await el.updateComplete;

      expect(isOpen(el)).toBe(true);
    });

    /**
     * The limit, recorded rather than discovered later: `composedPath()` stops at a **closed**
     * shadow root, so an anchor inside one stays invisible to the guard. Nothing in this
     * codebase uses one — Lit and Web Awesome both open their roots — which is why this is a
     * note and not a bug.
     */
    it('cannot see an anchor behind a closed shadow root', async () => {
      const el = await dirtyAt();
      const host = appendFixture<ClosedAnchorHost>('test-closed-anchor');

      clickThrough(host.inner);
      await el.updateComplete;

      expect(isOpen(el)).toBe(false);
    });

    it('ignores a dirty click that passed through no anchor at all', async () => {
      const el = await dirtyAt();
      const plain = document.createElement('button');
      document.body.append(plain);
      fixtures.push(plain);

      clickThrough(plain);
      await el.updateComplete;

      expect(isOpen(el)).toBe(false);
      expect(guardState().pendingPath).toBeNull();
    });

    it.each([
      ['an external link', 'https://example.com/docs'],
      ['a mailto: link', 'mailto:someone@example.com'],
      ['an in-page hash link', '#section'],
      // `hasAttribute('href')` is true and `getAttribute` is '' — an anchor that means "this
      // page". Blocking it would put the dialog up for a navigation that never happens.
      ['an empty href', ''],
    ])('lets %s through even when dirty', async (_label, href) => {
      const el = await dirtyAt();

      clickThrough(appendAnchor(href));
      await el.updateComplete;

      expect(isOpen(el)).toBe(false);
      expect(guardState().pendingPath).toBeNull();
    });

    it('strips the router basename off the href before navigating', async () => {
      const el = await dirtyAt('/schema/db.nsf/Demo', { basename: '/admin/ui' });

      clickThrough(appendAnchor('/admin/ui/scope'));
      await el.updateComplete;
      expect(isOpen(el)).toBe(true);

      // Discard, and the route it lands on proves what was stored: '/scope', not
      // '/admin/ui/scope'.
      await answer(el, 'discard');
      expect(router.location().pathname).toBe('/scope');
    });

    it('turns a bare basename href into the root route, not an empty path', async () => {
      // `href.slice(basename.length)` is '' for a link to the app root, and navigating to ''
      // would resolve against the current route rather than going home.
      const el = await dirtyAt('/schema/db.nsf/Demo', { basename: '/admin/ui' });

      clickThrough(appendAnchor('/admin/ui'));
      await answer(el, 'discard');

      expect(router.location().pathname).toBe('/');
    });

    it('leaves an href that is not under the basename alone', async () => {
      // Stripping is conditional on the prefix matching. A link the base does not cover is
      // already route-relative, and slicing it blindly would eat its first eight characters.
      const el = await dirtyAt('/schema/db.nsf/Demo', { basename: '/admin/ui' });

      clickThrough(appendAnchor('/scope'));
      await answer(el, 'discard');

      expect(router.location().pathname).toBe('/scope');
    });
  });

  describe('with no guard mounted', () => {
    /**
     * Replaces "degrades to no-ops rather than throwing".
     *
     * That test pinned the old context's default value — three no-ops, so a component rendered
     * outside `NavigationGuardProvider` lost its guard silently, which is the same failure mode
     * as #884 itself. There is no provider to be outside of now, so what is pinned instead is
     * the half that still matters: with no guard on the page there is no dialog, nothing is
     * intercepted, and nothing throws.
     */
    it('shows no dialog and intercepts nothing', () => {
      router = setRouterForTest(new Router({ history: memoryHistory(['/schema/db.nsf/Demo']) }));
      store.dispatch(setNavigationDirty(true));
      const link = appendLink('/scope');

      expect(() => clickThrough(link)).not.toThrow();

      expect(document.querySelector('keep-navigation-guard')).toBeNull();
      expect(guardState().pendingPath).toBeNull();
      // Nothing held it, so the link's own handler ran.
      expect(router.location().pathname).toBe('/scope');
    });

    it('leaves beforeunload alone', () => {
      store.dispatch(setNavigationDirty(true));
      expect(beforeUnload().defaultPrevented).toBe(false);
    });

    /**
     * The half the store conversion *fixes*, asserted so it cannot quietly regress: the dirty
     * flag reaches the store, not an ancestor, so a screen's position in the tree no longer
     * decides whether it has a guard at all.
     */
    it('still records the dirty flag, from a screen with no guard above it', () => {
      store.dispatch(setNavigationDirty(true));
      expect(guardState().isDirty).toBe(true);
    });
  });

  describe('the real wa-breadcrumb-item case', () => {
    /**
     * #877 gave the breadcrumb buttons rather than links *because* of this defect:
     * `wa-breadcrumb-item` renders its `<a>` in a shadow root, so an `href` would have silently
     * disabled the guard on every breadcrumb click. This is that exact anchor, and it is what
     * unblocks the follow-up — real URLs buy modified-click, open-in-new-tab and copy-link.
     */
    it('blocks a click on a wa-breadcrumb-item shadow-root anchor', async () => {
      const el = await dirtyAt();
      const item = appendFixture<HTMLElement & { updateComplete: Promise<boolean> }>(
        'wa-breadcrumb-item',
        'Scopes',
      );
      // `href` is watched with `waitUntilFirstUpdate`, so an item that is given one before it
      // has rendered once keeps `renderType: 'button'` and never grows an anchor at all.
      await item.updateComplete;
      item.setAttribute('href', '/scope');
      await item.updateComplete;

      const anchor = item.shadowRoot!.querySelector('a[href]');
      expect(anchor, 'wa-breadcrumb-item should render an anchor when given an href').not.toBeNull();

      clickThrough(anchor!);
      await el.updateComplete;

      expect(isOpen(el)).toBe(true);
    });
  });

  describe('programmatic navigation', () => {
    /**
     * What `useNavigationGuard().guardedNavigate` used to do at its call sites, which is now
     * `keep-breadcrumb-router`'s own three lines: ask `selectIsDirty`, then either dispatch
     * `blockNavigation(path)` or navigate. The guard owns the half after the dispatch.
     */
    it('raises the dialog for a navigation the store is holding', async () => {
      const el = await dirtyAt();

      store.dispatch(blockNavigation('/scope'));
      await el.updateComplete;

      expect(isOpen(el)).toBe(true);
      expect(router.location().pathname).toBe('/schema/db.nsf/Demo');
    });

    it('keeps the dialog shut while nothing is held', async () => {
      const el = await dirtyAt();
      expect(isOpen(el)).toBe(false);
    });
  });

  describe('hard navigation and history', () => {
    it('cancels beforeunload when dirty', async () => {
      await dirtyAt();
      expect(beforeUnload().defaultPrevented).toBe(true);
    });

    it('leaves beforeunload alone when clean', async () => {
      // No listener at all now, where the provider registered one for the session and had it
      // return early. Same observable answer, one fewer handler in front of every unload.
      await at();
      expect(beforeUnload().defaultPrevented).toBe(false);
    });

    /**
     * The `pushState` that happens when the listeners go in, rather than the one in the
     * handler. Without it the first Back leaves the history stack empty of anything to land
     * on, so the popstate that would raise the dialog never fires and the user is simply gone.
     */
    it('pushes a history entry when the page turns dirty', async () => {
      const el = await at();
      const pushState = vi.spyOn(window.history, 'pushState');

      store.dispatch(setNavigationDirty(true));
      await el.updateComplete;

      expect(pushState).toHaveBeenCalledTimes(1);
    });

    it('pushes the URL back and offers the dialog on back/forward', async () => {
      const el = await dirtyAt();
      // Installing the listener pushes once, so the first Back has something to land on.
      const pushState = vi.spyOn(window.history, 'pushState');

      window.dispatchEvent(new PopStateEvent('popstate'));
      await el.updateComplete;

      expect(pushState).toHaveBeenCalled();
      expect(isOpen(el)).toBe(true);
      expect(guardState().pendingPath).toBe('__BACK__');
    });

    it('actually goes back when the Back dialog is discarded', async () => {
      // The other popstate test proves the URL is pushed back and the dialog opens; this proves
      // the deferred navigation is a *history* move rather than a path push — the sentinel's
      // whole purpose, and the half a user would notice.
      const el = await dirtyAt();
      router.navigate('/scope');
      expect(router.location().pathname).toBe('/scope');

      window.dispatchEvent(new PopStateEvent('popstate'));
      await el.updateComplete;
      expect(isOpen(el)).toBe(true);

      await answer(el, 'discard');
      expect(router.location().pathname).toBe('/schema/db.nsf/Demo');
    });

    it('registers no popstate handler while clean', async () => {
      const el = await at();
      const pushState = vi.spyOn(window.history, 'pushState');

      window.dispatchEvent(new PopStateEvent('popstate'));
      await el.updateComplete;

      expect(pushState).not.toHaveBeenCalled();
      expect(isOpen(el)).toBe(false);
    });
  });

  describe('resolving the dialog', () => {
    /** Hold a navigation to `/scope`, then resolve it however the test wants. */
    const blocked = async (save?: () => Promise<void>) => {
      const el = await dirtyAt();
      if (save) setSaveFunction(save);
      store.dispatch(blockNavigation('/scope'));
      await el.updateComplete;
      expect(isOpen(el)).toBe(true);
      return el;
    };

    it('runs the registered save function, then navigates', async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const el = await blocked(save);

      await answer(el, 'save');

      expect(save).toHaveBeenCalledTimes(1);
      expect(router.location().pathname).toBe('/scope');
      expect(isOpen(el)).toBe(false);
    });

    it('navigates without saving on discard', async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const el = await blocked(save);

      await answer(el, 'discard');

      expect(save).not.toHaveBeenCalled();
      expect(router.location().pathname).toBe('/scope');
    });

    it('stays put on cancel, and stays dirty', async () => {
      const el = await blocked();

      await answer(el, 'cancel');

      expect(isOpen(el)).toBe(false);
      expect(router.location().pathname).toBe('/schema/db.nsf/Demo');

      // Still guarded: cancelling must not have cleared the dirty flag.
      expect(guardState().isDirty).toBe(true);
      clickThrough(appendLink('/scope'));
      await el.updateComplete;
      expect(isOpen(el)).toBe(true);
    });

    it('ignores a save event when nothing is pending', async () => {
      // The dialog is always rendered — only its `open` changes — so its events can arrive with
      // no navigation queued. A stray one must not navigate the user anywhere.
      const save = vi.fn().mockResolvedValue(undefined);
      const el = await dirtyAt();
      setSaveFunction(save);
      expect(isOpen(el)).toBe(false);

      await answer(el, 'save');

      expect(router.location().pathname).toBe('/schema/db.nsf/Demo');
    });

    it('resolves with no registered save function rather than throwing', async () => {
      const el = await blocked();

      await answer(el, 'save');

      expect(router.location().pathname).toBe('/scope');
    });
  });

  describe('the state it keeps', () => {
    /**
     * The point of #806 decision 1, asserted rather than assumed: the guard's state is in the
     * store, where the element reads it through `StoreController`, and not in a React subtree
     * only its own consumers can see.
     */
    it('holds the dirty flag and the pending navigation in the slice', async () => {
      const el = await dirtyAt();
      expect(guardState()).toEqual({ isDirty: true, pendingPath: null });

      clickThrough(appendLink('/scope'));
      await el.updateComplete;

      expect(guardState()).toEqual({ isDirty: true, pendingPath: '/scope' });
    });

    it('clears both when the user leaves', async () => {
      const el = await dirtyAt();
      clickThrough(appendLink('/scope'));
      await el.updateComplete;

      await answer(el, 'discard');

      expect(guardState()).toEqual({ isDirty: false, pendingPath: null });
    });
  });

  describe('teardown', () => {
    /**
     * `saveFunction.ts` asks the registrant to clear its function when it goes away, and
     * `keep-access-tabs` does. Nothing was clearing it when the *guard* went away, so a save
     * closed over an unmounted screen survived — and would be what the next dialog called.
     */
    it('clears the registered save function when the guard is removed', async () => {
      const save = vi.fn().mockResolvedValue(undefined);
      const el = await dirtyAt();
      setSaveFunction(save);

      el.remove();
      await runSaveFunction();

      expect(save).not.toHaveBeenCalled();
    });

    it('removes all three listeners when the guard is removed', async () => {
      const el = await dirtyAt();
      const pushState = vi.spyOn(window.history, 'pushState');

      el.remove();

      clickThrough(appendLink('/scope'));
      window.dispatchEvent(new PopStateEvent('popstate'));

      expect(guardState().pendingPath).toBeNull();
      expect(pushState).not.toHaveBeenCalled();
      expect(beforeUnload().defaultPrevented).toBe(false);
      expect(router.location().pathname).toBe('/scope');
    });

    /**
     * The other edge of the same reconciliation: the listeners go when the page stops being
     * dirty, rather than staying installed for the session with each handler returning early.
     */
    it('removes them again when the page stops being dirty', async () => {
      const el = await dirtyAt();
      expect(beforeUnload().defaultPrevented).toBe(true);

      store.dispatch(setNavigationDirty(false));
      await el.updateComplete;

      expect(beforeUnload().defaultPrevented).toBe(false);
      clickThrough(appendLink('/scope'));
      expect(guardState().pendingPath).toBeNull();
    });

    it('installs them when the page turns dirty after it mounted', async () => {
      const el = await at();
      expect(beforeUnload().defaultPrevented).toBe(false);

      store.dispatch(setNavigationDirty(true));
      await el.updateComplete;

      expect(beforeUnload().defaultPrevented).toBe(true);
    });
  });

  /*
   * A test stood here — "is what the old NavigationGuard path now forwards to" — asserting the
   * temporary §16 forward at `src/components/navigation/NavigationGuard.tsx` re-exported the
   * wrapper. The forward existed for exactly one wave, so the conversion did not have to edit
   * `Views.tsx` while three agents shared the worktree; the wave integration pointed `Views.tsx`
   * straight at the wrapper and deleted the directory.
   *
   * It is deleted rather than replaced. The obvious substitute — that the tag resolves to this
   * class — is already the "registers the custom element" case at the top of this file, and a
   * second copy under a name promising something about `Views.tsx` would read as coverage of
   * the wiring while asserting nothing about it. What genuinely guards that wiring is
   * `test/keep-element-wrappers.test.ts`, which fails if a wrapper loses its consumer.
   */
});
