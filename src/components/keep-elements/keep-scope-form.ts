/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import * as Yup from 'yup';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/dropdown/dropdown.js';
import '@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { FormController } from '../../store/FormController';
import { FA_LIBRARY } from '../../services/icon-library';
import { changeScope } from '../../store/databases/action';
import {
  DEFAULT_APP_ICON_NAME,
  appIconPayload,
  getAppIcons,
  loadAppIcons,
  type AppIconMap,
} from '../../services/app-icons';
import type { AvailableDatabases } from '../../store/databases/types';
import './keep-schema-contents-tree';
import type { KeepSchemaSelectDetail } from './keep-schema-contents-tree';
import './keep-icon-dropdown';
import type { KeepIconSelectDetail } from './keep-icon-dropdown';
import './keep-checkbox';
import type Checkbox from './keep-checkbox';
import './keep-button';

/** The seven ACLs the scope drawer offers, in the order the drawer listed them. */
const ACCESS_LEVELS = [
  'NoAccess',
  'Depositor',
  'Reader',
  'Author',
  'Editor',
  'Designer',
  'Manager',
] as const;

/** The ACL a scope gets when nothing else is known — the value the drawer defaulted to. */
const DEFAULT_ACCESS_LEVEL = 'Editor';

/** The values this form owns. Everything else in the POST body is derived — see `buildPayload`. */
export interface ScopeFormValues {
  apiName: string;
  description: string;
  server: string;
  /** Full path of the database holding the schema. Chosen in the tree on the left. */
  nsfPath: string;
  /** The schema (API) name inside that database. Chosen in the same tree. */
  schemaName: string;
  isActive: boolean;
  iconName: string;
  maximumAccessLevel: string;
}

/**
 * A scope as the list view hands it over. Every field optional: the still-React parent starts
 * with an empty object and fills it in when a card is opened.
 */
export interface ScopeRow {
  apiName?: string;
  description?: string;
  server?: string;
  nsfPath?: string;
  schemaName?: string;
  isActive?: boolean;
  iconName?: string;
  maximumAccessLevel?: string;
}

const INITIAL_VALUES: ScopeFormValues = {
  apiName: '',
  description: '',
  server: '',
  nsfPath: '',
  schemaName: '',
  isActive: true,
  iconName: DEFAULT_APP_ICON_NAME,
  maximumAccessLevel: DEFAULT_ACCESS_LEVEL,
};

/** `wa-dropdown`'s selection event, narrowed to the two fields this element reads. */
type WaSelect = Event & { detail: { item: { value: string; checked: boolean } } };

/**
 * The Scope form: pick a schema, name the scope, save. Tag: `keep-scope-form`.
 *
 * Replaces `components/database/ScopeForm.tsx`, and takes with it the form state that
 * `ScopeFormContainer.tsx` used to hold.
 *
 * ### It owns its form, and it owns the submit
 *
 * The React pair passed an opaque form object from container to leaf as a prop. Converting
 * that shape faithfully would have meant handing it across a shadow boundary as a property —
 * keeping the coupling alive through the type after removing it from the imports. So the
 * `FormController` lives here, with the schema and the `changeScope` dispatch, exactly as in
 * `keep-quick-config-form` and `keep-app-form`.
 *
 * ### Three values that were kept twice, and disagreed
 *
 * The container held `icon`, `maximumAccessLevel`, `nsfPath` and `schemaName` in component
 * state *as well as* in the form's values, and its submit handler read the component copies.
 * Two of those copies were seeded once, when the drawer element first mounted — which it does
 * on the Scopes screen with no scope selected — and no effect ever updated them again:
 *
 * - `icon` started at the default and **only** moved when the user picked from the menu, so
 *   opening an existing scope showed the default glyph and pressing Update overwrote that
 *   scope's `iconName` with it.
 * - `maximumAccessLevel` started at `Editor` the same way, so Update overwrote the scope's
 *   real access level too.
 *
 * Both are single-sourced here: the seed reads the row, the controls write the same value the
 * payload is built from, and there is no second copy left to drift. Reported as a defect
 * against the React version rather than presented as new behaviour.
 *
 * ### Errors appear on blur
 *
 * Every validated field wires `@blur`, so a required field reports itself when the user leaves
 * it and the first press reports whatever is left. The Formik markup described this and never
 * did it — `handleBlur` was wired nowhere, so `touched` only flipped on submit.
 *
 * The duplicate-name check moved into the schema with the rest. It used to be a hand-rolled
 * guard inside the Add handler plus a component-state error string, which meant it could not
 * fire on blur and had to be cleared by hand on every keystroke.
 *
 * @fires close - the Close button was pressed. The container decides what that means.
 * @fires delete - the Delete button was pressed. The container owns the permission check.
 */
