/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { keyed } from 'lit/directives/keyed.js';
import '@awesome.me/webawesome/dist/components/tab-group/tab-group.js';
import '@awesome.me/webawesome/dist/components/tab/tab.js';
import '@awesome.me/webawesome/dist/components/tab-panel/tab-panel.js';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import { StoreController } from '../../store/StoreController';
import type { AppDispatch } from '../../store';
import {
  SET_ACTIVEVIEWS,
  SET_ACTIVEAGENTS,
  type Database,
} from '../../store/databases/types';
import { getDatabaseIndex } from '../../store/databases/scripts';
import { SETUP_KEEP_API_URL } from '../../config.dev';
import {
  setForms,
  setCurrentForms,
  setViews,
  fetchViews,
  setAgents,
  fetchAgents,
  setDbIndex,
  addNsfDesign,
  updateSchema,
  fetchFolders,
} from '../../store/databases/action';
import { getToken } from '../../store/account/action';
import { apiRequestWithRetry } from '../../utils/api-retry';
import { getLogger } from '../../services/log-service';
import type { Router } from '../../router/router';
import type { KeepErrorStatus } from './keep-error-wrapper';
import { isTextualView } from './keep-source-header';
import type SourceContents from './keep-source-header';
import type MonacoEditor from './keep-monaco-editor';
import type { KeepDetailsSectionSchemaChangeDetail } from './keep-details-section';
import type { KeepFormsTabNavigateDetail } from './keep-forms-tab';
import type { KeepViewsTabViewOpenDetail } from './keep-views-tab';
import './keep-agents-tab';
import './keep-button';
import './keep-details-section';
import './keep-edit-view';
import './keep-error-wrapper';
import './keep-form-dialog-header';
import './keep-forms-tab';
import './keep-monaco-editor';
import './keep-page-loading';
import './keep-source-header';
import './keep-views-tab';

const log = getLogger('components/keep-elements/keep-forms-container');

/** The four panels, in the order the strip lists them. */
const FORMS_TAB = 'forms';
const VIEWS_TAB = 'views';
const AGENTS_TAB = 'agents';
const SOURCE_TAB = 'source';

/** The schema the element holds before its first fetch resolves. */
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
 * `JSON.parse` that reports failure instead of throwing.
 *
 * Three call sites need it and all three used to throw out of an event handler or a render:
 * the editor buffer is whatever the user typed, and the two fetch helpers below parse an
 * error *message* as JSON, which only works when the message came from this app's own
 * `throw new Error(JSON.stringify(...))` and not from the network layer.
 */
function parseJson(text: string): Record<string, any> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, any>) : null;
  } catch {
    return null;
  }
}

/**
 * Orders forms by name, tolerating entries that have none.
 *
 * Exported for test: it is the logic that the bare `catch {}` below used to hide.
 */
export function compareFormNames(a: { formName?: string }, b: { formName?: string }): number {
  return String(a.formName ?? '')
    .toLowerCase()
    .localeCompare(String(b.formName ?? '').toLowerCase());
}

function loadUnconfiguredForms(
  apiData: { forms: Array<any> },
  allForms: any[],
  dbName: string,
  dispatch: AppDispatch,
) {
  apiData.forms.forEach((form: any) => {
    allForms.push({
      dbName,
      formName: form['@name'],
      alias: form['@alias'],
      formModes: [],
    });
  });

  // Sort the form names alphabetically.
  //
  // This used to be wrapped in a bare `catch {}`: a design element with no `@name`
  // makes `formName` undefined, `undefined.toLowerCase()` throws, and Array#sort
  // propagates that out — so one nameless form left the *entire* list unsorted, with
  // nothing logged. `compareFormNames` cannot throw, so the failure is removed rather
  // than hidden or merely logged.
  allForms.sort(compareFormNames);

  // Save Forms Data
  dispatch(setForms(dbName, allForms));
  dispatch(setCurrentForms(dbName, allForms));
}

function loadConfiguredForms(
  configformsList: any[],
  allForms: any[],
  dbName: string,
  apiData: { forms: Array<any> },
  dispatch: AppDispatch,
) {
  const formPromises: Array<any> = [];

  for (const form of configformsList) {
    allForms.push({ dbName, ...form });
  }

  // Wait for all configured forms to be loaded
  Promise.allSettled(formPromises)
    .then(() => {
      // Once we have all the results build a complete list
      // and update our state
      // Add unconfigured forms
      const configformsNameList = configformsList.map((form) => form.formName);
      apiData.forms.forEach((form: any) => {
        if (!configformsNameList.includes(form['@name']))
          allForms.push({
            dbName,
            formName: form['@name'],
            alias: form['@alias'],
            formModes: [],
          });
      });
      // Sort the form names alphabetically
      allForms.sort((a, b) => (a.formName.toLowerCase() > b.formName.toLowerCase() ? 1 : -1));
      // Save Forms Data
      dispatch(setForms(dbName, allForms));
      dispatch(setCurrentForms(dbName, allForms));
    })
    .catch((e: any) => log.error('Error processing unconfigured forms', e as Error));
}

