/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './keep-schema-status';
import '@awesome.me/webawesome/dist/components/input/input.js';
import { FA_LIBRARY } from '../../services/icon-library';
import { appIconUri, DEFAULT_APP_ICON_NAME, loadAppIcons } from '../../services/app-icons';
import { appIconSkeleton, appIconSkeletonStyles } from './app-icon-skeleton';
import { KeepElement } from './keep-element';

type DatabaseEntry = {
  schemaName?: string;
  apiName?: string;
  nsfPath?: string;
  iconName?: string;
};
type Database = { fileName?: string; databases?: DatabaseEntry[] };

/**
 * Card listing the schemas/APIs of a database file, with a search filter.
 * Tag: `keep-nsf-card`. Renders a `keep-schema-status` per entry.
 */
@customElement('keep-nsf-card')
export default class NsfCard extends KeepElement {
  static styles = [
    appIconSkeletonStyles,
    css`
    /* Opt the shadow DOM into the host's colour scheme. The colours here are
       --wa-color-* tokens now (#708) rather than light-dark(), so this no longer
       affects them, but it still governs native control and scrollbar painting
       inside this root. */
    :host {
      color-scheme: inherit;
      color: var(--wa-color-text-loud);
    }
    text,
    text.nsf-filename {
      color: var(--wa-color-text-loud);
    }
    wa-input::part(base) {
      background-color: var(--wa-color-surface-default);
      color: var(--wa-color-text-loud);
      border-color: var(--wa-color-surface-border);
    }
    wa-input::part(input) {
      color: var(--wa-color-text-loud);
    }
    section {
      border: 1px solid var(--wa-color-surface-border);
      padding: 16px;
      border-radius: 8px;
      box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.1);
      width: 25vw;
      height: 392px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--wa-color-surface-raised);
      color: var(--wa-color-text-loud);
    }

    div.list-container {
      border: 1px solid var(--wa-color-surface-border);
      border-radius: var(--wa-border-radius-m);
      background-color: var(--wa-color-surface-default);
      color: var(--wa-color-text-loud);
      width: 100%;
      height: 100%;
      overflow-y: auto;
      overflow-x: visible;
      box-sizing: border-box;
    }

    div.card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-direction: row;
      align-content: center;
    }

    text.nsf-filename {
      font-size: 17px;
      font-weight: 600;
    }

    /* Both were style attributes until #685; see the note in keep-element.ts. */
    .card-icon {
      font-size: 32px;
    }

    /* Named for assistive tech, never shown. Same rule as keep-mode-fields and
       keep-delete-dialog; it does not cross a shadow boundary, so each root restates it. */
    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    .search {
      width: 100%;
    }

    /* Matches the 32px font-size the wa-icon is rendered at, so the title row keeps
       its height while the payload chunk is in flight. */
    .app-icon-skeleton {
      height: 32px;
      width: 32px;
    }
  `,
  ];

  @property({ type: Object }) accessor database: Database = {};
  @property({ type: Array }) accessor items: DatabaseEntry[] = [];
  @property({ type: Array }) accessor schemasWithScopes: string[] = [];
  @property({ type: String }) accessor iconName = 'beach';
  @property({ attribute: false }) accessor deleteFn: (data: DatabaseEntry) => void = () => {};
  @property({ attribute: false }) accessor open: (schema: DatabaseEntry) => void = () => {};

  private isSchema = window.location.pathname.endsWith('/schema');
  private searchItem = '';

  /** Set once the lazy icon payloads (#772) land, so `render` swaps skeleton for icon. */
  @state() private accessor iconsReady = false;

  connectedCallback(): void {
    super.connectedCallback();
    // Not a reactive property on its own — this element resolves its icon from the shared
    // loader, which is normally already warm from `index.tsx`. `requestUpdate` is what
    // turns the resolved payload into a re-render, since Lit cannot observe module state.
    void loadAppIcons().then(
      () => {
        this.iconsReady = true;
      },
      () => {
        /* leave the skeleton up; nothing here can retry usefully */
      }
    );
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has('database')) {
      this.items = this.database.databases ?? [];
      this.iconName = this.database.databases ? (this.database.databases[0]?.iconName ?? 'beach') : 'beach';
    }
  }

  private _handleSearchInput(e: Event) {
    this.searchItem = (e.target as HTMLInputElement).value;
    const list = this.database.databases ?? [];
    const needle = this.searchItem.toLowerCase();
    this.items = this.isSchema
      ? list.filter((item) => item.schemaName?.toLowerCase().includes(needle))
      : list.filter((item) => item.apiName?.toLowerCase().includes(needle));
  }

  /**
   * The card's icon: the entry's own if `iconName` resolves, the default otherwise, and a
   * skeleton while the payload chunk is still in flight — an unresolved name and an
   * unloaded chunk look identical from here, so the skeleton covers both until it lands.
   */
  private renderIcon() {
    if (!this.iconsReady) return appIconSkeleton();
    const src = appIconUri(this.iconName) || appIconUri(DEFAULT_APP_ICON_NAME);
    return html`<wa-icon src=${src} label=${this.iconName}></wa-icon>`;
  }

  render() {
    return html`
      <section>
        <div class="card-title">
            <div class="card-icon">
                ${this.renderIcon()}
            </div>
            <text class="nsf-filename">${this.database.fileName}</text>
        </div>
        <!--
          The label is slotted and visually hidden (#713). A placeholder is not an accessible
          name, so this field had none — and a host aria-label would not have given it one
          either: Web Awesome renders the real input inside its own shadow root and wires only
          the label attribute and this slot into it, so an attribute on the host never reaches
          the control. Measured both ways before choosing this one.
        -->
        <wa-input
            class="search"
            placeholder="Search Schema"
            .value=${this.searchItem}
            @wa-input=${this._handleSearchInput}
        >
            <span slot="label" class="visually-hidden">Search schemas in ${this.database.fileName ?? 'this database'}</span>
            <wa-icon slot="prefix" library="${FA_LIBRARY}" name="magnifying-glass" aria-hidden="true"></wa-icon>
        </wa-input>
        <div class="list-container">
            ${this.items.map(
              (item) => html`
                <keep-schema-status
                    key=${item.schemaName + '-' + item.nsfPath}
                    .item=${item}
                    .isSchema=${this.isSchema}
                    .schemasWithScopes=${this.schemasWithScopes || []}
                    .onDelete=${() => this.deleteFn(item)}
                    .onClickOpen=${() => this.open(item)}
                >
                </keep-schema-status>`,
            )}
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-nsf-card': NsfCard;
  }
}
