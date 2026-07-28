/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { adoptTableStyles } from './keep-data-table.styles';

/** `event.detail` of the `page-change` event. */
export interface KeepDataTablePageChangeDetail {
  page: number;
}

/** `event.detail` of the `rows-per-page-change` event. */
export interface KeepDataTableRowsPerPageChangeDetail {
  rowsPerPage: number;
}

/**
 * Chrome for a data table. Tag: `keep-data-table`.
 *
 * Slot a plain semantic `<table>`; the element supplies the container, the optional
 * header band and the optional pagination footer. It deliberately never sees the row
 * data.
 *
 * That is the whole design. The six MUI screens this replaces (#771) hold cells that
 * cannot be expressed as data — a `<TextField>` with `onChange` and `helperText`, an
 * `<ActivateSwitch>` with async Redux callbacks, SVG status dots whose fill is computed
 * from timestamp deltas. A `columns`/`rows` element could not render any of them without
 * a hook whose return value is a Lit template, which would make React consumers author
 * Lit. Keeping the cells in React and taking only the chrome avoids that boundary
 * entirely — and the chrome is what was actually duplicated, five near-identical times.
 *
 * Row and cell styling lives in `keep-data-table.styles.ts`, not in `static styles` here.
 * See that file for why the shadow root cannot reach slotted descendants.
 *
 * Pagination is **controlled**. The element emits `page-change` and `rows-per-page-change`
 * and never assigns to `page` or `rowsPerPage`. `@lit/react` re-applies every prop on every
 * render with no dirty check — the same behaviour that makes passing `value` to a `Keep*`
 * input clobber what the user typed — so an element that also wrote those props would fight
 * React on each render. Being strictly controlled removes that failure mode by
 * construction.
 *
 * @fires page-change - `CustomEvent<KeepDataTablePageChangeDetail>`
 * @fires rows-per-page-change - `CustomEvent<KeepDataTableRowsPerPageChangeDetail>`
 */
@customElement('keep-data-table')
export default class DataTable extends KeepElement {
  static styles = css`
    :host {
      color-scheme: inherit;
      color: var(--wa-color-text-normal);
      display: block;
    }

    .container {
      background: var(--wa-color-surface-raised);
      border: 1px solid var(--wa-color-surface-border);
      border-radius: var(--wa-border-radius-l);
      box-sizing: border-box;
      overflow-x: auto;
    }

    .pagination {
      align-items: center;
      border-top: 1px solid var(--wa-color-surface-border);
      display: flex;
      gap: 16px;
      justify-content: flex-end;
      padding: 8px 16px;
    }

    .range {
      font-size: var(--wa-font-size-s);
    }

    select {
      background: var(--wa-color-surface-default);
      border: 1px solid var(--wa-color-surface-border);
      border-radius: var(--wa-border-radius-m);
      color: var(--wa-color-text-normal);
      padding: 4px 8px;
    }

    .nav {
      display: flex;
      gap: 4px;
    }

    .nav button {
      align-items: center;
      background: none;
      border: none;
      border-radius: var(--wa-border-radius-m);
      color: var(--wa-color-text-normal);
      cursor: pointer;
      display: flex;
      justify-content: center;
      padding: 4px;
    }

    .nav button:disabled {
      cursor: default;
      opacity: 0.4;
    }
  `;

  /**
   * Stripe odd body rows with `--keep-surface-accent`.
   *
   * Reflected because the document sheet targets `keep-data-table[zebra]` — the styling
   * is driven by the attribute, not by this property.
   */
  @property({ type: Boolean, reflect: true }) accessor zebra = false;

  /**
   * Tint the `<thead>` with `--keep-surface-header`.
   *
   * Only `ConsentsTable` does this today; the other five screens leave the head
   * untinted, so it is opt-in to keep the migration visually 1:1. Reflected, as above.
   */
  @property({ type: Boolean, reflect: true, attribute: 'header-band' }) accessor headerBand = false;

  /** Render the pagination footer. */
  @property({ type: Boolean }) accessor paginated = false;

  /** Total number of rows, across all pages. */
  @property({ type: Number }) accessor count = 0;

  /** Zero-based current page. Controlled — the element only ever emits `page-change`. */
  @property({ type: Number }) accessor page = 0;

  /** Rows per page; `-1` means "All". Controlled, as above. */
  @property({ type: Number }) accessor rowsPerPage = 5;

  /** Choices offered by the footer's select. `-1` renders as "All", matching MUI. */
  @property({ type: Array }) accessor rowsPerPageOptions: number[] = [5, 10, 25, -1];

  connectedCallback(): void {
    super.connectedCallback();
    adoptTableStyles(this.ownerDocument);
  }

  /** `true` when every row is on one page. */
  private get showsAllRows(): boolean {
    return this.rowsPerPage <= 0;
  }

  /** Human range for the footer, matching MUI's "1–5 of 42". */
  private get rangeLabel(): string {
    if (this.count <= 0) return '0 of 0';
    const start = this.showsAllRows ? 1 : this.page * this.rowsPerPage + 1;
    const end = this.showsAllRows
      ? this.count
      : Math.min(this.count, start + this.rowsPerPage - 1);
    return `${start}–${end} of ${this.count}`;
  }

  /** Index of the final page. Zero when every row fits on one page. */
  private get lastPage(): number {
    if (this.showsAllRows) return 0;
    return Math.max(0, Math.ceil(this.count / this.rowsPerPage) - 1);
  }

  private goToPage(page: number): void {
    const target = Math.min(Math.max(0, page), this.lastPage);
    if (target === this.page) return;
    // Deliberately does NOT assign to this.page — see the class docblock.
    this.emit<KeepDataTablePageChangeDetail>('page-change', { page: target });
  }

  private renderNav() {
    const atStart = this.page <= 0;
    const atEnd = this.page >= this.lastPage;
    const button = (label: string, disabled: boolean, page: number, path: string) => html`
      <button aria-label=${label} ?disabled=${disabled} @click=${() => this.goToPage(page)}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d=${path} fill="currentColor"></path>
        </svg>
      </button>
    `;

    return html`
      <div class="nav">
        ${button('First Page', atStart, 0, 'M18.41 16.59 13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z')}
        ${button('Previous Page', atStart, this.page - 1, 'M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6z')}
        ${button('Next Page', atEnd, this.page + 1, 'M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z')}
        ${button('Last Page', atEnd, this.lastPage, 'M5.59 7.41 10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z')}
      </div>
    `;
  }

  private onRowsPerPageChange(event: Event): void {
    const value = Number.parseInt((event.target as HTMLSelectElement).value, 10);
    // Deliberately does NOT assign to this.rowsPerPage — see the class docblock.
    this.emit<KeepDataTableRowsPerPageChangeDetail>('rows-per-page-change', {
      rowsPerPage: value,
    });
  }

  private renderPagination() {
    return html`
      <div class="pagination">
        <label>
          Rows per page:
          <select .value=${String(this.rowsPerPage)} @change=${this.onRowsPerPageChange}>
            ${this.rowsPerPageOptions.map(
              (option) => html`<option value=${option}>${option === -1 ? 'All' : option}</option>`,
            )}
          </select>
        </label>
        <span class="range">${this.rangeLabel}</span>
        ${this.renderNav()}
      </div>
    `;
  }

  render() {
    return html`
      <div class="container">
        <slot></slot>
        ${this.paginated ? this.renderPagination() : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-data-table': DataTable;
  }
}
