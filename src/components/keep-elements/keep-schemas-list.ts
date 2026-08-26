/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import {
  fetchKeepDatabases,
  setOnlyShowSchemasWithScopes,
  setPullDatabase,
  setPullScope,
} from '../../store/databases/action';
import type { DatabaseOverview } from '../../store/databases/types';
import { toggleAlert } from '../../store/alerts/action';
import { setLoading } from '../../store/loading/action';
import { RouterController } from '../../router/RouterController';
import type { KeepSchemaOpenDetail } from './keep-schemas-cards-view';
import type { KeepViewChangeDetail } from './keep-card-view-options';
import type {
  KeepDatabaseSearchChangeDetail,
  KeepDatabaseSearchTypeChangeDetail,
} from './keep-database-search';
import './keep-add-import-dialog';
import './keep-button';
import './keep-card-view-options';
import './keep-database-search';
import './keep-network-error-dialog';
import './keep-page-loading';
import './keep-schemas-multi-view';
import './keep-tooltip';
import './keep-zero-results';

/** The first column the search bar offers on this screen. The other is always the NSF path. */
const SCHEMA_SEARCH_TYPE = 'SCHEMA NAME';

/** `?view=` is parsed out of this, exactly as the React original split `location.search`. */
const VIEW_QUERY = '?view=';

/**
 * The `/schema` route: the Schema Management screen. Tag: `keep-schemas-list`.
 *
 * Replaces `schemas/SchemasLists.tsx` — the page chrome (title, Refresh, Add Schema, the
 * search bar, the view picker and the scopes filter) around
 * {@link ./keep-schemas-multi-view}, plus the filtering and sorting that decides which
 * schemas it is handed.
 *
 * ## The route mounts this module directly
 *
 * It used to be reached through `keep-elements/react/KeepSchemasList`, because `Views.tsx`
 * wrapped every route in `React.lazy`, which needs a module whose default export is a
 * *component* — and an element module's is a class. #719 P4 made the outlet a Lit element, so
 * `keep-views` names the tag and imports this module for its registration alone. That wrapper
 * is deleted.
 *
 * ## The router comes from a controller
 *
 * The wrapper used to be the one place that could reach the router — it was created in
 * `App.tsx` and published through React context — so it read it and handed it down as a
 * property. #926 made the router a module singleton with a `RouterController` over it, so
 * this screen reaches it itself and the wrapper is now nothing but the `createComponent`
 * call. The two navigations this screen owns — opening a schema and recording the chosen
 * view in the query string — go through {@link route}.
 *
 * This is the boundary `keep-schemas-multi-view` was written against: the four card views
 * emit `schema-open` and it travels, composed, up to here. Nothing above this element listens
 * for it any more.
 *
 * ## Store access
 *
 * Two `StoreController`s, one per `useSelector` the component had. This element owns that
 * state outright now — no React parent selects it — so a controller is right here, where it
 * would have been wrong in a leaf. Both select a whole slice, which is a stable object
 * between changes and so safe under the controller's `Object.is` rule.
 *
 * ## Derived, not stored
 *
 * The original kept the filtered list in `useState` and re-derived it in an effect that
 * listed its own output as a dependency, guarded by an array comparison to stop the loop.
 * {@link results} is a plain getter: a render reads it, and any store or filter change
 * already schedules a render. The array comparison, and the seed value that filtered by
 * scopes even when the filter was off, both go with it — the seed was visible for one frame
 * on a cold arrival, when `databasesOverview` is empty and it computed `[]` anyway.
 *
 * The initial fetch is asked for once, on connect. The effect it replaces also re-ran
 * whenever `databasePull` changed, and the only writer that turns that flag *off* is the
 * Refresh button below, which issues its own fetch — so the extra run could only ever
 * duplicate that request.
 *
 * ## Accessibility (#713)
 *
 * The page title was a `span` styled to look like a heading; it is an `h1`, so the screen has
 * a heading at all. The scopes filter was a toggle whose label was a separate `span`, tied to
 * the control by nothing but proximity — the text is now the switch's own label, which is
 * what gives it an accessible name.
 *
 * ## What the shadow boundary cost
 *
 * `TopContainer` and `FilterContainer` from `styles/layout.tsx` — including the `top-nav` rule
 * nested inside the first — the `medium-text`, `color-text-primary`, `flex` and `items-center`
 * utilities from `styles.css`, and the six declarations `keep-wrapper-container` was holding
 * for this screen. All restated below.
 *
 * Two details are deliberate rather than mechanical:
 *
 * - The title reads `--text-color-primary`, not the `#000` that `color-text-primary` sets.
 *   That utility's dark-mode override is a light-DOM descendant selector which cannot reach
 *   into a shadow root, so copying the light literal would render black on near-black. Same
 *   call `keep-zero-results` made.
 * - The two bars keep `margin-top: 20px`. Each also carried one of the top-margin utilities —
 *   15px on the first, zero on the second — but those live in `styles.css`, which is imported
 *   at the entry, and the block that sets 20px is emitted with the component, i.e. later in
 *   the cascade at equal specificity. (Named in words, not as literals, so that
 *   `test/styles/dead-selectors.test.ts` can still see them die when `ScopeLists` goes.) So
 *   neither utility has ever applied, and `ScopeLists` still renders the same 20px.
 */
