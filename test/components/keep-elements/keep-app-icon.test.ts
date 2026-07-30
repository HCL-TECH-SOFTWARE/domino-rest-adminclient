/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { appIconUri, loadAppIcons, resetAppIconsForTest } from '../../../src/services/app-icons';
import '../../../src/components/keep-elements/keep-app-icon';
import type AppIcon from '../../../src/components/keep-elements/keep-app-icon';

/**
 * A gate in front of the payload chunk, so the in-flight state holds still.
 *
 * Without it these tests race: the element starts the load in `connectedCallback` and the
 * chunk is already in the module cache after the first test, so whether the placeholder
 * survives the element's first render depends on microtask ordering. Holding the gate shut
 * makes "in flight" a state a test can assert on rather than a moment it might catch.
 */
const chunk = vi.hoisted(() => {
  let open!: () => void;
  let refuse!: (reason: unknown) => void;
  const make = () =>
    new Promise<void>((resolve, reject) => {
      open = resolve;
      refuse = reject;
    });
  let gate = make();
  return {
    wait: () => gate,
    reset: () => {
      gate = make();
    },
    land: () => open(),
    fail: () => refuse(new Error('chunk unavailable'))
  };
});

vi.mock('../../../src/services/app-icons', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/services/app-icons')>();
  return {
    ...actual,
    loadAppIcons: async () => {
      await chunk.wait();
      return actual.loadAppIcons();
    }
  };
});

const TAG = 'keep-app-icon';

const shadow = (el: AppIcon) => el.shadowRoot!;
const img = (el: AppIcon) => shadow(el).querySelector('img');
const skeleton = (el: AppIcon) => shadow(el).querySelector('.app-icon-skeleton');
const fallbackSlot = (el: AppIcon) => shadow(el).querySelector('slot[name="fallback"]');

/** Let the gate's outcome and the element's re-render settle. */
const settle = async (el: AppIcon) => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
};

/**
 * Open the gate and wait for the icon to arrive. The load is awaited rather than merely
 * given a tick: the first evaluation of the 221 KB chunk takes several, and a test that
 * only yields once passes or fails depending on which file ran before it.
 */
const land = async (el: AppIcon) => {
  chunk.land();
  await loadAppIcons();
  await settle(el);
};

