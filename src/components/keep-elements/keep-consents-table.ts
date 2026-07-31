/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import { TABLE_STYLE_TEXT } from './keep-data-table.styles';
import { consentItemStyles } from './keep-consent-item';
import { FA_LIBRARY } from '../../services/icon-library';
import type { Consent } from '../../store/consents/types';
import type { KeepConsentItemApp, KeepConsentItemUser } from './keep-consent-item';
import type {
  KeepDataTablePageChangeDetail,
  KeepDataTableRowsPerPageChangeDetail,
} from './keep-data-table';
import type {
  KeepConsentFilterChangeDetail,
  KeepConsentFilterExpiry,
} from './keep-consent-filter';
import './keep-consent-filter';
import './keep-consent-item';
import './keep-data-table';
import './keep-page-loading';

/** `event.detail` of `filters-on-change`. */
export interface KeepConsentsTableFiltersOnDetail {
  filtersOn: boolean;
}

/** `event.detail` of `reset-change`. */
export interface KeepConsentsTableResetDetail {
  reset: boolean;
}

/** What an unresolved application name renders as, and what the app-name filter matches. */
const NO_APP = '-';

/** The value every filter starts at, and returns to. */
const ALL = 'All';

/** The caption shown while either list is still arriving. */
const LOADING = 'Users and Consents are loading. This may take a few seconds...';

/** A fresh, unset expiry filter. */
const anyExpiry = (): KeepConsentFilterExpiry => ({ expiration: ALL, date: new Date() });

/** Two timestamps on the same calendar day, in local time — which is how the filter reads. */
const sameDay = (a: Date, b: Date) =>
  a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

/** A timestamp the platform cannot parse, which is what the `None` expiry filter selects. */
const unparseable = (value: string) => new Date(value).toUTCString() === 'Invalid Date';

/**
 * The OAuth consents list. Tag: `keep-consents-table`. Rendered only from
 * {@link ./keep-consents}'s template, so it has no `@lit/react` wrapper — the one it had was
 * deleted with the last `.tsx` that rendered it.
 *
 * Replaces `applications/kanban/ConsentsTable.tsx`. It owns the list, the two search boxes,
 * both sorts, the paging and every filter the drawer sets; each row is a
 * {@link ./keep-consent-item}, and the drawer is a {@link ./keep-consent-filter} it hands the
 * applied filter to and takes a new one back from.
 *
 * ## Store access
 *
 * Four subscriptions, one per `useSelector` the original had. The parent hands none of this
 * down — it selects the consents only to decide between this table and a zero-results panel —
 * so there is no property for a subscription here to fight. Three of the four select a slice
 * reference and the fourth a boolean, so the controller's `Object.is` check is exact rather
 * than firing on every unrelated store move.
 *
 * ## Three effects, one pass
 *
 * The original ran three `useEffect`s that raced each other across two renders: one that
 * filtered, one that watched a `filtersOn` flag, and one that watched a `reset` flag. Two of
 * them wrote the state the first one read, so the list the user saw was the *converged*
 * result of that race, not the result of any single effect. It is written here as that
 * result, in the order it settles — clear on reset, clear on the filters flag, then filter —
 * which reaches the same end state in one update instead of two.
 *
 * Two things do not survive that, both deliberately:
 *
 * 1. **`filters-on-change` is never reported as `true`.** The original set the flag true on
 *    every filter pass and then cleared it again in the same batch on every path a user could
 *    reach. The one path where it stuck — a filter with a status, both expiries set and no
 *    scopes, only reachable straight after a Reset — fed the second effect, which cleared the
 *    very filters that had made it stick. That loop wiped a filter the user had just applied,
 *    so it is not reproduced. The property and the event stay, and the second effect's
 *    behaviour with them: a `filtersOn` arriving `true` from outside still clears the drawer
 *    filters and reports the flag back off.
 * 2. **The `reset` branch of the filter pass is gone**, because it cannot be reached any more:
 *    the reset clears every filter before the pass runs, so applying them is a no-op.
 *
 * ## Sorting was broken in the shipped app, and is fixed here
 *
 * `handleSortUsers`/`handleSortAppNames` sorted the array read straight out of the store —
 * **in place**, not a copy, unlike `AppsTable`, which copies with a spread first. Redux
 * Toolkit deep-freezes the state a reducer produces, and the consents arrive through one, so
 * the array is frozen and an in-place sort throws `TypeError: Cannot assign to read only
 * property '0'`. Both sort controls therefore did nothing but throw for any list the app
 * actually loaded.
 *
 * Nothing caught it because the characterization suite seeded the store through
 * `preloadedState`, which never passes through a reducer and so is never frozen — and it then
 * pinned the in-place mutation as intended behaviour. The sort copies here, the suite seeds
 * through the real action, and the assertion that pinned the mutation is gone.
 *
 * Sorting still replaces the filtered list with the whole one, so it clears an active search.
 * That is the original's behaviour and is preserved.
 *
 * ## Styling
 *
 * The `<table>` is rendered here and slotted into `keep-data-table`, so it sits in *this*
 * element's shadow root, and three things that style it today stop at that boundary:
 * `keep-data-table`'s own slotted-table sheet, adopted from the exported string rather than
 * copied; Web Awesome's `wa-native` layer, which reaches tables, cells and text inputs
 * through bare element selectors; and the handful of utility classes from the global
 * stylesheet that the head and the rows both carry. The rows' own rules come from
 * {@link ./keep-consent-item}, which exports them for exactly this reason.
 *
 * ## Accessibility (#713)
 *
 * The two search boxes had a placeholder and nothing else, so neither had an accessible name
 * — a placeholder is announced inconsistently and vanishes as soon as there is text in the
 * field. Both are labelled now. The two sort buttons were named by their glyph's label; they
 * are named directly, and say which way the column is about to sort. Every header cell says
 * which axis it heads.
 *
 * @fires filters-on-change - `CustomEvent<KeepConsentsTableFiltersOnDetail>`
 * @fires reset-change - `CustomEvent<KeepConsentsTableResetDetail>`
 */
