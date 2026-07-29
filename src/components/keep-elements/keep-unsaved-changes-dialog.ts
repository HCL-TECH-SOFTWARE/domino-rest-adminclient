/* ========================================================================== *
 * Copyright (C) 2024, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import './keep-form-dialog-header';
import './keep-button';

/** All three actions carry no payload; the event name is the whole signal. */
export type KeepUnsavedChangesDialogDetail = undefined;

/**
 * Shown when the user tries to leave a page with unsaved changes. Three exits: save and go,
 * discard and go, or stay.
 *
 * The events are `dialog-save` / `dialog-discard` / `dialog-cancel`, not `save`/`discard`/
 * `cancel`. `cancel` and `close` are both native `<dialog>` event names, and `KeepElement.emit`
 * bubbles and composes, so the unprefixed names would be ambiguous to any ancestor listener.
 * The wrapper maps them back to `onSave` / `onDiscard` / `onCancel`, so call sites are
 * unchanged.
 */
@customElement('keep-unsaved-changes-dialog')
export default class UnsavedChangesDialog extends KeepElement {
  static styles = css`
    /* was .dialog + .dialog[open] in styles.css; all four classes have other consumers, so
       the rules stay there too and these are copies rather than moves. */
    dialog {
      /* The legacy sheet pairs a transparent light border with a dark literal. Elements use a
         token instead: theme-selectors.test.ts forbids hardcoded light/dark colour pairs here,
         because they look theme-aware while adding another place the palette is written down.
         This is the border token the other seven elements use, so this dialog now shows a
         hairline in light mode where the sheet had none - a deliberate, visible convergence. */
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

    /* was .dialog-content-text; --text-color-primary inherits through the shadow boundary */
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
  `;

  /** Drives `showModal()` / `close()` on the inner native dialog. */
  @property({ type: Boolean }) accessor open = false;

  private get dialog(): HTMLDialogElement | null {
    return this.shadowRoot?.querySelector('dialog') ?? null;
  }

  protected updated(changed: PropertyValues<this>): void {
    if (!changed.has('open')) return;
    const dialog = this.dialog;
    if (!dialog) return;
    // The guard is only on the opening side: showModal() on an already-open dialog throws
    // InvalidStateError, whereas close() on a closed one is a no-op.
    if (this.open) {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.close();
    }
  }

  /**
   * Escape closes a modal `<dialog>` natively and fires `cancel`. Without forwarding it the
   * parent's `open` stayed true while the dialog was shut, so navigation remained blocked with
   * no dialog on screen and no way to get it back. The React version had this bug.
   */
  private handleNativeCancel(): void {
    this.emit<KeepUnsavedChangesDialogDetail>('dialog-cancel');
  }

  render() {
    // aria-label rather than aria-labelledby: the heading lives inside
    // keep-form-dialog-header's own shadow root, and an IDREF cannot cross a shadow
    // boundary, so a labelledby pointing at it would resolve to nothing (#713).
    return html`
      <dialog aria-label="Unsaved Changes" @cancel=${this.handleNativeCancel}>
        <keep-form-dialog-header
          heading="Unsaved Changes"
          @header-close=${this.handleNativeCancel}
        ></keep-form-dialog-header>
        <div class="content">
          <p>Changes have been made. Would you like to save these changes?</p>
          <p>Answering No will lose these changes.</p>
        </div>
        <div class="actions">
          <keep-button
            variant="neutral"
            appearance="outlined"
            @click=${() => this.emit('dialog-cancel')}
            >Cancel</keep-button
          >
          <keep-button variant="danger" @click=${() => this.emit('dialog-discard')}
            >No</keep-button
          >
          <keep-button @click=${() => this.emit('dialog-save')}>Yes</keep-button>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-unsaved-changes-dialog': UnsavedChangesDialog;
  }
}
