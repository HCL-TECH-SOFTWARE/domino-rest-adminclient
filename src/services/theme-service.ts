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
 * The boot script in `index.html` applies the same three from `localStorage` before React
 * mounts; this module is what keeps them correct afterwards, for every in-session toggle.
 * If you change the carriers here, change them there too.
 *
 * ## Why that boot script is inline HTML and not part of this bundle
 *
 * It briefly lived in `src/index.tsx` (#707). Module code cannot run until the whole entry
 * chunk has been fetched and evaluated, and the document has nothing paintable before React
 * renders — so nothing was on screen, in any theme, until the bundle finished. Measured
 * against a `vite preview` production build over throttled Fast 3G with an empty cache:
 *
 *     stylesheet ready    2293 ms
 *     entry chunk ready   5378 ms   (571 kB gzip)
 *     first paint         5468 ms
 *
 * The stylesheet was ready 3.1 s before the chunk, but a dark-mode user still looked at the
 * browser's default white canvas for ~5.5 s and only then got a dark app.
 *
 * Inline, at the top of `<body>`, the script runs during parse. Setting `color-scheme`
 * colours the canvas from the first frame without waiting for CSS at all, and having
 * `.wa-dark` on `<html>` before the stylesheet arrives means the dark token values apply the
 * moment it does. It is in `<body>` rather than `<head>` only because it touches
 * `document.body`.
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
