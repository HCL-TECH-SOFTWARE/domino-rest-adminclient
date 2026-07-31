/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html, unsafeCSS } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { TABLE_STYLE_TEXT } from './keep-data-table.styles';
import { appItemStyles } from './keep-app-item';
import { fetchMyApps } from '../../store/applications/action';
import { FA_LIBRARY } from '../../services/icon-library';
import type { AppProp } from '../../store/applications/types';
import type {
  KeepAppItemDeleteDetail,
  KeepAppItemEditDetail,
} from './keep-app-item';
import type {
  KeepDataTablePageChangeDetail,
  KeepDataTableRowsPerPageChangeDetail,
} from './keep-data-table';
import type { KeepAppFilterChangeDetail } from './keep-app-filter';
import './keep-app-filter';
import './keep-app-item';
import './keep-data-table';
import './keep-zero-results';

/** The value both drawer filters start at, and return to. */
const ALL = 'All';

/** The empty state, when the account has no applications at all. */
const NO_APPS = 'There are currently no apps to display.';
const NO_APPS_HINT = "Click 'Add Application' to create an app.";

/**
 * The Applications list. Tag: `keep-apps-table`. Exposed to React as `KeepAppsTable`.
 *
 * Replaces `applications/AppsTable.tsx`. It owns the list, the name search, the sort, the
 * paging and the two filters the drawer sets; each row is a {@link ./keep-app-item}, the
 * drawer is a {@link ./keep-app-filter} it hands the applied filters to and takes a new pair
 * back from, and the chrome is a {@link ./keep-data-table}.
 *
 * ## Store access
 *
 * One subscription, for the one `useSelector` the original had. `Kanban` selects `apps` only
 * for its own `appPull` flag and hands nothing down, so there is no property here for a
 * subscription to fight. The selector reads the array rather than the slice, so the
 * controller's identity check is exact rather than firing on every unrelated store move.
 *
 * ## Three effects, one pass
 *
 * The original ran three `useEffect`s: one that filtered, one that watched a `filtersOn`
 * flag, and one that watched a `reset` flag. Only the first has any reachable work.
 *
 * **`reset` was never true.** `Kanban` held it as state, passed it down and never set it;
 * the table only ever set it back to `false`. So the `reset` branch of the filter pass, and
 * the whole third effect, could not run — and with them went the only `setPage(0)` on the
 * filtering path, which is why filtering while on a later page still leaves you on that page
 * looking at nothing. That is the behaviour today and it is preserved here rather than
 * quietly fixed; it wants its own issue.
 *
 * **`filtersOn` was a round trip with no reader.** The filter pass set it true, the second
 * effect set it false again, and nothing anywhere read it — two extra renders per filter and
 * no observable effect. Both flags, their setters and the effects around them are gone; the
 * three `useState`s in `Kanban` that fed them go with them.
 *
 * What is left runs in `willUpdate` rather than after the render, because it only sets
 * state: done afterwards it would schedule a second update, where here it folds into the one
 * already in flight.
 *
 * ## Sorting replaces the filtered list with the whole one
 *
 * So it clears an active search. That is the original's behaviour and is preserved. Unlike
 * the consents list, this one already sorted a copy, so there is no frozen-array defect to
 * fix here.
 *
 * ## Styling
 *
 * The `<table>` is rendered here and slotted into `keep-data-table`, so it sits in *this*
 * element's shadow root, and three things that style it today stop at that boundary:
 * `keep-data-table`'s own slotted-table sheet, adopted from the exported string rather than
 * copied; Web Awesome's native layer, which reaches tables, cells and text inputs through
 * bare element selectors; and the utility classes from the global stylesheet that the head
 * carries. The rows' own rules come from {@link ./keep-app-item}, which exports them for
 * exactly this reason.
 *
 * ## Accessibility (#713)
 *
 * Four defects the original carried:
 *
 *  - the table announced itself as the **consents** table. It is the applications table; the
 *    label was copied from the screen next door and named neither (4.1.2).
 *  - the search box had a placeholder and nothing else, so it had no accessible name — a
 *    placeholder is announced inconsistently and vanishes as soon as there is text in the
 *    field (3.3.2).
 *  - the sort button was named by its glyph's label and said nothing about state. It is
 *    named directly and says which way the column is about to sort (4.1.2).
 *  - no header cell said which axis it headed; all five are `scope="col"` now (1.3.1). The
 *    decorative field that keeps the Description head aligned with its neighbours is out of
 *    the tab order and out of the accessibility tree.
 *
 * @fires app-edit - `CustomEvent<KeepAppItemEditDetail>`
 * @fires app-delete - `CustomEvent<KeepAppItemDeleteDetail>`
 */
