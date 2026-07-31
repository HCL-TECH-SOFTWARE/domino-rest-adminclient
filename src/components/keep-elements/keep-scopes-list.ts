/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import {
  clearDBError,
  fetchKeepDatabases,
  setPullDatabase,
  setPullScope,
} from '../../store/databases/action';
import { FETCH_AVAILABLE_DATABASES, type Scope } from '../../store/databases/types';
import { toggleDrawer } from '../../store/drawer/action';
import { toggleAlert } from '../../store/alerts/action';
import type { Router } from '../../router/router';
import type { ScopeRow } from './keep-scope-form';
import type { KeepScopeOpenDetail } from './keep-scopes-default-view';
import type { KeepViewChangeDetail } from './keep-card-view-options';
import type {
  KeepDatabaseSearchChangeDetail,
  KeepDatabaseSearchTypeChangeDetail,
} from './keep-database-search';
import './keep-button';
import './keep-card-view-options';
import './keep-database-search';
import './keep-network-error-dialog';
import './keep-page-loading';
import './keep-scope-form-container';
import './keep-scopes-multi-view';

/** The first column the search bar offers on this screen. The other is always the NSF path. */
const SCOPE_SEARCH_TYPE = 'SCOPE NAME';

/** The query key the chosen view is recorded under, exactly as the original split it out. */
const VIEW_QUERY = '?view=';

/**
 * The `/scope` route: the Scope Management screen. Tag: `keep-scopes-list`.
 *
 * Replaces `scopes/ScopeLists.tsx` — the page chrome (title, Refresh, Add Scope, the search
 * bar and the view picker) around {@link ./keep-scopes-multi-view}, the drawer that adds and
 * edits a scope, and the filtering and sorting that decides which scopes the views are handed.
 *
 * Deliberately the twin of {@link ./keep-schemas-list}: the two screens are the same layout
 * with a different noun, and every styling decision below is the one that file made, for the
 * reasons recorded there. The one structural difference is real and predates the conversion —
 * this screen has no "only show configured" filter row, because there is no scope-level
 * equivalent of the schemas screen's scopes toggle. Nothing was dropped to get here.
 *
 * ## It is reached through a wrapper, because a route root has to be a component
 *
 * `Views.tsx` hands each route a `load()` and the outlet wraps it in a lazy boundary, which
 * needs a module whose default export is a component — so the route cannot point at an
 * element module. It points at `keep-elements/react/KeepScopesList` instead, the same shape
 * the schemas route, the consents route and the quick-config drawer already use.
 *
 * ## The router arrives as a property
 *
 * That wrapper is also the one place that can reach the router: it is created in `App.tsx`
 * and published through context with no module-level instance, and there is still no Lit
 * reactive controller for it (#926). So {@link router} is handed down, and the one navigation
 * this screen owns — recording the chosen view in the query string — goes through it.
 *
 * ## Store access
 *
 * One `StoreController` over the whole `databases` slice, standing for the single
 * `useSelector` the component had. This element owns that state outright now — no parent
 * selects it — so a controller is right here, where it would be wrong in a leaf. A whole
 * slice is a stable object between changes and so safe under the controller's `Object.is`
 * rule.
 *
 * There is no fetch on connect, because there never was one: `Views.tsx` refetches the scopes
 * whenever `scopePull` is down and the URL needs them, which is also what makes Refresh below
 * work — it lowers the flag and that effect answers.
 *
 * ## Derived, not stored
 *
 * The original mirrored the filtered list into component state and refilled it from an effect.
 * {@link results} is a plain getter: a render reads it, and any store or filter change already
 * schedules a render. That also removes the empty first paint the seed value produced, where
 * the list rendered as zero scopes for one frame before the effect ran.
 *
 * ## The drawer is always mounted
 *
 * Carried over verbatim from the original, whose comment explains why: the underlying
 * `wa-drawer` animates its slide-out, and mounting the container only while the drawer is open
 * cut that animation off, so the panel vanished instead of leaving. It reads its own open state
 * from the store, so an always-mounted instance costs nothing when closed.
 *
 * ## Accessibility (#713)
 *
 * The page title was a span styled to look like a heading; it is an `h1`, so the screen has a
 * heading at all. Same call the schemas screen made.
 *
 * ## What the shadow boundary cost
 *
 * `TopContainer` from `styles/layout.tsx` — including the heading rule nested inside it — the
 * text-colour utility from `styles.css`, and the six declarations `keep-wrapper-container` was
 * holding for this screen, which is the last of its two consumers and so takes that element
 * with it.
 *
 * Two details are deliberate rather than mechanical, and both match the schemas screen:
 *
 * - The title reads the primary text custom property, not the black literal the colour utility
 *   sets. That utility's dark-mode override is a light-DOM descendant selector which cannot
 *   reach into a shadow root, so copying the light value would render black on near-black.
 * - The two bars keep a 20px top margin. Each also carried one of the top-margin utilities from
 *   `styles.css` — one of 15px, one of zero — but that sheet is imported at the entry while the
 *   block that sets 20px is emitted with the component, i.e. later in the cascade at equal
 *   specificity. So neither utility has ever applied, and this screen renders unchanged. The
 *   zero one had no other user in the tree and its rule goes with this conversion.
 */
