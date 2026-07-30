/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import * as Yup from 'yup';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/textarea/textarea.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import { StoreController } from '../../store/StoreController';
import { FormController } from '../../store/FormController';
import { DEFAULT_APP_ICON_NAME, appIconPayload, loadAppIcons } from '../../services/app-icons';
import { addSchema } from '../../store/databases/action';
import './keep-autocomplete';
import type Autocomplete from './keep-autocomplete';
import './keep-icon-dropdown';
import type { KeepIconSelectDetail } from './keep-icon-dropdown';
import './keep-form-dialog-header';
import './keep-button';

/** The close signal is the event itself; there is no payload. */
export type KeepAddImportDialogCloseDetail = undefined;

/**
 * The fields this form owns and validates.
 *
 * `icon` and `apiName` are **not** here, for #897's reason. `icon` was resolved into
 * `initialValues` on first render out of a chunk that loads lazily (#772) — so it was `''` for
 * every dialog opened before the payloads landed — and then recomputed at submit anyway.
 * `apiName` sat in `initialValues` as `''` and was overwritten with the schema name on the way
 * out, every time, without exception. Both are derived in {@link AddImportDialog.buildPayload}
 * where they are used, and neither has a second copy that can disagree.
 */
interface SchemaFormValues {
  schemaName: string;
  description: string;
  nsfPath: string;
  formulaEngine: string;
  iconName: string;
  isActive: boolean;
  agents: unknown[];
  views: unknown[];
  forms: unknown[];
  dqlAccess: boolean;
  dqlFormula: { formulaType: string; formula: string };
  allowCode: boolean;
  openAccess: boolean;
  requireRevisionToUpdate: boolean;
  allowDecryption: boolean;
  owners: unknown[];
}

const INITIAL_VALUES: SchemaFormValues = {
  schemaName: '',
  description: '',
  nsfPath: '',
  formulaEngine: 'domino',
  iconName: DEFAULT_APP_ICON_NAME,
  isActive: true,
  agents: [],
  views: [],
  forms: [],
  dqlAccess: true,
  dqlFormula: { formulaType: 'domino', formula: '@True' },
  allowCode: true,
  openAccess: true,
  requireRevisionToUpdate: false,
  allowDecryption: true,
  owners: [],
};

/** The one engine the picker offers, and the label it shows for it. */
const FORMULA_ENGINES: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'domino', label: 'Domino' },
];

/**
 * "Add New Schema": choose between importing a schema from a `.json` file and creating one by
 * hand, then fill in the form and save. Tag: `keep-add-import-dialog`.
 *
 * It had an `@lit/react` wrapper until #806 wave 5 converted the schema list page — its only
 * consumer — to `keep-schemas-list`. The wrapper went with it; the element is now reached
 * from a Lit template, which is also what registers it.
 *
 * @fires dialog-close - the user closed the dialog, or a save was dispatched. The parent owns
 *   the open flag and has to lower it.
 *
 * ## It owns its form state
 *
 * This is the tier-D shape: `FormController` (#807) replaces the form library, and the values
 * live in one place instead of the four the original spread them across. That component kept
 * `schemaName` and `nsfPath` in React state **as well as** in the form's values, wrote to the
 * form copies by assigning straight into the values object — which notified nothing — and read
 * the database back out of the autocomplete's shadow DOM at save time because the form could
 * not see it. Two of those four copies are gone and the assignment is a compile error now:
 * `FormController.values` is `Readonly`.
 *
 * The database picker reports itself through its own `change` event instead, so the value is in
 * the form before validation runs rather than one render behind it.
 *
 * ## It reads the store directly
 *
 * `state.databases` supplies both the list of databases to pick from and the list of existing
 * schemas the uniqueness rule compares against. The React parent selects part of that slice for
 * its own rendering but never passed any of it down, so there is no property for these to fight
 * with — the same division `keep-quick-config-form` settled on, and one subscription on the
 * whole slice for the same reason (#895): the two fields read are both large arrays, so a
 * projection would allocate on every store change and compare no fewer references.
 *
 * ## Errors appear on blur
 *
 * The two text fields wire `@blur`, so a required field reports itself when the user leaves it
 * and the first Save press reports whatever is left. The original wired blur nowhere, so
 * nothing was ever `touched` until Save — the behaviour its markup described but never had.
 *
 * The database picker is deliberately not among them. It is a text box with a menu attached,
 * and the only blur it can offer composes out of its own shadow root, so it fires when focus
 * moves from the box to the menu button beside it — reporting "Please select a database!" at
 * the moment the user reaches for the list. Its message waits for Save, as all of them used to,
 * and clears as soon as the field is edited.
 */
