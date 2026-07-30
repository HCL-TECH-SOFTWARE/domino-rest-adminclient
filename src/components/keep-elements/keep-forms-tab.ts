/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import './keep-button';
import './keep-form-dialog-header';
import './keep-forms-table';
import './keep-search-input';
import './keep-switch';
import type { KeepFormOpenDetail, KeepFormsTableRow } from './keep-forms-table';
import type { KeepSearchChangeDetail } from './keep-search-input';
import { StoreController } from '../../store/StoreController';
import { addForm, handleDatabaseForms, pullForms } from '../../store/databases/action';
import { toggleAlert } from '../../store/alerts/action';
import { validateFormSchemaName } from '../../store/databases/scripts';
import type { Database } from '../../store/databases/types';
import { fullEncode } from '../../utils/common';

/** `event.detail` of the `form-navigate` event. */
export interface KeepFormsTabNavigateDetail {
  /** A ready-to-use in-app path. Already encoded — hand it straight to the router. */
  path: string;
}

/** `event.detail` of `schema-change` — the schema a save came back with. */
export interface KeepFormsTabSchemaChangeDetail {
  schemaData: Database;
}

/**
 * The schema-list sink the parent owns.
 *
 * Spelt structurally rather than imported, because the type it mirrors comes from the view
 * library this element may not name. It is the setter half of a `[value, setValue]` state
 * pair over a list of form names.
 */
export type KeepFormsTabDataSink = (value: string[] | ((previous: string[]) => string[])) => void;

/** Handed to the pull thunk when the parent supplies no sink. See {@link FormsTab.setData}. */
const NO_SINK: KeepFormsTabDataSink = () => {};

/**
 * The mode a brand-new form schema is created with. Verbatim from the component this
 * replaces, which spelt it out twice — once for `formModes` and once for `formAccessModes`.
 *
 * A factory rather than one shared constant, so the two copies stay two objects: they end up
 * on the same record, and a single instance would make an edit to either show up in both.
 */
const newFormMode = () => ({
  computeWithForm: false,
  deleteAccessFormula: {
    formula: '@False',
    formulaType: 'domino',
  },
  fields: [],
  modeName: 'default',
  onLoad: {
    formula: '',
    formulaType: 'domino',
  },
  onSave: {
    formula: '',
    formulaType: 'domino',
  },
  readAccessFields: [],
  readAccessFormula: {
    formula: '@True',
    formulaType: 'domino',
  },
  required: [],
  validationRules: [],
  writeAccessFields: [],
  writeAccessFormula: {
    formula: '@False',
    formulaType: 'True',
  },
});

/** Every text field mirrors its inner control's value onto the host. */
type WaInput = HTMLElement & { value: string };