@customElement('keep-scopes-list')
export default class ScopesList extends KeepElement {
  static styles = css`
    /* was keep-wrapper-container, which this screen rendered as its outermost box. */
    :host {
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      height: calc(100% - 120px);
    }

    /* The 120px is the fixed page chrome above the list, which the mobile layout drops. */
    @media only screen and (max-width: 768px) {
      :host {
        height: 100%;
      }
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

    /* was the heading span and its colour utility. The margin reset is the user-agent h1
       margin, which does reach in here — unlike the class that used to size this text. */
    .title {
      display: flex;
      flex: 1;
      margin: 0;
      font-size: 24px;
      font-weight: bold;
      color: var(--text-color-primary);
    }
  `;

  /**
   * The app's single `Router`. Handed down by the wrapper — see the class note.
   *
   * Nullable because the element is constructible without one; the one navigation below is
   * guarded, so an element mounted bare renders and filters and simply does not navigate.
   */
  @property({ attribute: false }) accessor router: Router | null = null;

  /** The whole `databases` slice: scopes, both pull flags and the permissions. */
  private readonly db = new StoreController(this, (state) => state.databases);

  /** What was typed in the search bar, trimmed. Empty means no text filter. */
  @state() private accessor searchKey = '';

  /** Which column the search bar filters on: the scope name, or the NSF path. */
  @state() private accessor searchType = SCOPE_SEARCH_TYPE;

  /** `card` | `nsf` | `alphabetical` | `stack` — which of the four views is on screen. */
  @state() private accessor view = 'card';

  /** The row the drawer edits. Left alone by Add, which seeds from defaults instead. */
  @state() private accessor selectedScope: ScopeRow | undefined;

  /** Whether the drawer is editing that row or creating a new scope. */
  @state() private accessor isEdit = false;

  /** The URL is read for the view key exactly once, when the router first arrives. */
  private viewReadFromUrl = false;

  protected willUpdate(changed: PropertyValues): void {
    // The wrapper sets `router` after construction, so this cannot live in connectedCallback.
    if (!changed.has('router') || this.viewReadFromUrl || !this.router) return;
    this.viewReadFromUrl = true;

    const { search } = this.router.location();
    const displayType = search.split(VIEW_QUERY)[1];
    if (search && displayType) this.view = displayType;
  }

  /**
   * Both pull flags gate the list. Either one being up means something the views can render
   * has arrived, which is the condition the original swapped the loading indicator on.
   */
  private get pulled(): boolean {
    const { databasePull, scopePull } = this.db.value;
    return databasePull || scopePull;
  }