/**
 * The `/schema/:nsfPath/:dbName` route: the schema detail screen.
 * Tag: `keep-forms-container`.
 *
 * Replaces `forms/FormsContainer.tsx` — the page title, the schema header panel on the left,
 * and the four-tab strip on the right holding Forms, Views, Agents and Source. Every child it
 * renders converted in wave 5, so this was the last React frame around an otherwise all-Lit
 * screen and the five `@lit/react` wrappers it used are deleted with it.
 *
 * ## It is reached through a wrapper, because a route root has to be a React component
 *
 * `Views.tsx` hands each route a `load()` and the outlet wraps it in `React.lazy`, which needs
 * a module whose default export is a component — so the route cannot point at an element
 * module. It points at `keep-elements/react/KeepFormsContainer` instead, the same shape
 * `/schema` and `/apps/consents` already use.
 *
 * ## The router and the route params arrive as properties
 *
 * That wrapper is also the only place that can reach either. The router is created in
 * `App.tsx` and published through context with no module-level instance, and the matched
 * params are published through a second context that only the outlet writes — there is still
 * no Lit reactive controller for either (#926). So {@link router}, {@link nsfPath} and
 * {@link dbName} are handed down, exactly as `keep-schemas-list` takes its router.
 *
 * One navigation crosses this boundary: `keep-forms-tab` emits `form-navigate` carrying a
 * finished, already-encoded path, and it is handed straight to the router. That contract is
 * why the element below passes {@link nsfPath} down **raw** — the tab encodes it itself.
 *
 * ## Store access
 *
 * One `StoreController` over the databases slice, standing for the one `useSelector` that
 * survives: `databasesOverview` seeds the index, `updateSchemaError` resets the editor buffer
 * after a failed save, and `scopes` is passed to the two children that read it. A slice is a
 * stable reference between changes, which is what the controller's identity check wants.
 *
 * The second selector — `styles.themeMode` — is gone with the tab strip: it existed only to
 * colour the tab indicator by hand, and the replacement reads a brand token that is
 * mode-aware without being told which mode it is in.
 *
 * ## The tab strip
 *
 * `wa-tab-group` / `wa-tab` / `wa-tab-panel`, which is the design system's answer and brings
 * the roles, the arrow-key roving focus and the overflow scroll controls that the previous
 * strip got from its own framework. **Each panel's content is rendered only while that panel
 * is showing**, which the previous strip also did and which is load-bearing here: the Source
 * panel mounts the editor, and that editor fetches several MB on its first render. Leaving all
 * four panels populated — the default for a tab group — would pull the editor down for every
 * visitor to this screen.
 *
 * ## Store access the children own
 *
 * Nothing below this element takes the store from here. All five children already read what
 * they need through their own controllers; the three values that do cross — the schema, the
 * route's database name and the scope list — are the ones this element owns.
 *
 * ## Accessibility (#713)
 *
 * - The page title was a `span` styled to look like a heading; it is an `h1`, so the screen
 *   has a heading at all. Same call `keep-schemas-list` made for the list behind it.
 * - The two confirmations were unnamed dialogs whose body copy was a `text` element — an SVG
 *   tag in an HTML document, so the browser treated it as an unknown inline element. Both are
 *   named, described by their own paragraph, and the copy is a paragraph.
 * - Escape is handled on both, through the native `cancel` event, so a dismissed dialog cannot
 *   leave the element believing it is still open.
 *
 * ## What the shadow boundary cost
 *
 * The four Linaria blocks in the file it replaces, `TopContainer` and `TopNavigator` from the
 * layout module, the `mt-15`, `top-nav`, `color-text-primary` and `dialog*` classes in
 * `styles.css`, the box-sizing reset, and the dialog appearance Web Awesome's native layer
 * supplies through a bare element selector. All restated below, reading tokens rather than the
 * light-mode literals the originals held.
 *
 * Five rules in the outer Linaria block are **not** restated, because nothing they name
 * survives: three classes no node in this file ever carried, and two that styled descendants
 * which now live in their own shadow roots. See the note above `static styles`.
 */
