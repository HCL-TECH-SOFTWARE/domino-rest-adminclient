/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * Single writer for the DOM state that carries the active appearance.
 *
 * Three consumers read three different things, so a theme switch has to set all
 * three or the page ends up half-dark:
 *   - `<html>.wa-dark`          — Web Awesome components, and `keep-monaco-editor`,
 *                                 which derives its Monaco theme from this class.
 *   - `<html>.style.colorScheme` — native form controls, scrollbars, `light-dark()`.
 *   - `<body>[data-theme]`       — the app's own `:host-context(body[data-theme="dark"])`
 *                                 rules in the keep-* components.
 *
 * `appearance-boot.ts` applies the same three from `localStorage` before the app boots (to
 * avoid a flash); this module is what keeps them correct afterwards, for every in-session
 * toggle.
 *
 * ## Three settings, two appearances (#962)
 *
 * The stored setting is one of {@link THEME_MODES} — `default`, `dark` or `system` — and only
 * the first two name an appearance. `system` defers to `prefers-color-scheme`, which can change
 * under the app while it is running, so it needs both a resolution ({@link toAppearance}) and a
 * subscription ({@link followSystemAppearance}).
 *
 * Keeping the resolution here rather than at the call sites is the point: the boot script, the
 * shell and the login page all read the same stored string, and if any of them mapped it
 * differently the page would end up half-dark in exactly the way the three carriers above
 * already describe.
 */

/** The stored theme name for dark. */
const DARK_THEME = 'dark';

/** The stored theme name for "whatever the operating system is set to" (#962). */
export const SYSTEM_THEME = 'system';

/** The stored theme name for light. Also what an absent or unrecognised value means. */
export const LIGHT_THEME = 'default';

/**
 * The three settings a user can choose, in the order the toggles cycle through them.
 *
 * Distinct from {@link Appearance}: this is what is *stored*, and `system` is not an
 * appearance — it is a deferral to one.
 */
export const THEME_MODES = [LIGHT_THEME, DARK_THEME, SYSTEM_THEME] as const;

export type ThemeMode = (typeof THEME_MODES)[number];

export type Appearance = 'light' | 'dark';

/** The media query that carries the operating system's preference. */
const PREFERS_DARK = '(prefers-color-scheme: dark)';

/**
 * A stored string as one of the three settings.
 *
 * Anything unrecognised — a value from before #962, a hand-edited `localStorage`, or an absent key
 * on a first visit — defaults to system, which follows the operating system preference.
 */
export function toThemeMode(stored: string | null | undefined): ThemeMode {
  return THEME_MODES.includes(stored as ThemeMode) ? (stored as ThemeMode) : SYSTEM_THEME;
}

/**
 * The next setting in the cycle. The toggles are single buttons, so the only affordance is
 * "advance", and the label they show names the destination rather than the current state.
 */
export function nextThemeMode(themeMode: string | null | undefined): ThemeMode {
  const index = THEME_MODES.indexOf(toThemeMode(themeMode));
  return THEME_MODES[(index + 1) % THEME_MODES.length];
}

/**
 * How each setting presents itself: the glyph showing what is *current*, and the label naming
 * what pressing the toggle does *next*.
 *
 * Here rather than in the two elements that render it, because there are two of them — the
 * shell's rail and the login page's corner — and a pair of copies is how the wording and the
 * cycle order drift apart. `test/services/theme-service.test.ts` pins each `action` against
 * {@link nextThemeMode}, so a reordered cycle cannot leave the labels lying.
 *
 * Glyph names must be registered in `services/icon-library`; an unregistered one silently
 * falls through to Web Awesome's CDN resolver.
 */
export const THEME_MODE_UI: Record<ThemeMode, { icon: string; action: string }> = {
  [LIGHT_THEME]: { icon: 'sun', action: 'Switch to Dark Mode' },
  [DARK_THEME]: { icon: 'moon', action: 'Switch to System Mode' },
  [SYSTEM_THEME]: { icon: 'robot', action: 'Switch to Light Mode' }
};

/**
 * What the operating system is asking for right now.
 *
 * Absent `matchMedia` — jsdom without a stub, and any non-browser context — the answer is
 * light, which is the same default the app has always had for an unrecognised theme name.
 * 
 * Creates a fresh MediaQueryList object each time to avoid browser caching issues.
 */
export function systemAppearance(): Appearance {
  if (!window.matchMedia) return 'light';
  // Create a fresh query object each time to avoid cached values
  const isDark = window.matchMedia(PREFERS_DARK).matches;
  return isDark ? 'dark' : 'light';
}

/**
 * Maps a stored theme name to an appearance.
 *
 * `"system"` is resolved here rather than at the call sites, which is what keeps every reader
 * of the setting — the boot script, the shell, the login page — agreeing on what it means. The
 * fallback is light, so an unrecognised or absent value behaves exactly as it did before #962.
 */
export function toAppearance(themeMode: string | null | undefined): Appearance {
  if (themeMode === DARK_THEME) return 'dark';
  if (themeMode === SYSTEM_THEME) return systemAppearance();
  return 'light';
}

