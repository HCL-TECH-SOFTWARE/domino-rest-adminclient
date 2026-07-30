/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import * as Yup from 'yup';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/dropdown/dropdown.js';
import '@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { FormController } from '../../store/FormController';
import {
  APP_ICON_NAMES,
  DEFAULT_APP_ICON_NAME,
  appIconPayload,
  appIconUri,
  loadAppIcons,
} from '../../services/app-icons';
import { appIconSkeleton, appIconSkeletonStyles } from './app-icon-skeleton';
import { FA_LIBRARY } from '../../services/icon-library';
import { quickConfig } from '../../store/databases/action';
import './keep-file-contents-tree';
import type { KeepNsfSelectDetail } from './keep-file-contents-tree';
import './keep-checkbox';
import type Checkbox from './keep-checkbox';
import './keep-button';

/** The values this form owns. Everything else in the POST body is fixed — see `buildPayload`. */
interface QuickConfigValues {
  schemaName: string;
  scopeName: string;
  description: string;
  nsfPath: string;
  iconName: string;
  isActive: boolean;
  additionalModes: { odata: boolean; dql: boolean };
}

/**
 * `icon` and the setter-less `schemaName` are **not** here — #897. The React version put a
 * `useState('')` with no setter into `initialValues`, so `initialValues.schemaName` was a
 * constant `''` written the long way round while the field wrote to the form state instead;
 * and it resolved the base64 `icon` payload on first render from a chunk that loads lazily
 * (#772), then recomputed it at submit anyway. One name per value, resolved where it is used.
 */
const INITIAL_VALUES: QuickConfigValues = {
  schemaName: '',
  scopeName: '',
  description: '',
  nsfPath: '',
  iconName: DEFAULT_APP_ICON_NAME,
  isActive: true,
  additionalModes: { odata: false, dql: false },
};

/**
 * The Quick Config form: pick a database, name a schema and a scope, save. Tag:
 * `keep-quick-config-form`.
 *
 * This is `FormController`'s first production user (#717 · #807), and it owns its own form
 * state rather than receiving it. The React pair passed `FormikProps<any>` from container to
 * leaf; converting that shape faithfully would have meant handing an opaque form object across
 * a shadow boundary as a property — keeping the coupling alive through the type after removing
 * it from the imports. A form element owns its form.
 *
 * @fires close - the Close button was pressed. The drawer decides what that means.
 *
 * ### One store subscription, deliberately (#895)
 *
 * The React version called `useSelector((s) => s.databases)` **twice, back to back**, and
 * neither call narrowed anything — both returned the slice itself. This is one controller on
 * the whole slice, and that is the considered answer rather than a transcription: the five
 * fields read include two large arrays, so a projection would allocate a new object on every
 * store change and still compare the same two array references. `Object.is` on the slice is
 * the cheapest narrowing available until `createSelector` exists here (#697).
 *
 * ### Errors appear on blur
 *
 * Every field wires `@blur` to `FormController.handleBlur`, so a required field reports itself
 * when the user leaves it, and the first Add press reports whatever is left. The Formik markup
 * described this and never did it — `handleBlur` was wired nowhere, so `touched` only flipped
 * on submit.
 */