@customElement('keep-consents-table')
export default class ConsentsTable extends KeepElement {
  static styles = [
    unsafeCSS(TABLE_STYLE_TEXT),
    consentItemStyles,
    css`
      :host {
        display: block;
      }

      /*
       * The page's border-box reset is Web Awesome's wa-native layer: html{border-box} plus
       * a universal box-sizing:inherit. Neither a universal selector nor a bare element
       * selector crosses a shadow boundary, so without this the fixed-width columns would
       * measure their width *plus* the 60px of horizontal padding the slotted-table sheet
       * gives every cell.
       */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      /*
       * The rest of wa-native's table region, restated for the same reason. The sheet
       * adopted above already carries width, border-collapse, cell padding and text
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

      /*
       * Head, from the replaced file. Its .text rule is kept because three header cells
       * carry that class; the search-bar rule follows below with the wa-native block it
       * used to sit on top of.
       */
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
       * ColumnLayout. Its .collapse and .can-sort rules are dropped: no node in this markup
       * ever carried either class.
       */
      .expand {
        width: 50px;
      }

      .user {
        width: 30%;
      }

      .app-name {
        width: 20%;
      }

      .expirations {
        width: calc(40% - 50px);
      }

      .action {
        width: 10%;
      }

      /*
       * Web Awesome's wa-native layer again, this time its text-input region — a bare
       * element selector, so none of it reaches in here. Height, inline padding, inherited
       * family, weight, line height, alignment and the text cursor all arrive through it,
       * and the tokens it reads are custom properties, which do cross and stay mode-aware.
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
       * The utilities the head and the rows carried in from the global stylesheet. They
       * reached those nodes as class selectors, which do not cross a shadow boundary, so
       * they are restated once here for both trees.
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

      /* The sort buttons are a tab stop, so they need to show that they have focus. */
      button:focus-visible {
        border-radius: var(--wa-border-radius-s);
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }
    `,
  ];

  /** Expand all / Collapse all, from the options bar above the table. */
  @property({ type: Boolean }) accessor expand = false;

