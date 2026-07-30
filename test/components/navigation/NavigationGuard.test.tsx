/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import WaBreadcrumbItem from '@awesome.me/webawesome/dist/react/breadcrumb-item/index.js';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import {
  NavigationGuard,
  useNavigationGuard,
} from '../../../src/components/navigation/NavigationGuard';
import navigationGuardReducer from '../../../src/store/navigationGuard/reducer';
import { setSaveFunction } from '../../../src/store/navigationGuard/saveFunction';
import { Link } from '../../../src/router/react';

/**
 * #884 — the unsaved-changes guard, converted to a store slice by #806 (decision 1).
 *
 * Every assertion in `NavigationGuardContext.test.tsx` is carried over. Two things about
 * the file changed with the conversion and nothing else did:
 *
 * - There is no provider. `<NavigationGuard/>` is a **sibling** of the components it
 *   guards, not an ancestor, because its listeners are on `document` and `window`. The old
 *   file's fixtures already proved that by appending anchors outside the React tree.
 * - The store is real. `renderWithProviders` builds its store from identity reducers by
 *   design — component tests assert what renders for a given state, not that dispatching
 *   changes it — and the guard *is* a state machine, so this suite nests a Provider holding
 *   the real reducer. The inner store is the one every hook below sees.
 *
 * The shadow-root case remains the gate for #884: it fails against `closest('a[href]')` and
 * passes on `composedPath()`. The rest pin behaviour that already worked, because the point
 * of moving state is that *nothing else* moves.
 */

/** The dialog's `open` prop is how the guard says "blocked" — it renders one, always. */
const dialogOpen = () =>
  (document.querySelector('keep-unsaved-changes-dialog') as (HTMLElement & { open: boolean }) | null)
    ?.open ?? false;

const dialog = () => document.querySelector('keep-unsaved-changes-dialog') as HTMLElement;

/**
 * Drives the guard the way `AccessMode` does — `setDirty` plus a registered save function —
 * and exposes the programmatic path the breadcrumb uses.
 *
 * The save registration is cleared on unmount, exactly as `AccessMode.tsx` does it: the
 * function lives in a module now rather than in a provider's ref, so nothing drops it
 * automatically when the screen that registered it goes away.
 */
const Harness: React.FC<{ dirty: boolean; save?: () => Promise<void>; to?: string }> = ({
  dirty,
  save,
  to = '/scope',
}) => {
  const { setDirty, setSaveFunction: register, guardedNavigate } = useNavigationGuard();
  useEffect(() => setDirty(dirty), [dirty, setDirty]);
  useEffect(() => {
    register(save ?? null);
    return () => register(null);
  }, [save, register]);
  return (
    <button type="button" data-testid="programmatic" onClick={() => guardedNavigate(to)}>
      go
    </button>
  );
};

/** A store with the guard's real reducer in it — see the note at the top of the file. */
const guardStore = () => configureStore({ reducer: { navigationGuard: navigationGuardReducer } });

const renderGuarded = (ui: React.ReactNode, route: string) => {
  const store = guardStore();
  return { ...renderWithProviders(<Provider store={store}>{ui}</Provider>, { route }), guard: store };
};

interface MountOptions {
  dirty?: boolean;
  save?: () => Promise<void>;
  basename?: string;
  route?: string;
  to?: string;
  children?: React.ReactNode;
}

const mount = ({
  dirty = true,
  save,
  basename,
  route = '/schema/db.nsf/Demo',
  to,
  children,
}: MountOptions = {}) =>
  renderGuarded(
    <>
      <NavigationGuard basename={basename} />
      <Harness dirty={dirty} save={save} to={to} />
      {children}
    </>,
    route,
  );

/**
 * An anchor the guard can only reach through `composedPath()`.
 *
 * Synthetic on purpose: **no shipped component renders its own anchor yet**, which is exactly
 * why the defect was latent rather than live. This stands in for what #806 produces as each
 * component converts — and `wa-breadcrumb-item[href]`, exercised further down, is the real
 * article once #877's follow-up lands.
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

/**
 * Put a fixture host in the document, outside the React tree.
 *
 * Imperative rather than JSX for two reasons. A custom element has no entry in
 * `JSX.IntrinsicElements`, so `<test-shadow-anchor />` is a compile error unless the global JSX
 * types are augmented — which a test file has no business doing for a fixture. And it is the
 * more honest shape: the guard listens on `document` in the capture phase, so an anchor does
 * **not** have to be near the guard in the tree for it to be guarded, and these tests say so
 * out loud.
 */
const fixtures: HTMLElement[] = [];

const appendFixture = <T extends HTMLElement>(tag: string, lightDom = ''): T => {
  const host = document.createElement(tag) as T;
  if (lightDom) host.innerHTML = lightDom;
  document.body.append(host);
  fixtures.push(host);
  return host;
};

