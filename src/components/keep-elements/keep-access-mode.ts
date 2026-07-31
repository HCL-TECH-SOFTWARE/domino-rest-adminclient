/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { v4 as uuid } from 'uuid';
import './keep-access-tabs';
import './keep-button';
import './keep-field-list';
import './keep-mode-compare';
import './keep-network-error-dialog';
import './keep-page-loading';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { RouterController } from '../../router/RouterController';
import type { Database, Mode } from '../../store/databases/types';
import {
  cacheFormFields,
  setLoadedFields,
  addActiveFields,
  fetchSchema,
  pullForms,
} from '../../store/databases/action';
import { resetAccessFields, setAccessFields } from '../../store/accessMode/action';
import type { AccessField, AccessModeState } from '../../store/accessMode/types';
import type { KeepFieldsAddDetail } from './keep-field-list';
import type { KeepFieldItem } from './keep-field-container';
import type { KeepFieldIndexChangeDetail, KeepFieldsRemoveDetail } from './keep-mode-fields';
import type { KeepFieldUpdateDetail } from './keep-field-container';
import type {
  KeepAccessTabMode,
  KeepModeIndexChangeDetail,
  KeepPageIndexChangeDetail,
  KeepPostSaveActionDetail,
  KeepSchemaDataChangeDetail,
} from './keep-access-tabs';

/** The route this screen is mounted on, and the only place its three names come from. */
const ACCESS_ROUTE = '/schema/:nsfPath/:dbName/:formName/access';

/** Below this width the field palette is hidden and the editor gets the whole row. */
const NARROW = '(max-width: 768px)';

/** The empty schema the screen shows until `fetchSchema` answers. */
const EMPTY_SCHEMA: Database = {
  '@unid': '',
  apiName: '',
  schemaName: '',
  description: '',
  nsfPath: '',
  icon: 'beach',
  iconName: 'beach',
  isActive: 'true',
  owners: [],
  isModeFetch: false,
  modes: [],
  forms: [],
  configuredForms: [],
  views: [],
  agents: [],
};

/**
 * Schema Management: the field palette, the mode editor, and the mode-comparison dialog.
 * Tag: `keep-access-mode`.
 *
 * Replaces `components/access/AccessMode.tsx`, the view behind
 * `/schema/:nsfPath/:dbName/:formName/access`. It owns the schema it fetched, the mode list
 * derived from it, which mode and which field are selected, and the shared field map —
 * `keep-access-tabs` below owns everything that belongs to the mode being edited.
 *
 * ## The field map is a store slice
 *
 * It was a `useState` behind a React context; #806 decision 1 turned that into
 * `store/accessMode`, so the map keeps its name and its shape and the reads all over this
 * file are unchanged. The slice outlives this screen, which is why the reset below is
 * explicit rather than a `useState` initialiser: without it, the previous form's fields are
 * still in the store when the next one mounts.
 *
 * ## The router comes from a controller
 *
 * The app's one instance used to come down from `react/KeepAccessMode.ts`, the last React
 * frame above this screen, because `Router` is deliberately framework-free and had no Lit
 * binding. #926 gave it one, so {@link route} reaches it directly; #719 P4 then deleted that
 * wrapper outright, since the Lit outlet mounts this module by tag. Everything derived from
 * the URL is still derived here and handed down; `keep-access-tabs` has its own controller,
 * because creating a form navigates away from this page.
 *
 * ## #928 and #933, and why the mode list is derived
 *
 * Every crash this screen had was a cold load — the route reached without the schema's Forms
 * tab having run first, which is a *sibling* route rather than a parent, so nothing it
 * fetched is in the store. `allModes` is a pure function of data this element already has,
 * so a copy in state could only ever be stale, and one `?? []` in the getter is a guarantee
 * for all of its readers where `?? []` at each call site is a chance to miss one. Same for
 * the design list: an absent NSF means "not loaded", which the render treats as "still
 * loading".
 *
 * Those guards stopped the crash without giving the screen anything to render, so a cold
 * load simply stayed on the loading state — nothing on this route fetched the design list at
 * all. {@link syncDesign} is what fills it now (#933). The `?? []` guards stay regardless:
 * they are what keeps a *failed* pull a loading state rather than a white screen.
 *
 * ## What the shadow boundary cost
 *
 * `AccessModeContainer` from `access/styles.ts`, and `.header-container`, `.header-text` and
 * `.access-container` from `styles.css`. All restated below, plus the box-sizing reset,
 * which arrives through Web Awesome's native layer on a universal selector and so does not
 * cross.
 */