@customElement('keep-scope-form')
export default class ScopeForm extends KeepElement {
  static styles = css`
    /* The global reset does not cross a shadow boundary, and this layout needs it: the two
       columns are sized in percentages (40% + 55%) and both carry padding. Under content-box
       that padding is added outside the percentage, so the right-hand column overflows the
       drawer and clips its fields. */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    /* Was the Forms styled.form, which wrapped both columns. The real form is the right-hand
       column only, so the schema search box sits outside it and Enter there cannot submit. */
    :host {
      display: flex;
      flex: 1 1 auto;
      min-height: 0;
      width: 100%;
    }

    /* --- left column: search + schema tree ----------------------------------------- */

    /* Was the FileStructure styled.div. */
    .file-structure {
      width: 40%;
      display: flex;
      margin: 0;
      flex-direction: column;
      min-height: 0;
    }

    /* The banner over the schema tree.

       Global classes do not cross a shadow boundary, so every rule this element used is
       restated here. The originals stay in styles.css while other files still use them; they
       are deliberately not named in these comments, because the dead-selector guard scans
       source text and a mention here would keep a rule alive past its last real user.

       The literal white it replaces is a token that keep-theme measures against the brand
       surface in both modes. */
    .available-databases-text {
      color: var(--wa-color-brand-on-loud, #fff);
      font-size: 18px;
      padding: 10px;
      border-radius: var(--wa-border-radius-m);
      background: var(--keep-surface-brand);
    }

    /* Was the margin utility beside the search field, plus its full-width prop. */
    .search {
      margin-top: 8px;
    }

    /* Was styled(Paper) — a raised surface from the component library that is going away. */
    .search-results {
      height: calc(100vh - 153px);
      padding: 5px 0;
      overflow-y: auto;
      background: var(--wa-color-surface-raised);
      border: 1px solid var(--wa-color-surface-border);
      border-radius: var(--wa-border-radius-m);
    }

    /* --- right column: the fields --------------------------------------------------- */

    /* Was the FormContentContainer styled.div plus the flex and column utilities beside it.
       A form element, not a div, so Enter in a field submits. margin: 0 because some UA
       stylesheets give a form a bottom margin, which would push the column past the drawer. */
    .form-content {
      margin: 0;
      padding: 0 20px;
      min-width: 55%;
      max-width: 100%;
      width: 100%;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    /* The form's title bar. A heading element rather than a span: it names the panel, and the
       drawer's own title is the only other heading in here. */
    .form-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      color: var(--wa-color-brand-on-loud, #fff);
      background: var(--keep-surface-brand);
      font-size: 24px;
      font-weight: normal;
      padding: 20px;
      border-radius: var(--wa-border-radius-m);
      width: 100%;
    }

    /* Inline banner for a failed save, in place of the component library's alert. */
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

    /* Was the danger colour utility at 18px. The token is mode-aware; the class behind it
       resolves through a variable that does not reach in here. */
    .save-error-message {
      color: var(--keep-color-danger-text);
      font-size: 18px;
    }

    /* Was the InputContainer styled.div. */
    .input-container {
      padding: 5px 0;
    }

    .input-container.first {
      margin-top: 5px;
    }

    /* The two read-only rows that echo the tree selection. The second one truncates, which
       is what its own class did; both were a flex row with a fixed-width caption. */
    .path-row {
      display: flex;
      color: var(--wa-color-text-normal);
    }

    .path-row.truncate {
      text-overflow: ellipsis;
      overflow-x: hidden;
    }

    .path-label {
      min-width: 85px;
    }

    /* Was the small-text utility, plus the primary text colour on the icon caption. */
    .field-label {
      display: block;
      color: var(--wa-color-text-normal);
      font-size: 14px;
    }

    .field-error {
      display: block;
      color: var(--keep-color-danger-text);
      font-size: 14px;
    }

    /* Was the fullWidth prop on every field. */
    wa-input {
      display: block;
      width: 100%;
    }

    /* The server field's example list. Its colour was the component library's primary
       palette entry; this token is the contrast-checked equivalent and is mode-aware. */
    .server-hint {
      font-size: 12px;
      color: var(--keep-text-brand);
    }

    .server-hint ul {
      margin: 4px 0;
      padding-left: 20px;
    }

    /* The access-level trigger. A native button rather than the library's text button, which
       emitted styles that beat the app sheet and painted the label brand-coloured and upper
       case. The width shrinks to the label, as the fit-content utility asked. */
    .acl-trigger {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      width: fit-content;
      padding: 0;
      border: 0;
      background: none;
      cursor: pointer;
      font-family: inherit;
      font-size: inherit;
      text-transform: capitalize;
      color: var(--wa-color-text-normal);
    }

    /* A native button draws a ring on pointer clicks too, which the library button
       suppressed. Keyboard users keep theirs. */
    .acl-trigger:focus {
      outline: none;
    }

    .acl-trigger:focus-visible {
      outline: var(--wa-focus-ring);
      outline-offset: calc(-1 * var(--wa-focus-ring-width));
    }

    /* wa-icon has no size property — the glyph takes its box from font-size, and the utility
       class that used to supply it is in the document sheet. 18px is what that class set. */
    .caret {
      font-size: 18px;
    }

    .checkbox-row {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
      padding: 5px 0;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      padding: 16px 0;
    }

    /* Each action button takes a quarter of the column, as the global utility did. */
    .actions keep-button {
      width: 25%;
    }
  `;

