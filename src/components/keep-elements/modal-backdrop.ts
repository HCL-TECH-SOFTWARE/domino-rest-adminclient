/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css } from 'lit';

/**
 * The dark-mode backdrop for a `<dialog>` opened with `showModal()`.
 *
 * `styles/dark-mode.css` has this rule already, as `body[data-theme="dark"] dialog::backdrop`.
 * It stops at a shadow boundary like every other selector that is not a custom property, so
 * every dialog that became an element lost its backdrop the moment it was converted — the
 * modal stayed on the top layer and the page behind it stopped being dimmed. Nothing failed
 * and no test could see it: `vitest` runs with `css: false`, and jsdom implements neither the
 * top layer nor `::backdrop`. Measured in Chrome, a light-DOM modal reports
 * `rgba(0, 0, 0, 0.6)` for `::backdrop` and a shadowed one reports `rgba(0, 0, 0, 0)` (#806).
 *
 * `:host-context` rather than a media query, for two reasons: the app's dark mode is a
 * `data-theme` attribute the user toggles, not the OS preference, and it is the form the other
 * themed elements use. Light mode keeps the user-agent backdrop, which is what the document
 * sheet gave it — there is no light rule to reproduce.
 *
 * Add this to `static styles` in any element that calls `showModal()`.
 */
export const modalBackdropStyles = css`
  :host-context(body[data-theme='dark']) dialog::backdrop {
    background-color: rgba(0, 0, 0, 0.6);
  }
`;