/**
 * The "Database Forms" tab of the schema screen. Tag: `keep-forms-tab`.
 *
 * Holds the search box, the two bulk-activation controls, the Show Active filter, the forms
 * table itself, and the two confirmations that sit beside them: "Add New Form Schema" and
 * "Deactivate ALL forms?".
 *
 * ## Store access
 *
 * Two controllers, one per subscription the component this replaces had: the databases slice
 * (the form list and the flag that gates the search box while it is loading) and the dialog
 * slice (the API-busy flag that greys the bulk buttons). Neither is owned by the parent —
 * `FormsContainer` selects neither — so a controller is the right shape here rather than a
 * property, and there is no re-application race with the bridge to the React host.
 *
 * Both selectors return a slice, so the controller's `Object.is` check behaves.
 *
 * ## Navigation goes up, not out
 *
 * The router is handed to the React tree through context with no module-level instance, and
 * this codebase has no Lit router controller yet, so this element emits `form-navigate` with
 * a finished path and the still-React host calls `navigate()` with it. Building the path here
 * rather than in the host keeps the two spellings — which differ, see below — pinned by this
 * element's own tests.
 *
 * The nested table's own `form-open` is **stopped** rather than allowed to continue: it
 * bubbles and composes, so without that a host listening on this element would see the
 * table's event as well as this one, under two names with two different payloads.
 *
 * ## Two encoders, deliberately unchanged
 *
 * Opening an existing form encodes its name with the app's partial `fullEncode`; creating one
 * encodes it with the standard encoder. They disagree for names containing `! ' ( ) *`. Both
 * spellings are carried over exactly as they were — collapsing them is a routing change, not
 * a conversion, and belongs in its own issue.
 *
 * ## What changed on the way in
 *
 *  - **The derived lists are derived.** `normalizeForms` and `filtered` were state kept in
 *    step by an effect and a search handler. They are getters now. One consequence is a fix:
 *    `filtered` was computed once, at the moment of the search, so activating a form while a
 *    search was showing left the result list stale.
 *  - **Search filters the normalised list**, which it did not before. Two defects fall out of
 *    that: a searched row read "0" under Modes Available whenever the schema carried
 *    `formAccessModes` instead of `formModes`, and Show Active was ignored entirely while a
 *    search was in the box.
 *  - **Reopening the create dialog clears the field.** The name was only reset by Cancel, so
 *    dismissing with Escape or the close button and reopening showed the previous attempt.
 *  - **Escape keeps the open flags in step**, through `@cancel`. The warning dialog had no
 *    close handler at all, so dismissing it with Escape left `resetAllForms` set and the
 *    confirmation could not be raised again.
 *  - **The bulk actions do nothing without a schema to rewrite**, rather than posting
 *    `undefined` to the API.
 *
 * ## Accessibility (#713)
 *
 *  - the form-name field had a placeholder and no label, and its validation message was a
 *    loose helper line; it is a labelled field whose message is its own hint, marked with
 *    `aria-invalid` so the failure is announced rather than merely coloured.
 *  - both dialogs name themselves, and the warning describes itself from the paragraph that
 *    already carried the id nothing referenced.
 *  - the warning's body was a `text` element, which is not HTML: it is a paragraph now.
 *  - the two bulk controls are real buttons with a visible focus ring; the framework buttons
 *    they replace had one, and a bare button in a shadow root has none.
 *
 * ## The schema sink is an event, not a property
 *
 * The two save thunks and the nested table all want a callback to hand the saved schema
 * back through. That callback is `emitSchemaChange`, so the host sees `schema-change` and
 * writes its own state — the same contract `keep-views-tab` and `keep-edit-view` use beside
 * this one, rather than a fourth function-valued property crossing the bridge.
 *
 * @fires form-navigate - `CustomEvent<KeepFormsTabNavigateDetail>`
 * @fires schema-change - `CustomEvent<KeepFormsTabSchemaChangeDetail>`
 */