// `cleanup()` unmounts React trees; these hosts are appended to the body on their own, so a
// leaked one would sit in the document for every later test and be found by its `querySelector`.
afterEach(() => {
  fixtures.forEach((host) => host.remove());
  fixtures.length = 0;
});

// The save registration is module state and outlives a render. The Harness clears it on
// unmount; this is the belt to that pair of braces.
afterEach(() => setSaveFunction(null));

/**
 * Click something, with jsdom's unimplemented-navigation noise suppressed.
 *
 * When the guard blocks, it calls `stopPropagation()` in the capture phase and the event never
 * reaches the anchor. When it *lets a click through* — the control cases — jsdom would try to
 * navigate and log; this cancels at the bubble phase, after the guard has already decided.
 */
const clickThrough = (node: Element) => {
  const cancel = (e: Event) => e.preventDefault();
  document.addEventListener('click', cancel);
  try {
    fireEvent.click(node);
  } finally {
    document.removeEventListener('click', cancel);
  }
};

describe('NavigationGuard — in-app link clicks', () => {
  afterEach(cleanup);

  it('blocks a dirty in-app Link click and offers the dialog', () => {
    const { router } = mount({ children: <Link to="/scope">Scopes</Link> });

    clickThrough(document.querySelector('a[href="/scope"]')!);

    expect(dialogOpen()).toBe(true);
    expect(router!.location().pathname).toBe('/schema/db.nsf/Demo');
  });

  it('lets the same click through when nothing is dirty', () => {
    const { router } = mount({ dirty: false, children: <Link to="/scope">Scopes</Link> });

    clickThrough(document.querySelector('a[href="/scope"]')!);

    expect(dialogOpen()).toBe(false);
    // The Link's own handler navigated — the guard neither blocked nor interfered.
    expect(router!.location().pathname).toBe('/scope');
  });

  /**
   * **The gate for #884.** `e.target` retargets to the host for anything inside a shadow root
   * and `closest()` walks light-DOM ancestors, so `closest('a[href]')` found nothing here and
   * the handler returned — no error, no failing test, the dialog simply stopped appearing.
   */
  it('blocks an anchor rendered inside a shadow root', () => {
    mount();
    const host = appendFixture('test-shadow-anchor');

    clickThrough(host.shadowRoot!.querySelector('#inside')!);

    expect(dialogOpen()).toBe(true);
  });

  /**
   * A *slotted* anchor is light DOM — it only looks like it lives in the component. It passes
   * under both traversals, and is pinned here because a traversal change must not move it.
   */
  it('blocks a slotted anchor, which was never the broken case', () => {
    mount();
    appendFixture('test-shadow-anchor', '<a href="/scope" data-testid="slotted">Scopes</a>');

    clickThrough(document.querySelector('a[data-testid="slotted"]')!);

    expect(dialogOpen()).toBe(true);
  });

  /**
   * The limit, recorded rather than discovered later: `composedPath()` stops at a **closed**
   * shadow root, so an anchor inside one stays invisible to the guard. Nothing in this codebase
   * uses one — Lit and Web Awesome both open their roots — and there is no traversal that
   * would reach it, which is why this is a note and not a bug.
   */
  it('cannot see an anchor behind a closed shadow root', () => {
    mount();
    const host = appendFixture<ClosedAnchorHost>('test-closed-anchor');

    clickThrough(host.inner);

    expect(dialogOpen()).toBe(false);
  });

  it.each([
    ['an external link', 'https://example.com/docs'],
    ['a mailto: link', 'mailto:someone@example.com'],
    ['an in-page hash link', '#section'],
    // `hasAttribute('href')` is true and `getAttribute` is '' — an anchor that means "this
    // page". Blocking it would put the dialog up for a navigation that never happens.
    ['an empty href', ''],
  ])('lets %s through even when dirty', (_label, href) => {
    mount({ children: <a href={href} data-testid="out">out</a> });

    clickThrough(document.querySelector('a[data-testid="out"]')!);

    expect(dialogOpen()).toBe(false);
  });

  it('strips the router basename off the href before navigating', async () => {
    const { router } = mount({
      basename: '/admin/ui',
      children: <a href="/admin/ui/scope" data-testid="based">Scopes</a>,
    });

    clickThrough(document.querySelector('a[data-testid="based"]')!);
    expect(dialogOpen()).toBe(true);

    // Discard, and the route it lands on proves what was stored: '/scope', not '/admin/ui/scope'.
    await act(async () => {
      dialog().dispatchEvent(new CustomEvent('dialog-discard'));
    });
    expect(router!.location().pathname).toBe('/scope');
  });

  it('turns a bare basename href into the root route, not an empty path', async () => {
    // `href.slice(basename.length)` is '' for a link to the app root, and navigating to ''
    // would resolve against the current route rather than going home.
    const { router } = mount({
      basename: '/admin/ui',
      children: <a href="/admin/ui" data-testid="root">Home</a>,
    });

    clickThrough(document.querySelector('a[data-testid="root"]')!);
    await act(async () => {
      dialog().dispatchEvent(new CustomEvent('dialog-discard'));
    });

    expect(router!.location().pathname).toBe('/');
  });

  it('leaves an href that is not under the basename alone', async () => {
    // Stripping is conditional on the prefix matching. A link the base does not cover is
    // already route-relative, and slicing it blindly would eat its first eight characters.
    const { router } = mount({
      basename: '/admin/ui',
      children: <a href="/scope" data-testid="unbased">Scopes</a>,
    });

    clickThrough(document.querySelector('a[data-testid="unbased"]')!);
    await act(async () => {
      dialog().dispatchEvent(new CustomEvent('dialog-discard'));
    });

    expect(router!.location().pathname).toBe('/scope');
  });
});

