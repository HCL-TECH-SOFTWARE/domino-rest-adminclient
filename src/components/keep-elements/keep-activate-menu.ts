/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/dropdown/dropdown.js';
import '@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import { FA_LIBRARY } from '../../services/icon-library';
import { store } from '../../store/store';
import { toggleAlert } from '../../store/alerts/action';
import { deleteForm } from '../../store/databases/action';
import type { Database, Form } from '../../store/databases/types';
import './keep-button';
import './keep-form-dialog-header';

/** Emitted as `activate-form` when the user picks Activate on an inactive form. */
export interface KeepActivateFormDetail {
  formName: string;
}

/** `wa-dropdown`'s selection event, narrowed to the one field this element reads. */
type WaSelect = Event & { detail: { item: { value?: string } } };

/**
 * Per-row status indicator and action menu for the forms table.
 *
 * ## The menu is `wa-dropdown`, not a hand-rolled popup
 *
 * The component this replaces used a third-party menu that portalled its panel to
 * `document.body` and positioned it from an anchor element. `wa-dropdown` is already in the
 * tree (`keep-source`, `keep-quick-config-form`) and does the same job with three properties
 * this conversion needs and a hand-rolled popup would have had to reinvent:
 *
 *  - **Positioning through the CSSOM.** Its `wa-popup` writes `style.setProperty(...)` and
 *    takes the native top layer where the browser supports it, so the panel is neither
 *    clipped by the table cell nor blocked by the production CSP's `style-src-attr 'none'`.
 *    An interpolated `style=` attribute — or `styleMap`, whose first render is one — would
 *    silently not apply (#685).
 *  - **Keyboard and roles for free.** `role="menu"` on the panel, `role="menuitem"` and
 *    `aria-disabled` on each item, `aria-haspopup`/`aria-expanded` on the trigger, arrow
 *    keys, Home/End, type-ahead, Escape to close, and focus returned to the trigger on
 *    selection. None of that existed before (#713).
 *  - **Nothing escapes this shadow root.** The panel lives inside `wa-dropdown`'s own shadow
 *    root, so it carries its styling with it into the top layer, and the items — slotted
 *    light DOM from here — are still reachable from `static styles` below.
 *
 * Selection is read from the dropdown's own `wa-select` event rather than a click handler on
 * each item, because that event is the only path that honours `disabled`: a click listener
 * bound directly to a disabled item still fires.
 *
 * ## Store access
 *
 * The store is imported directly instead of through a `StoreController`. Nothing here is
 * *rendered* from store state — the in-flight-save check is read once, inside the click
 * handler, and the rest is dispatch. A controller would add a subscription per table row
 * that could only ever cause a re-render for a value the row does not display.
 *
 * The parent (`FormsTable`) keeps `schemaData`/`setSchemaData` and hands them down, which is
 * what it already did; `toggleActivate` becomes the `activate-form` event.
 *
 * ## Three behaviours from the original that are deliberately not carried over
 *
 *  1. **`updateFormError` and the `FORMS_ERROR` dispatch are gone.** Nothing in the tree ever
 *     sets `updateFormError` — it is initialised to `false` in the databases reducer and
 *     never written — and `FORMS_ERROR` has no reducer case, so dispatching it changed
 *     nothing. Both guards were therefore constant, and the branch behind them unreachable.
 *  2. **The activate path no longer calls a state setter with the value it already holds.**
 *     The original wrote `setActive(active)` after asking the parent to activate, which is a
 *     no-op; the dot stayed grey until a reload.
 *  3. **`active` is re-derived when a new `form` arrives** instead of being frozen at mount.
 *     The original seeded it from `formModes.length` once and never recomputed, so a form
 *     activated from this menu kept showing "Inactive". The optimistic `false` set when a
 *     deactivation is confirmed survives until fresh data replaces the `form` object.
 */
