/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import { KeepElement } from './keep-element';
import './keep-data-table';
import { TABLE_STYLE_TEXT } from './keep-data-table.styles';
import { FA_LIBRARY } from '../../services/icon-library';

/** One row of the editor. The shape the schema's `view.columns` entries actually have. */
export interface KeepColumnDetailsColumn {
  name: string;
  externalName: string;
  title?: string;
  /** Validation code set by the parent; only `'duplicate'` has a message today. */
  error?: string | null;
}

/** `event.detail` of the `column-remove` event. */
export interface KeepColumnRemoveDetail {
  /** The `name` of the column whose delete control was activated. */
  name: string;
}

/** `event.detail` of the `column-edit` event. */
export interface KeepColumnEditDetail {
  /** The row's column object, by reference — the parent keys off its `name` and `title`. */
  column: KeepColumnDetailsColumn;
  /** What the field now contains. */
  externalName: string;
}

/** The only validation code the parent produces. Anything else renders no message. */
function errorMessage(error: string | null | undefined): string {
  switch (error) {
    case 'duplicate':
      return 'Cannot have duplicate external names!';
    default:
      return '';
  }
}

/**
 * The right-hand pane of the Edit View dialog. Tag: `keep-column-details`.
 *
 * One row per chosen column: a delete control, the column's Domino name, and a field for
 * the external name it will be exposed under. Presentational — the parent owns the list,
 * the edit rules and the duplicate detection, so this takes {@link columns} as a property
 * and reports back as `column-remove` / `column-edit`.
 *
 * ## The field is deliberately uncontrolled
 *
 * The external-name input has a `placeholder` and no `value`, exactly as the form control
 * it replaces did: the placeholder shows what the column is currently mapped to, and the
 * field is blank until the user types. Binding `.value` here would be actively wrong —
 * the React bridge re-applies every property on every parent render with no dirty check,
 * so a bound value would overwrite what the user had half-finished typing.
 *
 * Rows go through `repeat()` keyed on `column.name` rather than a plain `map()`, and that
 * is load-bearing for the same reason. Positional reuse would leave a half-typed value
 * sitting in a row that now belongs to a different column when one is deleted from the
 * middle of the list.
 *
 * ## Accessibility (#713)
 *
 * Two defects were carried into this file by the original and are fixed here rather than
 * preserved:
 *
 *  - the delete affordance was a bare icon with a click handler — not focusable, not
 *    reachable by keyboard, and with no accessible name. It is now a real `<button>`
 *    named after the column it removes (WCAG 2.1.1, 4.1.2), with the glyph decorative.
 *  - the external-name field had no label at all, so its only name was whatever a browser
 *    chose to infer from the placeholder. It now carries a real label, visually hidden so
 *    the dense table layout is unchanged (WCAG 3.3.2, 4.1.2).
 *
 * A duplicate name is marked the way the rest of the app marks an invalid field (#743):
 * `aria-invalid` on the host and the message in `hint`, which `wa-input` already points
 * the inner control's `aria-describedby` at. The form control this replaces carried the
 * message in a sibling node and its error state in a class.
 *
 * ## Styling
 *
 * The table is rendered here and slotted into `keep-data-table`, which means it sits in
 * *this* element's shadow tree. `keep-data-table` styles its slotted table through a
 * document-level sheet — see `keep-data-table.styles.ts` for why it cannot use
 * `::slotted()` — and a document sheet does not reach into a shadow root. So the same
 * sheet is adopted here as well, from the one exported string rather than a copy of it.
 *
 * @fires column-remove - `CustomEvent<KeepColumnRemoveDetail>`
 * @fires column-edit - `CustomEvent<KeepColumnEditDetail>`
 */