@customElement('keep-access-mode')
export default class AccessMode extends KeepElement {
  static styles = css`
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    :host {
      display: block;
    }

    /* was .header-container */
    .header-container {
      margin-top: 20px;
      display: flex;
      padding: 15px 0;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: space-between;
    }

    /* was .header-text */
    .header-text {
      display: flex;
      flex: 1;
      font-size: 24px;
      font-weight: bold;
      color: var(--wa-color-text-normal);
    }

    /* was the AccessModeContainer styled.div in access/styles.ts */
    .panels {
      display: flex;
      height: calc(100vh - 230px);
      overflow-y: hidden;
      gap: 20px;
    }

    /* was .access-container. The editor inside it is absolutely positioned, which is what
       the relative position and the padding are here for. */
    .access-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      align-items: center;
      padding-top: 50px;
      position: relative;
      margin: 10px;
      height: calc(100vh - 200px);
    }
  `;

  /** The shared field map. The slice's own object, so it is reference-stable between writes. */
  private readonly accessFields = new StoreController(
    this,
    (state) => state.accessMode.fields,
  );

  /** Whether a schema write is in flight, which replaces the editor with a spinner. */
  private readonly loading = new StoreController(this, (state) => state.dialog.loading);

  /** `newForm` and `nsfDesigns`, so one subscription rather than two projections. */
  private readonly db = new StoreController(this, (state) => state.databases);

  /**
   * The app's router (#926). The three route names below are read out of it.
   *
   * Selects the pathname: the query string plays no part on this screen, so the default
   * whole-location selector would re-render it for a change it cannot see.
   */
  private readonly route = new RouterController(this, (location) => location.pathname);

  /** The schema this form belongs to, as last fetched or last written. */
  @state() private accessor schemaData: Database = EMPTY_SCHEMA;

  /** The mode list the editor is working through — `allModes` as of the last sync. */
  @state() private accessor modes: KeepAccessTabMode[] = [];

  /** Which mode is being edited. */
  @state() private accessor currentModeIndex = -1;

  /** Which field of that mode is selected. */
  @state() private accessor fieldIndex = 0;

  @state() private accessor modeCompareOpen = false;

  /** True below the narrow breakpoint, where the field palette is not shown. */
  @state() private accessor narrow = false;

  /**
   * A dialog `keep-access-tabs` wants opened after the next save.
   *
   * It lives here because the editor does not survive a save: the spinner replaces it, so
   * the element that stashed the intent is not the element that acts on it.
   */
  @state() private accessor postSaveAction: 'add' | 'clone' | null = null;

  private readonly narrowQuery = window.matchMedia(NARROW);

  /** The memoised `allModes`, and the three inputs it was computed from. */
  private modeCache: { forms: unknown; newFormForm: unknown; formName: string; modes: Mode[] } | null =
    null;

  /** The last dependency list each of the three syncs below ran against. */
  private readonly deps = new Map<string, readonly unknown[]>();

  /**
   * A dependency array, compared the way one is: identity, per position.
   *
   * The three syncs were effects with dependency arrays, and each of them writes state that
   * would otherwise re-enter it. Reproducing the array is what keeps them edge-triggered
   * where `updated()` is level-triggered.
   */
  private depsChanged(name: string, next: readonly unknown[]): boolean {
    const previous = this.deps.get(name);
    if (
      previous !== undefined &&
      previous.length === next.length &&
      previous.every((value, index) => Object.is(value, next[index]))
    ) {
      return false;
    }
    this.deps.set(name, next);
    return true;
  }