@customElement('keep-schemas-list')
export default class SchemasList extends KeepElement {
  static styles = css`
    /*
     * was keep-wrapper-container, which this screen rendered as its outermost box.
     *
     * No height or overflow of its own any more (#1032). It used to reserve
     * calc(100% - 120px) and scroll internally — a second scrolling region nested inside
     * keep-views' own .view-container, which already sizes itself to the viewport and
     * scrolls the whole route. The 120px was a guess at this screen's own chrome, and
     * being short even by a few pixels was enough for .view-container to need to scroll
     * too: a second scrollbar stacked on this one. Flowing at natural height leaves
     * exactly one scrolling region — .view-container's — for every view this screen can
     * show, including the nsf view's fixed-height cards, which are tall enough to make a
     * mismatched inner height most visible.
     */
    :host {
      display: flex;
      flex-direction: column;
    }

    /*
     * The page's border-box reset is a universal selector and does not cross a shadow
     * boundary. Restated so the padded bars below measure the way their siblings do.
     */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    /* was TopContainer, styles/layout.tsx. */
    .bar {
      margin-top: 20px;
      display: flex;
      padding: 15px 0;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: space-between;
    }

    /* was span.top-nav.color-text-primary. The margin reset is the user-agent h1 margin,
       which does reach in here — unlike the class that used to size this text. */
    .title {
      display: flex;
      flex: 1;
      margin: 0;
      font-size: 24px;
      font-weight: bold;
      color: var(--text-color-primary);
    }

    /* was FilterContainer, styles/layout.tsx. Its .switchStyle block is dropped: no element
       under it ever carried that class. */
    .filter {
      margin-top: 5px;
      margin-bottom: 25px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* were the medium-text and color-text-primary utilities on the label beside the toggle. */
    wa-switch {
      font-size: 16px;
      color: var(--text-color-primary);
    }
  `;

  /**
   * The app's router (#926).
   *
   * Selects the pathname rather than the whole location, because this screen writes its own
   * `?view=` into the query string: with the default selector that write would re-render the
   * element a second time for a value it already holds.
   */
  private readonly route = new RouterController(this, (location) => location.pathname);

  /** The whole `databases` slice: schemas, scopes, both pull flags and the permissions. */
  private readonly db = new StoreController(this, (state) => state.databases);

  /** The `loading` slice, whose `status` swaps the list for the loading indicator. */
  private readonly loadingState = new StoreController(this, (state) => state.loading);

  /** What was typed in the search bar, trimmed. Empty means no text filter. */
  @state() private accessor searchKey = '';

  /** Which column the search bar filters on: the schema name, or the NSF path. */
  @state() private accessor searchType = SCHEMA_SEARCH_TYPE;

  /** `card` | `nsf` | `alphabetical` | `stack` — which of the four views is on screen. */
  @state() private accessor view = 'card';

  /** Raises the Add/Import dialog, which owns its own form state and lowers it back. */
  @state() private accessor addImportOpen = false;

  connectedCallback(): void {
    super.connectedCallback();
    const { databasePull, databasesOverview } = this.db.value;
    if (!databasePull && databasesOverview.length === 0) {
      this.db.dispatch(fetchKeepDatabases());
    }

    // Before the first render, so the chosen view is never painted wrong and corrected. This
    // was a `willUpdate` guarded on the router property arriving, which is a race the
    // controller removes: the location is readable the moment the element exists.
    const { search } = this.route.location;
    const displayType = search.split(VIEW_QUERY)[1];
    if (search && displayType) this.view = displayType;
  }

  /**
   * The schemas to show: filtered by the scopes toggle and the search box, then sorted.
   *
   * Carried over unchanged from the original, including the comparator's `-1` for a schema
   * with no name and the de-duplication pass, which only ever has something to do if the
   * store hands out the same object twice.
   */
  private get results(): DatabaseOverview[] {
    const { databasesOverview, scopes, onlyShowSchemasWithScopes } = this.db.value;
    let schemas = databasesOverview.slice();

    if (onlyShowSchemasWithScopes) {
      const schemasWithScopes = scopes.map((scope) => scope.nsfPath + ':' + scope.schemaName);
      schemas = schemas.filter((schema) =>
        schemasWithScopes.includes(schema.nsfPath + ':' + schema.schemaName),
      );
    }

    if (this.searchKey) {
      const key = this.searchKey.toLowerCase();
      schemas =
        this.searchType.indexOf('NSF') !== -1
          ? schemas.filter((schema) => schema.nsfPath.toLowerCase().includes(key))
          : schemas.filter((schema) => schema.schemaName.toLowerCase().includes(key));
    }

    schemas.sort((schemaA, schemaB) =>
      schemaA.schemaName ? schemaA.schemaName.localeCompare(schemaB.schemaName) : -1,
    );

    return [...new Set(schemas)];
  }