@customElement('keep-column-details')
export default class ColumnDetails extends KeepElement {
  static styles = [
    unsafeCSS(TABLE_STYLE_TEXT),
    css`
      /*
       * Was the container div. The document box-sizing reset does not cross the shadow
       * boundary, so it is restated. The original also carried a left: 23% that never
       * applied — the element is a flex item and has never been positioned.
       */
      :host {
        box-sizing: border-box;
        display: block;
        width: 75%;
        height: 100%;
        margin-right: 2%;
        padding: 0;
      }

      /* Were width attributes on the header cells. */
      .col-actions {
        width: 150px;
      }

      .col-name,
      .col-external {
        width: 550px;
      }

      /*
       * The delete control. Transparent and padding-free so the button box is the glyph
       * box and the row looks exactly as it did when this was a bare icon. The icon takes
       * its size from font-size, not width.
       */
      .delete-button {
        background: none;
        border: none;
        color: inherit;
        cursor: pointer;
        display: inline-flex;
        font-size: 1.3em;
        line-height: 1;
        margin-left: 30px;
        padding: 0;
      }

      .delete-button:focus-visible {
        border-radius: var(--wa-border-radius-s);
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }

      /*
       * The label exists for assistive technology only. Clipped rather than display:none,
       * which would take it out of the accessibility tree along with the pixels. Written
       * as a part override so Web Awesome's own inline-flex and bottom margin lose: for
       * the same origin, the outer tree wins.
       */
      wa-input::part(label) {
        block-size: 1px;
        border: 0;
        clip-path: inset(50%);
        inline-size: 1px;
        margin: 0;
        overflow: hidden;
        padding: 0;
        position: absolute;
        white-space: nowrap;
      }

      /*
       * The same two declarations keep-overrides.css already applies to every wa-input in
       * the document (#743). Restated because this one is in a shadow root, which a
       * document sheet does not reach — not because this element wants its own rule.
       */
      wa-input[aria-invalid='true']::part(base) {
        border-color: var(--wa-color-danger-fill-loud);
        box-shadow: 0 0 0 var(--wa-focus-ring-width) var(--wa-color-danger-fill-quiet);
      }

      wa-input[aria-invalid='true']::part(hint) {
        color: var(--keep-color-danger-text);
      }
    `,
  ];

  /** The chosen columns, in display order. Owned by the parent. */
  @property({ type: Array }) accessor columns: KeepColumnDetailsColumn[] = [];

  private handleRemove(column: KeepColumnDetailsColumn): void {
    this.emit<KeepColumnRemoveDetail>('column-remove', { name: column.name });
  }

  private handleEdit(column: KeepColumnDetailsColumn, event: Event): void {
    // Retargeted to the wa-input host, which mirrors its inner field's value.
    const externalName = (event.target as HTMLInputElement).value;
    this.emit<KeepColumnEditDetail>('column-edit', { column, externalName });
  }

  private renderRow(column: KeepColumnDetailsColumn) {
    const message = errorMessage(column.error);
    const invalid = !!column.error;

    return html`
      <tr>
        <td>
          <button
            type="button"
            class="delete-button"
            aria-label="Remove column ${column.name}"
            @click=${() => this.handleRemove(column)}
          >
            <wa-icon library=${FA_LIBRARY} name="trash"></wa-icon>
          </button>
        </td>
        <td>${column.name}</td>
        <td>
          <wa-input
            aria-invalid=${invalid ? 'true' : 'false'}
            label="External name for ${column.name}"
            placeholder=${column.externalName}
            hint=${message}
            @input=${(event: Event) => this.handleEdit(column, event)}
          ></wa-input>
        </td>
      </tr>
    `;
  }

  render() {
    return html`
      <keep-data-table>
        <table aria-label="edit columns table">
          <thead>
            <tr>
              <th class="col-actions" scope="col"></th>
              <th class="col-name" scope="col">Column Name</th>
              <th class="col-external" scope="col">External Name</th>
            </tr>
          </thead>
          <tbody>
            ${repeat(
              this.columns,
              (column) => column.name,
              (column) => this.renderRow(column),
            )}
          </tbody>
        </table>
      </keep-data-table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-column-details': ColumnDetails;
  }
}