  connectedCallback(): void {
    super.connectedCallback();
    // First, deliberately: the syncs below populate the map and this must not run after
    // them. `connectedCallback` is before the first render, where they are after it.
    this.accessFields.dispatch(resetAccessFields());
    this.narrow = this.narrowQuery.matches;
    this.narrowQuery.addEventListener('change', this.handleNarrowChange);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.narrowQuery.removeEventListener('change', this.handleNarrowChange);
  }

  /**
   * The four data syncs, in the order the effects they replace ran in.
   *
   * `willUpdate` rather than `updated`: each of them writes reactive state, and a write here
   * folds into the render already scheduled where one in `updated()` asks for a second one —
   * so the first frame the user sees is the one carrying the fetched schema. None of them can
   * re-enter: their dependency lists are checked first, and no sync writes its own inputs.
   *
   * `syncDesign` runs first because the other three read what it fetches.
   */
  protected willUpdate(): void {
    this.syncDesign();
    this.syncSchema();
    this.reseedFromSchema();
    this.syncModeFields();
  }

  private readonly handleNarrowChange = (event: MediaQueryListEvent): void => {
    this.narrow = event.matches;
  };

  /* ---------------------------------------------------------------- *
   *  Derived from the route and the store                              *
   * ---------------------------------------------------------------- */

  /** Route names, read through the pattern so a malformed escape decodes to itself. */
  private get params(): { nsfPath: string; dbName: string; formName: string } {
    const matched = this.route.params(ACCESS_ROUTE) ?? {};
    return {
      nsfPath: matched.nsfPath ?? '',
      dbName: matched.dbName ?? '',
      formName: matched.formName ?? '',
    };
  }

  /**
   * The modes of the form this screen is editing (#928).
   *
   * Memoised on its three inputs rather than recomputed, for the reason `StoreController`
   * documents: the empty-list result would otherwise be a fresh array every call, and the
   * effect guards below compare by identity.
   */
  private get allModes(): Mode[] {
    const forms = this.schemaData.forms ?? [];
    const newFormForm = this.db.value.newForm.form;
    const { formName } = this.params;
    const cache = this.modeCache;
    if (
      cache &&
      cache.forms === forms &&
      cache.newFormForm === newFormForm &&
      cache.formName === formName
    ) {
      return cache.modes;
    }
    const candidates = newFormForm ? [...forms, newFormForm] : forms;
    const match = candidates.find((form) => form?.formName === formName);
    const modes = Array.isArray(match?.formModes) ? (match.formModes as Mode[]) : [];
    this.modeCache = { forms, newFormForm, formName, modes };
    return modes;
  }

  /**
   * The NSF's design forms, and the screen's "is anything loaded yet" test.
   *
   * `?? []` for the same reason as `allModes` (#928). It used to be load-bearing for the
   * ordinary case too, because `nsfDesigns` was populated only by the Forms tab — a sibling
   * of this route rather than a parent — so a cold load never had an entry here at all.
   * {@link syncDesign} fetches it now (#933), and the guard covers the two windows that
   * remain: before the pull answers, and after one that failed.
   *
   * Keyed by the **decoded** path. See the note on `addNsfDesign` in the reducer.
   */
  private get designForms(): unknown[] {
    return this.db.value.nsfDesigns[this.params.nsfPath]?.forms ?? [];
  }

  private get fields(): AccessModeState['fields'] {
    return this.accessFields.value;
  }

  private setFields(next: AccessModeState['fields']): void {
    this.accessFields.dispatch(setAccessFields(next));
  }

  /* ---------------------------------------------------------------- *
   *  The four data syncs                                               *
   * ---------------------------------------------------------------- */