  /**
   * The legacy "a filter is on" flag. An input: when it arrives `true` the drawer filters are
   * cleared and it is reported back off. Never reported on — see the class docblock.
   */
  @property({ type: Boolean, attribute: 'filters-on' }) accessor filtersOn = false;

  /** The options bar's Reset. Clears every filter, both searches and both sorts. */
  @property({ type: Boolean }) accessor reset = false;

  private readonly consentsCtl = new StoreController(this, (s) => s.consents.consents);
  private readonly appsCtl = new StoreController(this, (s) => s.apps.apps);
  private readonly usersCtl = new StoreController(this, (s) => s.users.users);
  private readonly loadingCtl = new StoreController(
    this,
    (s) => s.loading.consentsLoading || s.loading.usersLoading,
  );

  /** Zero-based page of {@link filteredConsents}. */
  @state() accessor page = 0;

  /** Rows per page; `-1` means All. */
  /** Matches keep-data-table's default and its offered options (#955). */
  @state() accessor rowsPerPage = 25;

  /** What the table is showing: the consents that pass every filter, in sort order. */
  @state() accessor filteredConsents: Consent[] = [];

  /** The user search box. */
  @state() accessor user = '';

  /** The app-name search box. */
  @state() accessor appName = '';

  /** The drawer's five filters. */
  @state() accessor status = ALL;
  @state() accessor showWithApps = false;
  @state() accessor expiration: KeepConsentFilterExpiry = anyExpiry();
  @state() accessor tokenExpiration: KeepConsentFilterExpiry = anyExpiry();
  @state() accessor scopes: string[] = [];

  /** Which way the next click on each sort control will sort. */
  @state() accessor sortUser = true;
  @state() accessor sortAppName = true;

  /** Edge detectors for the two flags, re-armed when the parent clears them. */
  private consumedReset = false;
  private consumedFiltersOn = false;

  /** The inputs the filtered list was last computed from, compared by reference. */
  private lastInputs: readonly unknown[] = [];

  /**
   * The three effects, in the order they settle. Run before the render rather than after it
   * because they only ever set state: done afterwards each would schedule a second update,
   * where here they fold into the one already in flight.
   */
  protected willUpdate(): void {
    this.consumeReset();
    this.consumeFiltersOn();
    this.refilter();
  }

  /** Every drawer filter, back to its unset value. */
  private clearDrawerFilters(): void {
    this.status = ALL;
    this.showWithApps = false;
    this.expiration = anyExpiry();
    this.tokenExpiration = anyExpiry();
    // The original cleared this to `['']` here and to `[]` in its reset effect. The filter
    // discards empty strings before it counts them, so the two were always the same filter.
    this.scopes = [];
  }

  /** The options bar's Reset: the drawer filters, both searches and both sort directions. */
  private consumeReset(): void {
    if (!this.reset) {
      this.consumedReset = false;
      return;
    }
    if (this.consumedReset) return;
    this.consumedReset = true;

    this.user = '';
    this.appName = '';
    this.clearDrawerFilters();
    this.sortUser = true;
    this.sortAppName = true;
    this.emit<KeepConsentsTableResetDetail>('reset-change', { reset: false });
  }

  /** The legacy flag: clear the drawer filters and report it back off. */
  private consumeFiltersOn(): void {
    if (!this.filtersOn) {
      this.consumedFiltersOn = false;
      return;
    }
    if (this.consumedFiltersOn) return;
    this.consumedFiltersOn = true;

    this.clearDrawerFilters();
    this.emit<KeepConsentsTableFiltersOnDetail>('filters-on-change', { filtersOn: false });
  }

  /** Recompute the visible list, and return to page one, when any input has moved. */
  private refilter(): void {
    const inputs = [
      this.user,
      this.appName,
      this.status,
      this.showWithApps,
      this.expiration,
      this.tokenExpiration,
      this.scopes,
      this.consentsCtl.value,
      this.appsCtl.value,
      this.usersCtl.value,
    ];
    if (this.hasUpdated && inputs.every((value, i) => Object.is(value, this.lastInputs[i]))) return;
    this.lastInputs = inputs;
    this.filteredConsents = this.computeFiltered();
    this.page = 0;
  }

