/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css } from 'lit';

/**
 * The backdrop for a `<dialog>` opened with `showModal()`, in **both** colour modes.
 *
 * A backdrop reaches a light-DOM dialog through two bare selectors, and a bare selector does
 * not cross a shadow boundary — so every dialog that became an element lost its dimming the
 * moment it was converted. The modal stayed on the top layer and the page behind it simply
 * stopped being dimmed. Nothing failed and no test could see it: vitest runs with css false,
 * and jsdom implements neither the top layer nor the backdrop pseudo-element. Measured in
 * Chrome, a light-DOM modal reports a dimmed backdrop and a shadowed one reports fully
 * transparent (#806).
 *
 * ## Both halves, which is what this originally got wrong
 *
 * This module first reproduced only the dark rule, on the reasoning that light mode "keeps the
 * user-agent backdrop". That was wrong. Web Awesome's native layer carries an unconditional
 * rule of its own (native.css, the dialog backdrop region) reading the modal-overlay token,
 * and it is mode-independent — the token supplies both values. The app's dark sheet then
 * overrides it with a heavier black.
 *
 * So a converted dialog needs the base rule *and* the dark override. With only the dark half,
 * every one of these dialogs had no dimming at all in light mode, which is the mode most of
 * them are reviewed in.
 *
 * The fallback in the base rule mirrors Web Awesome's own, so an element still dims if the
 * token is ever unset.
 *
 * ## Why host-context rather than a media query
 *
 * The app's dark mode is a data-theme attribute the user toggles, not the OS preference, and
 * host-context is the form the other themed elements already use.
 *
 * Add this to `static styles` in any element that calls `showModal()`.
 */
export const modalBackdropStyles = css`
  dialog::backdrop {
    background-color: var(--wa-color-overlay-modal, rgb(0 0 0 / 0.25));
  }

  :host-context(body[data-theme='dark']) dialog::backdrop {
    background-color: rgba(0, 0, 0, 0.6);
  }
`;
