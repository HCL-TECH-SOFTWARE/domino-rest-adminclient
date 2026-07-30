/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import { store } from '../../store/store';
import { toggleDeleteConsent } from '../../store/consents/action';
import type { Consent } from '../../store/consents/types';
import { FA_LIBRARY } from '../../services/icon-library';
import './keep-tooltip';

/** One application, as `state.apps.apps` holds it. */
export interface KeepConsentItemApp {
  appId: string;
  appName: string;
}

/**
 * One directory record, as `state.users.users` holds it: a single-key object whose value
 * carries the multi-value Domino fields this screen reads.
 */
export type KeepConsentItemUser = Record<string, { FullName: string[]; InternetAddress: string[] }>;

/** A day, in milliseconds. Inside this window an expiry is amber rather than green. */
const DAY = 86_400_000;

/** The three states of an expiry dot, oldest colours in the app and unchanged here. */
const EXPIRED = '#C3335F';
const SOON = '#FFCD41';
const HEALTHY = '#0FA068';

/** What an unparseable or absent timestamp renders as. */
const NONE = '-';

/**
 * Row styling for {@link ConsentItem}, adopted by the table that renders it.
 *
 * The rows are in the *table's* shadow root, not in one of their own — see the element's
 * docblock — so the rules that dress them have to be in the same root as the table's, and
 * that root is where these go. Scoped by tag name so nothing here can reach the table's own
 * head, which uses several of the same words.
 */
export const consentItemStyles = css`
  /*
   * The rows have to lay out as rows of the table above them, so the element between the
   * body and them must not generate a box of its own.
   */
  keep-consent-item {
    display: contents;
  }

  /*
   * Row, from the replaced file. Its .text rule is dropped: no node in this markup ever
   * carried that class.
   */
  keep-consent-item .exp-content {
    display: flex;
    flex-direction: column;
  }

  keep-consent-item .exp-row {
    display: flex;
    flex-direction: row;
    gap: 5px;
    align-items: center;
  }

  /*
   * Carried over verbatim, and worth a note: it is a literal rather than a token, so it does
   * not move between light and dark. Lane B's to fix, not this pass's.
   */
  keep-consent-item .revoke {
    color: #aa1f51;
  }

  keep-consent-item .off-border {
    border-bottom: 0;
  }

  /* UrlContainer, and the flex-col utility the second of the two carried. */
  keep-consent-item .url-container {
    padding: 0 20px;
    display: flex;
    gap: 5px;
  }

  keep-consent-item .url-container.flex-col {
    flex-direction: column;
  }

  keep-consent-item .scope-box {
    border: 1px solid #b9b9b9;
    border-radius: var(--wa-border-radius-m);
    padding: 10px;
    display: flex;
    flex-direction: row;
    gap: 10px;
  }

  keep-consent-item .scope {
    border-radius: 20px;
    padding: 5px 10px;
    background-color: var(--keep-surface-highlight);
  }

  /* The chevron was an icon at MUI's 24px default; xl is the nearest step on the ramp. */
  keep-consent-item .chevron {
    font-size: var(--wa-font-size-xl);
  }
`;

/**
 * One consent in the OAuth consents list: a data row and the detail row under it.
 * Tag: `keep-consent-item`.
 *
 * Replaces `applications/kanban/ConsentItem.tsx`. Presentational apart from one dispatch —
 * `keep-consents-table` owns the list, the filtering and the paging, and hands each row the
 * record plus the two directories it resolves against.
 *
 * ## It renders into the light DOM, and that is the whole design
 *
 * A shadow root here would be a third tree between the `<table>` and its `<tr>`s, and two
 * stylesheets that dress those rows would stop at it: `keep-data-table`'s slotted-table sheet
 * (every selector in it begins `keep-data-table`, which is an ancestor of the table but not
 * of anything inside a root nested below it) and Web Awesome's `wa-native` table region,
 * which is bare element selectors. Rendering into the light DOM keeps the rows in the table's
 * own root, where both already reach them — the same place they were before this conversion,
 * when they were React fragments. What the element owns instead is
 * {@link consentItemStyles}, which the table adopts.
 *
 * ## Store access
 *
 * One dispatch, no selection. The two directories arrive as properties from the table, which
 * already holds both; `store` is imported directly rather than through a `StoreController`,
 * because a controller with no selector is a subscription that can never fire.
 *
 * ## Two behaviours carried over deliberately
 *
 * - **Revoke sends the raw `consent.username`**, not the internet address the cell shows.
 *   The original read the record in its click handler and the resolved local only for
 *   display, and the delete dialog is worded against what the consent itself says.
 * - **`expand` is an edge, not a level.** The table's Expand all / Collapse all sets it, and
 *   a row the user has since opened or closed on its own stays that way until the flag
 *   actually moves — so pressing Expand all twice does not re-expand a row collapsed in
 *   between. That was true before and is true here.
 *
 * ## Accessibility (#713)
 *
 * The disclosure control was an unnamed button around a labelled glyph, which announced the
 * icon's own label and said nothing about state. It is one button now, named for what it
 * does, carrying `aria-expanded` and pointing at the row it controls; the glyph inside it is
 * decorative. The detail row stays in the table whether it has contents or not, so that
 * reference is resolvable either way.
 */