  private handleRefresh(): void {
    this.db.dispatch(setLoading({ status: true }));
    this.db.dispatch(setPullDatabase(false));
    this.db.dispatch(setPullScope(false));
    this.db.dispatch(fetchKeepDatabases());
  }

  private handleAddSchema(): void {
    const { scopePull, permissions } = this.db.value;
    if (!scopePull) {
      this.db.dispatch(toggleAlert('Please wait until schema loading complete!'));
      return;
    }
    if (permissions.createDbMapping) {
      this.addImportOpen = true;
    } else {
      this.db.dispatch(toggleAlert("You don't have permission to create schema."));
    }
  }

  private handleSearchChange(event: CustomEvent<KeepDatabaseSearchChangeDetail>): void {
    this.searchKey = event.detail.value.trim();
  }

  private handleSearchTypeChange(event: CustomEvent<KeepDatabaseSearchTypeChangeDetail>): void {
    this.searchType = event.detail.searchType;
  }

  private handleViewChange(event: CustomEvent<KeepViewChangeDetail>): void {
    const { view } = event.detail;
    // Recorded in the query string so the choice survives a reload, as before. The element
    // keeps its own `view` rather than re-reading the URL — see keep-card-view-options.
    this.route.navigate({ pathname: this.route.value, search: `${VIEW_QUERY}${view}` });
    this.view = view;
  }

  private handleScopeFilterToggle(): void {
    this.db.dispatch(setOnlyShowSchemasWithScopes(!this.db.value.onlyShowSchemasWithScopes));
  }

  private handleSchemaOpen(event: CustomEvent<KeepSchemaOpenDetail>): void {
    // The four card views declare the payload as `unknown` — they hand back whichever entry
    // of `databases` was clicked, and this element is what put that array there.
    const database = event.detail.database as DatabaseOverview;
    this.route.navigate(`/schema/${encodeURIComponent(database.nsfPath)}/${database.schemaName}`);
  }

  private handleAddImportClose(): void {
    this.addImportOpen = false;
  }

  render() {
    const { scopePull, onlyShowSchemasWithScopes } = this.db.value;
    const { loading } = this.loadingState.value;
    const results = this.results;

    return html`
      <div class="bar">
        <h1 class="title">Schema Management</h1>
        <keep-button icon="arrows-rotate" @click=${this.handleRefresh}>Refresh</keep-button>
        <keep-button icon="plus" @click=${this.handleAddSchema}>Add Schema</keep-button>
      </div>

      <div class="bar">
        <keep-database-search
          .searchType=${this.searchType}
          .nameType=${SCHEMA_SEARCH_TYPE}
          ?disabled=${!scopePull}
          @search-change=${this.handleSearchChange}
          @search-type-change=${this.handleSearchTypeChange}
        ></keep-database-search>
        <keep-card-view-options
          .view=${this.view}
          ?disabled=${!scopePull}
          @view-change=${this.handleViewChange}
        ></keep-card-view-options>
      </div>

      <div class="filter">
        <keep-tooltip content=${onlyShowSchemasWithScopes ? 'On' : 'Off'} placement="bottom">
          <wa-switch
            size="s"
            ?checked=${onlyShowSchemasWithScopes}
            @change=${this.handleScopeFilterToggle}
          >Only show schemas configured with scopes</wa-switch>
        </keep-tooltip>
      </div>

      ${results.length !== 0 && !loading.status
        ? html`<keep-schemas-multi-view
            .databases=${results}
            .view=${this.view}
            @schema-open=${this.handleSchemaOpen}
          ></keep-schemas-multi-view>`
        : nothing}
      ${loading.status
        ? html`<keep-page-loading
            contained
            page-height
            .message=${'Schemas are loading. This may take a few seconds...'}
          ></keep-page-loading>`
        : results.length === 0
          ? html`<keep-zero-results
              .mainLabel=${' Sorry, No result found'}
              .secondaryLabel=${"What you search was unfortunately not found or doesn't exist."}
            ></keep-zero-results>`
          : nothing}

      <keep-network-error-dialog></keep-network-error-dialog>
      <keep-add-import-dialog
        ?open=${this.addImportOpen}
        @dialog-close=${this.handleAddImportClose}
      ></keep-add-import-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-schemas-list': SchemasList;
  }
}