  /**
   * One subscription for the whole slice, on purpose. The React leaf called the selector hook
   * twice, back to back, and neither call narrowed anything — both returned the slice itself.
   * The five fields read here include two large arrays, so a projection would allocate a new
   * object on every store change and still compare the same two array references.
   */
  private readonly db = new StoreController(this, (state) => state.databases);

  /** Drives the seed: the drawer's opening edge clears whatever the last visit left behind. */
  private readonly drawer = new StoreController(this, (state) => state.drawer.visible);

  private readonly form = new FormController<ScopeFormValues>(this, {
    initialValues: INITIAL_VALUES,
    schema: this.buildSchema(),
    onSubmit: (values) => this.save(values),
  });

  /** The scope being edited, or nothing when the drawer is standing in for an Add. */
  @property({ attribute: false }) accessor database: ScopeRow | undefined;

  /** Whether this visit is an edit. Owned by the still-React list view. */
  @property({ type: Boolean }) accessor isEdit = false;

  @state() private accessor search = '';

  /**
   * Whether anything has been edited since the last seed — the Update button's gate, which
   * the React leaf spelled `updateButtonDisabled`.
   */
  @state() private accessor dirty = false;

  /**
   * The 86 icon payloads, once the lazily loaded chunk lands. Empty until then.
   *
   * Read at submit rather than in `render`: the POST body carries the base64 `icon` next to
   * `iconName`, so the payload has to be resolvable outside of rendering. The picker below
   * loads and renders its own.
   */
  @state() private accessor icons: AppIconMap = getAppIcons();

  /** Identity of the row the current values were seeded from. */
  private seededRow: ScopeRow | undefined;

  /** Which mode that seed was for, so an Add straight after an Edit re-seeds. */
  private seededIsEdit: boolean | undefined;

  /** Previous drawer flag, so the seed sees the edge rather than the level. */
  private wasOpen = false;

  connectedCallback(): void {
    super.connectedCallback();
    void loadAppIcons().then(
      (icons) => {
        this.icons = icons;
      },
      () => {
        /* the picker keeps its skeleton up; nothing here can retry usefully */
      },
    );
  }