describe('NavigationGuard — with no guard mounted', () => {
  afterEach(cleanup);

  /**
   * Replaces "degrades to no-ops rather than throwing".
   *
   * That test pinned the context's default value — three no-ops, so a component rendered
   * outside `NavigationGuardProvider` lost its guard silently, which is the same failure mode
   * as #884 itself. There is no provider to be outside of now, so what is pinned instead is
   * the half that still matters: with no `<NavigationGuard/>` on the page there is no dialog
   * and nothing navigates, and calling the hook still does not throw.
   */
  it('does not throw, show a dialog, or navigate', () => {
    const { router } = renderGuarded(
      <Harness dirty save={async () => {}} />,
      '/schema/db.nsf/Demo',
    );

    expect(() =>
      fireEvent.click(document.querySelector('[data-testid="programmatic"]')!),
    ).not.toThrow();
    expect(document.querySelector('keep-unsaved-changes-dialog')).toBeNull();
    expect(router!.location().pathname).toBe('/schema/db.nsf/Demo');
  });

  /**
   * The half the conversion *fixes*, asserted so it cannot quietly regress: the hook reaches
   * the store, not an ancestor, so a consumer's position in the tree no longer decides
   * whether it has a guard at all.
   */
  it('still records the dirty flag, from a component with no guard above it', () => {
    const { guard } = renderGuarded(<Harness dirty save={async () => {}} />, '/schema/db.nsf/Demo');

    expect(guard.getState().navigationGuard.isDirty).toBe(true);
  });
});

describe('NavigationGuard — the real wa-breadcrumb-item case', () => {
  afterEach(cleanup);

  /**
   * #877 gave the breadcrumb buttons rather than links *because* of this defect:
   * `wa-breadcrumb-item` renders its `<a>` in a shadow root, so an `href` would have silently
   * disabled the guard on every breadcrumb click. This is that exact anchor, and it is what
   * unblocks the follow-up — real URLs buy ⌘-click, open-in-new-tab and copy-link.
   */
  it('blocks a click on wa-breadcrumb-item’s shadow-root anchor', async () => {
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = mount({
        children: <WaBreadcrumbItem href="/scope">Scopes</WaBreadcrumbItem>,
      }));
      // wa-breadcrumb-item renders its <a> on Lit's first update, not synchronously with React.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const item = container.querySelector('wa-breadcrumb-item')!;
    const anchor = item.shadowRoot!.querySelector('a[href]');
    expect(anchor, 'wa-breadcrumb-item should render an anchor when given an href').not.toBeNull();

    clickThrough(anchor!);

    expect(dialogOpen()).toBe(true);
  });
});

describe('NavigationGuard — guardedNavigate', () => {
  afterEach(cleanup);

  it('defers a dirty programmatic navigation to the dialog', () => {
    const { router, getByTestId } = mount();

    fireEvent.click(getByTestId('programmatic'));

    expect(dialogOpen()).toBe(true);
    expect(router!.location().pathname).toBe('/schema/db.nsf/Demo');
  });

  it('navigates straight away when nothing is dirty', () => {
    const { router, getByTestId } = mount({ dirty: false });

    fireEvent.click(getByTestId('programmatic'));

    expect(dialogOpen()).toBe(false);
    expect(router!.location().pathname).toBe('/scope');
  });
});