@customElement('keep-forms-tab')
export default class FormsTab extends KeepElement {
  static styles = [
    modalBackdropStyles,
    css`
      :host {
        box-sizing: border-box;
        display: block;
      }

      /*
       * The document's border-box reset is a universal selector and does not cross a shadow
       * boundary. Both dialogs are sized as a percentage with padding inside, so they need
       * it. Stated outright rather than inherited: a declaration beats an inherited value
       * whatever the parent chain says.
       */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      /* was TopNavigator, styles/layout.tsx */
      .top-nav {
        display: flex;
        padding: 25px 0;
        gap: 10px;
      }

      /*
       * was ButtonsPanel, the Linaria block in the component this replaces. Its .add-form
       * rule is dropped rather than carried over: no node has ever carried that class.
       */
      .buttons-panel {
        margin: auto;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        align-content: center;
      }

      /*
       * The two bulk controls were framework buttons, so everything a bare button loses
       * inside a shadow root — the font, the border, the background — has to be explicit.
       * The declarations their classes asked for are honoured as written; the framework's
       * own emitted styles supplied the 16px size and a capitalising transform, so those
       * two are restated here to keep the row looking the same.
       */
      .button {
        appearance: none;
        background-color: transparent;
        border: none;
        border-radius: var(--wa-border-radius-m);
        cursor: pointer;
        display: inline-block;
        font-family: inherit;
        font-size: 16px;
        font-weight: 500;
        line-height: 1.75;
        padding: 10px;
        text-transform: none;
        vertical-align: middle;
      }

      .button:focus-visible {
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }

      /*
       * The hover wash the framework button drew, in the form the other converted controls
       * use. Suppressed while disabled, where a wash would read as an affordance.
       */
      .button:hover:not(:disabled) {
        background-color: var(--wa-color-neutral-fill-quiet);
      }

      /*
       * The literals these carried were the dark green and crimson the React tab used, and
       * they were never measured against the dark page: 2.96:1 and 2.53:1 on the default
       * surface, where 16px/500 text needs 4.5:1. Measured in a browser rather than inferred,
       * because the suite runs with css disabled and cannot see any of it.
       *
       * They now read the measured pair #765 added for exactly this, which is what the two
       * sibling tabs already did. This tab was the odd one out.
       */
      .activate {
        color: var(--keep-color-success-text);
        padding: 0 10px 0 0;
      }

      .deactivate {
        color: var(--keep-color-danger-text);
        padding: 0 0 0 10px;
      }

      /*
       * was the .disabled class, applied on exactly the condition that also set the disabled
       * attribute, so the pseudo-class says the same thing without the second expression.
       */
      .button:disabled {
        color: var(--wa-color-text-quiet);
        cursor: default;
      }

      /*
       * .short-vertical in styles.css, with the two adjustments the panel scoped onto it: it
       * is a div where an icon used to be, so it rejoins the buttons' inline flow, and the
       * shared 31px height is taller than these two buttons so the glyph's height is kept.
       */
      .short-vertical {
        background-color: var(--wa-color-text-loud);
        display: inline-block;
        height: 1.4em;
        vertical-align: middle;
        width: 1px;
      }

      /*
       * Both dialogs. Everything here arrived through a bare element selector — the padding,
       * the raised background, the centring, the shadow and the backdrop all come from Web
       * Awesome's native layer or the global dark sheet, and none of it crosses a shadow
       * boundary. The border follows the convergence the other converted dialogs recorded:
       * the legacy sheets pair a transparent light border with a dark literal, and an element
       * may not carry a light/dark pair (#708), so it reads the border token in both modes.
       */
      dialog {
        display: none;
        flex-direction: column;
        align-items: start;
        inset: 0;
        margin: auto;
        width: 30%;
        height: fit-content;
        max-width: calc(100% - var(--wa-space-l));
        color: var(--wa-color-text-normal);
        background: var(--wa-color-surface-raised);
        border: 1px solid var(--wa-color-surface-border);
        box-shadow: var(--wa-shadow-l);
      }

      dialog[open] {
        display: flex;
      }

      dialog:focus {
        outline: none;
      }

      /* was CreateFormDialogContainer. Its three nested rules named classes no node
         carries, so they are not reproduced. */
      .create-dialog {
        border-radius: var(--wa-border-radius-l);
        padding: 30px;
      }

      /* was .dialog in styles.css, whose gap is what spaces the three regions apart. */
      .warning-dialog {
        border-radius: 10px;
        gap: 30px;
        padding: var(--wa-space-l);
      }

      /*
       * was the full-width wrapper around the name field. Its fixed 10vh height is dropped:
       * it existed to reserve room for a validation line that is now the field's own hint,
       * which the field lays out for itself.
       */
      .field {
        width: 100%;
      }

      wa-input {
        width: 100%;
      }

      /*
       * The same two declarations keep-overrides.css already applies to every text field in
       * the document (#743). Restated because this one is in a shadow root, which a document
       * sheet does not reach — not because this element wants its own rule.
       */
      wa-input[aria-invalid='true']::part(base) {
        border-color: var(--wa-color-danger-fill-loud);
        box-shadow: 0 0 0 var(--wa-focus-ring-width) var(--wa-color-danger-fill-quiet);
      }

      wa-input[aria-invalid='true']::part(hint) {
        color: var(--keep-color-danger-text);
      }

      /*
       * The create dialog's button row. The panel class it carried was overridden on the
       * element by six utilities, so what it resolves to is spelt out once.
       */
      .create-buttons {
        display: flex;
        justify-content: flex-start;
        align-items: center;
        gap: 10px;
        margin: 0;
        padding: 0;
      }

      /* was .dialog-content */
      .dialog-content {
        width: 100%;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 40px;
      }

      /*
       * was .dialog-content-text on a non-HTML element name, which is the only reason the
       * global sheet's 12px rule reached it. As a paragraph it takes the dialog's own type
       * size; margin zero replaces the user-agent margin the previous markup never had.
       */
      .dialog-content-text {
        color: var(--text-color-primary);
        margin: 0;
      }

      /* was .color-text-danger */
      .danger {
        color: var(--text-color-danger);
      }

      /* was .dialog-actions */
      .dialog-actions {
        width: 100%;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        align-content: center;
        align-items: center;
      }
    `,
  ];