@customElement('keep-apps-table')
export default class AppsTable extends KeepElement {
  static styles = [
    unsafeCSS(TABLE_STYLE_TEXT),
    appItemStyles,
    css`
      :host {
        display: block;
      }

      /*
       * The page's border-box reset is Web Awesome's native layer: a rule on the root
       * element plus a universal inherit. Neither a universal selector nor a bare element
       * selector crosses a shadow boundary, so without this the percentage columns would
       * measure their width *plus* the 60px of horizontal padding the slotted-table sheet
       * gives every cell.
       */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      /*
       * The rest of the native layer's table region, restated for the same reason. The
       * sheet adopted above already carries width, border-collapse, cell padding and text
       * alignment; these are the declarations nothing else supplies, and each one is on the
       * screen today: the hairline rule above every body row, cell content aligned to the
       * top of a row whose height is set by the tallest thing in it rather than centred
       * against it, and header cells one step down the type ramp.
       */
      table {
        font-variant-numeric: tabular-nums;
      }

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

      /* Head, from the replaced file. */
      thead {
        border-bottom: 1px solid var(--wa-color-surface-border);
      }

      thead .text {
        font-weight: bold;
        font-size: var(--wa-font-size-m);
      }

      /* Body, from the same file. */
      tbody {
        font-size: var(--wa-font-size-m);
        padding-top: 20px;
        padding-bottom: 20px;
        border-bottom: none;
      }

      /*
       * ColumnLayout. Its collapse and can-sort rules are dropped: no node in this markup
       * ever carried either class. The app-name width reaches the body cell as well as the
       * head cell, exactly as it did when this was a wrapper div around the whole table.
       */
      .launch {
        width: 4%;
      }

      .app-name {
        width: 26%;
      }

      .app-id-secret {
        width: 30%;
        font-size: var(--wa-font-size-m);
      }

      .description {
        width: 36%;
      }

      .icons {
        width: 9%;
      }

      /*
       * Web Awesome's native layer again, this time its text-input region — a bare element
       * selector, so none of it reaches in here. Height, inline padding, inherited family,
       * weight, line height, alignment and the text cursor all arrive through it, and the
       * tokens it reads are custom properties, which do cross and stay mode-aware.
       */
      input[type='text'] {
        width: 100%;
        height: var(--wa-form-control-height);
        padding: 0 var(--wa-form-control-padding-inline);
        color: var(--wa-form-control-value-color);
        font-size: var(--wa-form-control-value-size);
        font-family: inherit;
        font-weight: var(--wa-form-control-value-font-weight);
        line-height: var(--wa-form-control-value-line-height);
        vertical-align: middle;
        cursor: text;
      }

      input[type='text']::placeholder {
        color: var(--wa-form-control-placeholder-color);
        user-select: none;
        -webkit-user-select: none;
      }

      input[type='text']:focus-visible {
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }

      /* Head .search-bar, which was unlayered and so outranked the block above. */
      .search-bar {
        border-radius: var(--wa-border-radius-m);
        border: 1px solid var(--wa-color-surface-border);
        padding: 3px 10px;
        background-color: var(--wa-color-surface-default);
        color: var(--wa-color-text-normal);
      }

      /*
       * The utilities the head carried in from the global stylesheet. They reached those
       * nodes as class selectors, which do not cross a shadow boundary.
       */
      .full-width {
        width: 100%;
      }

      .flex {
        display: flex;
      }

      .flex-col {
        flex-direction: column;
      }

      .items-center {
        align-items: center;
      }

      .gap-3 {
        gap: 3px;
      }

      .small-text {
        font-size: 14px;
      }

      .text-13 {
        font-size: 13px;
      }

      .text-bold {
        font-weight: bold;
      }

      .m-0 {
        margin: 0;
      }

      .p-0 {
        padding: 0;
      }

      .no-background {
        background: none;
      }

      .no-border {
        border: none;
      }

      .cursor-pointer {
        cursor: pointer;
      }

      .hidden {
        visibility: hidden;
      }

      /* The sort button is a tab stop, so it needs to show that it has focus. */
      thead button:focus-visible {
        border-radius: var(--wa-border-radius-s);
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }
    `,
  ];

