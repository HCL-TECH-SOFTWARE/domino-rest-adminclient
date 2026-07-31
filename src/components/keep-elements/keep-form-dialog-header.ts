/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { FA_LIBRARY } from '../../services/icon-library';
import { KeepElement } from './keep-element';

/** Payload is empty; the event itself is the signal. */
export type KeepFormDialogHeaderCloseDetail = undefined;

/**
 * Title bar with a close button, used by 19 dialogs.
 *
 * Distinct from `keep-dialog-header`, which is a generic slotted `section` + `hr`. This one
 * owns the title text and the close affordance.
 *
 * Two naming decisions worth keeping:
 *
 *  - The property is **`heading`**, not `title`. `title` is a property on `HTMLElement`, so a
 *    reactive property of that name shadows a built-in and couples the component to the
 *    native tooltip attribute.
 *  - The event is **`header-close`**, not `close`. `KeepElement.emit` bubbles *and* composes,
 *    and most consumers render this inside a native `<dialog>`, which fires its own `close`
 *    event. A bubbling `close` from in here would be indistinguishable from the dialog
 *    actually closing.
 *
 * `--dialog-header-color` is still read from the global sheet: custom properties inherit
 * through a shadow boundary, so the `light-dark()` token keeps working unchanged. Only the
 * class *rules* had to move.
 */
@customElement('keep-form-dialog-header')
export default class FormDialogHeader extends KeepElement {
  static styles = css`
    /* was .dialog-title */
    :host {
      display: flex;
      width: 100%;
      padding: 0;
      justify-content: space-between;
      position: relative;
    }

    /* was .dialog-header */
    .header {
      display: flex;
      justify-content: space-between;
      width: 100%;
      align-items: center;
      padding-right: 36px;
    }

    /* was .dialog-header-title, plus margin: 0 because this is an h2 now and the UA default
       margin would shift every dialog it sits in. */
    .heading {
      flex: 1;
      text-overflow: ellipsis;
      width: 100%;
      overflow: hidden;
      font-size: 24px;
      font-weight: bold;
      color: var(--dialog-header-color);
      margin: 0;
    }

    /* was .dialog-header-close */
    .close {
      cursor: pointer;
      font-size: 16px;
      color: var(--dialog-header-color);
      padding: 0;
      border: none;
      background: transparent;
      margin: 0;
      position: absolute;
      top: -15px;
      right: 0;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  `;

  /** The dialog title. */
  @property({ type: String }) accessor heading = '';

  private handleClose() {
    this.emit<KeepFormDialogHeaderCloseDetail>('header-close');
  }

  render() {
    // Accessibility (#713):
    //  - an <h2> rather than a <span>, so the dialog has a heading in the structure
    //    (WCAG 1.3.1); the visual weight was already heading-like.
    //  - type="button", because without it a button inside a form defaults to submit.
    //  - aria-label, because the button's only content is an icon, so it had no accessible
    //    name at all (WCAG 4.1.2).
    //  - the glyph is decorative once the button is labelled.
    // The glyph was inline SVG, kept that way "because it is already framework-agnostic
    // and needs no icon library at runtime". It is a registered xmark now (#946) — the
    // library is bundled either way, and one cross beats three hand-drawn copies of it.
    return html`
      <div class="header">
        <h2 class="heading">${this.heading}</h2>
        <button class="close" type="button" aria-label="Close" @click=${this.handleClose}>
          <wa-icon library=${FA_LIBRARY} name="xmark" canvas="auto" aria-hidden="true"></wa-icon>
        </button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-form-dialog-header': FormDialogHeader;
  }
}