  /**
   * Fetch the NSF design when this route is entered without one (#933).
   *
   * `nsfDesigns` used to be written only by the Forms tab, and this route is that tab's
   * sibling rather than its child. Arriving through the tab therefore worked, because the
   * pull had already happened; a direct URL, a bookmark or F5 left the cache empty. Before
   * #928's guards that threw and blanked the app, and after them it renders "Loading form
   * modes" forever — {@link designForms} stays empty, so {@link allModes} does, so
   * `renderEditor` never leaves its loading branch. Nothing on this route would ever have
   * filled it in.
   *
   * The key is the **decoded** path, which is what every writer already uses — see the note
   * on `addNsfDesign` in the reducer. `params` reads through the route pattern, and the
   * outlet percent-decodes each captured segment, so the value here is the same string
   * `keep-forms-container` derives for its own writes.
   *
   * Guarded on the path rather than on "have I run", so that navigating between two schemas
   * without unmounting fetches the second one. The cache test is the guard that keeps this
   * to one request: once the pull lands, `nsfDesigns[nsfPath]` is set and the early return
   * takes over. A pull that *fails* leaves the cache empty and `dialog.loading` false, which
   * is the error path #928's `?? []` guards already cover — it does not retry in a loop,
   * because the dependency list has not changed.
   */
  private syncDesign(): void {
    if (this.route.params(ACCESS_ROUTE) === null) return;
    const { nsfPath, dbName } = this.params;
    if (!nsfPath) return;
    if (this.db.value.nsfDesigns[nsfPath]) return;
    if (!this.depsChanged('design', [nsfPath, dbName])) return;
    void this.db.dispatch(pullForms(nsfPath));
  }

  /** Fetch the schema whenever the database or the schema in the URL changes. */
  private syncSchema(): void {
    // A pathname that is not this route names no schema to fetch. It used to be spelled
    // "the router has not arrived yet"; the controller means it never has not.
    if (this.route.params(ACCESS_ROUTE) === null) return;
    const { nsfPath, dbName } = this.params;
    if (!this.depsChanged('schema', [nsfPath, dbName])) return;
    void this.db.dispatch(fetchSchema(nsfPath, dbName, this.handleSchemaData));
  }

  /**
   * Re-seed the shared field map from the mode the user is on whenever the schema comes back
   * from the server — a save, a mode add, a mode delete.
   *
   * An out-of-range mode index is a no-op rather than a crash: this element's own index can
   * outlive the mode it pointed at (#928).
   */
  private reseedFromSchema(): void {
    const { formName } = this.params;
    const newForm = this.db.value.newForm;
    if (!this.depsChanged('reseed', [this.schemaData, newForm.form, formName])) return;
    const allModes = this.allModes;
    if (allModes.length === 0 || newForm.enabled) return;
    const chosenMode = allModes[this.currentModeIndex];
    const currentKey = Object.keys(this.fields)[0];
    if (!chosenMode || currentKey === undefined) return;
    this.setFields({ ...this.fields, [currentKey]: chosenMode.fields });
  }

  /**
   * Track the mode list, choose which mode to show, and decorate its fields for display.
   *
   * The index rules are the original's: first load and delete go to the mode named `default`
   * (or the first, when there is none — `findIndex(…) || 0` kept -1 here, because -1 is
   * truthy, and `allModes[-1].fields` threw for any form whose default mode had been
   * renamed); an added mode goes to the end; an edit stays put.
   */
  private syncModeFields(): void {
    if (this.route.params(ACCESS_ROUTE) === null) return;
    const { dbName, formName } = this.params;
    const allModes = this.allModes;
    if (!this.depsChanged('modeFields', [this.route.value, allModes, dbName, formName])) return;

    if (this.designForms.length === 0) {
      this.db.dispatch(setLoadedFields(formName, []));
      this.db.dispatch(addActiveFields(formName, []));
      this.db.dispatch(cacheFormFields(dbName, formName, []));
    }
    if (allModes.length === 0) return;

    const defaultIndex = Math.max(
      allModes.findIndex((mode) => mode.modeName === 'default'),
      0,
    );
    let modeIndex: number;
    if (allModes.length > this.modes.length && this.modes.length === 0) {
      modeIndex = defaultIndex;
      this.currentModeIndex = modeIndex;
    } else if (allModes.length > this.modes.length) {
      modeIndex = allModes.length - 1;
      this.currentModeIndex = modeIndex;
    } else if (allModes.length < this.modes.length) {
      modeIndex = defaultIndex;
      this.currentModeIndex = modeIndex;
    } else {
      modeIndex = this.currentModeIndex;
    }

    this.modes = allModes as KeepAccessTabMode[];
    this.writeColumns(this.decorate(allModes[modeIndex]?.fields ?? []));
  }

