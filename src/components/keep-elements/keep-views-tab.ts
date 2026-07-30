/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import './keep-button';
import './keep-form-dialog-header';
import './keep-search-input';
import './keep-switch';
import './keep-views-table';
import type { KeepSearchChangeDetail } from './keep-search-input';
import type {
  KeepViewOpenDetail,
  KeepViewsTableRow,
  KeepViewsTableToggleDetail,
} from './keep-views-table';
import { StoreController } from '../../store/StoreController';
import { handleDatabaseViews } from '../../store/databases/action';
import type { Database } from '../../store/databases/types';

/**
 * One entry of the schema's own view list, normalised.
 *
 * This is the shape the activation thunk expects as its `activeViews` argument: the schema
 * stores a view under `name`/`alias`/`unid`, and every consumer downstream reads
 * `viewName`/`viewAlias`/`viewUnid`. Loosely typed where the schema is — `Database.views`
 * is declared as an array of strings and is in fact an array of objects, which is a store
 * defect this element cannot fix from here.
 */
export interface KeepViewsTabActiveView {
  viewActive: boolean;
  viewAlias?: string[] | string;
  viewName: string;
  viewUnid?: string;
  viewUpdated?: boolean;
  viewColumns?: unknown;
  viewFolder: boolean;
  viewSelectionFormula?: unknown;
}

/**
 * `event.detail` of `view-open`.
 *
 * Re-emitted from the table's own event of the same name, unchanged: `active` is false when
 * the view cannot be opened, and the table has already raised the "activate it first" alert.
 */
export type KeepViewsTabViewOpenDetail = KeepViewOpenDetail;

/** `event.detail` of `schema-change` — the schema the save came back with. */
export interface KeepViewsTabSchemaChangeDetail {
  schemaData: any;
}

const RESET_HEADING = 'Reset ALL View Columns?';

const RESET_MESSAGE =
  'Making this view inactive will reset all columns and remove any configuration done to ' +
  'ALL the views. Do you wish to proceed?';

/**
 * The Database Views tab. Tag: `keep-views-tab`. Exposed to React as `KeepViewsTab`.
 *
 * The search box, the two bulk-activation buttons, the "Show Active" filter, the views
 * table and the confirmation shown before every view is deactivated at once. It owns the
 * list the table renders: the store's views merged with its folders, filtered by the search
 * key and by the Show Active switch, and sorted.
 *
 * ## Store access
 *
 * `views`, `folders` and `scopePull` come from the databases slice and `loading` from the
 * dialog slice, read through {@link StoreController}. The React parent selects none of them
 * for this tab's benefit, so there is no parent copy to mirror and nothing for the React
 * bridge to fight over — the same reasoning `keep-views-table` records. Both selectors
 * return a slice reference, which is what the controller's identity check wants.
 *
 * Two things do arrive as properties, because the parent owns them: {@link schemaData},
 * which the parent holds and re-fetches, and {@link dbName}, which comes off the route.
 *
 * ## Derived, not mirrored
 *
 * The component this replaces kept six pieces of state that were each a pure function of
 * the store and of `schemaData`, wired together by five effects. Two of those effects wrote
 * the same field on the same triggers, so one of them could never be observed. All of it is
 * getters here.
 *
 * That is not only shorter, it fixes a staleness bug: the filtered list was computed once,
 * inside the search handler, from the rows as they were at that keystroke. Activating a
 * view while a search was in progress left the table showing row objects captured before
 * the toggle, so the Active pill did not move until the box was cleared.
 *
 * The unfiltered list is sorted by name and the filtered one is not, which is what the
 * original did. Preserved rather than tidied: it is a visible ordering change and belongs
 * in its own decision.
 *
 * ## Escape used to break the confirmation permanently
 *
 * The reset dialog was opened from a boolean that Escape could not reach: the browser
 * closed the dialog, the flag stayed true, and setting a true flag to true again is not a
 * change — so the effect that called `showModal()` never ran again and the confirmation
 * could not be reopened for the life of the tab. The cancel handler below clears the flag,
 * the same repair `keep-forms-table` needed.
 *
 * ## Styling
 *
 * Everything reaching the original through the light DOM stops at this shadow boundary: the
 * three Linaria blocks in the file, `TopNavigator` from the layout module, and the
 * `flex` / `flex-row` / `justify-between` / `short-vertical` / `dialog*` utilities in
 * `styles.css`. All restated below. Three values did not survive as literals:
 *
 *  - the bulk buttons were a hardcoded green and red. Both fail AA on the dark surface
 *    (roughly 2.9:1 and 2.5:1), so they read the measured `--keep-color-success-text` /
 *    `--keep-color-danger-text` pair that #765 introduced for exactly this.
 *  - the views panel was `#FFFFFF` on a `#B9B9B9` border. Those are the light values of
 *    `--wa-color-surface-raised` and `--wa-color-surface-border`, so in dark mode the panel
 *    was a white sheet behind a dark table. Tokens now.
 *  - the dialog border was a light/dark literal, which an element may not carry (#708).
 *
 * The panel's `left: 0` / `top: 0` are dropped: it is statically positioned, so they never
 * did anything.
 *
 * @fires view-open - `CustomEvent<KeepViewsTabViewOpenDetail>`
 * @fires schema-change - `CustomEvent<KeepViewsTabSchemaChangeDetail>`
 */
