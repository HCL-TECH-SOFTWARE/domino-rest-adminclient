/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/card/card.js';
import { KeepElement } from './keep-element';
import { appIconSkeleton, appIconSkeletonStyles } from './app-icon-skeleton';

/**
 * Card summarising a single Keep entity (schema/scope/…) built on `<wa-card>`.
 * Tag: `keep-default-card`. Exposed via `KeepElements.tsx` as `KeepDefaultCard`.
 */
@customElement('keep-default-card')
export default class DefaultCard extends KeepElement {
  static styles = [
    appIconSkeletonStyles,
    css`
        /* Inherit color-scheme from the host's ancestor (documentElement toggles
           it via inline style). The colours here no longer depend on it — they
           are --wa-color-* tokens, which inherit through the shadow boundary on
           their own — but it still drives how native controls and scrollbars
           inside this root are painted, so it stays. */
        :host {
            color-scheme: inherit;
            color: var(--wa-color-text-loud);
        }
        wa-card {
            --wa-panel-background-color: var(--wa-color-surface-raised);
            --wa-panel-border-color: var(--wa-color-surface-border);
            color: var(--wa-color-text-loud);
            background: var(--wa-color-surface-raised);
        }
        wa-card::part(base) {
            background: var(--wa-color-surface-raised);
            border-color: var(--wa-color-surface-border);
            color: var(--wa-color-text-loud);
        }
        wa-card::part(body) {
            background: var(--wa-color-surface-raised);
            color: var(--wa-color-text-loud);
        }
        /*
         * The dark-mode force-override that used to sit here is gone (#708). It
         * set #252535 / #3a3a4a / #ffffff !important — exactly what the tokens
         * above now resolve to in dark mode — so it was both redundant and, being
         * !important, capable of hiding a mistake in the tokens it duplicated.
         */
        text,
        strong {
            color: var(--wa-color-text-loud);
        }
        wa-card {
            --border-radius: var(--wa-border-radius-l);
            margin: 0;
            border: none;
            border-radius: 15px;
            width: 315px;
            height: 250px;
            min-height: 250px;
            max-height: 260px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
            overflow: hidden;
            &:hover {
                cursor: pointer;
                --border-color: #5F1EBE;
            }
        }

        section {
            margin: 5px 0;
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        section.titles {
            display: flex;
            flex-direction: column;
            width: calc( 100% - 10px);
            gap: 1px;
            line-height: 1.2;
            margin: 0 5px;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        section.delete {
            display: flex;
            flex-direction: row;
            justify-content: flex-end;
            align-items: center;
            gap: 5px;
        }
        section.description {
            margin: 5px 0 20px 0;
            width: calc( 100% - 10px);
            height: 70px;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            line-height: 1.5;
            text-overflow: ellipsis;
            white-space: normal;
        }

        text {
            font-size: 16px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: normal;
            max-width: 100%;
            display: block;
            line-height: 1.5;
        }
        text.medium {
            font-size: var(--wa-font-size-m);
            display: block;
        }

        img {
            background: #383838;
            border-radius: 8px;
            padding: 10px;
            height: 55px;
            width: auto;
            display: block;
        }

        /* Same 55px box as the img above (plus its 10px padding), so swapping the
           skeleton for the real icon does not move the card's text. */
        .app-icon-skeleton {
            height: 75px;
            width: 75px;
        }

        div.main {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 10px;
        }
        div.icon {
            margin: 0;
            padding: 0;
        }
        div.delete {
            width: 20px;
            height: 20px;
            background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTMgNkg1SDIxIiBmaWxsPSIjRDY0NjZGIi8+CjxwYXRoIGQ9Ik0zIDZINUgyMSIgc3Ryb2tlPSIjRDY0NjZGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMTkgNlYyMEMxOSAyMC41MzA0IDE4Ljc4OTMgMjEuMDM5MSAxOC40MTQyIDIxLjQxNDJDMTguMDM5MSAyMS43ODkzIDE3LjUzMDQgMjIgMTcgMjJIN0M2LjQ2OTU3IDIyIDUuOTYwODYgMjEuNzg5MyA1LjU4NTc5IDIxLjQxNDJDNS4yMTA3MSAyMS4wMzkxIDUgMjAuNTMwNCA1IDIwVjZNOCA2VjRDOCAzLjQ2OTU3IDguMjEwNzEgMi45NjA4NiA4LjU4NTc5IDIuNTg1NzlDOC45NjA4NiAyLjIxMDcxIDkuNDY5NTcgMiAxMCAySDE0QzE0LjUzMDQgMiAxNS4wMzkxIDIuMjEwNzEgMTUuNDE0MiAyLjU4NTc5QzE1Ljc4OTMgMi45NjA4NiAxNiAzLjQ2OTU3IDE2IDRWNiIgc3Ryb2tlPSIjRDY0NjZGIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K');
            background-position: top right;
            background-repeat: no-repeat;
            background-size: contain;

            &:hover {
                background-image: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE5IDZWMjBDMTkgMjAuNTMwNCAxOC43ODkzIDIxLjAzOTEgMTguNDE0MiAyMS40MTQyQzE4LjAzOTEgMjEuNzg5MyAxNy41MzA0IDIyIDE3IDIySDdDNi40Njk1NyAyMiA1Ljk2MDg2IDIxLjc4OTMgNS41ODU3OSAyMS40MTQyQzUuMjEwNzEgMjEuMDM5MSA1IDIwLjUzMDQgNSAyMFY2TTggNlY0QzggMy40Njk1NyA4LjIxMDcxIDIuOTYwODYgOC41ODU3OSAyLjU4NTc5QzguOTYwODYgMi4yMTA3MSA5LjQ2OTU3IDIgMTAgMkgxNEMxNC41MzA0IDIgMTUuMDM5MSAyLjIxMDcxIDE1LjQxNDIgMi41ODU3OUMxNS43ODkzIDIuOTYwODYgMTYgMy40Njk1NyAxNiA0VjYiIGZpbGw9IiNENjQ2NkYiLz4KPHBhdGggZD0iTTE5IDZWMjBDMTkgMjAuNTMwNCAxOC43ODkzIDIxLjAzOTEgMTguNDE0MiAyMS40MTQyQzE4LjAzOTEgMjEuNzg5MyAxNy41MzA0IDIyIDE3IDIySDdDNi40Njk1NyAyMiA1Ljk2MDg2IDIxLjc4OTMgNS41ODU3OSAyMS40MTQyQzUuMjEwNzEgMjEuMDM5MSA1IDIwLjUzMDQgNSAyMFY2TTggNlY0QzggMy40Njk1NyA4LjIxMDcxIDIuOTYwODYgOC41ODU3OSAyLjU4NTc5QzguOTYwODYgMi4yMTA3MSA5LjQ2OTU3IDIgMTAgMkgxNEMxNC41MzA0IDIgMTUuMDM5MSAyLjIxMDcxIDE1LjQxNDIgMi41ODU3OUMxNS43ODkzIDIuOTYwODYgMTYgMy40Njk1NyAxNiA0VjYiIHN0cm9rZT0iI0Q2NDY2RiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPG1hc2sgaWQ9InBhdGgtMy1vdXRzaWRlLTFfMjc4XzEzNzMiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjIiIHk9IjUiIHdpZHRoPSIyMCIgaGVpZ2h0PSIyIiBmaWxsPSJibGFjayI+CjxyZWN0IGZpbGw9IndoaXRlIiB4PSIyIiB5PSI1IiB3aWR0aD0iMjAiIGhlaWdodD0iMiIvPgo8cGF0aCBkPSJNMyA2SDVIMjEiLz4KPC9tYXNrPgo8cGF0aCBkPSJNMyA2SDVIMjEiIGZpbGw9IiNENjQ2NkYiLz4KPHBhdGggZD0iTTMgNUMyLjQ0NzcyIDUgMiA1LjQ0NzcyIDIgNkMyIDYuNTUyMjggMi40NDc3MiA3IDMgN1Y1Wk0yMSA3QzIxLjU1MjMgNyAyMiA2LjU1MjI4IDIyIDZDMjIgNS40NDc3MiAyMS41NTIzIDUgMjEgNVY3Wk0zIDdINVY1SDNWN1pNNSA3SDIxVjVINVY3WiIgZmlsbD0id2hpdGUiIG1hc2s9InVybCgjcGF0aC0zLW91dHNpZGUtMV8yNzhfMTM3MykiLz4KPG1hc2sgaWQ9InBhdGgtNS1vdXRzaWRlLTJfMjc4XzEzNzMiIG1hc2tVbml0cz0idXNlclNwYWNlT25Vc2UiIHg9IjMiIHk9IjQiIHdpZHRoPSIxOCIgaGVpZ2h0PSIyIiBmaWxsPSJibGFjayI+CjxyZWN0IGZpbGw9IndoaXRlIiB4PSIzIiB5PSI0IiB3aWR0aD0iMTgiIGhlaWdodD0iMiIvPgo8cGF0aCBkPSJNNCA1TDUuNzc3NzggNUwyMCA1Ii8+CjwvbWFzaz4KPHBhdGggZD0iTTQgNUw1Ljc3Nzc4IDVMMjAgNSIgZmlsbD0iI0Q2NDY2RiIvPgo8cGF0aCBkPSJNNCA0QzMuNDQ3NzIgNCAzIDQuNDQ3NzIgMyA1QzMgNS41NTIyOCAzLjQ0NzcyIDYgNCA2TDQgNFpNMjAgNkMyMC41NTIzIDYgMjEgNS41NTIyOSAyMSA1QzIxIDQuNDQ3NzIgMjAuNTUyMyA0IDIwIDRMMjAgNlpNNCA2TDUuNzc3NzggNkw1Ljc3Nzc4IDRMNCA0TDQgNlpNNS43Nzc3OCA2TDIwIDZMMjAgNEw1Ljc3Nzc4IDRMNS43Nzc3OCA2WiIgZmlsbD0iI0Q2NDY2RiIgbWFzaz0idXJsKCNwYXRoLTUtb3V0c2lkZS0yXzI3OF8xMzczKSIvPgo8L3N2Zz4K');
            }
        }
        div.status {
            width: 10px;
            height: 10px;
            background-position: top right;
            background-repeat: no-repeat;
            background-size: contain;
            right: 20px;
            top: 20px;
            border-radius: 50%;
        }
    `,
  ];