  /** The internet address the directory holds for a consent's user, or the raw name. */
  private consentUsername(consent: Consent): string {
    const match = this.usersCtl.value?.find(
      (user) => user[Object.keys(user)[0]].FullName[0] === consent.username,
    );
    const address = match ? match[Object.keys(match)[0]].InternetAddress[0] : '';
    return address ? address : consent.username;
  }

  /** The name of the application the consent was granted to, or a dash. */
  private consentAppName(consent: Consent): string {
    return this.appsCtl.value.find((app) => app.appId === consent.client_id)?.appName ?? NO_APP;
  }

  private computeFiltered(): Consent[] {
    let next: readonly Consent[] = this.consentsCtl.value;

    if (this.user.length > 0) {
      const needle = this.user.toLowerCase();
      next = next.filter((c) => this.consentUsername(c).toLowerCase().includes(needle));
    }
    if (this.appName.length > 0) {
      const needle = this.appName.toLowerCase();
      next = next.filter((c) => this.consentAppName(c).toLowerCase().includes(needle));
    }
    if (this.status === 'Active') {
      next = next.filter((c) => new Date(c.code_expires_at) > new Date());
    }
    if (this.showWithApps) {
      // An application whose name is missing or a dash counts as no application at all.
      next = next.filter((c) => {
        const app = this.appsCtl.value.find((a) => a.appId === c.client_id);
        return !!app && !!app.appName && app.appName !== NO_APP;
      });
    }
    next = this.filterByExpiry(next, this.expiration, (c) => c.code_expires_at);
    next = this.filterByExpiry(next, this.tokenExpiration, (c) => c.refresh_token_expires_at);

    const wanted = this.scopes.filter((scope) => scope !== '');
    if (wanted.length > 0) {
      next = next.filter((c) => {
        const held = c.scope.split(',');
        return wanted.some((scope) => held.includes(scope));
      });
    }
    return next as Consent[];
  }

  private filterByExpiry(
    consents: readonly Consent[],
    filter: KeepConsentFilterExpiry,
    stamp: (consent: Consent) => string,
  ): readonly Consent[] {
    if (filter.expiration === ALL || filter.expiration.length === 0) return consents;
    if (filter.expiration === 'None') return consents.filter((c) => unparseable(stamp(c)));
    return consents.filter((c) => sameDay(new Date(stamp(c)), new Date(filter.date)));
  }

  /**
   * Sort the list by one of its two sortable columns.
   *
   * Sorts a **copy**, which is a bug fix — see the class docblock. Replacing the filtered
   * list with the whole one, and so clearing an active search, is the original's behaviour
   * and is preserved.
   */
  private sortBy(key: 'user' | 'appName'): void {
    const ascending = key === 'user' ? this.sortUser : this.sortAppName;
    const of =
      key === 'user'
        ? (c: Consent) => this.consentUsername(c)
        : (c: Consent) => this.consentAppName(c);
    this.filteredConsents = [...this.consentsCtl.value].sort((a, b) =>
      ascending ? of(a).localeCompare(of(b)) : of(b).localeCompare(of(a)),
    );
    if (key === 'user') this.sortUser = !this.sortUser;
    else this.sortAppName = !this.sortAppName;
  }

  private handleFilterChange(event: CustomEvent<KeepConsentFilterChangeDetail>): void {
    event.stopPropagation();
    const { status, showWithApps, expiration, tokenExpiration, scopes } = event.detail;
    this.status = status;
    this.showWithApps = showWithApps;
    this.expiration = expiration;
    this.tokenExpiration = tokenExpiration;
    this.scopes = scopes;
  }

  private handlePageChange(event: CustomEvent<KeepDataTablePageChangeDetail>): void {
    event.stopPropagation();
    this.page = event.detail.page;
  }

  private handleRowsPerPageChange(event: CustomEvent<KeepDataTableRowsPerPageChangeDetail>): void {
    event.stopPropagation();
    this.rowsPerPage = event.detail.rowsPerPage;
    this.page = 0;
  }

