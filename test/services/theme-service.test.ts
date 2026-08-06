/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  applyAppearance,
  applyTheme,
  followSystemAppearance,
  forceRefreshSystemTheme,
  nextThemeMode,
  resetSystemAppearanceForTest,
  systemAppearance,
  toAppearance,
  toThemeMode,
  THEME_MODES,
  THEME_MODE_UI
} from '../../src/services/theme-service';

/**
 * The operating-system preference, which jsdom does not model.
 *
 * `matchMedia` is stubbed rather than spied so the `change` listener
 * `followSystemAppearance` installs can be fired on demand — that subscription is the whole of
 * #962's "follow the system" behaviour and there is no other way to reach it.
 */
let systemListeners: Array<() => void> = [];
let prefersDark = false;

/**
 * Install the stub once per test. `matches` is a *getter* over a mutable flag rather than a
 * captured value, so {@link setSystemDark} can move the preference without replacing the
 * MediaQueryList the service is already subscribed to — replacing it would silently orphan
 * that subscription, which is precisely the bug these cases exist to catch.
 */
const stubSystem = () => {
  systemListeners = [];
  prefersDark = false;
  vi.stubGlobal('matchMedia', (query: string) => ({
    media: query,
    get matches() {
      return query.includes('prefers-color-scheme: dark') ? prefersDark : false;
    },
    addEventListener: (_: string, fn: () => void) => systemListeners.push(fn),
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false
  }));
};

/** Move the operating-system preference and notify whoever subscribed. */
const setSystemDark = (dark: boolean) => {
  prefersDark = dark;
  systemListeners.forEach((fire) => fire());
};

