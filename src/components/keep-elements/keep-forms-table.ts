/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import { TABLE_STYLE_TEXT } from './keep-data-table.styles';
import './keep-activate-menu';
import './keep-button';
import './keep-data-table';
import './keep-tooltip';
import type { KeepActivateFormDetail } from './keep-activate-menu';
import { FA_LIBRARY } from '../../services/icon-library';
import { store } from '../../store/store';
import { addForm, handleDatabaseForms } from '../../store/databases/action';
import type { Database } from '../../store/databases/types';

/**
 * One row of the table. The shape the schema's form list actually has at this point:
 * `TabForms` normalises `formAccessModes` into `formModes` and stamps `dbName` on every
 * entry before handing the list down.
 */
export interface KeepFormsTableRow {
  formName: string;
  /** The API sends an array; older cached entries are a bare string. Rendered as-is. */
  alias: string | string[];
  /** Which schema the form belongs to. The activation lookup matches on it. */
  dbName?: string;
  /**
   * Only the length is read here.
   *
   * Optional because the source genuinely lacks it: `TabForms` normalises `formAccessModes`
   * into `formModes`, and a form that has neither reaches this element with the key absent.
   * Requiring it here would only push a cast onto the call site.
   */
  formModes?: unknown[];
}

/** `event.detail` of the `form-open` event. */
export interface KeepFormOpenDetail {
  /** The form whose access screen should be shown. Not URL-encoded. */
  formName: string;
}

/** The mode a newly activated form is given. Verbatim from the component this replaces. */
const DEFAULT_FORM_MODE = {
  modeName: 'default',
  fields: [],
  readAccessFormula: {
    formulaType: 'domino',
    formula: '@True',
  },
  writeAccessFormula: {
    formulaType: 'domino',
    formula: '@True',
  },
  deleteAccessFormula: {
    formulaType: 'domino',
    formula: '@False',
  },
  computeWithForm: false,
};

/** What the Status column's help tooltip says. */
const STATUS_HELP = `Activate the Forms that should be accessible\nvia rest API`;

/** The purple lozenge marking a form that exists only in the schema. Decorative. */
const DIAMOND = html`
  <svg width="8" height="8" viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <polygon points="4,0 8,4 4,8 0,4" fill="#962CEA"></polygon>
  </svg>
`;

/**
 * The activate dialog's warning glyph.
 *
 * Inlined rather than imported: the only other copy is a component in the shared style
 * modules, which are React and are the last thing the migration removes. The markup is
 * byte-identical to that one.
 */
const WARNING = html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="35"
    height="35"
    viewBox="0 0 35 35"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M17.5 0C7.83594 0 0 7.83594 0 17.5C0 27.1641 7.83594 35 17.5 35C27.1641 35 35 27.1641 35 17.5C35 7.83594 27.1641 0 17.5 0ZM17.5 32.0312C9.47656 32.0312 2.96875 25.5234 2.96875 17.5C2.96875 9.47656 9.47656 2.96875 17.5 2.96875C25.5234 2.96875 32.0312 9.47656 32.0312 17.5C32.0312 25.5234 25.5234 32.0312 17.5 32.0312Z"
      fill="#D6466F"
    />
    <path
      d="M15.625 24.375C15.625 24.8723 15.8225 25.3492 16.1742 25.7008C16.5258 26.0525 17.0027 26.25 17.5 26.25C17.9973 26.25 18.4742 26.0525 18.8258 25.7008C19.1775 25.3492 19.375 24.8723 19.375 24.375C19.375 23.8777 19.1775 23.4008 18.8258 23.0492C18.4742 22.6975 17.9973 22.5 17.5 22.5C17.0027 22.5 16.5258 22.6975 16.1742 23.0492C15.8225 23.4008 15.625 23.8777 15.625 24.375ZM16.5625 20H18.4375C18.6094 20 18.75 19.8594 18.75 19.6875V9.0625C18.75 8.89062 18.6094 8.75 18.4375 8.75H16.5625C16.3906 8.75 16.25 8.89062 16.25 9.0625V19.6875C16.25 19.8594 16.3906 20 16.5625 20Z"
      fill="#D6466F"
    />
  </svg>
