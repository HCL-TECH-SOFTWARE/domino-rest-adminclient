/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { adoptTableStyles } from './keep-data-table.styles';

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

  connectedCallback(): void {
    super.connectedCallback();
    adoptTableStyles(this.ownerDocument);
  }

  render() {
    return html`
      <div class="container">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-data-table': DataTable;
  }
}