@customElement('keep-add-import-dialog')
export default class AddImportDialog extends KeepElement {
  static styles = [
    modalBackdropStyles,
    css`
      /* The page's border-box reset is a universal selector and stops at this boundary. The
         two option tiles and every padded row below are sized as percentages plus padding, so
         under content-box they measure wider than the dialog. */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      :host {
        display: contents;
      }

      /* was the shared modal-dialog rule plus this dialog's own zero-padding override.
         Background and text colour reach a light-DOM dialog through bare element selectors —
         Web Awesome's native layer and the app's dark sheet — and neither crosses a shadow
         boundary, so both are restated. Tokens rather than the sheet's hardcoded light/dark
         pairs, which is what the other converted dialogs settled on. The backdrop comes from
         the shared module above, for the same reason. */
      dialog {
        border: 1px solid var(--wa-color-surface-border);
        border-radius: 10px;
        width: 30%;
        min-width: 420px;
        height: fit-content;
        padding: 0;
        background: var(--wa-color-surface-raised);
        color: var(--wa-color-text-normal);
        flex-direction: column;
        gap: 30px;
        display: none;
      }

      dialog[open] {
        display: flex;
      }

      /* was the shared 1px rule between dialog sections. border: 0 is not in the original and
         is needed here: Web Awesome's native layer clears the user-agent groove through a bare
         selector, so inside a shadow root the groove comes back and draws under the bar. The
         colour is the surface border token rather than the sheet's fixed grey, which is the
         same value in both modes. */
      .divider {
        height: 1px;
        width: 100%;
        padding: 0;
        margin: 0;
        border: 0;
        background: var(--wa-color-surface-border);
      }

      /* was the rule that padded the title bar away from the dialog's edges. */
      .header {
        padding: 30px 30px 0 30px;
        display: flex;
        width: 100%;
        justify-content: space-between;
        background: transparent;
      }

      /* --- the chooser ------------------------------------------------------------- */

      /* was the container around the two option tiles. Its flex-direction and gap sat behind
         an [open] attribute selector, which a div never carries, so the block never became a
         flex container: the 30px between the tiles comes from their own bottom margin. Its
         height of 100% resolved against an auto-height dialog and did nothing either.
         Reproduced as it renders rather than as it reads. */
      .options {
        width: 100%;
        padding: 0 35px;
        background: var(--wa-color-surface-raised);
      }

      /* was the option tile's rule, on a div with a click handler and no role, no tabindex
         and no key handling — so neither option could be reached from the keyboard (WCAG
         2.1.1). A real button now, with the button user-agent styling turned off so it still
         looks like the tile it was. The border and the hover tint were a fixed grey and a
         hardcoded light/dark pair; both are tokens here and so stay right in both modes. */
      .option {
        width: 100%;
        border: 1px solid var(--wa-color-surface-border);
        border-radius: 5px;
        padding: 15px 10px;
        display: flex;
        gap: 23px;
        align-items: center;
        text-align: left;
        font: inherit;
        color: inherit;
        background-color: var(--wa-color-surface-default);
        margin-bottom: 30px;
      }

      .option:hover {
        cursor: pointer;
        background-color: var(--wa-color-brand-fill-quiet);
      }

      .option:focus-visible {
        outline: var(--wa-focus-ring);
        outline-offset: calc(-1 * var(--wa-focus-ring-width));
      }

      /* was the option tile's glyph rule, on an img holding a base64 data URI of a
         black-stroked SVG. The strokes are currentColor now, so the white backing patch and
         the dark-mode invert filter that went with it are both gone — inverting was a filter
         over a bitmap of a vector we had all along. Same 39px box for both, which is what that
         rule set even though one of the two source files is 43px square. */
      .option-icon {
        width: 39px;
        height: 39px;
        flex: none;
        color: var(--wa-color-text-normal);
      }

      /* was the rule stacking each tile's title over its description. */
      .option-text {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      /* was the tile-title rule, on a <text> tag. That is an SVG element name used as a
         bare tag in HTML, which parses as an unknown inline element; a span is what it meant.
         The 12px the document sheet gives every <text> never applied here — a class beats a
         type selector — so nothing is lost by leaving that rule behind. */
      .option-title {
        font-weight: 700;
        font-size: 16px;
        padding: 0;
        margin: 0;
        color: var(--wa-color-text-normal);
      }

      /* was the tile-description rule, likewise on a <text> tag. */
      .option-description {
        font-weight: 400;
        font-size: 14px;
        padding: 0;
        margin: 0;
        color: var(--hint-text-color);
      }

      /* Reports a file that is not a schema. The original let the parse throw out of a
         FileReader callback, so a wrong file left the dialog sitting on this screen with no
         indication that anything had happened. */
      .import-error {
        margin: 0 0 20px 0;
        font-size: 14px;
        color: var(--keep-color-danger-text);
      }

      /* --- the form ---------------------------------------------------------------- */

      /* was the column that holds the whole form. */
      .content {
        display: flex;
        flex-direction: column;
        width: 100%;
        gap: 10px;
      }

      /* was the Back link's rule. Its gap and its justify-content needed a flex container
         and the rule never declared one, so the arrow and the word sat centred and touching,
         which is not what either declaration asks for. It is a flex row here, so the control
         reads left-aligned with 5px between the two — worth an eye in the browser, because it
         is the one place this conversion moves something visible. */
      .back {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 5px;
        font: inherit;
        font-size: 14px;
        padding: 0;
        border: 0;
        cursor: pointer;
        background: var(--wa-color-surface-raised);
        color: var(--wa-color-text-normal);
      }

      .back:focus-visible {
        outline: var(--wa-focus-ring);
        outline-offset: calc(-1 * var(--wa-focus-ring-width));
      }

      /* was the padded block around the database picker. */
      .section {
        padding: 0 30px;
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      /* was a flex-row utility with the padding and gap utilities beside it. */
      .row {
        display: flex;
        flex-direction: row;
        padding: 10px 30px;
        gap: 20px;
      }

      /* was a flex-column utility with the same ones beside it; the engine block below drops
         the top padding, as its own utility list did. */
      .field-block {
        display: flex;
        flex-direction: column;
        padding: 10px 30px;
        gap: 5px;
      }

      .field-block.last {
        padding-top: 0;
      }

      /* was the icon caption-over-picker rule. */
      .icon-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      /* was the row the icon picker sits in. */
      .icon-dropdown {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      /* was the schema-name column, which takes the rest of the row. */
      .name-field {
        display: flex;
        flex-direction: column;
        flex: 1;
      }

      /* was the shared 16px caption rule, which captioned five things here. Three of those
         captions are inside a form control's label slot now — the slotted span is in this
         shadow root, so this rule still reaches it, and the control finally has a real
         accessible name instead of a placeholder that vanished as soon as anything was typed
         (WCAG 3.3.2). */
      .medium-text {
        font-size: 16px;
        color: var(--wa-color-text-normal);
      }

      /* The caption used to be a sibling in a 5px flex gap; as a label it takes its spacing
         from the control instead, so it is set back to the same 5px. */
      wa-input::part(label),
      wa-textarea::part(label),
      wa-select::part(form-control-label) {
        margin-bottom: 5px;
      }

      /* was the schema-name field's own rule. Its max-height of 41px is dropped: it bounded a
         single bare input, and this control is a label stacked over a field, which that height
         would clip. */
      wa-input,
      wa-textarea,
      wa-select {
        width: 100%;
      }

      /* The red border on a failed field is set by keep-overrides.css, from document scope,
         through a bare attribute selector on the element — which does not reach inside a
         shadow root. Restated rather than dropped: without it a rejected field here would show
         its message with nothing wrong-looking about the field itself. */
      wa-input[aria-invalid='true']::part(base),
      wa-textarea[aria-invalid='true']::part(base) {
        border-color: var(--wa-color-danger-fill-loud);
        box-shadow: 0 0 0 var(--wa-focus-ring-width) var(--wa-color-danger-fill-quiet);
      }

      /* The hint slot is where a field's own message goes, so it reads as danger when the
         field has failed and as an ordinary hint otherwise. */
      wa-input[aria-invalid='true']::part(hint),
      wa-textarea[aria-invalid='true']::part(hint) {
        color: var(--keep-color-danger-text);
      }

      /* was the full-width utility. */
      keep-autocomplete {
        display: block;
        width: 100%;
      }

      /* was the shared dialog button row with the padding utilities beside it. */
      .actions {
        width: 100%;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        align-content: center;
        align-items: center;
        padding: 0 30px 30px 30px;
      }
    `,
  ];