  /** The schema these forms belong to. Half of the row lookup the table performs. */
  @property({ type: String, attribute: 'db-name' }) accessor dbName = '';

  /** The schema's NSF path, undecoded. Only ever used to build the paths emitted upward. */
  @property({ type: String, attribute: 'nsf-path' }) accessor nsfPath = '';

  /** Form names the database itself knows; anything outside it is a custom form. */
  @property({ type: Array }) accessor formList: string[] = [];

  /** The schema the activation thunks rewrite. */
  @property({ attribute: false }) accessor schemaData: Database | undefined;

  /**
   * The parent's design-list sink.
   *
   * Forwarded to the pull thunk and nowhere else — and that thunk ignores it, as its
   * underscore-prefixed parameter name records. Kept so the call stays a faithful 1:1 of the
   * component this replaces; see the report on #806 wave 5.
   */
  @property({ attribute: false }) accessor setData: KeepFormsTabDataSink | undefined;

  /** What is in the search box. Owned here — see the note on `keep-search-input`. */
  @state() accessor searchKey = '';

  /** The Show Active filter. */
  @state() accessor showActive = false;

  /** Whether the "Add New Form Schema" prompt is up. */
  @state() accessor createFormOpen = false;

  /** Whether the "Deactivate ALL forms?" confirmation is up. */
  @state() accessor resetAllForms = false;

  /** The name being typed into the create prompt. */
  @state() accessor formName = '';

  /** Validation message for {@link formName}; empty when it passes. */
  @state() accessor formNameErrorMessage = '';

  @query('dialog.create-dialog') private accessor createDialog!: HTMLDialogElement | null;

  @query('dialog.warning-dialog') private accessor warningDialog!: HTMLDialogElement | null;

  private databases = new StoreController(this, (state) => state.databases);

  private dialog = new StoreController(this, (state) => state.dialog);

  /**
   * The schema sink the save thunks call back on, and the one handed to the nested table.
   *
   * A stable field rather than an arrow built in `render()`: the table takes it as a
   * reactive property, so a fresh identity every render would ask it to update every render.
   */
  private readonly emitSchemaChange = (schemaData: Database): void => {
    this.emit<KeepFormsTabSchemaChangeDetail>('schema-change', { schemaData });
  };

  /** The schema's form list, straight off the store. */
  private get forms() {
    return this.databases.value.forms;
  }

  /**
   * The list the tab works from: every form, with the older `formAccessModes` spelling
   * normalised onto `formModes`, or only the forms that have modes when Show Active is on.
   *
   * The Show Active branch reads `formModes` on the raw record, *before* that fallback — so
   * a schema written with the older spelling is hidden by the filter. Carried over exactly
   * as it was; changing it is a product decision, not a conversion.
   */
  private get normalizedForms(): KeepFormsTableRow[] {
    const forms = this.forms;
    if (!(forms && forms.length > 0)) return [];
    if (this.showActive) {
      return forms.filter((form) => form.formModes && form.formModes.length > 0);
    }
    return forms.map((form) =>
      'formModes' in form ? form : { ...form, formModes: form.formAccessModes },
    );
  }