@customElement('keep-views-tab')
export default class ViewsTab extends KeepElement {
  static styles = [
    modalBackdropStyles,
    css`
      /* was TabViewsContainer */
      :host {
        display: flex;
        flex-direction: column;
      }

      /*
       * The page's border-box reset arrives through a universal selector in Web Awesome's
       * native layer, and a universal selector does not cross a shadow boundary. Stated
       * rather than inherited: an inherited value loses to a declaration, and the sheet the
       * nested table adopts sets the property on its own cells directly.
       */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      /* was TopNavigator, styles/layout.tsx */
      .top-navigator {
        display: flex;
        padding: 25px 0;
        gap: 10px;
      }

      /* was the flex / flex-row / justify-between utility trio from styles.css */
      .toolbar {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
      }

      /* was ButtonsPanel */
      .buttons-panel {
        height: 60px;
        padding-left: 5px;
      }

      /*
       * The two bulk buttons were text buttons from the component library that is gone from
       * this element's tree, so its box is restated: 64px of minimum width, the 14px/500
       * type and the 1.75 line height are what give the pair their size and baseline. The
       * library's uppercase transform is not restated, but the guard against inheriting one
       * is, because text-transform does cross the boundary.
       */
      .bulk-button {
        align-items: center;
        appearance: none;
        background-color: transparent;
        border: none;
        border-radius: var(--wa-border-radius-s);
        cursor: pointer;
        display: inline-flex;
        font: inherit;
        font-size: 14px;
        font-weight: 500;
        justify-content: center;
        letter-spacing: 0.02857em;
        line-height: 1.75;
        min-width: 64px;
        text-transform: none;
      }

      /*
       * The colours were a hardcoded green and a hardcoded red. Both are dark steps chosen
       * against a white page and neither clears AA on the dark surface, so each reads the
       * token pair that switches step by mode instead.
       */
      .activate {
        color: var(--keep-color-success-text);
        padding: 0 10px 0 0;
      }

      .deactivate {
        color: var(--keep-color-danger-text);
        padding: 0 0 0 10px;
      }

      /* stands in for the 4 percent hover overlay the library button drew */
      .bulk-button:hover:not(:disabled) {
        background-color: color-mix(in srgb, currentColor 6%, transparent);
      }

      /* was the .disabled class the original toggled alongside the disabled attribute */
      .bulk-button:disabled {
        color: var(--wa-color-text-quiet);
        cursor: default;
      }

      .bulk-button:focus-visible {
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }

      /*
       * The rule between the two buttons: .short-vertical from styles.css, plus the two
       * adjustments the original scoped beside it. It is a box where a glyph used to be, so
       * it has to rejoin the buttons' inline flow, and the shared 31px height is taller than
       * these two buttons, so the height the glyph was given is restated instead.
       */
      .divider {
        background-color: var(--wa-color-text-loud);
        display: inline-block;
        height: 1.4em;
        vertical-align: middle;
        width: 1px;
      }

      /* was ViewPanel */
      .view-panel {
        display: flex;
        background: var(--wa-color-surface-raised);
        border: 1px solid var(--wa-color-surface-border);
        border-radius: var(--wa-border-radius-l);
      }

      /*
       * was the .dialog pair in styles.css. A bare element selector, so none of it reaches
       * in here; the border was a light/dark literal and reads the surface token instead.
       */
      dialog {
        background: var(--wa-color-surface-raised);
        border: 1px solid var(--wa-color-surface-border);
        border-radius: 10px;
        color: var(--wa-color-text-normal);
        display: none;
        flex-direction: column;
        gap: 30px;
        height: fit-content;
        width: 30%;
      }

      dialog[open] {
        display: flex;
      }

      /* was .dialog-content */
      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: 40px;
        margin: 0;
        padding: 0;
        width: 100%;
      }

      /*
       * was .dialog-content-text, which sat on a text element - an SVG tag in an HTML
       * document, so the browser treated it as an unknown inline box. A paragraph now, and
       * the margin a paragraph brings with it is removed. The custom property still
       * inherits in here.
       */
      .dialog-content p {
        color: var(--text-color-primary);
        margin: 0;
      }

      /* was .dialog-actions */
      .dialog-actions {
        align-content: center;
        align-items: center;
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        width: 100%;
      }
    `,
  ];