  /**
   * `willUpdate`, not `updated`: seeding writes to the controller, which requests another
   * update. Done after the render that is a second pass and a console warning; done before it,
   * the new values are part of the render that is already happening.
   *
   * Two triggers, and both are needed. The list view sets its React state and dispatches the
   * drawer toggle in the same handler, so which of the two arrives here first is not something
   * this element can rely on — the property change and the opening edge can land in either
   * order, or together. Identity alone would miss a second Add in a row (nothing about the
   * pristine values changed); the edge alone would read whichever property value happened to
   * arrive first.
   *
   * The drawer flag is compared explicitly rather than looked up in `changedProperties`,
   * because it arrives from a `StoreController`, which drives re-renders with a bare
   * `requestUpdate()` and so puts nothing in that map.
   */
  protected willUpdate(): void {
    const opened = this.drawer.value && !this.wasOpen;
    this.wasOpen = this.drawer.value;
    if (this.database !== this.seededRow || this.isEdit !== this.seededIsEdit) {
      this.seededRow = this.database;
      this.seededIsEdit = this.isEdit;
      this.applySeed();
    } else if (opened) {
      this.applySeed();
    }
  }

  /**
   * Load the row into the form.
   *
   * `reset` then `setValues` rather than one call, because `FormController` fixes its
   * `initialValues` at construction: there is no way to tell it that the form now stands for a
   * different row. `reset` is what clears `errors`, `touched` and `submitted` from the previous
   * visit; `setValues` puts the row in on top of the blanks it just restored. That gap is #935.
   *
   * The search box is deliberately left alone: it was component state in the React leaf, which
   * stayed mounted between visits, so a search survived closing and reopening the drawer.
   */
  private applySeed(): void {
    this.form.reset();
    this.form.setValues(seedValues(this.database, this.isEdit));
    this.dirty = false;
  }

