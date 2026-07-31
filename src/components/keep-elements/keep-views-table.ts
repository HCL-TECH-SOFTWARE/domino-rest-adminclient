/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import './keep-activate-switch';
import './keep-data-table';
import './keep-tooltip';
import type { KeepActivateSwitchRecord } from './keep-activate-switch';
import { TABLE_STYLE_TEXT } from './keep-data-table.styles';
import { FA_LIBRARY } from '../../services/icon-library';
import { StoreController } from '../../store/StoreController';
import { toggleAlert } from '../../store/alerts/action';

/**
 * One row: a view or a folder, as `TabViews` assembles them.
 *
 * Extends the record shape the activation switch takes, because the row object is handed
 * straight to it and travels back out untouched on the toggle events — that is what the
 * activation thunk needs. Loosely typed for the same reason the switch's record is: the
 * component this replaces typed its list `any`.
 */
export interface KeepViewsTableRow extends KeepActivateSwitchRecord {
  viewName: string;
  /** Normally an array; the original also tolerated a bare string. */
  viewAlias?: string[] | string;
  viewActive?: boolean;
  viewUpdated?: boolean;
}

/** `event.detail` of both `view-activate` and `view-deactivate`. */
export interface KeepViewsTableToggleDetail {
  /** The row's record, by reference. */
  view: KeepViewsTableRow;
}

/** `event.detail` of the `view-open` event. */
export interface KeepViewOpenDetail {
  /** The view whose edit control was activated. */
  viewName: string;
  /**
   * Whether the view may actually be opened. `false` means the parent should close the
   * edit panel — the element has already raised the "activate it first" alert.
   */
  active: boolean;
}

const STATUS_TIP = 'Activate the Views that should be accessible\nvia rest API';

const CHANGED_TIP = 'A change was made in this view.';

const INACTIVE_ALERT = 'Please activate this view before editing it!';

/** Aliases arrive as an array, but the original guarded for a bare string. */
function aliasList(viewAlias: string[] | string | undefined): string[] {
  if (Array.isArray(viewAlias)) return viewAlias;
  return viewAlias ? [viewAlias] : [];
}

/**
 * The Views tab's table. Tag: `keep-views-table`.
 *
 * One row per view or folder: an edit control, the view's name, its first alias, and the
 * Active/Inactive pill. The parent (`TabViews`) owns the list — it merges views with
 * folders, filters it by the search box and sorts it — so the list arrives as {@link views}
 * and this element never writes to it.
 *
 * ## Store access
 *
 * Two things this table needs are not passed down, exactly as before the conversion:
 * `dialog.loading` gates the edit buttons, and `databases.folders` says which rows are
 * really folders. `TabViews` selects neither for the table's benefit, so no property
 * mirrors them and there is nothing for the React bridge to fight over — the same
 * reasoning `keep-activate-switch` records. Both selectors return a slice reference, which
 * is what `StoreController`'s `Object.is` check wants.
 *
 * ## The activation events are re-emitted, not passed through
 *
 * `keep-activate-switch` emits `toggle-active` / `toggle-inactive` composed and bubbling, so
 * they would cross this shadow boundary on their own. They are stopped and re-emitted as
 * `view-activate` / `view-deactivate` anyway, so the parent's API does not depend on which
 * control this table happens to put in its last column. `keep-agents-table` does the same
 * with the same switch; letting them through here and not there would have shipped two
 * contracts for one interaction.
 *
 * The `stopPropagation()` is required rather than tidy: without it the composed original
 * also reaches the host and the consumer hears every toggle twice.
 *
 * ## Styling
 *
 * The `<table>` is rendered here and slotted into `keep-data-table`, so it sits in *this*
 * element's shadow tree. `keep-data-table` styles its slotted table from a document-level
 * sheet, which does not reach into a shadow root, so the same sheet is adopted here — from
 * the one exported string, not a copy. See `keep-data-table.styles.ts` and
 * `keep-column-details.ts`, which hit this first.
 *
 * Three styling details did not survive as-is, and each is deliberate:
 *
 *  - the header trigger's `display: inline-flex; gap: 4px` was written as `& > div > div`,
 *    which never matched: the inner div's parent is the tooltip element, not a div. It is
 *    applied here, so "Status" and its glyph sit on one line with the gap the original
 *    asked for.
 *  - the table carried `p-30` (a 30px padding). Under the collapsing border model — which
 *    the adopted sheet sets — a table's own padding is ignored, so that class has never
 *    rendered anything. Dropped rather than restated.
 *  - the "changed" glyph was coloured by `.views-table-question-circle` in the global
 *    sheet, a hardcoded blue/green pair. A class does not cross the shadow boundary, and
 *    an element may not carry a light/dark literal (#708), so it reads `--keep-text-brand`
 *    — which is also the fix for the old dark half, green on a dark surface at ~3.4:1.
 *
 * ## Accessibility (#713)
 *
 * The click handler used to sit on a plain `div` wrapping the edit button, and the
 * button's only accessible name was its `title` — the view name alone, with no hint that
 * activating it edits anything. The handler is on a real `<button>` now, named for what it
 * does, with the glyph decorative. The `title` stays, so the hover tooltip is unchanged.
 *
 * @fires view-open - `CustomEvent<KeepViewOpenDetail>`
 * @fires view-activate - `CustomEvent<KeepViewsTableToggleDetail>`
 * @fires view-deactivate - `CustomEvent<KeepViewsTableToggleDetail>`
 */