  /**
   * The scopes to show: filtered by the search box, then sorted by name.
   *
   * Carried over unchanged from the original, including that the sort is always by scope name
   * whichever column is being searched.
   */
  private get results(): Scope[] {
    const { scopes } = this.db.value;
    let rows = scopes.slice();

    if (this.searchKey) {
      const key = this.searchKey.toLowerCase();
      rows =
        this.searchType.indexOf('NSF') !== -1
          ? rows.filter((scope) => scope.nsfPath.toLowerCase().includes(key))
          : rows.filter((scope) => scope.apiName.toLowerCase().includes(key));
    }

    rows.sort((scopeA, scopeB) => scopeA.apiName.localeCompare(scopeB.apiName));
    return rows;
  }

  /**
   * Refresh drops both pull flags and asks for the schemas again.
   *
   * The scopes are not refetched from here and never were: lowering `scopePull` is what
   * `Views.tsx` watches, and it issues that fetch. The available-database list is emptied with
   * a raw action type, one of the handful the databases reducer still matches as a literal
   * string for exactly this call site.
   */
  private handleRefresh(): void {
    this.db.dispatch(setPullDatabase(false));
    this.db.dispatch(setPullScope(false));
    this.db.dispatch(fetchKeepDatabases());
    this.db.dispatch({ type: FETCH_AVAILABLE_DATABASES, payload: [] });
  }

  private handleAddScope(): void {
    const { databasePull, permissions } = this.db.value;
    if (!permissions.createDbMapping) {
      this.db.dispatch(toggleAlert(`You don't have permission to create scope.`));
      return;
    }

    this.isEdit = false;
    if (!databasePull) this.db.dispatch(fetchKeepDatabases());
    this.db.dispatch(clearDBError());
    this.db.dispatch(toggleDrawer());
  }

  /**
   * A card asked to open a scope: the drawer switches to Edit and takes that row.
   *
   * The schemas it offers as a destination come from the same fetch the Add button asks for,
   * which is why an open also triggers it when nothing has been pulled yet.
   */
  private handleScopeOpen(event: CustomEvent<KeepScopeOpenDetail>): void {
    if (!this.db.value.databasePull) this.db.dispatch(fetchKeepDatabases());
    // The four card views declare the payload as `unknown` — they hand back whichever entry
    // of `databases` was clicked, and this element is what put that array there.
    this.selectedScope = event.detail.scope as ScopeRow;
    this.isEdit = true;
    this.db.dispatch(clearDBError());
    this.db.dispatch(toggleDrawer());
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
    const router = this.router;
    if (router) {
      router.navigate({ pathname: router.location().pathname, search: `${VIEW_QUERY}${view}` });
    }
    this.view = view;
  }

  render() {
    const { scopePull } = this.db.value;

    return html`
      <div class="bar">
        <h1 class="title">Scope Management</h1>
        <keep-button icon="arrows-rotate" @click=${this.handleRefresh}>Refresh</keep-button>
        <keep-button icon="plus" @click=${this.handleAddScope}>Add Scope</keep-button>
      </div>

      <div class="bar">
        <keep-database-search
          .searchType=${this.searchType}
          .nameType=${SCOPE_SEARCH_TYPE}
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

      ${this.pulled
        ? html`<keep-scopes-multi-view
            .databases=${this.results}
            .view=${this.view}
            @scope-open=${this.handleScopeOpen}
          ></keep-scopes-multi-view>`
        : nothing}

      <keep-scope-form-container
        .database=${this.selectedScope}
        .isEdit=${this.isEdit}
      ></keep-scope-form-container>
      <keep-network-error-dialog></keep-network-error-dialog>

      ${this.pulled
        ? nothing
        : html`<keep-page-loading
            contained
            page-height
            .message=${'Scopes are loading. This may take a few seconds...'}
          ></keep-page-loading>`}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-scopes-list': ScopesList;
  }
}