  /** Drives `showModal()` / `close()` on the inner native dialog. The parent owns the flag. */
  @property({ type: Boolean }) accessor open = false;

  /** False on the chooser screen, true once a branch has been taken. */
  @state() private accessor formOpen = false;

  /** Which branch: importing a file, or creating by hand. Changes two captions and nothing else. */
  @state() private accessor importing = false;

  /** Set when a chosen file is not a schema. See the note on `.import-error`. */
  @state() private accessor importError = '';

  /** One subscription for the whole slice, on purpose — see the class docblock. */
  private readonly db = new StoreController(this, (state) => state.databases);

  private readonly form = new FormController<SchemaFormValues>(this, {
    initialValues: INITIAL_VALUES,
    schema: this.buildSchema(),
    onSubmit: (values) => {
      // Dispatched, then closed — the original closed on dispatch rather than on the response,
      // and the reset callback is what runs if the create succeeds. FormController returns the
      // in-flight promise to a second press rather than running this twice (#887), which for a
      // create is the difference between one schema and two.
      this.db.dispatch(addSchema(this.buildPayload(values), () => this.resetForm()));
      this.formOpen = false;
      this.emit<KeepAddImportDialogCloseDetail>('dialog-close');
    },
  });

  connectedCallback(): void {
    super.connectedCallback();
    // The request body carries the icon's base64 next to its name, and the payloads live in a
    // lazily loaded chunk (#772), so there is a window in which the name is known and the
    // bytes are not. Asking for them on connect closes it as early as this element can; the
    // window itself is preserved, and `appIconPayload` answers '' inside it exactly as before.
    void loadAppIcons().catch(() => {
      /* nothing here can retry usefully; the icon picker shows its own skeleton */
    });
  }