@customElement('keep-views-table')
export default class ViewsTable extends KeepElement {
  static styles = [
    unsafeCSS(TABLE_STYLE_TEXT),
    css`
      :host {
        display: block;
      }

      /*
       * Adopting the slotted-table sheet above is necessary but not sufficient. Web Awesome
       * also styles tables from its wa-native layer through **bare element selectors**, and
       * those do not cross a shadow boundary either. Without the block below the fixed-width
       * columns measure their width *plus* the 60px of cell padding the adopted sheet gives
       * them (edit 110 instead of 50, name 610 instead of 550, alias 560 instead of 500),
       * the hairline between body rows disappears, header cells jump a step up the type
       * ramp, and cell content centres against the 34px pill instead of topping.
       */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
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

      /* was the StatusHeader wrapper */
      .status-header {
        cursor: default;
      }

      /* what StatusHeader's dead descendant rule was trying to say */
      .status-trigger {
        align-items: center;
        display: inline-flex;
        gap: 4px;
      }

      /* were width attributes on the cells; content-box, as the attribute was */
      .col-edit {
        width: 50px;
      }

      .col-name {
        width: 550px;
      }

      .col-alias {
        width: 500px;
      }

      /*
       * The edit control, which used to be a Material text button inside a click-handling
       * div. Its box is restated here rather than approximated: 64px of minimum width and
       * 6px/8px of padding are what set the column's real width, and the library that
       * supplied them is gone.
       *
       * The 16px font size is literal for the same reason the icon's 1.5em is: the app
       * scales the type ramp to 85 %, so --wa-font-size-m would resolve to 13.6px here and
       * shrink the glyph from 24px to 20px. The colour is the one the button theme gave it,
       * brand-50 — the same step in both modes, which is why it needs no light/dark pair.
       */
      .edit-button {
        align-items: center;
        appearance: none;
        background: none;
        border: none;
        border-radius: var(--wa-border-radius-s);
        color: var(--wa-color-brand-50);
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        font-size: 16px;
        justify-content: center;
        line-height: 1.75;
        min-width: 64px;
        padding: 6px 8px;
      }

      /* stands in for the 4 % hover overlay the library button drew */
      .edit-button:hover:not(:disabled) {
        background-color: color-mix(in srgb, currentColor 6%, transparent);
      }

      .edit-button:disabled {
        color: var(--wa-color-text-quiet);
        cursor: default;
      }

      .edit-button:focus-visible {
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }

      /*
       * The glyph takes its box from font-size, not width, so a relative measure has to be
       * spelled as a font-size.
       */
      .edit-icon {
        font-size: 1.5em;
      }

      /* was ViewNameDisplay */
      .view-name {
        align-items: center;
        display: flex;
        gap: 10px;
      }

      .folder-icon {
        font-size: 1.2em;
      }

      /* was .views-table-question-circle in the global sheet */
      .changed-marker {
        color: var(--keep-text-brand);
      }

      /* was AliasContainer */
      .alias {
        cursor: default;
      }

      /*
       * Both of these guarded against an inherited uppercase from the button library's
       * typography. Kept because text-transform inherits through the shadow boundary, so
       * the guard still has something to guard against.
       */
      .alias,
      .view-name {
        text-transform: none;
      }
    `,
  ];

