/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './keep-schema-status';
import '@awesome.me/webawesome/dist/components/input/input.js';
import { FA_LIBRARY } from '../../services/icon-library';
import appIcons from '../../styles/app-icons';
import { KeepElement } from './keep-element';

const ICONS = appIcons as Record<string, string>;

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
  static styles = css`
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
  `;

  @property({ type: Object }) database: Database = {};
  @property({ type: Array }) items: DatabaseEntry[] = [];
  @property({ type: Array }) schemasWithScopes: string[] = [];
  @property({ type: String }) iconName = 'beach';
  @property({ attribute: false }) deleteFn: (data: DatabaseEntry) => void = () => {};
  @property({ attribute: false }) open: (schema: DatabaseEntry) => void = () => {};

  private isSchema = window.location.pathname.endsWith('/schema');
  private searchItem = '';

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

  render() {
    return html`
      <section>
        <div class="card-title">
            <div style="font-size: 32px;">
                ${this.iconName && ICONS[this.iconName]
                  ? html`
                    <wa-icon
                        src=${`data:image/svg+xml;base64,${ICONS[this.iconName]}`}
                        label=${this.iconName}
                    ></wa-icon>
                `
                  : html`
                    <wa-icon src=${`data:image/svg+xml;base64,${ICONS['beach']}`}></wa-icon>
                `}
            </div>
            <text class="nsf-filename">${this.database.fileName}</text>
        </div>
        <wa-input
            placeholder="Search Schema"
            style="width: 100%;"
            .value=${this.searchItem}
            @wa-input=${this._handleSearchInput}
        >
            <wa-icon slot="prefix" library="${FA_LIBRARY}" name="magnifying-glass"></wa-icon>
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