  /** Give every field the id and display name the list rows are built from. */
  private decorate(fields: readonly AccessField[]): AccessField[] {
    return fields.map((field) => ({ id: uuid(), content: field.name, ...field }));
  }

  /**
   * Write one list into the map's columns, in key order.
   *
   * There has only ever been one column; the loop is what is left of a two-column layout and
   * is preserved because every reader still indexes the map by `Object.keys(…)[0]`.
   */
  private writeColumns(list: AccessField[]): void {
    const columns: AccessModeState['fields'] = {};
    let index = 0;
    for (const columnKey of Object.keys(this.fields)) {
      columns[columnKey] = index === 0 ? list : [];
      index += 1;
    }
    this.setFields({ ...this.fields, ...columns });
  }

  /* ---------------------------------------------------------------- *
   *  Field-map edits, driven by the editor below                       *
   * ---------------------------------------------------------------- */

  private readonly handleSchemaData = (schemaData: Database): void => {
    this.schemaData = schemaData;
  };

  /** Remove every field the user ticked, matched on id or display name. */
  private removeFields(fields: readonly AccessField[]): void {
    const ids = new Set(fields.map((field) => field.id));
    const contents = new Set(fields.map((field) => field.content));
    const next: AccessModeState['fields'] = {};
    for (const [columnKey, list] of Object.entries(this.fields)) {
      next[columnKey] = list.filter(
        (field) => !ids.has(field.id) && !contents.has(field.content),
      );
    }
    this.setFields(next);
  }

  /** Replace one field of one column with the edited copy. */
  private updateField(detail: KeepFieldUpdateDetail): void {
    const list = this.fields[detail.droppableIndex];
    if (!list) return;
    this.setFields({
      ...this.fields,
      [detail.droppableIndex]: list.map((field, index) =>
        index === detail.itemIndex ? (detail.item as AccessField) : field,
      ),
    });
  }

  /** Append the fields picked in the palette, skipping any the mode already shows. */
  private addFields(items: readonly AccessField[]): void {
    const columnKey = Object.keys(this.fields)[0];
    if (columnKey === undefined) return;
    const existing = this.fields[columnKey] ?? [];
    const present = new Set(existing.map((field) => field.content));
    const added = items.filter((item) => !present.has(item.content));
    this.setFields({ [columnKey]: [...existing, ...added] });
  }

  /**
   * Add one custom field, answering with the reason it could not.
   *
   * A bound arrow field, not a method: `keep-mode-fields` calls this from its own template,
   * so a plain method would run with `this` pointing at that element and write the new field
   * onto it instead.
   */
  private readonly addField = (_from: string, item: KeepFieldItem): string => {
    const columnKey = Object.keys(this.fields)[0];
    if (columnKey === undefined) return '';
    const existing = this.fields[columnKey] ?? [];
    if (existing.some((field) => field.name === item.name)) return 'The name already exists.';
    this.setFields({ ...this.fields, [columnKey]: [...existing, item as AccessField] });
    return '';
  };

  /**
   * Reseed the field map from mode `index` — the editor's "show me this mode" signal, and
   * also its "put everything back" after a discard.
   *
   * The fresh `modes` array is what tells the editor to re-read the mode: it compares by
   * identity, exactly as a dependency array does. An out-of-range index is a no-op; the
   * original indexed it unguarded.
   */
  private showMode(index: number): void {
    const mode = this.modes[index];
    if (!mode) return;
    this.writeColumns(
      (mode.fields as AccessField[]).map((field) =>
        field.id ? { ...field } : { id: uuid(), content: field.name, ...field },
      ),
    );
    this.modes = [...this.modes];
  }

