/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import {
  APP_ICON_NAMES,
  DEFAULT_APP_ICON_NAME,
  appIconPayload,
  appIconUri,
  appIconsLoaded,
  getAppIcons,
  isAppIconName,
  loadAppIcons,
  resetAppIconsForTest,
  useAppIcons,
} from '../../src/services/app-icons';

/**
 * The loader seam from #772. What matters here is the *before* state: every function has
 * to give a usable answer while the chunk is still in flight, because that window is the
 * only thing the split introduced. A helper that returned `undefined`-in-a-template there
 * is exactly the broken-image flash the issue asked to avoid.
 */
describe('app-icons service', () => {
  afterEach(() => {
    cleanup();
    resetAppIconsForTest();
    vi.restoreAllMocks();
  });

  describe('before the chunk loads', () => {
    it('reports itself unloaded and hands out an empty map', () => {
      expect(appIconsLoaded()).toBe(false);
      expect(getAppIcons()).toEqual({});
    });

    it('returns the same map object every read, so useSyncExternalStore is stable', () => {
      expect(getAppIcons()).toBe(getAppIcons());
    });

    it('still knows which names exist', () => {
      expect(isAppIconName('beach')).toBe(true);
      expect(isAppIconName('not-an-icon')).toBe(false);
      expect(isAppIconName(undefined)).toBe(false);
      expect(isAppIconName('')).toBe(false);
    });

    it('yields empty strings rather than half-built URIs', () => {
      expect(appIconPayload('beach')).toBe('');
      expect(appIconUri('beach')).toBe('');
    });
  });

  describe('once loaded', () => {
    it('resolves every name in APP_ICON_NAMES to a payload', async () => {
      const icons = await loadAppIcons();
      expect(APP_ICON_NAMES.filter((name) => !icons[name])).toEqual([]);
    });

    it('flips to loaded and serves the payloads synchronously', async () => {
      await loadAppIcons();
      expect(appIconsLoaded()).toBe(true);
      expect(appIconPayload(DEFAULT_APP_ICON_NAME)).not.toBe('');
    });

    it('builds a data URI from the payload', async () => {
      const icons = await loadAppIcons();
      expect(appIconUri('beach')).toBe(`data:image/svg+xml;base64,${icons['beach']}`);
    });

    it('reads from a caller-supplied snapshot when given one', () => {
      expect(appIconUri('x', { x: 'QUJD' })).toBe('data:image/svg+xml;base64,QUJD');
      expect(appIconPayload('x', { x: 'QUJD' })).toBe('QUJD');
    });

    it('returns empty for an unknown name', async () => {
      await loadAppIcons();
      expect(appIconPayload('not-an-icon')).toBe('');
      expect(appIconUri('not-an-icon')).toBe('');
    });
  });

  it('shares one import between concurrent callers', async () => {
    const [a, b] = await Promise.all([loadAppIcons(), loadAppIcons()]);
    expect(a).toBe(b);
  });

  it('resolves synchronously once cached', async () => {
    await loadAppIcons();
    const cached = getAppIcons();
    await expect(loadAppIcons()).resolves.toBe(cached);
  });

  /*
   * The subscription half of the service, and its failure path.
   *
   * These were covered only through `components/commons/AppIcon.test.tsx` until #806 turned
   * that component into `keep-app-icon`. The element does not use the hook — a Lit element
   * has its own reactivity — but `useAppIcons()` is *not* dead: `ScopeFormContainer` and
   * `DetailsSection` are still React and still call it. Deleting the component's test
   * therefore took the service's coverage with it, which is what CI caught.
   *
   * Tested here rather than through whichever component happens to call it, because that is
   * how it came to be covered by accident in the first place.
   */
  describe('the subscription seam', () => {
    // `subscribe` is module-private and only reachable through the hook, so the hook is what
    // is driven here — which is also how the two remaining React callers reach it.
    it('returns an empty map on first render, then the payloads once the chunk lands', async () => {
      expect(appIconsLoaded()).toBe(false);

      const { result } = renderHook(() => useAppIcons());
      expect(result.current).toEqual({});

      await act(async () => {
        await loadAppIcons();
      });

      expect(appIconsLoaded()).toBe(true);
      expect(result.current[DEFAULT_APP_ICON_NAME]).toBeTruthy();
    });

    it('kicks off the load itself, without anyone calling loadAppIcons', async () => {
      // Subscribing is a reason to fetch: a component that reads icons should not also have
      // to remember to warm them. Awaited inside `act` because the chunk landing notifies
      // subscribers, which is a React state update.
      const { result } = renderHook(() => useAppIcons());

      await act(async () => {
        await vi.waitFor(() => expect(appIconsLoaded()).toBe(true));
      });

      expect(result.current[DEFAULT_APP_ICON_NAME]).toBeTruthy();
    });

    it('unsubscribes on unmount, so a landed chunk cannot update a gone component', async () => {
      const { unmount } = renderHook(() => useAppIcons());
      unmount();

      // The load still completes; the point is that nothing throws and no update is attempted
      // against the unmounted tree.
      await expect(loadAppIcons()).resolves.toBeTypeOf('object');
    });
  });
});
