/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent } from '@testing-library/react';
import WaBreadcrumbItem from '@awesome.me/webawesome/dist/react/breadcrumb-item/index.js';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import {
  NavigationGuardProvider,
  useNavigationGuard,
} from '../../../src/components/navigation/NavigationGuardContext';
import { Link } from '../../../src/router/react';

/**
 * #884 — the unsaved-changes guard, which had no tests at all.
 *
 * `test/router/react.test.tsx` has a `describe('guard')` block, but that is about *route*
 * guards (`guard: () => false`) — a different mechanism entirely. This file covers the one
 * that stops a user losing work, whose only real consumer is `access/AccessMode.tsx`: the
 * access-mode editor, where losing unsaved changes costs the most.
 *
 * Written before the traversal change, so the shadow-root case below is the gate: it fails
 * against `closest('a[href]')` and passes on `composedPath()`. The rest pin behaviour that
 * already worked, because the point of a traversal change is that *nothing else* moves.
 */

/** The dialog's `open` prop is how the provider says "blocked" — it renders one, always. */
const dialogOpen = () =>
  (document.querySelector('keep-unsaved-changes-dialog') as (HTMLElement & { open: boolean }) | null)
    ?.open ?? false;

const dialog = () => document.querySelector('keep-unsaved-changes-dialog') as HTMLElement;

/**
 * Drives the context the way `AccessMode` does — `setDirty` plus a registered save function —
 * and exposes the programmatic path the breadcrumb uses.
 */
const Harness: React.FC<{ dirty: boolean; save?: () => Promise<void>; to?: string }> = ({
  dirty,
  save,
  to = '/scope',
}) => {
  const { setDirty, setSaveFunction, guardedNavigate } = useNavigationGuard();
  useEffect(() => setDirty(dirty), [dirty, setDirty]);
  useEffect(() => setSaveFunction(save ?? null), [save, setSaveFunction]);
  return (
    <button type="button" data-testid="programmatic" onClick={() => guardedNavigate(to)}>
      go
    </button>
  );
};

interface MountOptions {
  dirty?: boolean;
  save?: () => Promise<void>;
  basename?: string;
  route?: string;
  to?: string;
  children?: React.ReactNode;
}

const mount = ({ dirty = true, save, basename, route = '/schema/db.nsf/Demo', to, children }: MountOptions = {}) =>
  renderWithProviders(
    <NavigationGuardProvider basename={basename}>
      <Harness dirty={dirty} save={save} to={to} />
      {children}
    </NavigationGuardProvider>,
    { route },
  );

/**
 * An anchor the guard can only reach through `composedPath()`.
 *
 * Synthetic on purpose: **no shipped component renders its own anchor yet**, which is exactly
 * why the defect is latent rather than live. This stands in for what #806 produces as each
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
 * **not** have to be inside the provider's subtree for it to be guarded, and these tests now say
 * so out loud.
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

describe('NavigationGuardProvider — in-app link clicks', () => {
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
});

describe('NavigationGuardProvider — used outside its provider', () => {
  afterEach(cleanup);

  /**
   * The default context value is three no-ops, so a component that calls `useNavigationGuard`
   * without a provider above it degrades silently instead of throwing. Worth pinning: it means
   * a converted component can lose its guard by being mounted in the wrong place, and the only
   * symptom is that nothing happens — the same failure mode as #884 itself.
   */
  it('degrades to no-ops rather than throwing', () => {
    const { router } = renderWithProviders(<Harness dirty save={async () => {}} />, {
      route: '/schema/db.nsf/Demo',
    });

    expect(() => fireEvent.click(document.querySelector('[data-testid="programmatic"]')!)).not.toThrow();
    // No provider, so no dialog was ever rendered, and nothing navigated.
    expect(document.querySelector('keep-unsaved-changes-dialog')).toBeNull();
    expect(router!.location().pathname).toBe('/schema/db.nsf/Demo');
  });
});

describe('NavigationGuardProvider — the real wa-breadcrumb-item case', () => {
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

describe('NavigationGuardProvider — guardedNavigate', () => {
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

describe('NavigationGuardProvider — hard navigation and history', () => {
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
    mount({ dirty: false });
    expect(beforeUnload().defaultPrevented).toBe(false);
  });

  it('pushes the URL back and offers the dialog on back/forward', () => {
    const pushState = vi.spyOn(window.history, 'pushState');
    mount();
    // The effect pushes once on mount, so that the first Back has something to land on.
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
    // the '__BACK__' sentinel's whole purpose, and the half a user would notice.
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

describe('NavigationGuardProvider — resolving the dialog', () => {
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
    // with no navigation queued. `performPendingNavigation` guards on that, and this is what
    // the guard is for: a stray event must not navigate the user anywhere.
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