/** Mount with light-DOM children, which `mountLit` has no way to pass. */
async function mountWithFallback(props: Partial<AppIcon>, fallbackHtml: string) {
  const el = document.createElement(TAG) as AppIcon;
  Object.assign(el, props);
  el.innerHTML = fallbackHtml;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

/**
 * The three states #772 introduced at every icon site, and why they are distinct:
 *
 *   unknown name    → the caller's fallback, decided on the first render because the
 *                     *names* are still bundled eagerly. An unknown `iconName` is a
 *                     permanent fact about backend data, not a loading state, and must
 *                     not shimmer.
 *   known, unloaded → a placeholder. Rendering an image here paints a broken-image glyph.
 *   known, loaded   → the icon.
 *
 * Collapsing the first two is the tempting simplification and the wrong one: it makes
 * every card with a stale `iconName` pulse forever.
 */
describe('keep-app-icon', () => {
  beforeEach(chunk.reset);

  afterEach(() => {
    cleanupLit();
    resetAppIconsForTest();
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  it('exposes the default property values', async () => {
    const el = await mountLit<AppIcon>(TAG);
    expect(el.name).toBe('');
    expect(el.alt).toBe('');
  });

  it('renders the fallback slot for a name that is not a known icon', async () => {
    const el = await mountWithFallback(
      { name: 'no-such-icon' },
      '<span slot="fallback" id="fb"></span>'
    );

    const slot = fallbackSlot(el) as HTMLSlotElement;
    expect(slot.assignedElements().map((node) => node.id)).toEqual(['fb']);
    expect(img(el)).toBeNull();
  });

  it('renders nothing at all for an unknown name with no fallback given', async () => {
    const el = await mountLit<AppIcon>(TAG, { name: undefined });

    // The empty slot is the whole shadow content, and an unfilled slot with no default
    // content renders nothing — the light-DOM equivalent of returning no elements.
    expect((fallbackSlot(el) as HTMLSlotElement).assignedNodes()).toHaveLength(0);
    expect(img(el)).toBeNull();
    expect(skeleton(el)).toBeNull();
  });

  it('does not shimmer for an unknown name — that state never resolves', async () => {
    const el = await mountWithFallback({ name: 'no-such-icon' }, '<span slot="fallback"></span>');
    expect(skeleton(el)).toBeNull();
  });

  it('renders a placeholder, not an image, while the payloads are in flight', async () => {
    const el = await mountLit<AppIcon>(TAG, { name: 'beach', alt: 'db-icon' });

    expect(img(el)).toBeNull();
    expect(skeleton(el)!.getAttribute('aria-hidden')).toBe('true');
  });

  it('swaps the placeholder for the icon once the payloads land', async () => {
    const el = await mountLit<AppIcon>(TAG, { name: 'beach', alt: 'db-icon' });
    expect(skeleton(el)).toBeTruthy();

    await land(el);

    expect(img(el)!.getAttribute('src')).toBe(appIconUri('beach'));
    expect(img(el)!.getAttribute('alt')).toBe('db-icon');
    expect(skeleton(el)).toBeNull();
  });

  it('renders the icon straight away when the payloads are already loaded', async () => {
    chunk.land();
    await loadAppIcons();
    const el = await mountLit<AppIcon>(TAG, { name: 'beach' });

    // No placeholder frame at all: connecting short-circuits when the chunk is already in.
    expect(img(el)!.getAttribute('src')).toBe(appIconUri('beach'));
    expect(img(el)!.getAttribute('alt')).toBe('');
    expect(skeleton(el)).toBeNull();
  });

  it('keeps its placeholder when the payload chunk fails to load', async () => {
    const el = await mountLit<AppIcon>(TAG, { name: 'beach' });

    chunk.fail();
    await settle(el);

    expect(skeleton(el)).toBeTruthy();
    expect(img(el)).toBeNull();
  });

  it('keeps the caller class on the host, in every state', async () => {
    // The class used to land on the image. It lands on the host now, which is the box the
    // image fills — so a site that sized the image keeps that size through both states.
    const el = await mountWithFallback(
      { name: 'beach', alt: 'db-icon' },
      '<span slot="fallback"></span>'
    );
    el.className = 'quick-config-icon-image';
    expect(skeleton(el)).toBeTruthy();
    expect(el.className).toBe('quick-config-icon-image');

    await land(el);

    expect(img(el)).toBeTruthy();
    expect(el.className).toBe('quick-config-icon-image');
  });

  it('exposes the loaded image as a part', async () => {
    // This is what replaces the removed element-override prop. A call site that wants the
    // image styled — a background plate, a radius, a fixed height — reaches it through
    // `keep-app-icon::part(icon)`, the one hook that crosses this boundary.
    chunk.land();
    await loadAppIcons();
    const el = await mountLit<AppIcon>(TAG, { name: 'beach' });

    expect(img(el)!.getAttribute('part')).toBe('icon');
  });

  it('follows the name from a known icon to an unknown one', async () => {
    chunk.land();
    await loadAppIcons();
    const el = await mountWithFallback({ name: 'beach' }, '<span slot="fallback"></span>');
    expect(img(el)).toBeTruthy();

    el.name = 'no-such-icon';
    await el.updateComplete;

    expect(img(el)).toBeNull();
    expect(fallbackSlot(el)).toBeTruthy();
  });

  it('reads the name from the attribute', async () => {
    chunk.land();
    await loadAppIcons();
    const el = document.createElement(TAG) as AppIcon;
    el.setAttribute('name', 'beach');
    document.body.appendChild(el);
    await el.updateComplete;

    expect(el.name).toBe('beach');
    expect(img(el)).toBeTruthy();
  });
});