  @property({ type: Boolean }) status = false;
  @property({ type: String }) icon = '';
  @property({ type: String }) title = '';
  @property({ type: String }) subtitle = '';
  @property({ type: String }) acl = '';
  @property({ type: String }) description = '';
  @property({ type: Boolean }) delete = false;
  @property({ attribute: false }) onDelete: () => void = () => {};

  render() {
    return html`
        <wa-card>
            <section class="delete">
                <div class="status" style="background-color: ${this.status ? '#4CAF50' : '#F44336'}"></div>
            </section>
            <div class="main">
                <div class="icon">
                    ${this.icon
                      ? html`<img src="${this.icon}" alt="${this.title}" />`
                      : appIconSkeleton()}
                </div>
                <section class="titles">
                    <strong><text>${this.title}</text></strong>
                    <text class="medium">${this.subtitle}</text>
                    ${this.acl ?
                        html`
                            <strong>
                                <text
                                    style="color: ${this.acl === '*Editor' ? 'orange' : 'green'};"
                                >
                                    ${this.acl}
                                </text>
                            </strong>
                        `
                        : ''}
                </section>
            </div>
            <section class="description">
                <text class="medium">${this.description}</text>
            </section>
            <section class="delete" @click=${(e: Event) => { e.stopPropagation(); this.onDelete(); }}>
                ${this.delete ?
                    html`
                        <div class="delete"></div>
                    `
                    :
                    ''
                }
            </section>
        </wa-card>
      `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-default-card': DefaultCard;
  }
}