@customElement('keep-quick-config-form')
export default class QuickConfigForm extends KeepElement {
  static styles = [
    appIconSkeletonStyles,
    css`
      /* The global reset does not cross a shadow boundary, and this layout needs it: the two
         columns are sized in percentages (40% + 55%) and both carry padding. Under
         content-box that padding is added *outside* the percentage, so 95% + 50px overflows
         the drawer and clips the right-hand fields. Measured in Chrome before restating it.

         Element selectors and class selectors from styles.css stop at this boundary too;
         only custom properties inherit through. */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      /* Was the Forms styled.form, which wrapped both columns. The real form is now the
         right-hand column only, so the database search box sits outside it and Enter there
         cannot submit (#896). */
      :host {
        display: flex;
        flex: 1 1 auto;
        min-height: 0;
        width: 100%;
      }

      /* --- left column: search + database tree ------------------------------------- */

      .file-structure {
        width: 40%;
        display: flex;
        padding: 0 0 0 10px;
        flex-direction: column;
        min-height: 0;
      }

      /* The banner over the database tree.

         Global classes do not cross a shadow boundary, so every rule this element used is
         restated here. The originals are still in styles.css because ScopeForm.tsx uses
         them; they are deliberately not named in these comments, because the dead-selector
         guard scans source text and a mention here would keep a rule alive after its last
         real user was converted. */
      .available-databases-text {
        color: var(--wa-color-brand-on-loud, #fff);
        font-size: 18px;
        padding: 10px;
        border-radius: var(--wa-border-radius-m);
        background: var(--keep-surface-brand);
      }

      /* Was styled(Paper) — a MUI raised surface. */
      .search-results {
        flex: 1 1 auto;
        min-height: 0;
        max-height: calc(100vh - 200px);
        margin-bottom: 24px;
        margin-top: 8px;
        padding: 5px 0;
        overflow-y: auto;
        background: var(--wa-color-surface-raised);
        border: 1px solid var(--wa-color-surface-border);
        border-radius: var(--wa-border-radius-m);
      }

      /* --- right column: the fields ------------------------------------------------ */

      .form-content {
        /* A form element, not a div, so Enter in a field submits (#896). margin: 0 because
           some UA stylesheets give form a bottom margin, which would push the row taller
           than the drawer. */
        margin: 0;
        padding: 0 20px;
        min-width: 55%;
        max-width: 100%;
        width: 100%;
        overflow-y: auto;
      }

      /* The form's title bar. Original rule left in styles.css for ScopeForm.tsx. */
      .form-header {
        display: flex;
        align-items: center;
        gap: 10px;
        color: var(--wa-color-brand-on-loud, #fff);
        font-size: 24px;
        padding: 20px;
        border-radius: var(--wa-border-radius-m);
        background: var(--keep-surface-brand);
        width: 100%;
        box-sizing: border-box;
      }

      /* Was the InputContainer styled.div. */
      .input-container {
        padding: 5px 0;
      }

      .database-label {
        /* The global class this replaces is a hardcoded black plus a separate dark-mode
           override, and neither reaches inside a shadow root. This token is mode-aware on
           its own.

           No backticks anywhere in a css tagged template: they close it, and the error
           surfaces far away as an SWC parse failure or a bogus CSSResult property. */
        color: var(--wa-color-text-normal);
        font-size: 15px;
      }

      .field-error {
        display: block;
        color: var(--keep-color-danger-text);
        font-size: 14px;
      }

      /* Inline banner for a failed save. Separate from the drawer's toast, as before. */
      .save-error {
        margin: 10px 0;
        padding: 10px 12px;
        border-radius: var(--wa-border-radius-m);
        border: 1px solid var(--wa-color-danger-border-quiet, var(--wa-color-surface-border));
        background: var(--wa-color-danger-fill-quiet);
      }

      .save-error-title {
        display: block;
        font-weight: var(--wa-font-weight-semibold, 600);
        color: var(--wa-color-text-normal);
      }

      .save-error-message {
        color: var(--keep-color-danger-text);
        font-size: 14px;
      }

      /* --- icon picker -------------------------------------------------------------- */

      .icon-select::part(label) {
        text-transform: capitalize;
      }

      /* The 35px app-icon tile. Original rule left in styles.css for its other users. */
      .icon-image,
      .app-icon-skeleton {
        width: 35px;
        height: 35px;
        object-fit: contain;
        display: block;
      }

      .icon-menu-image {
        width: 20px;
        height: 20px;
        object-fit: contain;
        display: block;
      }

      /* 86 icons: the list scrolls rather than running off the drawer. */
      .icon-menu {
        max-height: 40vh;
        overflow-y: auto;
      }

      .field-label {
        display: block;
        color: var(--wa-color-text-normal);
        font-size: 14px;
        padding-bottom: 4px;
      }

      .checkbox-row {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 8px;
      }

      .modes {
        padding-left: 10px;
      }

      .actions {
        display: flex;
        gap: 10px;
        padding: 16px 0;
      }

      /* Both action buttons take a quarter of the column, as the global utility did. */
      .actions keep-button {
        width: 25%;
      }
    `,
  ];

  /** See the class docblock: one subscription for the whole slice, on purpose (#895). */
  private readonly db = new StoreController(this, (state) => state.databases);

