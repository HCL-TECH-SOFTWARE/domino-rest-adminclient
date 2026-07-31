/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import '@awesome.me/webawesome/dist/components/input/input.js';
import './keep-form-dialog-header';
import './keep-button';

/** The mode name as it now reads in the field. */
export type KeepAddModeNameChangeDetail = string;

/** Save and close are signals, not payloads. */
export type KeepAddModeDialogDetail = undefined;

type WaInput = HTMLElement & { value: string; updateComplete: Promise<unknown> };

/**
 * "Add New Mode" / "Clone <mode>" prompt: one text field, a hint, an inline error, and the
 * usual Cancel/Save pair.
 *
 * ## The typed text is owned here, and mirrored out
 *
 * The field it replaces was uncontrolled — the parent never fed a value back in, it only
 * listened for changes. That is kept: `modeText` is internal state, and every keystroke
 * leaves as `mode-name-change`. Nothing named `value` is accepted as a property, on purpose;
 * the bridge to the React parent re-applies every property on every parent render with no
 * dirty check, so a value flowing both ways would overwrite what the user is typing.
 *
 * `open`, `clone`, `modeName` and `formError` do come in as properties: the parent owns all
 * four, none of them is in the store, and none is edited here.
 *
 * ## Reopening clears the field
 *
 * The old markup lived inside a `<dialog>` that was never unmounted, so the text survived a
 * close and was still on screen the next time the dialog opened — while the parent had reset
 * its own copy to empty. Typing "foo", cancelling, reopening and pressing Save produced
 * "Mode Name is Required." underneath a field reading "foo". Clearing on open fixes both
 * halves: the field empties, and `mode-name-change` tells the parent so its copy agrees.
 * This also gives Clone Mode a blank field, which it never had.
 */
@customElement('keep-add-mode-dialog')
export default class AddModeDialog extends KeepElement {
  static styles = [
    modalBackdropStyles,
    css`
      /* was .add-mode-dialog-container in styles/styles.css. Its border was a
         light-dark() literal pairing a transparent light edge with a dark hex; the
         elements use the surface border token instead, which is what the other
         converted dialogs settled on, so this now shows a hairline in light mode. */
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

      /* was .dialog-content with .gap-20 beside it. Both set gap; the utility is declared
         later in the sheet at equal specificity, so 20px is the value that ever applied. */
      .content {
        width: 100%;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      /* was the .flex.flex-col.gap-5 trio. The .add-mode-content-container that wrapped it
         is gone: it existed to space a paragraph away from the field, and that paragraph is
         now the field's own hint. */
      .field {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      wa-input {
        width: 100%;
      }

      /* was .small-text .color-text-danger. --text-color-danger is a custom property, so it
         still resolves in here; margin: 0 replaces the paragraph's user-agent margin, which
         put an em of air above the message inside a 5px flex gap. */
      .error {
        font-size: 14px;
        color: var(--text-color-danger);
        margin: 0;
      }

      /* was .dialog-actions. The .dialog-actions-button class that sat on both buttons is
         dropped rather than reproduced: no stylesheet in the tree declares it. */
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

  /** Drives `showModal()` / `close()` on the inner native dialog. */
  @property({ type: Boolean }) accessor open = false;

  /** Cloning an existing mode rather than adding a blank one — changes the heading only. */
  @property({ type: Boolean }) accessor clone = false;

  /** The mode being cloned. Read only when {@link clone} is set. */
  @property({ type: String }) accessor modeName = '';

  /** Validation message from the parent's save attempt. */
  @property({ type: String }) accessor formError = '';

  /** What is in the field right now. Internal — see the note on the class. */
  @state() accessor modeText = '';

  @query('wa-input') private accessor input!: WaInput | null;

  private get nativeDialog(): HTMLDialogElement | null {
    return this.shadowRoot?.querySelector('dialog') ?? null;
  }

  private get heading(): string {
    return this.clone ? `Clone ${this.modeName}` : 'Add New Mode';
  }

  /**
   * Clearing in `willUpdate` rather than `updated`: this is the sanctioned place to change
   * reactive state mid-update, so it folds into the render already scheduled instead of
   * asking for a second one.
   */
  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('open') && this.open) {
      this.modeText = '';
    }
  }

  protected updated(changed: PropertyValues<this>): void {
    if (!changed.has('open')) return;
    const dialog = this.nativeDialog;
    if (!dialog) return;
    if (this.open) {
      // Guarded because showModal() on an already-open dialog throws InvalidStateError;
      // close() on a closed one is a no-op and needs no guard.
      if (!dialog.open) dialog.showModal();
      this.emit<KeepAddModeNameChangeDetail>('mode-name-change', '');
      void this.focusField();
    } else {
      dialog.close();
    }
  }

  /**
   * Put the caret in the field as the dialog opens.
   *
   * Explicit rather than an autofocus attribute: the field is two shadow roots below the
   * dialog, further than the dialog's own focusing steps reach.
   *
   * The wait is not optional. On the render that opens the dialog the field element exists
   * but has not had its first update, so `focus()` reaches through to an inner control that
   * is not there yet and throws.
   */
  private async focusField(): Promise<void> {
    const input = this.input;
    if (!input) return;
    await input.updateComplete;
    input.focus();
  }

  private handleInput(event: Event): void {
    // The inner control's native input event is composed, so without this it would leave
    // this element too and a consumer would see the change twice under two names.
    event.stopPropagation();
    this.modeText = (event.target as WaInput).value;
    this.emit<KeepAddModeNameChangeDetail>('mode-name-change', this.modeText);
  }

  private handleClose(): void {
    this.emit<KeepAddModeDialogDetail>('dialog-close');
  }

  private handleSave(): void {
    this.emit<KeepAddModeDialogDetail>('dialog-save');
  }

  render() {
    // Accessibility (#713):
    //  - aria-label, not aria-labelledby: the heading is inside keep-form-dialog-header's
    //    own shadow root and an IDREF cannot cross a shadow boundary.
    //  - the field has a real label. It had a placeholder and nothing else, so its only
    //    accessible name vanished the moment anything was typed (WCAG 3.3.2).
    //  - "Example: dql, draft, archive" is the field's hint, so it is announced with the
    //    field rather than read as a loose paragraph above it.
    //  - role="alert" on the validation message: it appears after a save attempt, and
    //    nothing else tells a screen-reader user the save did not happen (WCAG 3.3.1).
    return html`
      <dialog aria-label=${this.heading} @cancel=${this.handleClose}>
        <div class="content">
          <keep-form-dialog-header
            heading=${this.heading}
            @header-close=${this.handleClose}
          ></keep-form-dialog-header>
          <div class="field">
            <wa-input
              label="Mode Name"
              hint="Example: dql, draft, archive"
              .value=${this.modeText}
              @input=${this.handleInput}
            ></wa-input>
            ${this.formError
              ? html`<p class="error" role="alert">${this.formError}</p>`
              : ''}
          </div>
        </div>
        <div class="actions">
          <keep-button variant="neutral" appearance="outlined" @click=${this.handleClose}>
            Cancel
          </keep-button>
          <keep-button @click=${this.handleSave}>Save</keep-button>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-add-mode-dialog': AddModeDialog;
  }
}