@customElement('keep-forms-container')
export default class FormsContainer extends KeepElement {
  /*
   * Five selectors from the outer Linaria block are dropped rather than carried over:
   *
   *  - the error-message, chosen-tab and textarea classes were never applied to any node in
   *    this file, in any of its revisions reachable from here.
   *  - the flex-container and flex-child rules styled *descendants* — they were written for
   *    markup that is now inside `keep-agents-tab`'s shadow root, which restates the one it
   *    needs. A rule here could not reach either way.
   *
   * The tab-button block loses two of its three declarations for the same reason: its nested
   * focus rule compiled to a descendant selector, and its selected-state rule named a class
   * the tab framework put on the tab itself rather than inside it, so neither ever matched.
   * Only the type size survives.
   */
  static styles = [
    modalBackdropStyles,
    css`
      :host {
        display: block;
      }

      /*
       * The page's border-box reset is a universal selector and does not cross a shadow
       * boundary. Restated so the padded panels below measure the way their siblings do.
       */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      /*
       * was TopContainer, styles/layout.tsx. The element also carried the 15px top-margin
       * utility, which lives in the page stylesheet: same specificity, and the component
       * block is emitted later, so the 20px here is what has always rendered.
       */
      .bar {
        margin-top: 20px;
        display: flex;
        padding: 15px 0;
        flex-wrap: wrap;
        gap: 10px;
        justify-content: space-between;
      }

      /*
       * was the top-nav and primary-text classes on a span. The margin reset is the
       * user-agent heading margin, which does reach in here — unlike the classes that used
       * to size this text. The colour reads the token rather than the literal that utility
       * sets, whose dark-mode override is a light-DOM descendant selector and so cannot
       * cross. Same call keep-schemas-list made.
       */
      .title {
        display: flex;
        flex: 1;
        margin: 0;
        font-size: 24px;
        font-weight: bold;
        color: var(--text-color-primary);
      }

      /* was CoreContainer */
      .core {
        padding: 0;
        display: flex;
        height: calc(100vh - 225px);
        overflow-y: auto;
        width: calc(100% - 10px);
      }

      @media only screen and (max-width: 768px) {
        .core {
          height: calc(100vh - 60px);
        }
      }

      /*
       * was Details. Its border was a light-mode literal with no dark counterpart, so it
       * reads the surface-border token in both modes instead.
       */
      .details {
        width: 20%;
        height: 100%;
        border-radius: var(--wa-border-radius-l);
        border: 1px solid var(--wa-color-surface-border);
        overflow-x: scroll;
        overflow-y: auto;
        padding: 20px 30px;
      }

      /* was Stack */
      .stack {
        flex: 1;
        padding: 0 25px;
        width: calc(100% - 190px);
      }

      /* was TabContainer, the box each panel's content sat in */
      .panel {
        padding-left: 1px;
      }

      /* was the tab-button class. See the note above these styles for its other two rules. */
      wa-tab {
        font-size: 20px;
      }

      /* was TopNavigator, styles/layout.tsx — an empty flex box acting as a spacer */
      .top-navigator {
        display: flex;
        padding: 25px 0;
        gap: 10px;
      }

      /*
       * The editor's height, which the previous call site set as an inline style object.
       * A rule rather than an attribute: an interpolated style attribute does not apply
       * under the production policy, and the suite counts them (#685).
       */
      keep-monaco-editor {
        display: block;
        height: 70vh;
      }

      /*
       * Both confirmations. Everything here arrived through a bare element selector — the
       * padding, the raised background, the centring and the shadow all come from Web
       * Awesome's native layer, and none of it crosses a shadow boundary. The border follows
       * the convergence the other converted dialogs recorded: the page sheet pairs a
       * transparent light border with a dark literal, and an element may not carry a
       * light/dark pair (#708), so it reads the border token in both modes.
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
        gap: 30px;
        padding: var(--wa-space-l);
        border: 1px solid var(--wa-color-surface-border);
        border-radius: 10px;
        color: var(--wa-color-text-normal);
        background: var(--wa-color-surface-raised);
        box-shadow: var(--wa-shadow-l);
      }

      dialog[open] {
        display: flex;
      }

      dialog:focus {
        outline: none;
      }

      /* was the dialog-content class */
      .dialog-content {
        width: 100%;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 40px;
      }

      /*
       * was the dialog-content-text class on a non-HTML element name, which is the only
       * reason the page sheet's rule reached it at all. As a paragraph it takes the dialog's
       * own type size; margin zero replaces the user-agent margin the previous markup never
       * had.
       */
      .dialog-content-text {
        color: var(--text-color-primary);
        margin: 0;
      }

      /* was the dialog-actions class */
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

  /**
   * The app's single `Router`. Handed down by the wrapper — see the class note.
   *
   * Nullable because the element is constructible without one; the one navigation below is
   * guarded, so an element mounted bare renders and simply does not navigate.
   */
  @property({ attribute: false }) accessor router: Router | null = null;

  /**
   * The route's NSF path, **raw**: this is the value the outlet captured, and it is handed to
   * `keep-forms-tab` unchanged because that element encodes it itself when it builds the paths
   * it reports upward.
   */
  @property({ type: String, attribute: 'nsf-path' }) accessor nsfPath = '';

  /** The route's schema name. Every child that addresses a schema needs it explicitly. */
  @property({ type: String, attribute: 'db-name' }) accessor dbName = '';

  /** The schema this screen edits. Replaced wholesale by every child's `schema-change`. */
  @state() accessor schemaData: Database = EMPTY_SCHEMA;

  /** The design list's form names, which the Forms tab offers when creating a form schema. */
  @state() private accessor nsfForms: string[] = [];

  /** False until the first fetch settles, which is what the loading state is keyed on. */
  @state() private accessor isFetch = false;

  /** What the last request returned. Anything but 200 replaces the page with an error state. */
  @state() private accessor errorStatus: KeepErrorStatus = { status: 200, statusText: '' };

  /** Which panel is showing. The tab group owns the strip; this owns what is inside it. */
  @state() private accessor activeTab: string = FORMS_TAB;

  /** The editor buffer: the schema as text, plus whatever has been typed into it since. */
  @state() private accessor sourceTabContent = JSON.stringify(EMPTY_SCHEMA, null, 1);

  /** Which lens the Source panel is using: the JSON tree, the text editor, or the diff. */
  @state() private accessor selectedOption = 'tree';

  /** Whether the "Save changes?" confirmation is up. */
  @state() private accessor saveChangesDialog = false;

  /** Whether the "Discard changes?" confirmation is up. */
  @state() private accessor discardChangesDialog = false;

  /** Whether the Edit View panel beside the Views tab is open. */
  @state() private accessor viewOpen = false;

  /** Which view that panel is editing. */
  @state() private accessor openViewName = '';

  @query('dialog.save-dialog') private accessor saveDialog!: HTMLDialogElement | null;

  @query('dialog.discard-dialog') private accessor discardDialog!: HTMLDialogElement | null;

  @query('keep-source') private accessor sourceView!: SourceContents | null;

  @query('keep-monaco-editor') private accessor editor!: MonacoEditor | null;

  private readonly db = new StoreController(this, (state) => state.databases);

  /** What the Save confirmation will post. Not rendered, so not reactive. */
  private editedContent: Record<string, any> = {};

  /** Views and agents are fetched the first time their panel is opened, and not again. */
  private viewsFetched = false;

  private agentsFetched = false;

  /** Lets the buffer reset below tell a lens switch apart from a schema refresh. */
  private previousView = 'tree';

  /** Mirrors the store's flag, so a *transition* to failed can be acted on exactly once. */
  private previousSchemaError = false;

  /** The last buffer that parsed. What the JSON tree falls back to — see {@link sourceContent}. */
  private lastGoodContent: Record<string, any> = EMPTY_SCHEMA as unknown as Record<string, any>;

  /**
   * The route param decoded a second time.
   *
   * The outlet already percent-decodes every captured segment, so for every path this app can
   * produce this is the identity — it is kept because the value is what the design-list cache
   * is keyed on, and changing that key is a store change rather than a conversion. The guard
   * is the router's own policy: a hand-edited address bar can carry a stray `%`, and an
   * unguarded decode would throw out of a render and blank the screen.
   */
  private get nsfPathDecode(): string {
    try {
      return decodeURIComponent(this.nsfPath);
    } catch {
      return this.nsfPath;
    }
  }

  /**
   * The left-hand side of the diff: the schema as last saved on the server. Same formatting as
   * the editor buffer, so the diff shows real edits and not whitespace.
   */
  private get savedSchemaText(): string {
    return JSON.stringify(this.schemaData, null, 1);
  }

  /**
   * The buffer as an object, for the JSON tree.
   *
   * The buffer is whatever the editor last held, so it is not necessarily valid JSON — a
   * cancel taken while the text view holds a half-typed edit writes exactly that. Parsing it
   * unguarded in the render is what the previous frame did, and an invalid buffer took the
   * whole page down with it.
   */
  private get sourceContent(): Record<string, any> {
    const parsed = parseJson(this.sourceTabContent);
    if (parsed) this.lastGoodContent = parsed;
    return this.lastGoodContent;
  }

  connectedCallback(): void {
    super.connectedCallback();
    this.previousSchemaError = this.db.value.updateSchemaError;
  }

  protected firstUpdated(): void {
    document.title = `HCL Domino REST API | ${this.dbName} Forms`;
    // The `if (visible) dispatch(toggleSettings())` that closed the database settings
    // dialog on mount is gone with the slice (#853). It had been unreachable since
    // 19e56a2 deleted the settings screen: nothing was left that could set `visible`.
    this.db.dispatch(fetchFolders(this.dbName, this.nsfPath));
    void this.loadSchema();
  }

  protected willUpdate(changed: PropertyValues): void {
    // Nothing below applies to the first pass: every field it would write already holds the
    // value that pass computes, and the fetches it would repeat are issued in firstUpdated.
    if (!this.hasUpdated) return;

    const routeChanged = changed.has('dbName') || changed.has('nsfPath');

    if (routeChanged) {
      this.db.dispatch(fetchFolders(this.dbName, this.nsfPath));
    }

    // The buffer follows the schema, and the route the schema was fetched for.
    if (changed.has('schemaData') || routeChanged) {
      this.sourceTabContent = this.savedSchemaText;
    }

    // A lens switch discards the pending edits — except Text to Diff and back, which are two
    // views of one buffer: both render the same pending edits, and resetting would leave the
    // diff with nothing to show. A schema refresh reaches here with the lens unchanged, so
    // the guard does not apply to it and it still resets.
    if (changed.has('selectedOption') || changed.has('schemaData')) {
      const previous = this.previousView;
      this.previousView = this.selectedOption;
      const sameLens =
        previous !== this.selectedOption &&
        isTextualView(previous) &&
        isTextualView(this.selectedOption);
      if (!sameLens) this.sourceTabContent = this.savedSchemaText;
    }

    // A failed save throws the edits away, so the buffer shows what the server still holds.
    const schemaError = this.db.value.updateSchemaError;
    if (schemaError !== this.previousSchemaError) {
      this.previousSchemaError = schemaError;
      if (schemaError) this.sourceTabContent = this.savedSchemaText;
    }
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has('saveChangesDialog')) {
      this.syncDialog(this.saveDialog, this.saveChangesDialog);
    }
    if (changed.has('discardChangesDialog')) {
      this.syncDialog(this.discardDialog, this.discardChangesDialog);
    }
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

  /**
   * The mount fetch: seed the schema index, then pull the design list and the schema itself.
   *
   * The two branches the previous frame had — one for a warm schema list, one for a cold one —
   * ran identical bodies, so there is one here. The only difference between them was which
   * message a failure logged.
   */
  private async loadSchema(): Promise<void> {
    const dbIndex = getDatabaseIndex(this.db.value.databasesOverview, this.dbName, this.nsfPathDecode);
    this.db.dispatch(setDbIndex(dbIndex));
    try {
      await this.pullForms();
      await this.pullSubForms();
    } catch (error) {
      log.error('Error loading forms', error as Error);
    }
    this.isFetch = true;
  }

  /** Records what a failed request reported, for the error page in front of this screen. */
  private reportError(error: unknown, message: string): void {
    const body = parseJson(String(error).replace(/\\"/g, '"').replace('Error: ', ''));
    if (!body) {
      // Not one of this app's own JSON-bodied errors — a network failure, say. The previous
      // frame parsed it anyway and threw a second error out of its own catch block.
      log.error(message, error as Error);
      return;
    }
    this.errorStatus = { status: body.status, statusText: body.message };
    log.error(message, body as Error);
  }

  private async pullSubForms(): Promise<void> {
    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/designlist/subforms?nsfPath=${this.nsfPath}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json',
          },
        }),
      );

      if (!response.ok) {
        throw new Error(JSON.stringify(data));
      }

      if (data) {
        this.db.dispatch(addNsfDesign(this.nsfPathDecode, data));
      }
    } catch (e: any) {
      this.reportError(e, 'Error fetching subforms');
    }
  }

  /**
   * Retrieve the information for this database and save off the form data for later display.
   */
  private async pullForms(): Promise<void> {
    try {
      const allForms: Array<any> = [];

      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/designlist/forms?nsfPath=${this.nsfPath}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json',
          },
        }),
      );
      const apiData = data;

      if (!response.ok) {
        throw new Error(JSON.stringify(apiData));
      }

      if (!apiData) return;

      this.nsfForms = apiData.forms.map((form: any) => form['@name']);
      this.db.dispatch(addNsfDesign(this.nsfPathDecode, apiData));

      // Get list of configured forms
      try {
        const configured = await apiRequestWithRetry(() =>
          fetch(
            `${SETUP_KEEP_API_URL}/schema?nsfPath=${this.nsfPath}&configName=${this.dbName}`,
            {
              headers: {
                Authorization: `Bearer ${getToken()}`,
                Accept: 'application/json',
              },
            },
          ),
        );

        if (!configured.response.ok) {
          throw new Error(JSON.stringify(apiData));
        }

        this.errorStatus = { status: 200, statusText: 'success' };
        this.schemaData = {
          ...configured.data,
          nsfPath: this.nsfPathDecode,
          schemaName: this.dbName,
        };

        // Loop through configured forms and fetch their modes
        const configformsList = configured.data.forms;
        if (configformsList != null && configformsList.length > 0) {
          loadConfiguredForms(configformsList, allForms, this.dbName, apiData, this.db.dispatch);
        } else {
          // Add unconfigured forms
          loadUnconfiguredForms(apiData, allForms, this.dbName, this.db.dispatch);
        }
        this.setActiveViews(this.dbName, configured.data.views);
        this.setActiveAgents(this.dbName, configured.data.agents);
      } catch (e: any) {
        log.error('Error fetching configured forms', e as Error);
      }
    } catch (e: any) {
      this.reportError(e, 'Error fetching forms');
    }
  }

  /** Build the Active Views list the right-hand panels read, and publish it. */
  private setActiveViews(dbName: string, views: Array<any>): Array<any> {
    const viewsList: Array<any> = [];
    views?.forEach((view) => {
      let alias = view.alias != null && view.alias.length > 0 ? view.alias[0] : '';

      // Suppress alias when it's a duplicate of the name LABS-1903
      alias = alias === view.name ? '' : alias;
      const viewUpdatedBool = !!(view.columns && view.columns.length > 0);
      viewsList.push({
        viewName: view.name,
        viewAlias: alias,
        viewUnid: view.unid,
        viewActive: true,
        viewUpdated: viewUpdatedBool,
      });
    });
    this.db.dispatch({
      type: SET_ACTIVEVIEWS,
      payload: { db: dbName, activeViews: viewsList },
    });
    return viewsList;
  }

  /** Build the Active Agents list the right-hand panels read, and publish it. */
  private setActiveAgents(dbName: string, agents: Array<any>): Array<any> {
    const agentsList: Array<any> = [];
    agents?.forEach((agent) => {
      let alias = agent.alias != null && agent.alias.length > 0 ? agent.alias[0] : '';

      // Suppress alias when it's a duplicate of the name LABS-1903
      alias = alias === agent.name ? '' : alias;
      agentsList.push({
        agentName: agent.name,
        agentAlias: alias,
        agentUnid: agent.unid,
        agentActive: true,
      });
    });
    this.db.dispatch({
      type: SET_ACTIVEAGENTS,
      payload: { db: dbName, activeAgents: agentsList },
    });
    return agentsList;
  }

  /**
   * The tab group reports which panel it just showed; the two server-backed panels fetch on
   * their first showing and not again.
   *
   * The confirmation that used to guard leaving the Source panel is gone. It was reached only
   * through a flag that nothing ever set to true — the one writer set it to false — so the
   * warning has never been shown, and reproducing it would have been an unreachable branch.
   * Recorded rather than silently dropped: see the report on #806 wave 6.
   */
  private readonly handleTabShow = (event: Event): void => {
    const { name } = (event as CustomEvent<{ name: string }>).detail;
    this.activeTab = name;

    if (name === VIEWS_TAB && !this.viewsFetched) {
      this.viewsFetched = true;
      this.db.dispatch(setViews(this.dbName, []));
      this.db.dispatch(fetchViews(this.dbName, this.nsfPath));
    } else if (name === AGENTS_TAB && !this.agentsFetched) {
      this.agentsFetched = true;
      this.db.dispatch(setAgents(this.dbName, []));
      this.db.dispatch(fetchAgents(this.dbName, this.nsfPath));
    }
  };

  /**
   * Every child that saves hands the schema back the same way, so they share one handler.
   *
   * The four events are typed identically apart from the interface name; `keep-details-section`
   * is the one whose declaration is named here, because the others' are the same shape.
   */
  private readonly handleSchemaChange = (event: Event): void => {
    const { schemaData } = (event as CustomEvent<KeepDetailsSectionSchemaChangeDetail>).detail;
    this.schemaData = schemaData;
  };

  /**
   * `keep-forms-tab` reports a finished, already-encoded path rather than navigating itself,
   * because it has no router to reach for. This is the one place on the screen that does.
   */
  private readonly handleFormNavigate = (event: Event): void => {
    const { path } = (event as CustomEvent<KeepFormsTabNavigateDetail>).detail;
    this.router?.navigate(path);
  };

  private readonly handleViewOpen = (event: Event): void => {
    const { active, viewName } = (event as CustomEvent<KeepViewsTabViewOpenDetail>).detail;
    if (active) this.openViewName = viewName;
    this.viewOpen = active;
  };

  private readonly handleCloseEditView = (): void => {
    this.viewOpen = false;
  };

  /**
   * Moving between Text and Diff keeps the same editor buffer, so the live text has to be
   * captured before the switch — the buffer is what the rebuilt editor reads, and it would
   * otherwise still hold the pre-edit content.
   *
   * A bound field, not a method: `keep-source` takes this as a property and calls it from its
   * own template, so a plain method would run with `this` pointing at that element.
   */
  private readonly handleViewChange = (newOption: string): void => {
    if (isTextualView(this.selectedOption) && isTextualView(newOption)) {
      this.sourceTabContent = this.showValue();
    }
    this.selectedOption = newOption;
  };

  /** The live text of the Monaco buffer. Empty before the editor exists. */
  private readonly showValue = (): string => this.editor?.getValue() ?? '';

  /** Bound for the same reason {@link handleViewChange} is. */
  private readonly handleClickSave = (): void => {
    if (this.sourceView?.shadowRoot) {
      if (isTextualView(this.selectedOption)) {
        const text = this.showValue();
        const parsed = parseJson(text);
        if (!parsed) {
          // The previous frame threw here, out of a click handler, and the confirmation
          // simply never appeared. Same outcome, minus the unhandled error.
          log.error('Schema editor holds invalid JSON; not offering to save it');
          return;
        }
        this.editedContent = parsed;
        this.sourceTabContent = text;
      } else if (this.selectedOption === 'tree') {
        this.editedContent = this.sourceView.content;
        this.sourceTabContent = JSON.stringify(this.sourceView.content, null, 2);
      }
    }
    this.saveChangesDialog = true;
  };

  /** Bound for the same reason {@link handleViewChange} is. */
  private readonly handleClickCancel = (): void => {
    if (isTextualView(this.selectedOption)) {
      this.sourceTabContent = this.showValue();
    } else if (this.sourceView?.shadowRoot) {
      this.sourceTabContent = JSON.stringify(this.sourceView.content, null, 2);
    }
    this.discardChangesDialog = true;
  };

  private readonly handleSaveChanges = (): void => {
    this.saveChangesDialog = false;
    this.db.dispatch(updateSchema(this.editedContent, this.applySavedSchema));
    void this.pullForms();
    void this.pullSubForms();
    this.db.dispatch(fetchViews(this.dbName, this.nsfPath));
    this.db.dispatch(fetchAgents(this.dbName, this.nsfPath));
  };

  /** The sink the update thunk echoes the saved record back through. */
  private readonly applySavedSchema = (schemaData: Database): void => {
    this.schemaData = schemaData;
  };

  private readonly handleDiscardChanges = (): void => {
    this.sourceTabContent = this.savedSchemaText;
    this.discardChangesDialog = false;
  };

  private readonly handleKeepEditing = (): void => {
    if (isTextualView(this.selectedOption)) {
      this.sourceTabContent = this.showValue();
    } else if (this.selectedOption === 'tree' && this.sourceView) {
      this.sourceTabContent = JSON.stringify(this.sourceView.content, null, 2);
    }
    this.discardChangesDialog = false;
  };

  private readonly handleClickNo = (): void => {
    this.sourceTabContent = JSON.stringify(this.editedContent, null, 1);
    this.saveChangesDialog = false;
  };

  private renderFormsPanel() {
    return html`
      <div class="panel">
        <keep-forms-tab
          .dbName=${this.dbName}
          .nsfPath=${this.nsfPath}
          .formList=${this.nsfForms}
          .schemaData=${this.schemaData}
          @form-navigate=${this.handleFormNavigate}
          @schema-change=${this.handleSchemaChange}
        ></keep-forms-tab>
      </div>
    `;
  }

  private renderViewsPanel() {
    // The key stays: it is what resets the tab's uncontrolled search box when the schema
    // changes, exactly as the React key did.
    return html`
      <div class="panel">
        ${keyed(
          `${this.schemaData.schemaName}-${this.schemaData.nsfPath}`,
          html`<keep-views-tab
            .schemaData=${this.schemaData}
            .dbName=${this.dbName}
            @view-open=${this.handleViewOpen}
            @schema-change=${this.handleSchemaChange}
          ></keep-views-tab>`,
        )}
        <keep-edit-view
          ?open=${this.viewOpen}
          .dbName=${this.dbName}
          .nsfPathProp=${this.nsfPath}
          .viewName=${this.openViewName}
          .scopes=${this.db.value.scopes}
          .schemaData=${this.schemaData}
          @dialog-close=${this.handleCloseEditView}
          @schema-change=${this.handleSchemaChange}
        ></keep-edit-view>
      </div>
    `;
  }

  private renderAgentsPanel() {
    // `dbName` replaces the route lookup the tab used to make itself — without it the
    // activation thunk addresses the wrong database.
    return html`
      <div class="panel">
        <keep-agents-tab .schemaData=${this.schemaData} .dbName=${this.dbName}></keep-agents-tab>
      </div>
    `;
  }

  private renderSourcePanel() {
    return html`
      <div class="panel">
        <div class="top-navigator"></div>
        <keep-source
          .content=${this.sourceContent}
          .selectedOption=${this.selectedOption}
          .onSave=${this.handleClickSave}
          .onCancel=${this.handleClickCancel}
          .onDropdownChange=${this.handleViewChange}
          .getExternalContent=${this.showValue}
        ></keep-source>
        ${isTextualView(this.selectedOption)
          ? html`<keep-monaco-editor
              language="json"
              .value=${this.sourceTabContent}
              .diffMode=${this.selectedOption === 'diff'}
              .originalValue=${this.savedSchemaText}
            ></keep-monaco-editor>`
          : nothing}

        <dialog class="save-dialog" aria-label="Save changes?" @cancel=${this.handleClickNo}>
          <keep-form-dialog-header
            heading="Save changes?"
            @header-close=${this.handleClickNo}
          ></keep-form-dialog-header>
          <div class="dialog-content">
            <p class="dialog-content-text">
              Are you sure you want to save the changes made to the schema? Click Yes to
              continue. Click No to go back and review your changes.
            </p>
          </div>
          <div class="dialog-actions">
            <keep-button variant="neutral" appearance="outlined" @click=${this.handleClickNo}
              >No</keep-button
            >
            <keep-button @click=${this.handleSaveChanges}>Yes</keep-button>
          </div>
        </dialog>

        <dialog
          class="discard-dialog"
          aria-label="Discard changes?"
          @cancel=${this.handleDiscardChanges}
        >
          <keep-form-dialog-header
            heading="Discard changes?"
            @header-close=${this.handleDiscardChanges}
          ></keep-form-dialog-header>
          <div class="dialog-content">
            <p class="dialog-content-text">
              WARNING: Clicking Cancel will discard the changes you've made to the schema.
              Continue?
            </p>
          </div>
          <div class="dialog-actions">
            <keep-button
              variant="neutral"
              appearance="outlined"
              @click=${this.handleDiscardChanges}
              >Discard Changes</keep-button
            >
            <keep-button @click=${this.handleKeepEditing}>Keep Editing</keep-button>
          </div>
        </dialog>
      </div>
    `;
  }

  render() {
    return html`
      <keep-error-wrapper .errorStatus=${this.errorStatus}>
        <div class="bar">
          <h1 class="title">Schema Management</h1>
        </div>
        <div class="core" id="databases-list">
          ${this.isFetch
            ? html`
                <div class="details">
                  <keep-details-section
                    .dbName=${this.dbName}
                    .schemaData=${this.schemaData}
                    .scopes=${this.db.value.scopes}
                    @schema-change=${this.handleSchemaChange}
                  ></keep-details-section>
                </div>
                <div class="stack">
                  <wa-tab-group @wa-tab-show=${this.handleTabShow}>
                    <wa-tab panel="${FORMS_TAB}">Database Forms</wa-tab>
                    <wa-tab panel="${VIEWS_TAB}">Database Views</wa-tab>
                    <wa-tab panel="${AGENTS_TAB}">Database Agents</wa-tab>
                    <wa-tab panel="${SOURCE_TAB}">Source</wa-tab>

                    <wa-tab-panel name="${FORMS_TAB}">
                      ${this.activeTab === FORMS_TAB ? this.renderFormsPanel() : nothing}
                    </wa-tab-panel>
                    <wa-tab-panel name="${VIEWS_TAB}">
                      ${this.activeTab === VIEWS_TAB ? this.renderViewsPanel() : nothing}
                    </wa-tab-panel>
                    <wa-tab-panel name="${AGENTS_TAB}">
                      ${this.activeTab === AGENTS_TAB ? this.renderAgentsPanel() : nothing}
                    </wa-tab-panel>
                    <wa-tab-panel name="${SOURCE_TAB}">
                      ${this.activeTab === SOURCE_TAB ? this.renderSourcePanel() : nothing}
                    </wa-tab-panel>
                  </wa-tab-group>
                </div>
              `
            : html`<keep-page-loading
                contained
                page-height
                .message=${`Getting Schema ${this.dbName}. This may take a few seconds...`}
              ></keep-page-loading>`}
        </div>
      </keep-error-wrapper>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-forms-container': FormsContainer;
  }
}