  private readonly form = new FormController<QuickConfigValues>(this, {
    initialValues: INITIAL_VALUES,
    schema: this.buildSchema(),
    onSubmit: (values) => {
      this.db.dispatch(quickConfig(this.buildPayload(values)));
    },
  });

  @state() private accessor search = '';

  /** Set once the lazy icon payloads (#772) land, so `render` swaps skeleton for icon. */
  @state() private accessor iconsReady = false;

  @query('#schema-name') private accessor schemaNameInput!: HTMLElement | null;

  connectedCallback(): void {
    super.connectedCallback();
    void loadAppIcons().then(
      () => {
        this.iconsReady = true;
      },
      () => {
        /* leave the skeleton up; nothing here can retry usefully */
      },
    );
  }

  /**
   * Clears the form. Called by the drawer when it opens or closes — the React container did
   * this in a `useEffect` on the drawer flag.
   */
  reset(): void {
    this.search = '';
    this.form.reset();
  }

  /**
   * Moves focus to the first field. The React container tried to do this and could not: its
   * `descriptionElementRef` was created, read, and **never attached to any element**, so
   * `descriptionElement` was always null and the focus call never ran.
   */
  focusFirstField(): void {
    this.schemaNameInput?.focus();
  }

  /**
   * The two "already exists" checks live here rather than in a hand-rolled guard before
   * submit, which is where the React version kept them (`handleAdd`, plus a `useState` error
   * string per field and manual clearing on every keystroke). As schema rules they report
   * through `form.errors` like every other field, on blur as well as on submit.
   *
   * Both close over `this`, so they read the store as it is when validation runs, not as it
   * was when the schema was built. `context.parent` is the values being validated — that is
   * how the schema-name rule reaches `nsfPath`, a sibling field.
   *
   * **The schema-name rule now reads `databasesOverview`, not `databases`** (#905). The React
   * version compared against `state.databases.databases`, which no reducer in the store ever
   * writes — it is `[]` from `initialState` onwards, so the check could not fire and a
   * duplicate schema name in the same database reached the server unchallenged.
   * `databasesOverview` is the list that actually holds `{ nsfPath, schemaName }` and that
   * `addSchema` pushes into, so the rule works here for the first time.
   */
  private buildSchema(): Yup.AnyObjectSchema {
    return Yup.object().shape({
      schemaName: Yup.string()
        .max(256, 'Schema Name is too long (maximum is 256 characters)')
        .required('Schema Name is required.')
        .test('First Character', 'Schema Name must start with a letter', (val) => {
          // Build Issue: character must be converted to an int before the isNaN call
          let retval = true;
          if (val && val.length) {
            retval = isNaN(parseInt(val.charAt(0), 10));
          }
          return retval;
        })
        .test(
          'unique in database',
          'The schema name already exists in this database.',
          (val, context) => {
            if (!val) return true;
            const nsfPath = (context.parent as QuickConfigValues).nsfPath;
            return !this.db.value.databasesOverview.some(
              (schema) => schema.nsfPath === nsfPath && schema.schemaName === val,
            );
          },
        ),
      scopeName: Yup.string()
        .min(4, 'Scope Name is too short (minimum is 4 characters)')
        .max(256, 'Scope Name is too long (maximum is 256 characters)')
        .required('Scope Name is required.')
        .test('First Character', 'Scope Name must begin with a letter', (val) => {
          // Build Issue: character must be converted to an int before the isNaN call
          let retval = false;
          if (val && val.length) {
            retval = isNaN(parseInt(val.charAt(0), 10));
          }
          return retval;
        })
        .test('unique', 'The name already exists.', (val) => {
          if (!val) return true;
          return !this.db.value.scopes.some((scope) => scope.apiName === val);
        }),
      description: Yup.string().required('Please provide a short description about this schema!'),
      nsfPath: Yup.string().required('Please select a database!'),
    }) as Yup.AnyObjectSchema;
  }