  /** The schema this tab belongs to. The parent owns it and re-fetches it. */
  @property({ attribute: false }) accessor schemaData: Database | undefined;

  /**
   * The schema name from the route, already decoded.
   *
   * The router decodes every captured parameter, so the second `decodeURIComponent` the
   * original applied here was a double decode — and a throwing one: a schema called `100%`
   * raised `URIError` out of render and blanked the tab. Neither sibling tab decoded, so
   * this drops it and matches them.
   */
  @property({ type: String, attribute: 'db-name' }) accessor dbName = '';

  /** The filter box's text, verbatim. Empty means "no filter". */
  @state() accessor searchKey = '';

  /** Whether the Show Active switch is on. */
  @state() accessor showActive = false;

  /** Whether the deactivate-everything confirmation is showing. */
  @state() accessor resetAllViews = false;

  private readonly databases = new StoreController(this, (state) => state.databases);

  private readonly dialogState = new StoreController(this, (state) => state.dialog);

  /** Every folder's name, which is how the thunk recognises a row as one. */
  private get folderNames(): string[] {
    return this.databases.value.folders.map((folder: { viewName: string }) => folder.viewName);
  }

  /**
   * The schema's own views, which are by definition the active ones.
   *
   * The original left this undefined when the schema carried no view list, and the
   * activation thunk iterates it unconditionally — so a bulk activate against such a schema
   * threw. An empty list is the same answer without the crash.
   */
  private get activeViews(): KeepViewsTabActiveView[] {
    const views = (this.schemaData?.views ?? []) as any[];
    const folders = this.folderNames;
    return views.map((view: any) => ({
      viewActive: true,
      viewAlias: view.alias,
      viewName: view.name,
      viewUnid: view.unid,
      viewUpdated: view.viewUpdated,
      viewColumns: view.columns,
      viewFolder: folders.includes(view.name),
      viewSelectionFormula: view.selectionFormula,
    }));
  }

  private get activeViewNames(): string[] {
    return this.activeViews.map((view) => view.viewName);
  }

  /** The folders, restated as rows and told whether the schema has them active. */
  private get updatedFolders(): KeepViewsTableRow[] {
    const active = this.activeViewNames;
    return this.databases.value.folders.map((folder: any) => ({
      viewName: folder.viewName,
      viewUnid: folder.viewUnid,
      viewAlias: folder.viewAlias,
      viewUpdated: folder.viewUpdated,
      viewActive: active.includes(folder.viewName),
    }));
  }

  /** Views and folders together, with the Show Active switch applied. */
  private get rows(): KeepViewsTableRow[] {
    const merged = [
      ...(this.databases.value.views as KeepViewsTableRow[]),
      ...this.updatedFolders,
    ];
    if (!this.showActive) return merged;
    const active = this.activeViewNames;
    return merged.filter((row) => active.includes(row.viewName));
  }

  /** What the table shows: sorted while unfiltered, in list order while filtered. */
  private get visibleRows(): KeepViewsTableRow[] {
    const rows = this.rows;
    if (this.searchKey === '') {
      return rows.slice().sort((a, b) => (a.viewName > b.viewName ? 1 : -1));
    }
    const key = this.searchKey.toLowerCase();
    return rows.filter((row) => row.viewName && row.viewName.toLowerCase().indexOf(key) !== -1);
  }

  private get nativeDialog(): HTMLDialogElement | null {
    return this.shadowRoot?.querySelector('dialog') ?? null;
  }

  protected updated(): void {
    const dialog = this.nativeDialog;
    if (!dialog) return;
    // Guarded on both sides: this runs on every render, and showModal() on an already-open
    // dialog throws InvalidStateError.
    if (this.resetAllViews) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }

  /**
   * Hand a set of views to the activation thunk.
   *
   * The parent's schema sink is the event: the thunk calls back with the schema the save
   * returned, and that is re-emitted so the React parent can store it. Same contract as
   * `keep-edit-view`.
   */
  private saveViews(views: any[], active: boolean): void {
    this.databases.dispatch(
      handleDatabaseViews(
        views,
        this.activeViews,
        this.dbName,
        this.schemaData as Database,
        active,
        (schemaData: any) =>
          this.emit<KeepViewsTabSchemaChangeDetail>('schema-change', { schemaData }),
        this.folderNames,
      ),
    );
  }

  private handleSearch(event: Event): void {
    // Fully consumed here, so the composed original is stopped rather than allowed to
    // surface on this host as well.
    event.stopPropagation();
    this.searchKey = (event as CustomEvent<KeepSearchChangeDetail>).detail.value;
  }

  private readonly handleToggleShowActive = (): void => {
    this.showActive = !this.showActive;
  };

  private handleActivateAll(): void {
    this.saveViews(this.databases.value.views, true);
  }

  private handleDeactivateAll(): void {
    this.resetAllViews = false;
    this.saveViews(this.databases.value.views, false);
  }

  private closeResetDialog(): void {
    this.resetAllViews = false;
  }

  private openResetDialog(): void {
    this.resetAllViews = true;
  }

  private handleViewOpen(event: Event): void {
    // The table's event is composed, so without this the consumer hears it twice: once as
    // the table's own and once as the copy re-emitted from this host.
    event.stopPropagation();
    this.emit<KeepViewsTabViewOpenDetail>(
      'view-open',
      (event as CustomEvent<KeepViewOpenDetail>).detail,
    );
  }

  private handleToggleView(event: Event, active: boolean): void {
    // Consumed, not forwarded: activation is this element's job, so the pair does not
    // belong to its outward contract.
    event.stopPropagation();
    this.saveViews([(event as CustomEvent<KeepViewsTableToggleDetail>).detail.view], active);
  }

  render() {
    const { scopePull } = this.databases.value;
    const { loading } = this.dialogState.value;
    const noViews = this.databases.value.views.length === 0;
    const bulkDisabled = noViews || loading;

    // Accessibility (#713):
    //  - the two bulk controls are real buttons with an explicit type, rather than library
    //    buttons whose type defaulted to submit inside a form.
    //  - the rule between them is decorative, so it is hidden from assistive tech; it was a
    //    bare div with no role before.
    //  - the dialog is named and described. Its heading lives inside another element's
    //    shadow root, so an IDREF cannot reach it and the name is spelt out here.
    return html`
      <div class="top-navigator">
        <!-- No value property: the field is deliberately uncontrolled. See keep-search-input. -->
        <keep-search-input
          placeholder="Search Views"
          ?disabled=${!scopePull}
          @search-change=${this.handleSearch}
        ></keep-search-input>
      </div>
      <div class="toolbar">
        <div class="buttons-panel">
          <button
            type="button"
            class="bulk-button activate"
            ?disabled=${bulkDisabled}
            @click=${this.handleActivateAll}
          >
            Activate All
          </button>
          <span class="divider" aria-hidden="true"></span>
          <button
            type="button"
            class="bulk-button deactivate"
            ?disabled=${bulkDisabled}
            @click=${this.openResetDialog}
          >
            Deactivate All
          </button>
        </div>
        <keep-switch .onToggle=${this.handleToggleShowActive}>Show Active</keep-switch>
      </div>
      <div class="view-panel">
        <keep-views-table
          .views=${this.visibleRows}
          @view-open=${this.handleViewOpen}
          @view-activate=${(event: Event) => this.handleToggleView(event, true)}
          @view-deactivate=${(event: Event) => this.handleToggleView(event, false)}
        ></keep-views-table>
      </div>
      <dialog
        aria-label=${RESET_HEADING}
        aria-describedby="reset-message"
        @cancel=${this.closeResetDialog}
      >
        <keep-form-dialog-header
          heading=${RESET_HEADING}
          @header-close=${this.closeResetDialog}
        ></keep-form-dialog-header>
        <div class="dialog-content">
          <p id="reset-message">${RESET_MESSAGE}</p>
        </div>
        <div class="dialog-actions">
          <keep-button variant="neutral" appearance="outlined" @click=${this.closeResetDialog}>
            No
          </keep-button>
          <keep-button @click=${this.handleDeactivateAll}>Yes</keep-button>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-views-tab': ViewsTab;
  }
}