describe('theme-service', () => {
  beforeEach(() => {
    document.documentElement.className = '';
    document.documentElement.style.colorScheme = '';
    delete document.body.dataset.theme;
    localStorage.removeItem('theme');
    resetSystemAppearanceForTest();
    stubSystem();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetSystemAppearanceForTest();
  });

  describe('toAppearance', () => {
    it('maps "dark" to dark', () => {
      expect(toAppearance('dark')).toBe('dark');
    });

    it('maps the stored "default" theme to light', () => {
      expect(toAppearance('default')).toBe('light');
    });

    it('maps an absent theme to system (which resolves to current OS preference)', () => {
      setSystemDark(false);
      expect(toAppearance(null)).toBe('light');
      expect(toAppearance(undefined)).toBe('light');

      setSystemDark(true);
      expect(toAppearance(null)).toBe('dark');
      expect(toAppearance(undefined)).toBe('dark');
    });
  });

  describe('applyAppearance', () => {
    it('adds wa-dark to <html> for dark — this is what keep-monaco-editor reads', () => {
      applyAppearance('dark');
      expect(document.documentElement.classList.contains('wa-dark')).toBe(true);
    });

    it('removes wa-dark from <html> for light', () => {
      applyAppearance('dark');
      applyAppearance('light');
      expect(document.documentElement.classList.contains('wa-dark')).toBe(false);
    });

    it('sets all three appearance carriers together', () => {
      applyAppearance('dark');
      expect(document.documentElement.classList.contains('wa-dark')).toBe(true);
      expect(document.documentElement.style.colorScheme).toBe('dark');
      expect(document.body.dataset.theme).toBe('dark');
    });

    it('leaves unrelated <html> classes alone', () => {
      document.documentElement.classList.add('wa-scroll-lock');
      applyAppearance('dark');
      applyAppearance('light');
      expect(document.documentElement.classList.contains('wa-scroll-lock')).toBe(true);
    });

    it('is idempotent', () => {
      applyAppearance('dark');
      applyAppearance('dark');
      expect(document.documentElement.className.match(/wa-dark/g)).toHaveLength(1);
    });
  });

  describe('applyTheme', () => {
    it('applies dark from the stored theme name', () => {
      applyTheme('dark');
      expect(document.documentElement.classList.contains('wa-dark')).toBe(true);
    });

    it('applies light from the stored "default" theme name', () => {
      applyTheme('dark');
      applyTheme('default');
      expect(document.documentElement.classList.contains('wa-dark')).toBe(false);
    });
  });

  describe('the system setting (#962)', () => {
    it('systemAppearance returns dark when OS prefers dark', () => {
      setSystemDark(true);
      expect(systemAppearance()).toBe('dark');
    });

    it('systemAppearance returns light when OS prefers light', () => {
      setSystemDark(false);
      expect(systemAppearance()).toBe('light');
    });

    it('resolves to whatever the operating system asks for', () => {
      setSystemDark(true);
      expect(toAppearance('system')).toBe('dark');

      setSystemDark(false);
      expect(toAppearance('system')).toBe('light');
    });

    it('falls back to light where matchMedia does not exist', () => {
      // Not hypothetical: jsdom ships no implementation unless a suite installs one, and the
      // boot module runs before anything could.
      vi.stubGlobal('matchMedia', undefined);
      expect(systemAppearance()).toBe('light');
      expect(toAppearance('system')).toBe('light');
    });

    it('re-applies when the operating system changes under a system setting', () => {
      localStorage.setItem('theme', 'system');
      followSystemAppearance();
      applyTheme('system');
      expect(document.documentElement.classList.contains('wa-dark')).toBe(false);

      // The OS flips while the app is running. Nothing re-renders; the listener is the only
      // thing that can carry this.
      setSystemDark(true);
      expect(document.documentElement.classList.contains('wa-dark')).toBe(true);
    });

    it('leaves an explicit choice alone when the operating system changes', () => {
      // The point of choosing light or dark is that the OS stops deciding.
      localStorage.setItem('theme', 'default');
      followSystemAppearance();
      applyTheme('default');

      setSystemDark(true);
      expect(document.documentElement.classList.contains('wa-dark')).toBe(false);
    });

    it('subscribes once however many callers ask', () => {
      followSystemAppearance();
      followSystemAppearance();
      followSystemAppearance();
      expect(systemListeners).toHaveLength(1);
    });
  });

  describe('toThemeMode', () => {
    it.each(THEME_MODES)('passes %s through', (mode) => {
      expect(toThemeMode(mode)).toBe(mode);
    });

    it.each([null, undefined, '', 'light', 'nonsense'])('maps %s to the system default', (stored) => {
      // Unrecognized values default to 'system', which respects the OS preference
      expect(toThemeMode(stored)).toBe('system');
    });
  });

  describe('nextThemeMode', () => {
    it('cycles light → dark → system → light', () => {
      expect(nextThemeMode('default')).toBe('dark');
      expect(nextThemeMode('dark')).toBe('system');
      expect(nextThemeMode('system')).toBe('default');
    });

    it('treats an unrecognised setting as system, so the first press goes dark', () => {
      expect(nextThemeMode(null)).toBe('dark');
      expect(nextThemeMode('nonsense')).toBe('dark');
    });
  });

  describe('THEME_MODE_UI', () => {
    it('describes every mode, and only the modes', () => {
      expect(Object.keys(THEME_MODE_UI).sort()).toEqual([...THEME_MODES].sort());
    });

    it('names the destination of the cycle, not the current setting', () => {
      // The labels and the cycle are two statements of the same order, in two places. Pinning
      // one against the other is what stops a reordered cycle leaving the labels lying.
      const spoken: Record<string, string> = {
        default: 'Switch to Dark Mode',
        dark: 'Switch to System Mode',
        system: 'Switch to Light Mode'
      };
      for (const mode of THEME_MODES) {
        expect(THEME_MODE_UI[mode].action).toBe(spoken[nextThemeMode(mode)]);
      }
    });

    it('uses a distinct glyph per mode', () => {
      const icons = THEME_MODES.map((mode) => THEME_MODE_UI[mode].icon);
      expect(new Set(icons).size).toBe(icons.length);
      expect(icons).toEqual(['sun', 'moon', 'robot']);
    });
  });

  describe('forceRefreshSystemTheme', () => {
    it('re-applies system appearance when called', () => {
      localStorage.setItem('theme', 'system');
      setSystemDark(false);
      followSystemAppearance();
      applyTheme('system');
      expect(document.documentElement.classList.contains('wa-dark')).toBe(false);

      // Change OS to dark
      setSystemDark(true);
      // Manually force refresh
      forceRefreshSystemTheme();
      expect(document.documentElement.classList.contains('wa-dark')).toBe(true);
    });

    it('does nothing when not in system mode', () => {
      localStorage.setItem('theme', 'dark');
      applyTheme('dark');
      setSystemDark(false);
      forceRefreshSystemTheme();
      // Should still be dark, not light
      expect(document.documentElement.classList.contains('wa-dark')).toBe(true);
    });
  });

  describe('polling for system changes', () => {
    it('detects OS preference changes via polling when in system mode', async () => {
      vi.useFakeTimers();
      localStorage.setItem('theme', 'system');
      setSystemDark(false);
      followSystemAppearance();
      applyTheme('system');
      expect(document.documentElement.classList.contains('wa-dark')).toBe(false);

      // Change OS
      setSystemDark(true);
      // Move time forward to trigger the polling interval (500ms)
      vi.advanceTimersByTime(600);
      expect(document.documentElement.classList.contains('wa-dark')).toBe(true);

      vi.useRealTimers();
    });
  });

  describe('fallback listeners', () => {
    it('responds to focus event when in system mode', () => {
      localStorage.setItem('theme', 'system');
      setSystemDark(false);
      followSystemAppearance();
      applyTheme('system');
      expect(document.documentElement.classList.contains('wa-dark')).toBe(false);

      // Change OS
      setSystemDark(true);
      // Simulate focus event
      window.dispatchEvent(new Event('focus'));
      expect(document.documentElement.classList.contains('wa-dark')).toBe(true);
    });

    it('responds to visibilitychange when page becomes visible', () => {
      localStorage.setItem('theme', 'system');
      setSystemDark(false);
      followSystemAppearance();
      applyTheme('system');
      expect(document.documentElement.classList.contains('wa-dark')).toBe(false);

      // Change OS
      setSystemDark(true);
      // Simulate becoming visible
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => false
      });
      document.dispatchEvent(new Event('visibilitychange'));
      expect(document.documentElement.classList.contains('wa-dark')).toBe(true);
    });

    it('responds to click event when in system mode', () => {
      localStorage.setItem('theme', 'system');
      setSystemDark(false);
      followSystemAppearance();
      applyTheme('system');
      expect(document.documentElement.classList.contains('wa-dark')).toBe(false);

      // Change OS
      setSystemDark(true);
      // Simulate click event
      window.dispatchEvent(new Event('click'));
      expect(document.documentElement.classList.contains('wa-dark')).toBe(true);
    });
  });
});