  /** What the table renders: the normalised list, narrowed by the search box and the schema. */
  private get tableForms(): KeepFormsTableRow[] {
    const key = this.searchKey.toLowerCase();
    return this.normalizedForms.filter(
      (form) =>
        form.dbName === this.dbName &&
        (key === '' || form.formName.toLowerCase().includes(key)),
    );
  }

  /** Nothing to act on, or the API is already busy. */
  private get bulkDisabled(): boolean {
    return this.normalizedForms.length === 0 || this.dialog.value.loading;
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    // Clearing here rather than in `updated` is the sanctioned place to change reactive
    // state mid-update, so it folds into the render already scheduled.
    if (changed.has('createFormOpen') && this.createFormOpen) {
      this.formName = '';
      this.formNameErrorMessage = '';
    }
  }

  protected updated(changed: PropertyValues<this>): void {
    if (changed.has('createFormOpen')) this.syncDialog(this.createDialog, this.createFormOpen);
    if (changed.has('resetAllForms')) this.syncDialog(this.warningDialog, this.resetAllForms);
  }

  /** Guarded on both sides: `showModal()` on an already-open dialog throws InvalidStateError. */
  private syncDialog(dialog: HTMLDialogElement | null, shouldBeOpen: boolean): void {
    if (!dialog) return;
    if (shouldBeOpen) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }

  private navigateTo(formName: string, encode: (name: string) => string): void {
    this.emit<KeepFormsTabNavigateDetail>('form-navigate', {
      path: `/schema/${encodeURIComponent(this.nsfPath)}/${this.dbName}/${encode(formName)}/access`,
    });
  }

  private handleSearch(event: Event): void {
    this.searchKey = (event as CustomEvent<KeepSearchChangeDetail>).detail.value;
  }

  private handleToggleShowActive = (): void => {
    this.showActive = !this.showActive;
  };

  /**
   * The table names a form; the path is built here.
   *
   * The child's event is stopped because it bubbles and composes, so it would otherwise
   * reach this element's own host alongside `form-navigate`.
   */
  private handleFormOpen(event: Event): void {
    event.stopPropagation();
    this.navigateTo((event as CustomEvent<KeepFormOpenDetail>).detail.formName, fullEncode);
  }

  private handleActivateAll(): void {
    const schemaData = this.schemaData;
    if (!schemaData) return;
    this.databases.dispatch(
      handleDatabaseForms(
        schemaData,
        this.dbName,
        this.forms,
        this.emitSchemaChange,
        'Successfully activated all forms.',
      ),
    );
    this.databases.dispatch(pullForms(this.nsfPath, this.dbName, this.setData ?? NO_SINK));
  }

  private handleDeactivateAll(): void {
    const schemaData = this.schemaData;
    this.resetAllForms = false;
    if (!schemaData) return;
    // The schema is rewritten to hold only the forms the database does not know about, so
    // every designer form loses its modes and the custom ones are left as they are.
    const customForms = this.forms.filter((form) => !this.formList.includes(form.formName));
    this.databases.dispatch(
      handleDatabaseForms(
        schemaData,
        this.dbName,
        customForms,
        this.emitSchemaChange,
        'Successfully deactivated all designer forms.',
      ),
    );
    this.databases.dispatch(pullForms(this.nsfPath, this.dbName, this.setData ?? NO_SINK));
  }

  private handleFormNameInput(event: Event): void {
    // The inner control's native input event is composed, so without this it would leave
    // this element too.
    event.stopPropagation();
    this.formName = (event.target as WaInput).value;
    this.formNameErrorMessage = validateFormSchemaName(
      this.formName,
      this.normalizedForms.map((form) => form.formName),
    ).errorMessage;
  }