  /**
   * The rules the container declared, moved here with the values they validate, plus the
   * duplicate-name check that used to be a guard inside the Add handler.
   *
   * A method rather than a plain function because the duplicate rule reads the store and the
   * mode as they are when validation runs, not as they were when the schema was built. An edit
   * is exempt from it: the scope being edited is in the list under its own name.
   */
  private buildSchema(): Yup.AnyObjectSchema {
    return Yup.object().shape({
      apiName: Yup.string()
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
          if (!val || this.isEdit) return true;
          return !this.db.value.scopes.some((scope) => scope.apiName === val);
        }),
      description: Yup.string()
        .min(4, 'Description is too short (minimum is 4 characters)')
        .required('Please provide a short description about this scope'),
      schemaName: Yup.string().required('Please select a schema!'),
    }) as Yup.AnyObjectSchema;
  }

  /**
   * The request body. The thunk closes the drawer and posts its own alert on success, so
   * there is nothing to do afterwards.
   *
   * The React version reached the same shape through a stringify/parse round trip, which was
   * a deep clone standing in for the copy `FormController` already guarantees.
   */
  private buildPayload(values: ScopeFormValues) {
    return {
      ...values,
      server: values.server ? values.server.trim() : '',
      icon: appIconPayload(values.iconName, this.icons),
    };
  }

  private save(values: ScopeFormValues): void {
    this.db.dispatch(changeScope(this.buildPayload(values), this.isEdit));
  }

  /** Every control routes its write through here, so the Update gate cannot be forgotten. */
  private setValue(path: keyof ScopeFormValues, value: unknown): void {
    this.dirty = true;
    this.form.setValue(path, value);
  }

  /**
   * Scope names are restricted to lowercase alphanumerics.
   *
   * `live` on the binding is what takes back a character that sanitises away: the form value
   * does not change when the user types a rejected character, so an ordinary binding would
   * skip the update and leave the character sitting in the box, drifting from what is
   * submitted. The React version assigned to the event target for the same reason.
   */
  private handleApiNameInput(event: Event): void {
    const raw = (event.target as HTMLInputElement).value ?? '';
    this.setValue('apiName', raw.toLowerCase().replace(/[^a-z0-9]/g, ''));
  }

  private handleSchemaSelect(event: CustomEvent<KeepSchemaSelectDetail>): void {
    // Both halves, and both into the form. The React version wrote `nsfPath` into component
    // state only and assigned `schemaName` straight into the form object — a mutation nothing
    // was subscribed to, which only appeared to work when an unrelated render followed.
    this.setValue('nsfPath', event.detail.nsfPath);
    this.setValue('schemaName', event.detail.schemaName);
  }

  /**
   * The access level. Bound on the dropdown rather than on each item: Web Awesome synthesises
   * a click only for pointer selection, so a per-item handler is dead for anyone driving the
   * menu with the arrow keys and Enter, and it fires on a disabled item.
   */
  private handleAclSelect(event: Event): void {
    // Composed, and would otherwise surface on the container as an event it never asked for.
    event.stopPropagation();
    const { item } = (event as WaSelect).detail;
    // wa-dropdown flips a checkbox item's own `checked` before it emits. Re-picking the level
    // that is already chosen therefore unticks its row, and the binding below cannot put it
    // back because its committed value has not moved.
    item.checked = true;
    this.setValue('maximumAccessLevel', item.value);
  }

  /**
   * `keep-checkbox` re-emits its own composed `change` with no detail, having stopped the
   * inner event, so the state is on the element and `target` is the `keep-checkbox` itself.
   */
  private checkedOf(event: Event): boolean {
    return (event.target as Checkbox).checked;
  }

  /**
   * Implicit submission — Enter in any single-line field.
   *
   * `preventDefault` because a native submit would navigate; the values live in the controller
   * rather than in the form's elements collection, so there is nothing for the browser to send.
   */
  private handleSubmitEvent(event: Event): void {
    event.preventDefault();
    void this.form.submit();
  }

  /** Sorted by title when unfiltered, as before; the filter narrows each database's schemas. */
  private get visibleDatabases(): AvailableDatabases[] {
    const withSchemas = this.db.value.availableDatabases.filter(
      (data) => (data.apinames?.length ?? 0) > 0,
    );
    if (this.search === '') {
      return withSchemas
        .slice()
        .sort((a, b) => (a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1));
    }
    const needle = this.search.toLowerCase();
    return withSchemas
      .map((data) => ({
        title: data.title,
        nsfpath: data.nsfpath,
        apinames: data.apinames.filter((api) => api.toLowerCase().includes(needle)),
      }))
      .filter((data) => data.apinames.length > 0);
  }

  /** The display gate is `touched && errors`, so a field the user has not reached stays quiet. */
  private renderError(path: keyof ScopeFormValues) {
    const message = this.form.touched[path] ? this.form.errors[path] : undefined;
    // Never interpolated unconditionally: the React version rendered the key into a string,
    // which shows the user the word "undefined" whenever the field is in fact valid. It also
    // gated the schema message on a different field's touched flag, so leaving the scope name
    // reported a schema the user had not been asked for yet.
    return message ? html`<span class="field-error">${message}</span>` : nothing;
  }

  render() {
    const { dbError, dbErrorMessage } = this.db.value;
    const { values } = this.form;
    const editing = this.isEdit;
    return html`
      <div class="file-structure">
        <span class="available-databases-text">Available Schema</span>
        <wa-input
          class="search"
          label="Search Schema"
          .value=${this.search}
          @input=${(e: Event) => {
            this.search = (e.target as HTMLInputElement).value ?? '';
          }}
        ></wa-input>
        <div class="search-results">
          <keep-schema-contents-tree
            .contents=${this.visibleDatabases}
            @schema-select=${(e: CustomEvent<KeepSchemaSelectDetail>) =>
              this.handleSchemaSelect(e)}
          ></keep-schema-contents-tree>
        </div>
      </div>

      <form class="form-content" @submit=${(e: Event) => this.handleSubmitEvent(e)}>
        <h2 class="form-header">
          <wa-icon library=${FA_LIBRARY} name="database" canvas="auto"></wa-icon>
          <span>${editing ? 'Edit Scope' : 'Add New Scope'}</span>
        </h2>

        ${dbError && dbErrorMessage
          ? html`<div class="save-error" role="alert">
              <span class="save-error-title">
                Error: Unable to ${editing ? 'edit' : 'add'} scope
              </span>
              <span class="save-error-message">${dbErrorMessage}</span>
            </div>`
          : nothing}

        <div class="input-container first">
          <span class="path-row">
            <span class="path-label">Database:</span>
            <span>${values.nsfPath}</span>
          </span>
        </div>
        <div class="input-container">
          <span class="path-row truncate">
            <span class="path-label">Schema:</span>
            <span>${values.schemaName}</span>
          </span>
        </div>
        ${this.renderError('schemaName')}

        <div class="input-container first">
          <wa-input
            id="apiName"
            label="Scope Name"
            ?disabled=${editing}
            .value=${live(values.apiName)}
            @input=${(e: Event) => this.handleApiNameInput(e)}
            @blur=${() => void this.form.handleBlur('apiName')}
          ></wa-input>
          ${this.renderError('apiName')}
        </div>

        <div class="input-container">
          <wa-input
            id="description"
            label="Description"
            .value=${values.description}
            @input=${(e: Event) =>
              this.setValue('description', (e.target as HTMLInputElement).value)}
            @blur=${() => void this.form.handleBlur('description')}
          ></wa-input>
          ${this.renderError('description')}
        </div>

        <div class="input-container">
          <wa-input
            id="server"
            label="Server"
            .value=${values.server}
            @input=${(e: Event) => this.setValue('server', (e.target as HTMLInputElement).value)}
          >
            <div slot="hint" class="server-hint">
              <span>
                Optional : Server name must be heirarchical or canonical format.<br />For
                example:
              </span>
              <ul>
                <li>Server/Org</li>
                <li>CN=Server/O=Org</li>
              </ul>
            </div>
          </wa-input>
        </div>

        <div class="input-container">
          <span class="field-label">Maximum Access Level</span>
          <wa-dropdown @wa-select=${(e: Event) => this.handleAclSelect(e)}>
            <button
              class="acl-trigger"
              slot="trigger"
              type="button"
              aria-label="Maximum Access Level: ${values.maximumAccessLevel}"
            >
              <span>${values.maximumAccessLevel}</span>
              <wa-icon
                class="caret"
                library=${FA_LIBRARY}
                name="chevron-down"
                canvas="auto"
              ></wa-icon>
            </button>
            ${ACCESS_LEVELS.map(
              (acl) => html`
                <wa-dropdown-item
                  type="checkbox"
                  value=${acl}
                  ?checked=${acl === values.maximumAccessLevel}
                >
                  ${acl}
                </wa-dropdown-item>
              `,
            )}
          </wa-dropdown>
        </div>

        <div class="input-container">
          <span class="field-label">Scope Icon</span>
          <keep-icon-dropdown
            label="Scope Icon"
            .iconName=${values.iconName}
            @icon-select=${(e: CustomEvent<KeepIconSelectDetail>) =>
              this.setValue('iconName', e.detail.iconName)}
          ></keep-icon-dropdown>
        </div>

        <div class="checkbox-row">
          <keep-checkbox
            size="m"
            ?checked=${values.isActive}
            @change=${(e: Event) => this.setValue('isActive', this.checkedOf(e))}
          ></keep-checkbox>
          <span>Active</span>
        </div>

        <div class="actions">
          <keep-button @click=${() => this.emit('close')}>Close</keep-button>
          <keep-button
            ?disabled=${this.form.submitting || (editing && !this.dirty)}
            @click=${() => void this.form.submit()}
          >
            ${editing ? 'Update' : 'Add'}
          </keep-button>
          ${editing
            ? html`<keep-button @click=${() => this.emit('delete')}>Delete</keep-button>`
            : nothing}
        </div>

        <!-- The form's only submitter, so Enter in a field reaches the submit handler.
             Neither keep-button nor its inner Web Awesome button is form-associated, and an
             input's implicit submission walks the form's elements collection looking for an
             enabled submit control - with none, Enter did nothing at all. -->
        <button type="submit" hidden aria-hidden="true" tabindex="-1"></button>
      </form>
    `;
  }
}

/**
 * The values a visit starts from: the row being edited, or the pristine blanks.
 *
 * A plain function because nothing in it reads the element. The fallbacks are the React
 * version's, which tolerated a partially filled row arriving from the list.
 */
function seedValues(row: ScopeRow | undefined, isEdit: boolean): ScopeFormValues {
  if (!isEdit) return { ...INITIAL_VALUES };
  return {
    apiName: row?.apiName ?? '',
    description: row?.description ?? '',
    server: row?.server ?? '',
    nsfPath: row?.nsfPath ?? '',
    schemaName: row?.schemaName ?? '',
    isActive: row?.isActive ?? true,
    iconName: row?.iconName || DEFAULT_APP_ICON_NAME,
    maximumAccessLevel: row?.maximumAccessLevel || DEFAULT_ACCESS_LEVEL,
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-scope-form': ScopeForm;
  }
}