  private get nativeDialog(): HTMLDialogElement | null {
    return this.shadowRoot?.querySelector('dialog') ?? null;
  }

  private get heading(): string {
    if (!this.formOpen) return 'Add New Schema';
    return this.importing ? 'Import Schema' : 'Create Schema';
  }

  /**
   * Opening clears everything, which is what the original did from an effect on the same flag.
   * `willUpdate` rather than `updated`, so the clear folds into the render already scheduled
   * instead of asking for a second one.
   */
  protected willUpdate(changed: PropertyValues<this>): void {
    if (!changed.has('open') || !this.open) return;
    this.resetForm();
    this.formOpen = false;
    this.importing = false;
  }

  protected updated(changed: PropertyValues<this>): void {
    if (!changed.has('open')) return;
    const dialog = this.nativeDialog;
    if (!dialog) return;
    if (this.open) {
      // Guarded because showModal() on an already-open dialog throws InvalidStateError;
      // close() on a closed one is a no-op and needs no guard.
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.close();
    }
  }

  /**
   * The validation rules, ported field for field.
   *
   * Both `.test()` closures read `this`, so they see the store as it is when validation runs
   * rather than as it was when the schema was built. The uniqueness rule reaches its sibling
   * field through `context.parent`, which is the values object being validated — that is how it
   * can know which database the user picked (#905). The React version had to do the same thing
   * for a different reason: it kept a second copy of `nsfPath` in state that was always one
   * render behind the submit that read it.
   *
   * A crash in either closure is no longer read as "valid": `FormController.validate` rethrows
   * anything that is not a validation error (#890), where the form library swallowed it.
   */
  private buildSchema(): Yup.AnyObjectSchema {
    return Yup.object().shape({
      schemaName: Yup.string()
        .max(256, 'Schema name is too long (maximum is 256 characters).')
        .min(3, 'Schema name should contain at least 3 characters.')
        .required('Schema name is required.')
        .test('First Character', 'Schema name must start with a letter', (val) => {
          // Build Issue: character must be converted to an int before the isNaN call
          let retval = false;
          if (val && val.length) {
            retval = isNaN(parseInt(val.charAt(0), 10));
          }
          return retval;
        })
        .test(
          'Unique Schema Name',
          'Schema name already exists in this database! Change the schema name or the database.',
          (val, context) => {
            const { nsfPath } = context.parent as { nsfPath?: string };
            return !this.db.value.databasesOverview.some(
              (schema) => schema.nsfPath === nsfPath && schema.schemaName === val,
            );
          },
        )
        .matches(
          /^[a-z0-9_]+$/g,
          'Schema name should only contain lowercase letters, numbers, and underscores.',
        ),
      description: Yup.string()
        .min(3, 'Schema description should contain at least 3 characters.')
        .required('Please provide a short description about this schema!'),
      nsfPath: Yup.string()
        .required('Please select a database!')
        .test('Database Does Not Exist', 'Database does not exist!', (val) =>
          this.db.value.availableDatabases.some((database) => database.title === val),
        ),
    }) as Yup.AnyObjectSchema;
  }

