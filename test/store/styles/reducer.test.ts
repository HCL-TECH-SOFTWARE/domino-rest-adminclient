/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect, vi } from 'vitest';

// The styles reducer reads `localStorage.getItem('theme')` at module-load time.
// In this jsdom/Node setup `localStorage` is not defined, so provide a minimal
// in-memory stub before the reducer module is imported. `vi.hoisted` guarantees
// this runs before the (hoisted) ESM imports below.
vi.hoisted(() => {
  const g = globalThis as any;
  if (!g.localStorage || typeof g.localStorage.getItem !== 'function') {
    const store = new Map<string, string>();
    const mock = {
      getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
      setItem: (key: string, value: string) => void store.set(key, String(value)),
      removeItem: (key: string) => void store.delete(key),
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    };
    try {
      Object.defineProperty(g, 'localStorage', {
        configurable: true,
        writable: true,
        value: mock,
      });
    } catch {
      g.localStorage = mock;
    }
  }
});

import stylesReducer, { adjustDatabaseStyle, toggleFullscreen, setViewport, switchTheme } from '../../../src/store/styles/reducer';
import { StylesState } from '../../../src/store/styles/types';

// themeMode is seeded from localStorage at module load; derive it the same way
// so the expected initial state matches regardless of the environment default.
const initial: StylesState = {
  databaseSize: 100,
  accessModeFullscreen: false,
  isMobile: false,
  themeMode: localStorage.getItem('theme') || 'default',
};

describe('stylesReducer', () => {
  it('returns the initial state for an unknown action', () => {
    expect(stylesReducer(undefined, { type: '@@UNKNOWN' } as any)).toEqual(initial);
  });

  it('adjustDatabaseStyle sets databaseSize from the payload', () => {
    const next = stylesReducer(initial, adjustDatabaseStyle(42));
    expect(next.databaseSize).toBe(42);
  });

  it('toggleFullscreen flips accessModeFullscreen on each dispatch', () => {
    const once = stylesReducer(initial, toggleFullscreen());
    expect(once.accessModeFullscreen).toBe(true);
    expect(stylesReducer(once, toggleFullscreen()).accessModeFullscreen).toBe(false);
  });

  // `setViewport` takes no payload — it unconditionally sets the flag (see the reducer's
  // own note). Passing one was a type error the CI gates never ran to catch.
  it('setViewport sets isMobile to true', () => {
    const next = stylesReducer(initial, setViewport());
    expect(next.isMobile).toBe(true);
  });

  it('switchTheme sets themeMode from the payload', () => {
    const next = stylesReducer(initial, switchTheme('dark'));
    expect(next.themeMode).toBe('dark');
  });

  it('does not mutate the input state', () => {
    const frozen = Object.freeze({ ...initial });
    expect(() => stylesReducer(frozen, toggleFullscreen())).not.toThrow();
  });
});
