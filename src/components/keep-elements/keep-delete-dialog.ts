/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import { StoreController } from '../../store/StoreController';
import { toggleDeleteDialog } from '../../store/dialog/action';
import { deleteSchema, deleteScope } from '../../store/databases/action';
import '@awesome.me/webawesome/dist/components/spinner/spinner.js';
import './keep-form-dialog-header';
import './keep-button';

/**
 * What is about to be deleted. `isDeleteSchema` picks which of the two identifiers is the
 * subject, and which thunk runs — schemas are addressed by nsf path plus name, scopes by
 * their API name.
 */
export interface KeepDeleteTarget {
  isDeleteSchema?: boolean;
  nsfPath?: string;
  schemaName?: string;
  apiName?: string;
}

/**
 * Confirmation for deleting a schema or a scope.
 *
 * ## The open flag is read from the store, not passed in
 *
 * All six React call sites passed `open={deleteDialog}`, and at every one of them that value
 * came from the same place: `state.dialog.deleteDialog`. A prop that mirrors store state is
 * the `@lit/react` hazard in its purest form — the bridge re-applies every prop on every
 * parent render with no dirty check, so the element would be told its own state by a parent
 * that read it from the store the element can read itself. Reading it here deletes the
 * mirror, and the call sites pass one property instead of two.
 *
 * `loading` comes from the same slice and was never a prop.
 *
 * `selected` stays a property: it is the view's selection, not the store's. It arrives as a
 * fresh object literal on each parent render, so this element re-renders whenever its parent
 * does — the same cost the React version paid, and not worth a memo on a dialog.
 */
@customElement('keep-delete-dialog')
export default class DeleteDialog extends KeepElement {
  static styles = [
    modalBackdropStyles,
    css`
    /* was the dialog class pair in styles/styles.css */
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

    /* was dialog-content */
    .content {
      width: 100%;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 40px;
    }

    /*
     * was the delete-schema-dialog-text rule, deleted from styles.css in this commit. This
     * was its only consumer and a class selector on a document sheet cannot reach into a
     * shadow root, so leaving it there would have been a rule that no longer applied to
     * anything. The shadow root scopes these names, which is why the long prefixes go.
     */
    .description {
      text-overflow: ellipsis;
      overflow: hidden;
      word-break: break-word;
    }

    /* was dialog-content-text */
    .description p {
      color: var(--text-color-primary);
      margin: 0;
    }

    /*
     * was delete-dialog-progress-icon, also deleted from styles.css. Its min-width: 400 and
     * height: 150 are dropped rather than carried over: both are unitless non-zero lengths,
     * which are invalid CSS, so the parser has always discarded them. Only the centring ever
     * applied.
     */
    .progress {
      display: flex;
      justify-content: center;
      align-items: center;
    }

    /*
     * was dialog-actions. The pt-30 utility beside it is not reproduced: it was there because
     * the React markup nested the content and the actions inside a plain div with no gap, and
     * as direct children of the dialog they now get its own 30px gap. Keeping both put 60px
     * between the warning and the buttons, which is visible.
     */
    .actions {
      width: 100%;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      align-content: center;
      align-items: center;
    }

    /* Announced, never shown: carries the delete-in-progress status message for 4.1.3. */
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
  `,
  ];

  @property({ attribute: false }) accessor selected: KeepDeleteTarget = {};

  private readonly dialogState = new StoreController(this, (state) => state.dialog);

  private get nativeDialog(): HTMLDialogElement | null {
    return this.shadowRoot?.querySelector('dialog') ?? null;
  }

  /** Schemas are named by `schemaName`, scopes by `apiName`. */
  private get subject(): string {
    const { isDeleteSchema, schemaName, apiName } = this.selected;
    return (isDeleteSchema ? schemaName : apiName) ?? '';
  }

  private get kind(): string {
    return this.selected.isDeleteSchema ? 'schema' : 'scope';
  }

  private close(): void {
    this.dialogState.dispatch(toggleDeleteDialog());
  }

  private confirm(): void {
    const { isDeleteSchema, nsfPath, schemaName, apiName } = this.selected;
    if (isDeleteSchema) {
      this.dialogState.dispatch(deleteSchema({ nsfPath, schemaName }));
    } else {
      this.dialogState.dispatch(deleteScope(apiName ?? ''));
    }
  }

  protected updated(): void {
    const dialog = this.nativeDialog;
    if (!dialog) return;
    // Guarded on both sides: this runs on every render, and showModal() on an open dialog
    // throws InvalidStateError.
    if (this.dialogState.value.deleteDialog) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }

  render() {
    const { loading } = this.dialogState.value;
    const subject = this.subject;

    // aria-label rather than aria-labelledby: the heading is inside keep-form-dialog-header's
    // own shadow root, and an IDREF cannot cross a shadow boundary. The React version left an
    // id="alert-dialog-description" that nothing referenced, so the warning was never wired to
    // the dialog at all - aria-describedby does that now (WCAG 2.1 AA, #713).
    return html`
      <dialog
        aria-label=${loading ? `Deleting ${subject}` : `Delete ${subject}?`}
        aria-describedby="description"
        aria-busy=${loading ? 'true' : 'false'}
        @cancel=${this.close}
      >
        <keep-form-dialog-header
          heading=${loading ? `Deleting ${subject}` : `Delete ${subject}?`}
          @header-close=${this.close}
        ></keep-form-dialog-header>
        ${loading
          ? html`
              <div class="content progress" role="status">
                <wa-spinner aria-hidden="true"></wa-spinner>
                <span class="visually-hidden">Deleting ${this.kind} ${subject}</span>
              </div>
            `
          : html`
              <div id="description" class="content description">
                <p>
                  You'll lose all settings of the ${this.kind}: ${subject}. You cannot recover
                  them once you delete.
                </p>
                <p>Are you sure you want to permanently delete this ${this.kind}?</p>
              </div>
              <div class="actions">
                <keep-button variant="neutral" appearance="outlined" @click=${this.close}>
                  No
                </keep-button>
                <!-- The React call site passed autoFocus, which was inert: keep-button is not
                     a focusable area, so the attribute had nothing to act on. -->
                <keep-button @click=${this.confirm}>Yes</keep-button>
              </div>
            `}
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-delete-dialog': DeleteDialog;
  }
}