  private handleCreateCancel(): void {
    this.createFormOpen = false;
    this.databases.dispatch(addForm(false));
  }

  private async handleCreate(): Promise<void> {
    const formName = this.formName;
    if (formName.length === 0) {
      this.databases.dispatch(toggleAlert('Please enter a valid form schema name!'));
      return;
    }
    // A named binding rather than an inline literal: the thunk's parameter type does not
    // declare `formValue`, which the record carries and the schema screen reads back.
    const newForm = {
      alias: [formName],
      dbName: this.dbName,
      formModes: [newFormMode()],
      formAccessModes: [newFormMode()],
      formName,
      formValue: formName,
    };
    await this.databases.dispatch(addForm(true, newForm));
    this.navigateTo(formName, encodeURIComponent);
  }

  render() {
    const invalid = this.formNameErrorMessage !== '';

    return html`
      <div class="top-nav">
        <keep-search-input
          placeholder="Search Forms"
          ?disabled=${!this.databases.value.databasePull}
          @search-change=${this.handleSearch}
        ></keep-search-input>
        <keep-button @click=${() => (this.createFormOpen = true)}>
          Add New Form Schema
        </keep-button>
      </div>

      <div class="buttons-panel">
        <div>
          <button
            type="button"
            class="button activate"
            ?disabled=${this.bulkDisabled}
            @click=${this.handleActivateAll}
          >
            Activate All
          </button>
          <div class="short-vertical"></div>
          <button
            type="button"
            class="button deactivate"
            ?disabled=${this.bulkDisabled}
            @click=${() => (this.resetAllForms = true)}
          >
            Deactivate All
          </button>
        </div>
        <keep-switch .onToggle=${this.handleToggleShowActive}>Show Active</keep-switch>
      </div>

      <dialog
        class="create-dialog"
        aria-label="Add New Form Schema"
        @cancel=${() => (this.createFormOpen = false)}
      >
        <keep-form-dialog-header
          heading="Add New Form Schema"
          @header-close=${() => (this.createFormOpen = false)}
        ></keep-form-dialog-header>
        <div class="field">
          <wa-input
            label="Form Schema Name"
            aria-invalid=${invalid ? 'true' : 'false'}
            hint=${this.formNameErrorMessage}
            .value=${this.formName}
            @input=${this.handleFormNameInput}
          ></wa-input>
        </div>
        <div class="create-buttons">
          <keep-button variant="neutral" appearance="outlined" @click=${this.handleCreateCancel}>
            Cancel
          </keep-button>
          <keep-button @click=${this.handleCreate}>Create</keep-button>
        </div>
      </dialog>

      <keep-forms-table
        .forms=${this.tableForms}
        db-name=${this.dbName}
        .formList=${this.formList}
        .schemaData=${this.schemaData}
        .setSchemaData=${this.emitSchemaChange}
        @form-open=${this.handleFormOpen}
      ></keep-forms-table>

      <dialog
        class="warning-dialog"
        aria-label="WARNING: Deactivate ALL forms?"
        aria-describedby="reset-form-contents"
        @cancel=${() => (this.resetAllForms = false)}
      >
        <keep-form-dialog-header
          heading="WARNING: Deactivate ALL forms?"
          @header-close=${() => (this.resetAllForms = false)}
        ></keep-form-dialog-header>
        <div class="dialog-content">
          <p id="reset-form-contents" class="dialog-content-text">
            This action deletes all form modes and removes all configurations done to
            <span class="danger">ALL</span> of the designer forms. Do you wish to proceed?
          </p>
        </div>
        <div class="dialog-actions">
          <keep-button
            variant="neutral"
            appearance="outlined"
            @click=${() => (this.resetAllForms = false)}
          >
            No
          </keep-button>
          <keep-button @click=${this.handleDeactivateAll}>Yes</keep-button>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-forms-tab': FormsTab;
  }
}