@customElement('keep-activate-menu')
export default class ActivateMenu extends KeepElement {
  static styles = [
    modalBackdropStyles,
    css`
      /* was .activate-menu-container in styles/styles.css */
      :host {
        display: flex;
        gap: 10px;
        width: 100%;
        align-items: center;
      }

      /*
       * The dot and its label are one group now, so the label can colour the dot through
       * currentColor. They were siblings before, and the dot's fill was a light-mode literal
       * while the label used the mode-aware token — so in dark mode an active row showed a
       * #0fa068 dot beside #52c999 text. The 10px gap is unchanged: it was the container's,
       * and both the group's internal gap and the gap to the menu button are still 10px.
       */
      .status {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        color: var(--inactive-indicator-color);
      }

      .status.on {
        color: var(--active-indicator-color);
      }

      /* was .small-text on the label */
      .label {
        font-size: 14px;
      }

      /* was .active-menu-button, plus the colour the icon carried as .color-text-primary */
      .menu-button {
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--text-color-primary);
        padding: 0;
        margin: 0;
        display: inline-flex;
        align-items: center;
        line-height: 1;
      }

      /*
       * was .dialog. The original paired a transparent light edge with a dark literal, which
       * the theme-selectors guard (#708) forbids in an element: it reads as theme-aware while
       * writing the palette down a fourth time. The shared surface-border token is the same
       * substitution the two dialogs converted alongside this one made, so all three confirm
       * dialogs now carry the same hairline in both modes — in light, that edge is new.
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

      /* was .dialog-content-text, plus margin: 0 because this is a p now */
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

  /** The row's form. Only `formName` and `formModes` are read. */
  @property({ attribute: false }) accessor form: Form | undefined;

  /** Form names that exist in the database; anything outside it is a custom form. */
  @property({ type: Array }) accessor formList: string[] = [];

  /** The schema the deactivate/delete thunk rewrites. */
  @property({ attribute: false }) accessor schemaData: Database | undefined;

  /** The parent's schema sink, handed straight to the thunk. */
  @property({ attribute: false }) accessor setSchemaData: ((data: Database) => void) | undefined;

  /** Whether the form has any modes configured. Re-derived whenever `form` changes. */
  @state() accessor active = false;

  /** Whether the deactivate/delete confirmation is showing. */
  @state() accessor confirming = false;

  private get formName(): string {
    return this.form?.formName ?? '';
  }

  /** A form the database knows about, as opposed to one that exists only in the schema. */
  private get known(): boolean {
    return this.formList.includes(this.formName);
  }

  private get confirmDialog(): HTMLDialogElement {
    return this.shadowRoot!.querySelector('dialog')!;
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('form')) {
      this.active = (this.form?.formModes.length ?? 0) > 0;
    }
  }

  protected updated(): void {
    const dialog = this.confirmDialog;
    // Guarded on both sides: this runs on every render, and showModal() on an open dialog
    // throws InvalidStateError.
    if (this.confirming) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }

  private handleSelect(event: Event): void {
    // Activate is the only item that acts immediately. Deactivate and Delete are the same
    // destructive path — they differ only in what the confirmation says and in the flag the
    // thunk gets — so both open the dialog.
    if ((event as WaSelect).detail.item.value === 'activate') {
      this.activate();
    } else {
      this.confirming = true;
    }
  }

  private activate(): void {
    if (store.getState().dialog.loading) {
      store.dispatch(toggleAlert('Please wait while forms are still saving!'));
      return;
    }
    if (this.active) {
      store.dispatch(toggleAlert('This form is already active!'));
      return;
    }
    this.emit<KeepActivateFormDetail>('activate-form', { formName: this.formName });
  }

  private cancel(): void {
    this.confirming = false;
  }

  private confirm(): void {
    const { schemaData } = this;
    if (schemaData) {
      // The fourth argument switches the thunk from "deactivate" — drop the form's modes but
      // keep it in the schema — to "delete", which removes a custom form outright.
      store.dispatch(deleteForm(schemaData, this.formName, this.setSchemaData, !this.known));
    }
    this.active = false;
    this.confirming = false;
  }

  render() {
    const heading = this.known ? 'Reset Form?' : 'WARNING: Deleting Custom Form';
    const warning = this.known
      ? 'Deactivating this form will delete all form modes and remove any configurations done to this form. Do you wish to proceed?'
      : "This is a custom form. DELETING this form removes it from the schema entirely, which means you won't be able to retrieve it. Do you wish to proceed?";

    // Accessibility (#713):
    //  - the trigger is a real button with type="button" and a name that says which row it
    //    belongs to; it had no accessible name beyond a bare "Form actions" repeated once
    //    per row, which is ambiguous in a table.
    //  - the status dot is decorative once the word beside it says the same thing.
    //  - aria-label on the dialog rather than aria-labelledby: the heading lives inside
    //    keep-form-dialog-header's shadow root and an IDREF cannot cross that boundary.
    //  - @cancel keeps Escape and the state in step. The original dialog closed on Escape
    //    while its flag stayed set, so the menu could not reopen it.
    return html`
      <span class="status ${this.active ? 'on' : ''}">
        <!-- A status dot, left as inline SVG on purpose (#946): a filled circle has no
             name in any icon set, so wa-icon would cost a registry entry and a
             font-size to draw one path. -->
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
          <circle cx="4" cy="5" r="4" fill="currentColor"></circle>
        </svg>
        <span class="label">${this.active ? 'Active' : 'Inactive'}</span>
      </span>

      <wa-dropdown placement="bottom-end" @wa-select=${this.handleSelect}>
        <button
          class="menu-button"
          slot="trigger"
          type="button"
          aria-label="Form actions for ${this.formName}"
        >
          <wa-icon library=${FA_LIBRARY} name="ellipsis" canvas="auto"></wa-icon>
        </button>
        <wa-dropdown-item value="activate" ?disabled=${!this.known}>Activate</wa-dropdown-item>
        <wa-dropdown-item value="deactivate" ?disabled=${!this.known}>Deactivate</wa-dropdown-item>
        <wa-dropdown-item value="delete" ?disabled=${this.known}>Delete</wa-dropdown-item>
      </wa-dropdown>

      <dialog aria-label=${heading} aria-describedby="warning" @cancel=${this.cancel}>
        <keep-form-dialog-header
          heading=${heading}
          @header-close=${this.cancel}
        ></keep-form-dialog-header>
        <div class="content">
          <p id="warning">${warning}</p>
        </div>
        <div class="actions">
          <keep-button variant="neutral" appearance="outlined" @click=${this.cancel}>
            No
          </keep-button>
          <keep-button @click=${this.confirm}>Yes</keep-button>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-activate-menu': ActivateMenu;
  }
}