  private readonly appsCtl = new StoreController(this, (state) => state.apps.apps);

  /** Zero-based page of {@link filteredApps}. */
  @state() accessor page = 0;

  /** Rows per page; `-1` means All. */
  /** Matches keep-data-table's default and its offered options (#955). */
  @state() accessor rowsPerPage = 25;

  /** What the table is showing: the apps that pass every filter, in sort order. */
  @state() accessor filteredApps: AppProp[] = [];

  /** The name search box. */
  @state() accessor appName = '';

  /** Which way the next click on the sort control will sort. */
  @state() accessor sortAppName = true;

  /** The drawer's two filters. */
  @state() accessor status = ALL;
  @state() accessor appSecret = ALL;

  /** The inputs the filtered list was last computed from, compared by reference. */
  private lastInputs: readonly unknown[] = [];

  protected willUpdate(): void {
    this.refilter();
  }

  /** Recompute the visible list when any input has moved. */
  private refilter(): void {
    const inputs = [this.appName, this.status, this.appSecret, this.appsCtl.value];
    if (this.hasUpdated && inputs.every((value, i) => Object.is(value, this.lastInputs[i]))) return;
    this.lastInputs = inputs;
    this.filteredApps = this.computeFiltered();
  }

  private computeFiltered(): AppProp[] {
    let next: readonly AppProp[] = this.appsCtl.value;

    if (this.appName.length > 0) {
      const needle = this.appName.toLowerCase();
      next = next.filter((app) => app.appName.toLowerCase().indexOf(needle) !== -1);
    }

    switch (this.status) {
      case 'Active':
        next = next.filter((app) => app.appStatus === 'isActive');
        break;
      case 'Inactive':
        next = next.filter((app) => app.appStatus !== 'isActive');
        break;
      default:
        break;
    }

    switch (this.appSecret) {
      case 'App secret':
        next = next.filter((app) => !app.usePkce);
        break;
      case 'App secret generated':
        next = next.filter((app) => !app.usePkce && app.appSecret !== null);
        break;
      case 'App secret not generated':
        next = next.filter((app) => !app.usePkce && app.appSecret === null);
        break;
      case 'PKCE':
        next = next.filter((app) => app.usePkce);
        break;
      default:
        break;
    }

    return next as AppProp[];
  }

  /** Sort by name. Replaces the filtered list with the whole one — see the class docblock. */
  private sortByName(): void {
    const ascending = this.sortAppName;
    this.filteredApps = [...this.appsCtl.value].sort((a, b) =>
      ascending ? a.appName.localeCompare(b.appName) : b.appName.localeCompare(a.appName),
    );
    this.sortAppName = !this.sortAppName;
  }

  /**
   * A page change also refetches the list, which is what the original did. The refetch is
   * not awaited and the page moves either way.
   */
  private handlePageChange(event: CustomEvent<KeepDataTablePageChangeDetail>): void {
    event.stopPropagation();
    this.page = event.detail.page;
    this.appsCtl.dispatch(fetchMyApps());
  }

  private handleRowsPerPageChange(event: CustomEvent<KeepDataTableRowsPerPageChangeDetail>): void {
    event.stopPropagation();
    this.rowsPerPage = event.detail.rowsPerPage;
    this.page = 0;
  }

  private handleFilterChange(event: CustomEvent<KeepAppFilterChangeDetail>): void {
    event.stopPropagation();
    this.status = event.detail.status;
    this.appSecret = event.detail.appSecret;
  }