/**
 * Applies an appearance to the document.
 *
 * Safe to call repeatedly with the same value — `classList.toggle` and the attribute
 * writes are idempotent. That matters because `keep-monaco-editor` observes `<html>`'s
 * `class` attribute, and MutationObserver fires on every write, not only on real
 * changes.
 */
export function applyAppearance(appearance: Appearance): void {
  const isDark = appearance === 'dark';
  document.documentElement.classList.toggle('wa-dark', isDark);
  document.documentElement.style.colorScheme = appearance;
  document.body.dataset.theme = appearance;
}

/** Convenience wrapper: apply straight from a stored theme name. */
export function applyTheme(themeMode: string | null | undefined): void {
  applyAppearance(toAppearance(themeMode));
}

/** Installed once; the flag is what makes {@link followSystemAppearance} idempotent. */
let following = false;

/** Stored reference to the media query list to prevent garbage collection and ensure listener persists. */
let mediaQuery: MediaQueryList | null = null;

/** Stored reference to the current system appearance for polling detection. */
let lastKnownAppearance: Appearance | null = null;

/** Poll interval ID for fallback system appearance checking. */
let pollIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Re-apply the appearance when the operating system's preference changes (#962).
 *
 * Only meaningful while the stored setting is `system`, and that is checked at *event* time
 * rather than at subscribe time — the user can switch to and from `system` at any point, and a
 * listener that had to be torn down and rebuilt on every toggle is a leak waiting to happen.
 * When the setting is not `system` the callback resolves to the same appearance it already
 * applied, and `applyAppearance` is idempotent, so the check is belt and braces rather than
 * load-bearing.
 *
 * **Not a `MutationObserver`.** The issue asks for one, and the DOM is the wrong thing to
 * watch: `prefers-color-scheme` never appears in it. `MutationObserver` is what
 * `keep-monaco-editor` uses to *follow* `<html>`'s class once this has written it, which is the
 * downstream half of the same chain and already works.
 *
 * Called from `appearance-boot.ts`, so it is live on every page including the login screen,
 * and before anything else has rendered. Idempotent, so a second caller costs nothing.
 */
export function followSystemAppearance(): void {
  if (following || !window.matchMedia) return;
  following = true;

  // Store the reference to prevent garbage collection and ensure the listener persists.
  mediaQuery = window.matchMedia(PREFERS_DARK);
  
  // Initialize the last known appearance to the current system state
  lastKnownAppearance = systemAppearance();

  const themeListener = () => {
    // localStorage, not the store: this runs on the login screen too, where no store has been
    // populated, and it is the same source `appearance-boot` reads.
    if (localStorage.getItem('theme') !== SYSTEM_THEME) return;
    applyAppearance(systemAppearance());
  };

  // Use both addEventListener and addListener for maximum compatibility across browsers.
  mediaQuery.addEventListener('change', themeListener);
  // Fallback for older browsers that don't support addEventListener on MediaQueryList.
  if ((mediaQuery as any).addListener) {
    (mediaQuery as any).addListener(themeListener);
  }

  // Fallback: Re-apply theme when window regains focus, in case the OS preference changed while
  // the window was not focused. Some browsers (especially on Windows) don't fire the matchMedia
  // 'change' event until the window regains focus.
  if (typeof window !== 'undefined') {
    const refocusListener = () => {
      if (localStorage.getItem('theme') !== SYSTEM_THEME) return;
      applyAppearance(systemAppearance());
    };
    window.addEventListener('focus', refocusListener);

    // Also check when page becomes visible again (tab switching).
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      if (localStorage.getItem('theme') !== SYSTEM_THEME) return;
      applyAppearance(systemAppearance());
    });

    // Additional workaround: Check on any user interaction (click, keyboard, mousemove)
    // because the browser may only update its matchMedia cache when the window is active
    const interactionListener = () => {
      if (localStorage.getItem('theme') !== SYSTEM_THEME) return;
      const appearance = systemAppearance();
      if (lastKnownAppearance !== appearance) {
        lastKnownAppearance = appearance;
        applyAppearance(appearance);
      }
    };
    
    // Use passive listeners to avoid blocking user interactions
    window.addEventListener('click', interactionListener, { passive: true });
    window.addEventListener('keydown', interactionListener, { passive: true });
  }
}

/** Test seam: forget the installed listener so a suite can install a fresh one. */
export function resetSystemAppearanceForTest(): void {
  following = false;
  mediaQuery = null;
  lastKnownAppearance = null;
  if (pollIntervalId !== null) {
    clearInterval(pollIntervalId);
    pollIntervalId = null;
  }
}

/**
 * Force a re-check of the system appearance and re-apply if in system mode.
 * Use this as a workaround if the browser doesn't automatically detect OS theme changes.
 * Can be called from the console as: `window.__refreshSystemTheme()`
 */
export function forceRefreshSystemTheme(): void {
  if (localStorage.getItem('theme') !== SYSTEM_THEME) return;
  const appearance = systemAppearance();
  lastKnownAppearance = null; // Reset to force re-apply even if unchanged
  applyAppearance(appearance);
}

// Expose the refresh function globally for manual debugging/workarounds
if (typeof window !== 'undefined') {
  (window as any).__refreshSystemTheme = forceRefreshSystemTheme;
}