`;

/**
 * The forms list of a schema. Tag: `keep-forms-table`.
 *
 * One row per form: an edit control, the form's name and aliases, how many modes it has,
 * and the per-row status menu (`keep-activate-menu`). Clicking the edit control on a form
 * that has no modes offers to activate it first, in the confirmation this element owns.
 *
 * ## The table is nested, so the slotted-table sheet is adopted here too
 *
 * The `<table>` is rendered here and slotted into `keep-data-table`, which puts it inside
 * *this* element's shadow tree. `keep-data-table` styles its slotted table from a
 * document-level sheet — see `keep-data-table.styles.ts` for why it cannot use
 * `::slotted()` — and a document sheet does not reach into a shadow root. Without the
 * `unsafeCSS(TABLE_STYLE_TEXT)` below the table renders bare: no cell padding, no header
 * rule, no zebra stripe. Nothing fails; the suite runs with `css: false`.
 *
 * The same applies to the `<dialog>`. Its background, text colour and backdrop all came
 * from bare `dialog` selectors in the global sheets, so all three are restated — from
 * `--wa-color-*` tokens rather than the light/dark literals those sheets used, which the
 * theme guard (#708) forbids in an element. One consequence in light mode: the border was
 * effectively transparent there and is now the shared surface hairline, matching the two
 * dialogs converted alongside this one.
 *
 * ## Store access
 *
 * The store is imported directly rather than through a `StoreController`. Nothing here is
 * rendered from store state — the component this replaces selected nothing and only ever
 * dispatched — so a controller would add a subscription that could never usefully fire.
 *
 * ## Navigation goes up, not out
 *
 * The element emits `form-open` instead of navigating. The router is handed to the React
 * tree through context with no module-level instance to reach for, and this codebase has
 * no Lit router controller yet, so the still-React parent (`TabForms`) turns the event
 * into a URL. That includes the deferred case: the "activate, then open" path emits
 * `form-open` from the save thunk's success callback, exactly where it used to navigate.
 *
 * The two navigations it replaces spelled the same URL two ways — one encoded the schema
 * path with the standard encoder, the other with the app's partial `fullEncode` helper.
 * Collapsing them onto one call site normalises that on the standard encoder, which is
 * what the other four `/schema/...` call sites in the tree use and the only one of the two
 * that round-trips through the router's decoder for every input.
 *
 * ## Accessibility (#713)
 *
 *  - the edit control was an icon-only button whose accessible name was the form name on
 *    its own, which reads as "Contact, button" with no hint of what it does. It keeps the
 *    native tooltip and gains a real name (WCAG 4.1.2).
 *  - the Status column's help tooltip hung off a plain `<div>`: no focus, no name, so the
 *    explanation was mouse-only. It is a real button now, named with the same text
 *    (WCAG 2.1.1, 4.1.2).
 *  - the confirmation's buttons were laid out reversed, so DOM order and reading order
 *    disagreed (WCAG 1.3.2). They are in visual order with the same right alignment.
 *  - `@cancel` keeps Escape and the open flag in step; the original left the flag set, so
 *    a dismissed offer could not be re-opened for the same form.
 *  - the dialog names and describes itself, and its title is a heading.
 *
 * Two rules from the styling this replaces are deliberately dropped: a `.tooltip` block
 * (no node ever carried that class, and one of its two declarations was not a CSS
 * property) and `.dialog-buttons` / `.button-ok` / `.button-cancel`, left behind by an
 * earlier pass that had already replaced those buttons with `keep-button`.
 *
 * @fires form-open - `CustomEvent<KeepFormOpenDetail>`
 */
@customElement('keep-forms-table')
export default class FormsTable extends KeepElement {
  static styles = [
    unsafeCSS(TABLE_STYLE_TEXT),
    modalBackdropStyles,
    css`
      /*
       * The document's box-sizing reset stops at the shadow boundary, so it is restated.
       * The dialog is sized as a percentage with 30px of padding and needs it.
       */
      :host {
        box-sizing: border-box;
        display: block;
      }

      *,
      *::before,
      *::after {
        box-sizing: inherit;
      }

      /* was the p-30 utility on the table element */
      table {
        padding: 30px;
      }

      /*
       * Adopting the slotted-table sheet above is necessary but not sufficient. Web Awesome
       * also styles tables from its wa-native layer through **bare element selectors**, and
       * those do not cross a shadow boundary either. The box-sizing reset above covers one
       * of the four losses; these are the other three, and each is on the screen today: the
       * hairline above every body row, cell content topped rather than centred against the
       * row's tallest control, and header cells one step down the type ramp.
       */
      tbody tr {
        border-block-start: var(--wa-border-style) var(--wa-border-width-s)
          var(--wa-color-border-quiet);
      }

      th,
      td {
        vertical-align: top;
      }

      thead th {
        font-size: var(--wa-font-size-smaller);
      }

      /*
       * Were width attributes on the cells. The header and the body disagree about the
       * name column — 350px against 550px — which is how it has always been; both are
       * kept so the resolved layout does not move.
       */
      .col-edit {
        width: 50px;
      }

      .col-name,
      .col-alias {
        width: 350px;
      }

      .col-modes {
        width: 150px;
      }

      .cell-name {
        width: 550px;
      }

      /* was .table-cell-activate-menu in the global sheet */
      .col-status,
      .cell-status {
        white-space: nowrap;
        width: 200px;
      }

      /* was the flex/flex-row utility pair on the name header */
      .name-header {
        display: flex;
        flex-direction: row;
      }

      /* was .forms-table-diamond-marker in the global sheet */
      .marker {
        transform: translateY(-7%);
      }

      /*
       * Hidden rather than absent, in both places it is used: the header's copy is a
       * spacer that keeps the column title aligned with the names below it, and a row for
       * a known form has to reserve the same width as a row for a custom one.
       */
      .marker-spacer {
        visibility: hidden;
      }

      /* was the mr-5 utility, which only the header's spacer carried */
      .marker-gap {
        margin-right: 5px;
      }

      /* was ViewNameDisplay, on all three text columns */
      .cell-flex {
        display: flex;
        align-items: flex-start;
      }

      .cell-flex .text {
        text-transform: none;
        display: flex;
        flex-direction: column;
      }

      /*
       * The label under a form that is not in the database's own list. Its colour was a
       * light-mode literal with no dark counterpart anywhere in the sheets, so it was
       * near-invisible against the dark surface; the quiet-text token is mode-aware and
       * matches the literal closely in light mode.
       */
      .custom-form {
        font-size: var(--wa-font-size-s);
        color: var(--wa-color-text-quiet);
      }

      /*
       * was StatusHeader. Its one live declaration was the cursor; the inline-flex here
       * is what its second rule was written for and never achieved — the selector was one
       * level short of the node it meant, so the trigger has never been a flex line.
       */
      .status-header {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        cursor: default;
      }

      /*
       * Both icon-only controls. Transparent and padding-free so the button box is the
       * glyph box; a bare button in a shadow root gets none of the document's button
       * styling, so the reset has to be explicit down to the font.
       */
      .edit-button,
      .status-help,
      .close {
        appearance: none;
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        font: inherit;
        line-height: 1;
        margin: 0;
        padding: 0;
      }

      .edit-button:focus-visible,
      .status-help:focus-visible,
      .close:focus-visible {
        border-radius: var(--wa-border-radius-s);
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }

      /*
       * The edit control keeps the hit area and hover tint the button it replaces had, so
       * the 50px column does not visibly tighten.
       */
      .edit-button {
        border-radius: var(--wa-border-radius-m);
        padding: 6px 8px;
      }

      .edit-button:hover {
        background: var(--wa-color-neutral-fill-quiet);
      }

      /* wa-icon takes its box from font-size, not width. */
      .edit-icon,
      .close-icon {
        font-size: 1.5em;
      }

      dialog {
        background: var(--wa-color-surface-raised);
        border: 1px solid var(--wa-color-surface-border);
        border-radius: var(--wa-border-radius-l);
        color: var(--wa-color-text-normal);
        height: fit-content;
        padding: 30px;
        width: 40%;
      }

      .header-close {
        display: flex;
        justify-content: space-between;
        padding-bottom: 25px;
      }

      .header {
        display: flex;
        gap: 16px;
        align-items: center;
      }

      /* was the w-30px/h-30px/p-0/flex/items-center utility stack around the glyph */
      .warning-icon {
        display: flex;
        align-items: center;
        width: 30px;
        height: 30px;
        padding: 0;
      }

      /* margin: 0 because this is a heading now and the UA default would shift the row */
      .title {
        font-size: var(--wa-font-size-xl);
        color: var(--wa-color-text-normal);
        font-weight: 700;
        margin: 0;
      }

      .content {
        padding-bottom: 30px;
      }

      /*
       * The colour came from a bare-element rule in the dark-mode sheet, which does not
       * reach in here. margin: 0 because this is a paragraph now.
       */
      .text-content {
        color: var(--wa-color-text-normal);
        margin: 0;
      }

      /*
       * Was a reversed row, which put the confirm button first in the DOM and last on the
       * line. Same alignment, same order on screen, but reading order now matches.
       */
      .buttons {
        display: flex;
        justify-content: flex-end;
        gap: 20px;
        padding: 0;
      }
    `,
  ];

  /** The rows, already filtered and normalised by the parent. */
  @property({ attribute: false }) accessor forms: KeepFormsTableRow[] = [];

  /** The schema these forms belong to. Part of the activation lookup. */
  @property({ type: String, attribute: 'db-name' }) accessor dbName = '';

  /** Form names the database itself knows; anything outside it is a custom form. */
  @property({ type: Array }) accessor formList: string[] = [];

  /** The schema the activation thunk rewrites. */
  @property({ attribute: false }) accessor schemaData: Database | undefined;

  /** The parent's schema sink, handed straight to the thunk. */
  @property({ attribute: false }) accessor setSchemaData: ((data: Database) => void) | undefined;

  /**
   * The form the activate offer is about, or `null` when no offer is showing.
   *
   * One flag rather than the name-plus-boolean pair the original kept: the two could
   * disagree, and the dialog's open state is derived from this in {@link updated}.
   */
  @state() accessor pendingActivation: string | null = null;

  private get dialog(): HTMLDialogElement {
    return this.shadowRoot!.querySelector('dialog')!;
  }

  protected updated(): void {
    const dialog = this.dialog;
    // Guarded on both sides: this runs on every render, and showModal() on an already-open
    // dialog throws InvalidStateError.
    if (this.pendingActivation !== null) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }

  /** A form the database knows about, as opposed to one that exists only in the schema. */
  private isKnown(formName: string): boolean {
    return this.formList.includes(formName);
  }

  private openForm(form: KeepFormsTableRow): void {
    if ((form.formModes?.length ?? 0) > 0) {
      store.dispatch(addForm(false));
      this.emit<KeepFormOpenDetail>('form-open', { formName: form.formName });
      return;
    }
    this.pendingActivation = form.formName;
  }

  private cancelActivation(): void {
    this.pendingActivation = null;
  }

  private confirmActivation(): void {
    const formName = this.pendingActivation;
    this.pendingActivation = null;
    if (formName !== null) this.activate(formName, true);
  }

  private handleActivateForm(event: Event): void {
    // The row menu names the form in its payload rather than relying on a closure, so a
    // filtered list cannot activate the wrong row.
    this.activate((event as CustomEvent<KeepActivateFormDetail>).detail.formName, false);
  }

  /**
   * Give `formName` a default mode and save the schema.
   *
   * @param thenOpen Navigate to the form once the save succeeds. That callback is the only
   *   difference between the two paths that reach here, and it is what tells "activate and
   *   open" apart from "activate in place".
   */
  private activate(formName: string, thenOpen: boolean): void {
    const { schemaData, setSchemaData } = this;
    if (!schemaData || !setSchemaData) return;

    const row = this.forms.find(
      (form) => form.formName === formName && form.dbName === this.dbName,
    );
    // The original indexed straight into the result and threw on a miss, which took the
    // whole screen down. There is nothing to activate, so there is nothing to do.
    if (!row) return;

    const updated = [
      ...schemaData.forms,
      {
        formValue: formName,
        formName,
        alias: row.alias,
        formModes: [DEFAULT_FORM_MODE],
      },
    ];
    const message = `${formName} activated successfully.`;

    store.dispatch(
      thenOpen
        ? handleDatabaseForms(schemaData, this.dbName, updated, setSchemaData, message, () =>
            this.emit<KeepFormOpenDetail>('form-open', { formName }),
          )
        : handleDatabaseForms(schemaData, this.dbName, updated, setSchemaData, message),
    );
  }

  private renderRow(form: KeepFormsTableRow) {
    const custom = !this.isKnown(form.formName);

    return html`
      <tr>
        <th class="col-edit" scope="row">
          <button
            type="button"
            class="edit-button"
            title=${form.formName}
            aria-label="Edit form ${form.formName}"
            @click=${() => this.openForm(form)}
          >
            <wa-icon class="edit-icon" library=${FA_LIBRARY} name="pencil"></wa-icon>
          </button>
        </th>
        <td class="cell-name">
          <div class="cell-flex">
            <span class="marker ${custom ? '' : 'marker-spacer'}">${DIAMOND}</span>
            <span class="text">
              <span>${form.formName}</span>
              ${custom ? html`<span class="custom-form">custom form</span>` : nothing}
            </span>
          </div>
        </td>
        <td>
          <div class="cell-flex"><span>${form.alias}</span></div>
        </td>
        <td>
          <div class="cell-flex"><span>${form.formModes?.length ?? 0}</span></div>
        </td>
        <td class="cell-status">
          <keep-activate-menu
            .form=${form}
            .schemaData=${this.schemaData}
            .setSchemaData=${this.setSchemaData}
            .formList=${this.formList}
            @activate-form=${this.handleActivateForm}
          ></keep-activate-menu>
        </td>
      </tr>
    `;
  }

  render() {
    // Keyed on the form name rather than reused positionally. A row owns a
    // keep-activate-menu, and that element holds its own confirmation state — positional
    // reuse would leave an open confirmation attached to whichever form the search box
    // slid into that slot.
    return html`
      <keep-data-table zebra>
        <table aria-label="forms table">
          <thead>
            <tr>
              <th class="col-edit" scope="col"></th>
              <th class="col-name" scope="col">
                <div class="name-header">
                  <span class="marker marker-spacer marker-gap">${DIAMOND}</span>
                  Form Name
                </div>
              </th>
              <th class="col-alias" scope="col">Form Aliases</th>
              <th class="col-modes" scope="col">Modes Available</th>
              <th class="col-status" scope="col">
                <span class="status-header">
                  Status
                  <keep-tooltip content=${STATUS_HELP} placement="bottom" without-arrow>
                    <button type="button" class="status-help" aria-label=${STATUS_HELP}>
                      <wa-icon library=${FA_LIBRARY} name="circle-question"></wa-icon>
                    </button>
                  </keep-tooltip>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            ${repeat(
              this.forms,
              (form) => form.formName,
              (form) => this.renderRow(form),
            )}
          </tbody>
        </table>
      </keep-data-table>

      <dialog
        aria-label="Activate Form?"
        aria-describedby="activate-warning"
        @cancel=${this.cancelActivation}
      >
        <div class="header-close">
          <div class="header">
            <span class="warning-icon">${WARNING}</span>
            <h2 class="title">Activate Form?</h2>
          </div>
          <button type="button" class="close" aria-label="Close" @click=${this.cancelActivation}>
            <wa-icon class="close-icon" library=${FA_LIBRARY} name="xmark"></wa-icon>
          </button>
        </div>
        <div class="content">
          <p id="activate-warning" class="text-content">
            This form is inactive. Activate this form to edit it?
          </p>
        </div>
        <div class="buttons">
          <keep-button variant="neutral" appearance="outlined" @click=${this.cancelActivation}>
            Cancel
          </keep-button>
          <keep-button @click=${this.confirmActivation}>OK</keep-button>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-forms-table': FormsTable;
  }
}