  /**
   * The rows' two events are this element's internals on the way through. They are composed,
   * so each is stopped here and re-emitted under a name that says which list it came from.
   */
  private handleRowEdit(event: CustomEvent<KeepAppItemEditDetail>): void {
    event.stopPropagation();
    this.emit<KeepAppItemEditDetail>('app-edit', { values: event.detail.values });
  }

  private handleRowDelete(event: CustomEvent<KeepAppItemDeleteDetail>): void {
    event.stopPropagation();
    this.emit<KeepAppItemDeleteDetail>('app-delete', { appId: event.detail.appId });
  }

  /** The apps on the current page, or all of them when the page size is All. */
  private get visibleApps(): AppProp[] {
    if (this.rowsPerPage <= 0) return this.filteredApps;
    const start = this.page * this.rowsPerPage;
    return this.filteredApps.slice(start, start + this.rowsPerPage);
  }

  private renderTable() {
    return html`
      <keep-data-table
        paginated
        .count=${this.filteredApps.length}
        .page=${this.page}
        .rowsPerPage=${this.rowsPerPage}
        @page-change=${this.handlePageChange}
        @rows-per-page-change=${this.handleRowsPerPageChange}
      >
        <table aria-label="applications table">
          <thead>
            <tr>
              <th class="launch" scope="col"><span class="visually-hidden">Open app</span></th>
              <th class="app-name text" scope="col">
                <div class="full-width flex flex-col gap-3">
                  <span class="small-text text-bold flex items-center gap-3">
                    App Name
                    <button
                      class="no-background no-border cursor-pointer m-0 p-0"
                      aria-label=${`Sort by app name, ${
                        this.sortAppName ? 'ascending' : 'descending'
                      }`}
                      @click=${this.sortByName}
                    >
                      <wa-icon library=${FA_LIBRARY} name="sort" canvas="auto"></wa-icon>
                    </button>
                  </span>
                  <input
                    type="text"
                    class="search-bar"
                    placeholder="Search App Name"
                    aria-label="Search App Name"
                    .value=${this.appName}
                    @input=${(event: Event) => {
                      this.appName = (event.target as HTMLInputElement).value;
                    }}
                  />
                </div>
              </th>
              <th class="app-id-secret text" scope="col">
                <!--
                  The two labels are adjacent rather than laid out one per line: the markup
                  this replaces was a view-library template, which drops whitespace-only text
                  between elements, and a Lit template does not. Left apart, the cell's text
                  gains a newline the head never had.
                -->
                <div class="full-width flex flex-col gap-3">
                  <span class="text-bold text-13">App ID</span
                  ><span class="text-bold text-13">App Secret</span>
                </div>
              </th>
              <th class="description text" scope="col">
                <div class="full-width flex flex-col gap-3">
                  <span class="small-text text-bold">Description</span>
                  <input type="text" class="search-bar hidden" aria-hidden="true" tabindex="-1" />
                </div>
              </th>
              <th class="icons" scope="col"><span class="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            ${repeat(
              this.visibleApps,
              (app, index) => `${app.appName}-${index}`,
              (app) => html`
                <keep-app-item
                  .app=${app}
                  @app-edit=${this.handleRowEdit}
                  @app-delete=${this.handleRowDelete}
                ></keep-app-item>
              `,
            )}
          </tbody>
        </table>
      </keep-data-table>
    `;
  }

  render() {
    return html`
      ${this.appsCtl.value.length === 0
        ? html`
            <keep-zero-results
              .mainLabel=${NO_APPS}
              .secondaryLabel=${NO_APPS_HINT}
            ></keep-zero-results>
          `
        : this.renderTable()}
      <!--
        Outside the branch above, as it was: the drawer is reachable from the options bar
        whether or not there is a list behind it.
      -->
      <keep-app-filter
        status=${this.status}
        app-secret=${this.appSecret}
        @filter-change=${this.handleFilterChange}
      ></keep-app-filter>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-apps-table': AppsTable;
  }
}