describe('NavigationGuard — hard navigation and history', () => {
  afterEach(cleanup);

  const beforeUnload = () => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event;
  };

  it('cancels beforeunload when dirty', () => {
    mount();
    expect(beforeUnload().defaultPrevented).toBe(true);
  });

  it('leaves beforeunload alone when clean', () => {
    // No listener at all now, where the provider registered one for the session and had it
    // return early. Same observable answer, one fewer handler in front of every unload.
    mount({ dirty: false });
    expect(beforeUnload().defaultPrevented).toBe(false);
  });

  it('pushes the URL back and offers the dialog on back/forward', () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    mount();
    // The effect pushes once when the page turns dirty, so the first Back has something to
    // land on.
    pushState.mockClear();

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(pushState).toHaveBeenCalled();
    expect(dialogOpen()).toBe(true);
    pushState.mockRestore();
  });

  it('actually goes back when the Back dialog is discarded', async () => {
    // The other popstate test proves the URL is pushed back and the dialog opens; this proves
    // the deferred navigation is a *history* move (`navigate(-1)`) rather than a path push —
    // the sentinel's whole purpose, and the half a user would notice.
    const { router } = mount();
    await act(async () => router!.navigate('/scope'));
    expect(router!.location().pathname).toBe('/scope');

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(dialogOpen()).toBe(true);

    await act(async () => {
      dialog().dispatchEvent(new CustomEvent('dialog-discard'));
    });
    expect(router!.location().pathname).toBe('/schema/db.nsf/Demo');
  });

  it('registers no popstate handler while clean', () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    mount({ dirty: false });
    pushState.mockClear();

    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(pushState).not.toHaveBeenCalled();
    expect(dialogOpen()).toBe(false);
    pushState.mockRestore();
  });
});

describe('NavigationGuard — resolving the dialog', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  /** Block a programmatic navigation to `/scope`, then resolve it however the test wants. */
  const blocked = (save?: () => Promise<void>) => {
    const result = mount({ save });
    fireEvent.click(result.getByTestId('programmatic'));
    expect(dialogOpen()).toBe(true);
    return result;
  };

  it('runs the registered save function, then navigates', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { router } = blocked(save);

    await act(async () => {
      dialog().dispatchEvent(new CustomEvent('dialog-save'));
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(router!.location().pathname).toBe('/scope');
    expect(dialogOpen()).toBe(false);
  });

  it('navigates without saving on discard', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const { router } = blocked(save);

    await act(async () => {
      dialog().dispatchEvent(new CustomEvent('dialog-discard'));
    });

    expect(save).not.toHaveBeenCalled();
    expect(router!.location().pathname).toBe('/scope');
  });

  it('stays put on cancel, and stays dirty', async () => {
    const { router, getByTestId } = blocked();

    await act(async () => {
      dialog().dispatchEvent(new CustomEvent('dialog-cancel'));
    });

    expect(dialogOpen()).toBe(false);
    expect(router!.location().pathname).toBe('/schema/db.nsf/Demo');

    // Still guarded: cancelling must not have cleared the dirty flag.
    fireEvent.click(getByTestId('programmatic'));
    expect(dialogOpen()).toBe(true);
  });

  it('ignores a save event when nothing is pending', async () => {
    // The dialog is always mounted — only its `open` prop changes — so its events can arrive
    // with no navigation queued. A stray event must not navigate the user anywhere.
    const save = vi.fn().mockResolvedValue(undefined);
    const { router } = mount({ save });
    expect(dialogOpen()).toBe(false);

    await act(async () => {
      dialog().dispatchEvent(new CustomEvent('dialog-save'));
    });

    expect(router!.location().pathname).toBe('/schema/db.nsf/Demo');
  });

  it('resolves with no registered save function rather than throwing', async () => {
    const { router } = blocked();

    await act(async () => {
      dialog().dispatchEvent(new CustomEvent('dialog-save'));
    });

    expect(router!.location().pathname).toBe('/scope');
  });
});

describe('NavigationGuard — the state it keeps', () => {
  afterEach(cleanup);

  /**
   * The point of #806 decision 1, asserted rather than assumed: the guard's state is in the
   * store, where a Lit element can read it through `StoreController`, and not in a React
   * subtree only its own consumers can see.
   */
  it('holds the dirty flag and the pending navigation in the slice', () => {
    const { guard, getByTestId } = mount();
    expect(guard.getState().navigationGuard).toEqual({ isDirty: true, pendingPath: null });

    fireEvent.click(getByTestId('programmatic'));

    expect(guard.getState().navigationGuard).toEqual({ isDirty: true, pendingPath: '/scope' });
  });

  it('clears both when the user leaves', async () => {
    const { guard, getByTestId } = mount();
    fireEvent.click(getByTestId('programmatic'));

    await act(async () => {
      dialog().dispatchEvent(new CustomEvent('dialog-discard'));
    });

    expect(guard.getState().navigationGuard).toEqual({ isDirty: false, pendingPath: null });
  });
});
