/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import { StoreController } from '../../store/StoreController';
import { toggleErrorDialog } from '../../store/dialog/action';
import './keep-form-dialog-header';
import './keep-button';

/**
 * The dialog that reports a failed request. Raised from the store, not from a parent:
 * `store/databases/scopes.ts` and `store/databases/fields.ts` dispatch `toggleErrorDialog`
 * with the message, and this element is mounted bare by whichever page is on screen.
 *
 * ## Why this is the first production `StoreController`
 *
 * It takes **no properties at all**, and all three call sites render it bare. That is exactly
 * the shape where reading the store from inside an element is safe: the `@lit/react` bridge
 * re-applies every prop on every parent render with no dirty check, so an element that reads
 * state its parent also passes down ends up fighting itself. With no props there is nothing to
 * fight.
 *
 * The rest of the card-view slice deliberately does *not* do this — `ScopeLists` and
 * `SchemasLists` stay React, own their `useSelector` calls, and pass results down. A
 * controller in one of their children would be the fight described above.
 *
 * ## Escape used to break it
 *
 * Escape closes a modal `<dialog>` natively and fires `cancel`. The React version listened for
 * neither, so the dialog vanished while `errorDialogOpen` stayed `true` — and because the
 * action is a *toggle*, the next failure flipped the flag back to `false` and showed nothing.
 * One press of Escape disabled error reporting for the rest of the session. Handling `cancel`
 * here dispatches the same toggle the buttons do, so the store and the DOM agree again.
 */
@customElement('keep-network-error-dialog')
export default class NetworkErrorDialog extends KeepElement {
  static styles = [
    modalBackdropStyles,
    css`
    /*
     * The React dialog carried no className, so it got the user-agent box plus the bare
     * element-selector rule in styles/dark-mode.css, which does not reach into this shadow
     * root. Rather than reproduce a UA dialog, this takes the same rules
     * keep-unsaved-changes-dialog uses - the dialog class pair in styles.css. That is a
     * deliberate, visible change: this dialog now matches the others instead of being the one
     * that did not. The missing class looks like an oversight; every other dialog has it.
     *
     * No backticks anywhere in here: a backtick would terminate the css tagged template.
     */
    dialog {
      border: 1px solid var(--wa-color-surface-border);
      border-radius: 10px;
      width: 30%;
      height: fit-content;
      background: var(--wa-color-surface-raised);
      color: var(--wa-color-text-normal);
      flex-direction: column;
      gap: 30px;
      display: none;
    }

    dialog[open] {
      display: flex;
    }

    /* was .dialog-content */
    .content {
      width: 100%;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 40px;
    }

    /* was .dialog-content-text; the custom property inherits through the shadow boundary,
       the .color-text-primary class it pairs with in the document sheet does not. */
    .content p {
      color: var(--text-color-primary);
      margin: 0;
    }

    /* was .dialog-actions */
    .actions {
      width: 100%;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      align-content: center;
      align-items: center;
    }
  `,
  ];

  private readonly dialogState = new StoreController(this, (state) => state.dialog);

  private get nativeDialog(): HTMLDialogElement | null {
    return this.shadowRoot?.querySelector('dialog') ?? null;
  }

  /**
   * `toggleErrorDialog` both flips `errorDialogOpen` and *sets* the message, so dismissing
   * means re-sending the message that is already there. Passing anything else would leave a
   * stale string behind for the next failure to flash before its own message arrives.
   */
  private dismiss(): void {
    this.dialogState.dispatch(toggleErrorDialog(this.dialogState.value.errorDialogMessage));
  }

  protected updated(): void {
    const dialog = this.nativeDialog;
    if (!dialog) return;
    // Guarded on both sides here, unlike keep-unsaved-changes-dialog: this runs on every
    // render rather than only when a property changed, so an unguarded showModal() would
    // throw InvalidStateError the moment anything else in the slice re-rendered.
    if (this.dialogState.value.errorDialogOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }

  render() {
    // aria-label rather than aria-labelledby: the heading is inside keep-form-dialog-header's
    // own shadow root and an IDREF cannot cross a shadow boundary. aria-describedby *can* be
    // used, because the message is in this root - so the failure is now announced as the
    // dialog's description instead of being read only if the user explores the contents
    // (WCAG 2.1 AA, #713).
    return html`
      <dialog aria-label="Error" aria-describedby="message" @cancel=${this.dismiss}>
        <keep-form-dialog-header heading="Error" @header-close=${this.dismiss}>
        </keep-form-dialog-header>
        <div class="content">
          <p id="message">${this.dialogState.value.errorDialogMessage}</p>
        </div>
        <div class="actions">
          <!-- The React call site passed autoFocus, which was inert: keep-button has no
               delegatesFocus and no tabindex, so it is not a focusable area and the autofocus
               attribute had nothing to act on. Dropped rather than reimplemented - showModal()
               moves focus into the dialog either way, which is what 2.4.3 asks for. -->
          <keep-button @click=${this.dismiss}>OK</keep-button>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-network-error-dialog': NetworkErrorDialog;
  }
}