  /**
   * The POST body. Everything outside `QuickConfigValues` is a constant the form does not
   * own, and `additionalModes` narrows from the two checkboxes to the list of enabled names.
   *
   * The React version reached this shape through `JSON.parse(JSON.stringify(values))`, which
   * was a deep clone standing in for the copy `FormController` already guarantees.
   */
  private buildPayload(values: QuickConfigValues) {
    const { additionalModes, iconName, ...rest } = values;
    return {
      ...rest,
      create: true,
      server: '',
      icon: appIconPayload(iconName),
      iconName,
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
      additionalModes: Object.keys(additionalModes).filter(
        (mode) => additionalModes[mode as keyof typeof additionalModes],
      ),
    };
  }

  /**
   * Schema and scope names are restricted to lowercase alphanumerics.
   *
   * The sanitised value is written back to the control before `setValue`, because a keystroke
   * that sanitises away (`!`) leaves form state unchanged — so Lit's dirty check would skip
   * the re-render that would take the character back out of the box, and the control would
   * drift from the values being submitted. The React version mutated `e.target.value` for the
   * same reason, before handing the event on to the form library's change handler.
   */
  private handleRestrictedInput(path: 'schemaName' | 'scopeName', event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitised = (input.value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (input.value !== sanitised) input.value = sanitised;
    this.form.setValue(path, sanitised);
  }

  private handleSearchInput(event: Event): void {
    this.search = (event.target as HTMLInputElement).value ?? '';
  }

  /**
   * Implicit submission — Enter in any field (#896).
   *
   * `preventDefault` because a native submit would navigate; the values live in the controller,
   * not in `form.elements`, so there is nothing for the browser to send anyway.
   *
   * Straight to `submit()` rather than a separate path: the two "already exists" rules live in
   * the yup schema here, so Enter and the Add button run exactly the same validation. That is
   * the reason to put them in the schema rather than in a guard before submit — a guard has to
   * be repeated on every route into the form, and one of them will eventually be missed.
   *
   * The database search box is deliberately **outside** this form, so Enter there associates
   * with no form and cannot reach this handler.
   */
  private handleSubmitEvent(event: Event): void {
    event.preventDefault();
    void this.form.submit();
  }

  /**
   * `keep-checkbox` re-emits its own composed `change` with no detail, having stopped the
   * inner `wa-checkbox` event — so the state lives on the element, and `target` is the
   * `keep-checkbox` rather than an `<input>`.
   */
  private checkedOf(event: Event): boolean {
    return (event.target as Checkbox).checked;
  }

  /** Sorted by title when unfiltered, as before; the filter preserves the source order. */
  private get visibleDatabases() {
    const { availableDatabases } = this.db.value;
    if (this.search === '') {
      return availableDatabases
        .slice()
        .sort((a, b) => (a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1));
    }
    const needle = this.search.toLowerCase();
    return availableDatabases.filter((data) => data.title.toLowerCase().includes(needle));
  }

  /** `touched.x && errors.x` — the gate #893 said this markup should have used. */
  private renderError(path: keyof QuickConfigValues) {
    const message = this.form.touched[path] ? this.form.errors[path] : undefined;
    // No template interpolation of a possibly-absent key: the React version rendered
    // the error key into a string, which shows the user the word "undefined" when it is absent.
    return message ? html`<span class="field-error">${message}</span>` : nothing;
  }

  private renderIcon(name: string, className: string) {
    if (!this.iconsReady) return appIconSkeleton();
    const src = appIconUri(name) || appIconUri(DEFAULT_APP_ICON_NAME);
    return html`<img class=${className} src=${src} alt="" />`;
  }

  render() {
    const { dbError, dbErrorMessage } = this.db.value;
    const { values } = this.form;
    return html`
      <div class="file-structure">
        <span class="available-databases-text">Available Databases</span>
        <wa-input
          label="Search Databases"
          with-clear
          .value=${this.search}
          @input=${(e: Event) => this.handleSearchInput(e)}
          @wa-clear=${() => {
            this.search = '';
          }}
        ></wa-input>
        <div class="search-results">
          <keep-file-contents-tree
            .contents=${this.visibleDatabases}
            @nsf-select=${(e: CustomEvent<KeepNsfSelectDetail>) =>
              this.form.setValue('nsfPath', e.detail.nsfPath)}
          ></keep-file-contents-tree>
        </div>
      </div>

      <form class="form-content" @submit=${(e: Event) => this.handleSubmitEvent(e)}>
        <span class="form-header">
          <wa-icon library=${FA_LIBRARY} name="database" label="Database"></wa-icon>
          <span>Quick Config</span>
        </span>

        ${dbError && dbErrorMessage
          ? html`<div class="save-error" role="alert">
              <span class="save-error-title">Quick config error:</span>
              <span class="save-error-message">${dbErrorMessage}</span>
            </div>`
          : nothing}

        <div class="input-container">
          <span class="database-label">Database: ${values.nsfPath}</span>
        </div>
        ${this.renderError('nsfPath')}

        <div class="input-container">
          <wa-input
            id="schema-name"
            label="Schema Name"
            .value=${values.schemaName}
            @input=${(e: Event) => this.handleRestrictedInput('schemaName', e)}
            @blur=${() => void this.form.handleBlur('schemaName')}
          ></wa-input>
          ${this.renderError('schemaName')}
        </div>

        <div class="input-container">
          <wa-input
            label="Scope Name"
            .value=${values.scopeName}
            @input=${(e: Event) => this.handleRestrictedInput('scopeName', e)}
            @blur=${() => void this.form.handleBlur('scopeName')}
          ></wa-input>
          ${this.renderError('scopeName')}
        </div>

        <div class="input-container">
          <wa-input
            label="Description"
            .value=${values.description}
            @input=${(e: Event) =>
              this.form.setValue('description', (e.target as HTMLInputElement).value)}
            @blur=${() => void this.form.handleBlur('description')}
          ></wa-input>
          ${this.renderError('description')}
        </div>

        <div class="input-container">
          <span class="field-label" id="icon-label">Schema Icon</span>
          <wa-dropdown>
            <wa-button
              class="icon-select"
              slot="trigger"
              appearance="plain"
              with-caret
              aria-labelledby="icon-label"
            >
              ${this.renderIcon(values.iconName, 'icon-image')}
              <span>${values.iconName}</span>
            </wa-button>
            <div class="icon-menu">
              ${APP_ICON_NAMES.map(
                (iconName) => html`
                  <wa-dropdown-item
                    type="checkbox"
                    ?checked=${iconName === values.iconName}
                    @click=${() => this.form.setValue('iconName', iconName)}
                  >
                    <span slot="icon">${this.renderIcon(iconName, 'icon-menu-image')}</span>
                    ${iconName}
                  </wa-dropdown-item>
                `,
              )}
            </div>
          </wa-dropdown>
        </div>

        <div class="checkbox-row">
          <keep-checkbox
            size="m"
            ?checked=${values.isActive}
            @change=${(e: Event) => this.form.setValue('isActive', this.checkedOf(e))}
          ></keep-checkbox>
          <span>Active</span>
        </div>

        <div class="input-container">
          <span class="field-label">Additional Modes</span>
          <!-- One checkbox per mode. The React version declared Odata and DQL twice,
               character for character, so the drawer read Odata / DQL / Odata / DQL (#892). -->
          <div class="modes checkbox-row">
            <keep-checkbox
              ?checked=${values.additionalModes.odata}
              @change=${(e: Event) => this.form.setValue('additionalModes.odata', this.checkedOf(e))}
            ></keep-checkbox>
            <span>Odata</span>
          </div>
          <div class="modes checkbox-row">
            <keep-checkbox
              ?checked=${values.additionalModes.dql}
              @change=${(e: Event) => this.form.setValue('additionalModes.dql', this.checkedOf(e))}
            ></keep-checkbox>
            <span>DQL</span>
          </div>
        </div>

        <div class="actions">
          <keep-button @click=${() => this.emit('close')}>Close</keep-button>
          <keep-button ?disabled=${this.form.submitting} @click=${() => void this.form.submit()}>
            Add
          </keep-button>
        </div>

        <!-- The form's only submitter, so Enter in a field reaches the submit handler (#896).
             Neither keep-button nor its inner wa-button is form-associated, and wa-input's
             implicit submission walks the form's elements collection for an enabled submit
             control - with none, Enter did nothing at all.

             No backticks in this comment: it sits inside an html tagged template, and one
             would close it. Same trap as the css templates above. -->
        <button type="submit" hidden aria-hidden="true" tabindex="-1"></button>
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-quick-config-form': QuickConfigForm;
  }
}
