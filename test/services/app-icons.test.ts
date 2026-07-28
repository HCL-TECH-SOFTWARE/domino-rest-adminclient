/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it, vi } from 'vitest';
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
} from '../../src/services/app-icons';

/**
 * The loader seam from #772. What matters here is the *before* state: every function has
 * to give a usable answer while the chunk is still in flight, because that window is the
 * only thing the split introduced. A helper that returned `undefined`-in-a-template there
 * is exactly the broken-image flash the issue asked to avoid.
 */
describe('app-icons service', () => {
  afterEach(() => {
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
});
