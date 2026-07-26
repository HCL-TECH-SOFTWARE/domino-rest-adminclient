// Copyright (C) 2026 HCL America Inc.
// Licensed under the Apache 2.0 License (https://www.apache.org/licenses/LICENSE-2.0.txt)

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
 * The boot script in `index.html` applies the same three from `localStorage` before
 * React mounts (to avoid a flash); this module is what keeps them correct afterwards,
 * for every in-session toggle.
 */

/** The stored theme name for dark. Any other value ("default") means light. */
const DARK_THEME = 'dark';

export type Appearance = 'light' | 'dark';

/**
 * Maps a stored theme name to an appearance. The app persists `"dark"` or
 * `"default"`, so anything that isn't `"dark"` is light.
 */
export function toAppearance(themeMode: string | null | undefined): Appearance {
  return themeMode === DARK_THEME ? 'dark' : 'light';
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