  /** The rows to show, in display order. Owned by the parent. */
  @property({ attribute: false }) accessor views: KeepViewsTableRow[] = [];

  private handleToggle(view: KeepViewsTableRow, activate: boolean, event: Event): void {
    // The switch's own events are composed, so without this they would cross this shadow
    // boundary too and the consumer would hear every toggle twice.
    event.stopPropagation();
    this.emit<KeepViewsTableToggleDetail>(activate ? 'view-activate' : 'view-deactivate', {
      view,
    });
  }

  private readonly dialogState = new StoreController(this, (state) => state.dialog);

  private readonly databases = new StoreController(this, (state) => state.databases);

  /** The names of every folder, which is how a row is recognised as one. */
  private get folderNames(): string[] {
    return this.databases.value.folders.map((folder: { viewName: string }) => folder.viewName);
  }

  private handleEdit(view: KeepViewsTableRow): void {
    const active = Boolean(view.viewActive);
    this.emit<KeepViewOpenDetail>('view-open', { viewName: view.viewName, active });
    if (!active) this.dialogState.dispatch(toggleAlert(INACTIVE_ALERT));
  }

  private renderName(view: KeepViewsTableRow) {
    if (!(view.viewUpdated && view.viewActive)) return html`<span>${view.viewName}</span>`;

    return html`<span
      ><b>${view.viewName}</b>
      <keep-tooltip .content=${CHANGED_TIP} placement="bottom"
        ><span
          ><wa-icon
            class="changed-marker"
            library=${FA_LIBRARY}
            name="circle-question"
          ></wa-icon></span
      ></keep-tooltip
    ></span>`;
  }

  private renderAlias(view: KeepViewsTableRow) {
    const aliases = aliasList(view.viewAlias);
    if (aliases.length === 0) return nothing;

    return html`<keep-tooltip .content=${aliases.join('\n')} placement="bottom" without-arrow>
      <div>${aliases[0]}</div>
    </keep-tooltip>`;
  }

  private renderRow(view: KeepViewsTableRow, loading: boolean, folders: string[]) {
    return html`
      <tr>
        <th class="col-edit" scope="row">
          <button
            type="button"
            class="edit-button"
            title=${view.viewName}
            aria-label="Edit view ${view.viewName}"
            ?disabled=${loading}
            @click=${() => this.handleEdit(view)}
          >
            <wa-icon class="edit-icon" library=${FA_LIBRARY} name="pencil"></wa-icon>
          </button>
        </th>
        <td class="col-name">
          <div class="view-name">
            ${folders.includes(view.viewName)
              ? html`<keep-tooltip .content=${`${view.viewName} is a folder.`}>
                  <span
                    ><wa-icon
                      class="folder-icon"
                      library=${FA_LIBRARY}
                      name="folder-open"
                    ></wa-icon
                  ></span>
                </keep-tooltip>`
              : nothing}
            ${this.renderName(view)}
          </div>
        </td>
        <td class="col-alias"><span class="alias">${this.renderAlias(view)}</span></td>
        <td>
          <keep-activate-switch
            .view=${view}
            type="view"
            @toggle-active=${(e: Event) => this.handleToggle(view, true, e)}
            @toggle-inactive=${(e: Event) => this.handleToggle(view, false, e)}
          ></keep-activate-switch>
        </td>
      </tr>
    `;
  }

  render() {
    const { loading } = this.dialogState.value;
    const folders = this.folderNames;

    return html`
      <keep-data-table zebra>
        <table aria-label="views table">
          <thead>
            <tr>
              <th class="col-edit" scope="col"><span class="visually-hidden">Actions</span></th>
              <th class="col-name" scope="col">View Name</th>
              <th class="col-alias" scope="col">Alias</th>
              <th scope="col">
                <keep-tooltip
                  class="status-header"
                  .content=${STATUS_TIP}
                  placement="bottom"
                  without-arrow
                >
                  <span class="status-trigger"
                    >Status
                    <wa-icon library=${FA_LIBRARY} name="circle-question"></wa-icon>
                  </span>
                </keep-tooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            ${repeat(
              this.views,
              (view) => view.viewName,
              (view) => this.renderRow(view, loading, folders),
            )}
          </tbody>
        </table>
      </keep-data-table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-views-table': ViewsTable;
  }
}
