/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import { StoreController } from '../../store/StoreController';
import { toggleDeleteDialog } from '../../store/dialog/action';
import './keep-form-dialog-header';
import './keep-button';

/** Yes was pressed. The caller knows what it asked about, so there is no payload. */
export type KeepConfirmDeleteDetail = undefined;

/**
 * Generic "are you sure?" confirmation: the caller supplies the title and the sentence, and
 * hears back once, as `confirm-delete`. It was `DeleteApplicationDialog`, a name it had
 * outgrown — the applications board and the schema-mode tab bar both use it, for an
 * application and for a form mode respectively.
 *
 * ## Not the same element as `keep-delete-dialog`, and worth keeping apart for now
 *
 * That one is the schema/scope confirmation. It writes its own copy from a `selected`
 * target, decides between two delete thunks and dispatches one itself. This one carries no
 * knowledge of what is being deleted at all. They could become one element — a slot for the
 * body and an event instead of the thunks would cover both — but that means editing
 * `keep-delete-dialog` and its six call sites, which is a separate change from this one.
 *
 * ## The open flag is read from the store
 *
 * Neither parent selects it, so there is no parent copy to mirror and nothing for the React
 * bridge to fight over: the flag is read here through a `StoreController`, exactly as
 * `keep-delete-dialog` reads its own.
 *
 * It reads `apps.deleteDialogOpen` rather than `dialog.deleteDialog` because that is what
 * the component it replaces read. The two are the same boolean twice: `dialog/reducer`
 * declares `toggleDeleteDialog`, and `applications/reducer` picks the very same action up in
 * `extraReducers` and toggles a second copy of the flag beside it. Both start false and
 * nothing else writes either, so they cannot diverge — but one of them is redundant, and
 * collapsing them is a store change, not a component one.
 *
 * ## Yes does not close the dialog
 *
 * Both delete thunks reached from here dispatch `toggleDeleteDialog` themselves, on the
 * success path and on the failure path. Closing here as well would toggle twice and reopen
 * the dialog over the result.
 */
@customElement('keep-confirm-delete-dialog')
export default class ConfirmDeleteDialog extends KeepElement {
  static styles = [
    modalBackdropStyles,
    css`
      /* was the .dialog class pair in styles/styles.css */
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

      /* was .dialog-content-text, which sat on a <text> element - an SVG tag in an HTML
         document, so the browser treated it as an unknown inline element. A paragraph now.
         --text-color-primary is a custom property and still inherits in here. */
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

  /** Dialog title, e.g. `Delete Application`. */
  @property({ type: String }) accessor heading = '';

  /** The question, e.g. `Are you sure you want to delete this Application?`. */
  @property({ type: String }) accessor message = '';

  private readonly dialogOpen = new StoreController(this, (state) => state.apps.deleteDialogOpen);

  /**
   * What was last applied to the native dialog.
   *
   * The store is not a reactive property, so `updated()` gets no changed-properties entry to
   * key off and runs on every render. Tracking the last applied value is what makes this an
   * edge trigger. `keep-delete-dialog` reads `dialog.open` back instead, which is correct in
   * a browser and inert under test — jsdom implements no modal behaviour, so that flag never
   * becomes true and the close branch there can never be reached.
   */
  private applied = false;

  private get nativeDialog(): HTMLDialogElement | null {
    return this.shadowRoot?.querySelector('dialog') ?? null;
  }

  private close(): void {
    this.dialogOpen.dispatch(toggleDeleteDialog());
  }

  private confirm(): void {
    this.emit<KeepConfirmDeleteDetail>('confirm-delete');
  }

  protected updated(): void {
    const dialog = this.nativeDialog;
    if (!dialog) return;
    const open = this.dialogOpen.value;
    if (open === this.applied) return;
    this.applied = open;
    if (open) {
      // showModal() on an already-open dialog throws InvalidStateError; close() on a closed
      // one is a no-op, so only the opening side needs the second guard.
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.close();
    }
  }

  render() {
    // Accessibility (#713):
    //  - aria-label rather than aria-labelledby: the heading lives inside
    //    keep-form-dialog-header's shadow root and an IDREF cannot cross a shadow boundary.
    //  - aria-describedby points at the question, which nothing referenced before.
    return html`
      <dialog aria-label=${this.heading} aria-describedby="message" @cancel=${this.close}>
        <keep-form-dialog-header
          heading=${this.heading}
          @header-close=${this.close}
        ></keep-form-dialog-header>
        <div id="message" class="content">
          <p>${this.message}</p>
        </div>
        <div class="actions">
          <keep-button variant="neutral" appearance="outlined" @click=${this.close}>
            No
          </keep-button>
          <!-- The old call site passed autoFocus here, which was inert: keep-button is not
               itself a focusable area, so the attribute had nothing to act on. -->
          <keep-button @click=${this.confirm}>Yes</keep-button>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-confirm-delete-dialog': ConfirmDeleteDialog;
  }
}