@customElement('keep-consent-item')
export default class ConsentItem extends KeepElement {
  /**
   * Light DOM. See the class docblock — the rows must stay in the table's root for the two
   * sheets that style them to reach them.
   */
  protected createRenderRoot(): HTMLElement {
    return this;
  }

  /** The consent this row shows. */
  @property({ attribute: false }) accessor consent!: Consent;

  /** Every application, so the row can name the one that was granted the consent. */
  @property({ attribute: false }) accessor apps: readonly KeepConsentItemApp[] = [];

  /** The directory, so the row can show an internet address instead of a Domino name. */
  @property({ attribute: false }) accessor users: readonly KeepConsentItemUser[] | null = [];

  /** The table's Expand all / Collapse all. An edge — see the class docblock. */
  @property({ type: Boolean }) accessor expand = false;

  /** Whether the detail row is showing. */
  @state() accessor showDetails = false;

  /** Distinct per row, so `aria-controls` resolves to this row's details and no other. */
  private get detailsId(): string {
    return `consent-details-${this.consent.unid}`;
  }

  protected willUpdate(changed: PropertyValues<this>): void {
    if (changed.has('expand')) this.showDetails = this.expand;
  }

  /** The application that was granted this consent, if the list still holds it. */
  private get app(): KeepConsentItemApp | undefined {
    return this.apps.find((app) => app.appId === this.consent.client_id);
  }

  /**
   * The internet address the directory holds for this consent's user, or the raw name.
   *
   * The record is matched on `FullName`, which is what the consent stores. A directory entry
   * with an empty address is treated as no match, exactly as before.
   */
  private get username(): string {
    const match = this.users?.find(
      (user) => user[Object.keys(user)[0]].FullName[0] === this.consent.username,
    );
    const address = match ? match[Object.keys(match)[0]].InternetAddress[0] : '';
    return address ? address : this.consent.username;
  }

  /** Ask the consents screen to confirm revoking this consent. */
  private _revoke(): void {
    store.dispatch(
      toggleDeleteConsent(
        this.consent.unid,
        this.app?.appName ?? '',
        this.consent.username,
        this.consent.scope,
      ),
    );
  }

  private _toggleDetails(): void {
    this.showDetails = !this.showDetails;
  }

  /** A timestamp as the row states it, or a dash when it does not parse. */
  private static _stamp(value: string): string {
    const text = new Date(value).toUTCString();
    return text !== 'Invalid Date' ? text : NONE;
  }

  /**
   * One expiry: a status dot, a label and the timestamp.
   *
   * The tooltip's copy is empty unless the expiry is inside a day, which is what suppresses
   * it — `keep-tooltip` shows nothing for empty content.
   */
  private _renderExpiry(label: string, value: string) {
    const remaining = new Date(value).getTime() - Date.now();
    const fill = remaining < 0 ? EXPIRED : remaining <= DAY ? SOON : HEALTHY;
    return html`
      <div class="exp-row">
        <keep-tooltip
          content=${remaining > 0 && remaining <= DAY ? 'Expiring in less than a day' : ''}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 9 9" fill="none">
            <circle cx="4.5" cy="4.5" r="4.5" fill=${fill}></circle>
          </svg>
        </keep-tooltip>
        <span class="small-text text-bold">${label}:</span>
        <span class="small-text">${ConsentItem._stamp(value)}</span>
      </div>
    `;
  }

  render() {
    const scopes = this.consent.scope.split(',');
    return html`
      <tr>
        <td class="expand off-border">
          <button
            class="no-background no-border cursor-pointer m-0 p-0"
            aria-label=${this.showDetails ? 'Hide consent details' : 'Show consent details'}
            aria-expanded=${this.showDetails ? 'true' : 'false'}
            aria-controls=${this.detailsId}
            @click=${this._toggleDetails}
          >
            <wa-icon
              class="chevron"
              library=${FA_LIBRARY}
              name=${this.showDetails ? 'chevron-up' : 'chevron-down'}
              canvas="auto"
            ></wa-icon>
          </button>
        </td>
        <td class="user off-border">${this.username}</td>
        <td class="app-name off-border">${this.app ? this.app.appName : NONE}</td>
        <td class="expiration exp-content off-border">
          ${this._renderExpiry('Expiration', this.consent.code_expires_at)}
          ${this._renderExpiry('Token Expiration', this.consent.refresh_token_expires_at)}
        </td>
        <td class="off-border">
          <button
            class="revoke no-background no-border cursor-pointer m-0 p-0"
            @click=${this._revoke}
          >
            Revoke
          </button>
        </td>
      </tr>
      <!--
        The detail row is always present, empty when collapsed, because it always was: the
        transition it used to hold collapsed its own contents to nothing and left the row and
        its cell standing, padding and all. Removing it here would tighten every row in the
        table by the cell's own 40px, which is a layout change nobody asked this pass for.
      -->
      <tr id=${this.detailsId}>
        <td colspan="5">
          ${this.showDetails
            ? html`
                <div class="url-container">
                  <span><b>URL:</b></span>
                  <a href=${this.consent.redirect_uri} target="_blank" rel="noreferrer"
                    >${this.consent.redirect_uri}</a
                  >
                </div>
                <div class="url-container flex-col">
                  <span><b>Scopes</b></span>
                  <div class="scope-box">
                    ${scopes.map((scope) => html`<span class="scope">${scope}</span>`)}
                  </div>
                </div>
              `
            : nothing}
        </td>
      </tr>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-consent-item': ConsentItem;
  }
}
