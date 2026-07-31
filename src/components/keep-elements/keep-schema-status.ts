/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/tooltip/tooltip.js';
import { FA_LIBRARY } from '../../services/icon-library';
import { KeepElement } from './keep-element';

type SchemaItem = { schemaName?: string; apiName?: string; nsfPath?: string };

/**
 * Row showing a schema/API name with a used-by-scopes status dot and (in schema
 * mode) a delete control. Tag: `keep-schema-status`. Consumed internally by
 * `keep-nsf-card`.
 */
@customElement('keep-schema-status')
export default class SchemaStatus extends KeepElement {
  static styles = css`
    div.main {
      display: flex;
      width: 100%;
      justify-content: space-between;
      padding: 10px 15px;
      box-sizing: border-box;
      align-items: center;
      gap: 8px;
      cursor: pointer;
    }

    div.api-status {
        width: 4px;
        height: 20px;
        flex-shrink: 0;
        background: #82DC73;
    }

    div.unused {
        background: #F75764;
    }

    div.description {
      display: flex;
      min-width: 0;
      align-items: center;
      flex-direction: row;
      gap: 6px;
      flex: 1;
      overflow: hidden;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }

    /*
     * The delete affordance. #946.
     *
     * Was hand-drawn path data styled as an outline — fill:none, stroke:#F75764 — that filled
     * in on hover. A registered trash glyph is solid, so there is no outline state to fill:
     * the same two colours drive the resting and hover states directly, and wa-icon takes its
     * box from font-size rather than width.
     *
     * The bare wa-icon rule that stood beside this matched nothing — there was no wa-icon in
     * this element until now — so it is folded in rather than left to apply twice.
     */
    .trash-icon {
        cursor: pointer;
        flex-shrink: 0;
        font-size: 20px;
        color: #F75764;
        transition: color 0.2s ease;
    }

    .trash-icon:hover {
        color: #8B2630;
    }

    div.name {
        text-overflow: ellipsis;
        flex: 1;
        overflow: hidden;
        white-space: nowrap;
        font-size: 15px;
    }

    div.delete {
        cursor: pointer;
    }
  `;

  @property({ type: Object }) accessor item: SchemaItem = {};
  @property({ type: Array }) accessor schemasWithScopes: string[] | undefined;
  @property({ type: Boolean }) accessor isSchema = window.location.pathname.endsWith('/schema');
  @property({ type: String }) accessor name = '';
  // Constant on purpose. This used to be computed from `schemasWithScopes` and `item`, but
  // a field initializer runs during construction — both are still at their defaults there
  // (`undefined` and `{}`), so the expression could only ever produce this one string.
  // `updated()` below is what actually derives it, as soon as `item` arrives.
  @property({ type: String }) accessor status = 'Not used by Scopes';
  @property({ type: Boolean }) accessor usedByScopes = false;
  @property({ attribute: false }) accessor onDelete: (e: Event) => void = () => {};
  @property({ attribute: false }) accessor onClickOpen: (e: Event) => void = () => {};

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has('item')) {
      this.name = (this.isSchema ? this.item.schemaName : this.item.apiName) ?? '';
      this.usedByScopes =
        this.schemasWithScopes?.includes(this.item.nsfPath + ':' + this.item.schemaName) ?? false;
      this.status = this.usedByScopes ? 'Used by Scopes' : 'Not used by Scopes';
    }
  }

  render() {
    return html`
      <div class="main">
        <div class="description" @click=${this.onClickOpen}>
            ${this.isSchema
              ? html`<wa-tooltip content="${this.status}" placement="top">
                <div class="api-status ${this.usedByScopes ? '' : 'unused'}"></div>
            </wa-tooltip>`
              : ''}
            <div class="name" title="${this.name}">${this.name}</div>
        </div>
        ${this.isSchema
          ? html`<div class="delete" @click=${this.onDelete}>
            <wa-icon class="trash-icon" library=${FA_LIBRARY} name="trash" canvas="auto" aria-hidden="true"></wa-icon>
        </div>`
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-schema-status': SchemaStatus;
  }
}