  /** The consents on the current page, or all of them when the page size is All. */
  private get visibleConsents(): Consent[] {
    if (this.rowsPerPage <= 0) return this.filteredConsents;
    const start = this.page * this.rowsPerPage;
    return this.filteredConsents.slice(start, start + this.rowsPerPage);
  }

  /** A searchable column header: its name, its sort control and its search box. */
  private renderSearchColumn(
    key: 'user' | 'appName',
    label: string,
    placeholder: string,
    ascending: boolean,
  ) {
    return html`
      <div class="full-width flex flex-col gap-3">
        <span class="small-text text-bold flex items-center gap-3">
          ${label}
          <button
            class="no-background no-border cursor-pointer m-0 p-0"
            aria-label=${`Sort by ${label.toLowerCase()}, ${ascending ? 'ascending' : 'descending'}`}
            @click=${() => this.sortBy(key)}
          >
            <wa-icon library=${FA_LIBRARY} name="sort" canvas="auto"></wa-icon>
          </button>
        </span>
        <input
          type="text"
          class="search-bar"
          placeholder=${placeholder}
          aria-label=${placeholder}
          .value=${key === 'user' ? this.user : this.appName}
          @input=${(event: Event) => {
            const { value } = event.target as HTMLInputElement;
            if (key === 'user') this.user = value;
            else this.appName = value;
          }}
        />
      </div>
    `;
  }

  /** A column that only announces itself. The hidden field keeps the head rows aligned. */
  private renderPlainColumn(label: string) {
    return html`
      <div class="full-width flex flex-col gap-3">
        <span class="small-text text-bold flex items-center gap-3">${label}</span>
        <input type="text" class="search-bar hidden" aria-hidden="true" tabindex="-1" />
      </div>
    `;
  }

  private renderTable() {
    return html`
      <keep-data-table
        paginated
        header-band
        .count=${this.filteredConsents.length}
        .page=${this.page}
        .rowsPerPage=${this.rowsPerPage}
        @page-change=${this.handlePageChange}
        @rows-per-page-change=${this.handleRowsPerPageChange}
      >
        <table aria-label="consents table">
          <thead>
            <tr>
              <!-- The disclosure column, which has no name to give. Left empty, as it was. -->
              <th class="expand" scope="col"></th>
              <th class="user" scope="col">
                ${this.renderSearchColumn('user', 'User', 'Search User', this.sortUser)}
              </th>
              <th class="app-name text" scope="col">
                ${this.renderSearchColumn(
                  'appName',
                  'App Name',
                  'Search App Name',
                  this.sortAppName,
                )}
              </th>
              <th class="expirations text" scope="col">${this.renderPlainColumn('Expirations')}</th>
              <th class="action text" scope="col">${this.renderPlainColumn('Action')}</th>
            </tr>
          </thead>
          <tbody>
            ${repeat(
              this.visibleConsents,
              (consent, index) => `${consent.unid}-${consent.username}-${index}`,
              (consent) => html`
                <keep-consent-item
                  .consent=${consent}
                  .apps=${this.appsCtl.value as KeepConsentItemApp[]}
                  .users=${this.usersCtl.value as KeepConsentItemUser[] | null}
                  ?expand=${this.expand}
                ></keep-consent-item>
              `,
            )}
          </tbody>
        </table>
      </keep-data-table>
    `;
  }

  render() {
    return html`
      ${this.loadingCtl.value
        ? // The consents container is an auto-height flex column, so page-height is what
          // keeps this the full-page box it was rather than a strip at the top.
          html`<keep-page-loading contained page-height message=${LOADING}></keep-page-loading>`
        : this.renderTable()}
      <keep-consent-filter
        status=${this.status}
        ?show-with-apps=${this.showWithApps}
        .expiration=${this.expiration}
        .tokenExpiration=${this.tokenExpiration}
        .scopes=${this.scopes}
        .consents=${this.consentsCtl.value}
        @filter-change=${this.handleFilterChange}
      ></keep-consent-filter>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-consents-table': ConsentsTable;
  }
}