  /**
   * The request body: the imported leftovers, then the form's values over the top, then the two
   * fields that are derived rather than owned.
   *
   * `apiName` has always been the schema name — the original assigned it on this line every
   * time — and `icon` has always been resolved here from `iconName` rather than read out of the
   * form, so neither needs a home in the values.
   */
  private buildPayload(values: SchemaFormValues): Record<string, unknown> {
    return {
      ...this.form.extras,
      ...values,
      apiName: values.schemaName,
      icon: appIconPayload(values.iconName),
    };
  }

  /**
   * Clears the form and the leftovers from an import together, so neither outlives the other.
   *
   * The import leftovers are not cleared here any more: they live on the controller now, and
   * `reset()` clears them with everything else (#947). Remembering to do it by hand was the
   * half of a private bag that is easy to get wrong, which is why #935 asked for the slot.
   */
  private resetForm(): void {
    this.importError = '';
    this.form.reset();
  }

  private handleClose(): void {
    this.formOpen = false;
    this.resetForm();
    this.emit<KeepAddImportDialogCloseDetail>('dialog-close');
  }

  /** Back to the chooser, with whatever was typed thrown away — as before. */
  private handleBack(): void {
    this.formOpen = false;
    this.resetForm();
  }

  private handleCreate(): void {
    this.importing = false;
    this.resetForm();
    this.formOpen = true;
  }

  /**
   * Opens the file picker through a throwaway input.
   *
   * Two things differ from the original, both of them leaks it had. The input was built in the
   * component body, so a fresh one was created on **every render** whether or not anyone was
   * importing; and it was removed from the document only on the success path inside the reader
   * callback, so cancelling the picker or choosing an unreadable file left it in the body for
   * the life of the page. It is created on demand here and removed on either outcome.
   */
  private handleImport(): void {
    this.importing = true;
    this.importError = '';

    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = '.json';
    // The `hidden` attribute, not a style property: the production CSP sends
    // style-src-attr 'none', and this keeps the element out of the CSP surface entirely.
    picker.hidden = true;

    const remove = () => picker.remove();
    picker.addEventListener('cancel', remove);
    picker.addEventListener('change', (event) => {
      remove();
      this.readSchema(event);
    });

    document.body.appendChild(picker);
    picker.click();
  }

  /** Read the chosen file and fill the form from it. */
  private readSchema(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener('loadend', () => {
      try {
        this.applyImportedSchema(JSON.parse(String(reader.result)) as unknown);
      } catch {
        // The original had no guard here, so a file that is not JSON threw out of this
        // callback and the dialog simply did not move.
        this.importError = 'That file could not be read as a schema. Choose a .json export.';
      }
    });
    reader.readAsText(file);
  }