  /* ---------------------------------------------------------------- *
   *  Render                                                            *
   * ---------------------------------------------------------------- */

  private renderEditor() {
    const { nsfPath, dbName, formName } = this.params;
    if (this.loading.value || this.modes.length === 0) {
      // `contained` keeps this inside the panel. Without it the element is absolutely
      // positioned and 100px taller than that box, so it would cover the page.
      return html`<keep-page-loading contained message="Loading form modes"></keep-page-loading>`;
    }
    return html`
      <keep-access-tabs
        .state=${this.fields}
        .modes=${this.modes}
        .currentModeIndex=${this.currentModeIndex}
        .fieldIndex=${this.fieldIndex}
        .schemaData=${this.schemaData}
        .nsfPath=${nsfPath}
        .schemaName=${dbName}
        .formName=${formName}
        .addField=${this.addField}
        .postSaveAction=${this.postSaveAction}
        @fields-remove=${(event: CustomEvent<KeepFieldsRemoveDetail>) =>
          this.removeFields(event.detail.fields as AccessField[])}
        @field-update=${(event: CustomEvent<KeepFieldUpdateDetail>) =>
          this.updateField(event.detail)}
        @field-index-change=${(event: CustomEvent<KeepFieldIndexChangeDetail>) => {
          this.fieldIndex = event.detail.fieldIndex;
        }}
        @mode-index-change=${(event: CustomEvent<KeepModeIndexChangeDetail>) => {
          this.currentModeIndex = event.detail.index;
        }}
        @page-index-change=${(event: CustomEvent<KeepPageIndexChangeDetail>) =>
          this.showMode(event.detail.index)}
        @schema-data-change=${(event: CustomEvent<KeepSchemaDataChangeDetail>) => {
          this.schemaData = event.detail.schemaData;
        }}
        @post-save-action=${(event: CustomEvent<KeepPostSaveActionDetail>) => {
          this.postSaveAction = event.detail.action;
        }}
      ></keep-access-tabs>
    `;
  }

  private renderScreen() {
    const { nsfPath, dbName, formName } = this.params;
    return html`
      <div>
        <div class="header-container">
          <p class="header-text">Schema Management - ${formName}</p>
          <keep-button
            ?disabled=${this.modes.length === 1}
            @click=${() => {
              this.modeCompareOpen = true;
            }}
          >
            Open Mode Compare
          </keep-button>
        </div>
        <div class="panels">
          ${this.narrow
            ? nothing
            : html`
                <keep-field-list
                  .schemaName=${dbName}
                  .nsfPath=${nsfPath}
                  .formName=${formName}
                  @fields-add=${(event: CustomEvent<KeepFieldsAddDetail>) =>
                    this.addFields(event.detail.items as AccessField[])}
                ></keep-field-list>
              `}
          <div class="access-container">${this.renderEditor()}</div>
        </div>
      </div>
    `;
  }

  render() {
    const { formName } = this.params;
    const allModes = this.allModes;
    return html`
      ${this.designForms.length > 0
        ? this.renderScreen()
        : html`<keep-page-loading
            message="Loading ${formName} Form Access Data"
          ></keep-page-loading>`}
      <keep-network-error-dialog></keep-network-error-dialog>
      <!-- The dialog takes the mode list rather than the whole schema: it used to dig the
           same list out itself, which is the unguarded read this screen has stopped making
           in three other places (#928). -->
      ${!this.db.value.newForm.enabled && allModes.length > 0
        ? html`
            <keep-mode-compare
              .open=${this.modeCompareOpen}
              .formName=${formName}
              .modes=${allModes}
              .currentModeIndex=${this.currentModeIndex}
              @dialog-close=${() => {
                this.modeCompareOpen = false;
              }}
            ></keep-mode-compare>
          `
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-access-mode': AccessMode;
  }
}