  /**
   * Split a parsed file into the fields the form owns and everything else.
   *
   * The owned half is written with `replaceValues` over `INITIAL_VALUES`, which keeps the good
   * half of the original difference — a file missing a key left it `undefined` before, and the
   * request body carried the hole, where here it takes its initial value — while making this
   * import self-contained (#947).
   *
   * `setValues` merged into whatever the form already held, which is correct today only because
   * of what the callers happen to do: the Import button lives in the chooser, the chooser only
   * renders while `formOpen` is false, and `handleBack()` is the sole way back to it and resets.
   * A second import therefore cannot inherit the first one's fields — but nothing here said so,
   * and the next path into this form would have had to know. Naming `INITIAL_VALUES` states it.
   *
   * The unowned half goes to `form.setExtras`, which the controller clears on `reset()`. It used
   * to be a private bag on this class, cleared by hand alongside `form.reset()`.
   */
  private applyImportedSchema(parsed: unknown): void {
    // Arrays are excluded as well as primitives: a JSON array parses fine and would be walked
    // key by numeric key, filling the request body with 0, 1, 2 and opening an empty form.
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      this.importError = 'That file could not be read as a schema. Choose a .json export.';
      return;
    }

    const known: Record<string, unknown> = {};
    const extras: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (key in INITIAL_VALUES) known[key] = value;
      else extras[key] = value;
    }

    this.importError = '';
    this.form.setExtras(extras);
    this.form.replaceValues({ ...INITIAL_VALUES, ...known } as SchemaFormValues);
    this.formOpen = true;
  }

  /**
   * Schema names are restricted to lowercase letters, digits and underscores.
   *
   * `live()` on the binding is what takes a rejected character back out of the box: a keystroke
   * that sanitises away leaves form state unchanged, so an ordinary binding would be
   * dirty-checked out and the control would drift from the value being submitted.
   */
  private handleSchemaNameInput(event: Event): void {
    event.stopPropagation();
    const value = (event.target as HTMLInputElement).value ?? '';
    this.form.setValue('schemaName', value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
  }

  private handleDescriptionInput(event: Event): void {
    event.stopPropagation();
    this.form.setValue('description', (event.target as HTMLInputElement).value ?? '');
  }

  /**
   * The picked database, read off the element rather than out of its shadow DOM.
   *
   * The original reached through `shadowRoot.querySelector('input')` at save time because the
   * form could not see the value any other way. The element publishes it, and the value is in
   * the form before validation runs instead of one render after it.
   *
   * The event is stopped because it is a bare `change`: it composes out of that element's
   * shadow root, and letting it continue would surface on the consumer as a change this dialog
   * never meant to report.
   */
  private handleDatabaseChange(event: Event): void {
    event.stopPropagation();
    this.form.setValue('nsfPath', (event.target as Autocomplete).selectedOption);
  }

  private handleIconSelect(event: CustomEvent<KeepIconSelectDetail>): void {
    event.stopPropagation();
    this.form.setValue('iconName', event.detail.iconName);
  }

  private handleEngineChange(event: Event): void {
    event.stopPropagation();
    this.form.setValue('formulaEngine', (event.target as HTMLInputElement).value ?? '');
  }

  private renderChooser() {
    // Accessibility (#713): buttons rather than click-handling divs, so both options are
    // reachable and operable from the keyboard, and the glyphs are decorative because the
    // button's own text already names it.
    return html`
      <hr class="divider" />
      <div class="options">
        ${this.importError
          ? html`<p class="import-error" role="alert">${this.importError}</p>`
          : nothing}
        <button class="option" type="button" @click=${() => this.handleImport()}>
          <svg
            class="option-icon"
            viewBox="0 0 39 39"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M34.125 24.375V30.875C34.125 31.737 33.7826 32.5636 33.1731 33.1731C32.5636 33.7826 31.737 34.125 30.875 34.125H8.125C7.26305 34.125 6.4364 33.7826 5.8269 33.1731C5.21741 32.5636 4.875 31.737 4.875 30.875V24.375"
            />
            <path d="M27.625 13L19.5 4.875L11.375 13" />
            <path d="M19.5 4.875V24.375" />
          </svg>
          <span class="option-text">
            <span class="option-title">Import Schema</span>
            <span class="option-description">Import new schema from file</span>
          </span>
        </button>
        <button class="option" type="button" @click=${() => this.handleCreate()}>
          <svg
            class="option-icon"
            viewBox="0 0 43 43"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M21.5007 39.4167C31.3958 39.4167 39.4173 31.3951 39.4173 21.5C39.4173 11.6049 31.3958 3.58337 21.5007 3.58337C11.6055 3.58337 3.58398 11.6049 3.58398 21.5C3.58398 31.3951 11.6055 39.4167 21.5007 39.4167Z"
            />
            <path d="M21.5 14.3334V28.6667" />
            <path d="M14.334 21.5H28.6673" />
          </svg>
          <span class="option-text">
            <span class="option-title">Create Schema</span>
            <span class="option-description">Create your own schema</span>
          </span>
        </button>
      </div>
    `;
  }

  private renderForm() {
    const { values, errors, touched } = this.form;
    const nsfPathError = touched.nsfPath ? errors.nsfPath : undefined;
    const schemaNameError = touched.schemaName ? errors.schemaName : undefined;
    const descriptionError = touched.description ? errors.description : undefined;

    return html`
      <hr class="divider" />
      <div class="content">
        <button class="back" type="button" @click=${() => this.handleBack()}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M11.875 7.5H3.125"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M7.5 11.875L3.125 7.5L7.5 3.125"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Back
        </button>

        <div class="section">
          <span class="medium-text"
            >${this.importing ? 'Import Into Database' : 'Database'}</span
          >
          <keep-autocomplete
            .options=${this.db.value.availableDatabases.map((database) => database.title)}
            .initialOption=${values.nsfPath}
            ?error=${!!nsfPathError}
            .errorMessage=${nsfPathError ?? ''}
            @change=${(e: Event) => this.handleDatabaseChange(e)}
          ></keep-autocomplete>
        </div>

        <hr class="divider" />

        <div class="row">
          <div class="icon-field">
            <span class="medium-text">Icon</span>
            <div class="icon-dropdown">
              <keep-icon-dropdown
                .iconName=${values.iconName}
                @icon-select=${(e: CustomEvent<KeepIconSelectDetail>) => this.handleIconSelect(e)}
              ></keep-icon-dropdown>
            </div>
          </div>
          <div class="name-field">
            <wa-input
              id="schema-name"
              placeholder="Schema Name"
              aria-invalid=${schemaNameError ? 'true' : 'false'}
              .value=${live(values.schemaName)}
              @input=${(e: Event) => this.handleSchemaNameInput(e)}
              @blur=${() => void this.form.handleBlur('schemaName')}
            >
              <span slot="label" class="medium-text">Schema Name</span>
              ${schemaNameError ? html`<span slot="hint">${schemaNameError}</span>` : nothing}
            </wa-input>
          </div>
        </div>

        <div class="field-block">
          <wa-textarea
            placeholder="Description"
            rows="5"
            resize="none"
            aria-invalid=${descriptionError ? 'true' : 'false'}
            .value=${live(values.description)}
            @input=${(e: Event) => this.handleDescriptionInput(e)}
            @blur=${() => void this.form.handleBlur('description')}
          >
            <span slot="label" class="medium-text">Schema Description</span>
            ${descriptionError ? html`<span slot="hint">${descriptionError}</span>` : nothing}
          </wa-textarea>
        </div>

        <div class="field-block last">
          <wa-select
            .value=${live(values.formulaEngine)}
            @change=${(e: Event) => this.handleEngineChange(e)}
          >
            <span slot="label" class="medium-text">Formula Engine</span>
            ${FORMULA_ENGINES.map(
              (engine) => html`<wa-option value=${engine.value}>${engine.label}</wa-option>`,
            )}
          </wa-select>
        </div>
      </div>

      <hr class="divider" />

      <div class="actions">
        <keep-button variant="neutral" appearance="outlined" @click=${() => this.handleBack()}>
          Back
        </keep-button>
        <keep-button ?disabled=${this.form.submitting} @click=${() => void this.form.submit()}>
          Save Schema
        </keep-button>
      </div>
    `;
  }

  render() {
    // aria-label, not aria-labelledby: the heading lives inside keep-form-dialog-header's own
    // shadow root and an IDREF cannot cross a shadow boundary (#713).
    return html`
      <dialog aria-label=${this.heading} @cancel=${() => this.handleClose()}>
        <div class="header">
          <keep-form-dialog-header
            heading=${this.heading}
            @header-close=${() => this.handleClose()}
          ></keep-form-dialog-header>
        </div>
        ${this.formOpen ? this.renderForm() : this.renderChooser()}
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-add-import-dialog': AddImportDialog;
  }
}
