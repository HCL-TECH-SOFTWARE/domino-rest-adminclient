/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html, nothing, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';
import './keep-button';
import './keep-column-details';
import './keep-form-dialog-header';
import './keep-page-loading';
import './keep-unsaved-changes-dialog';
import type {
  KeepColumnDetailsColumn,
  KeepColumnEditDetail,
  KeepColumnRemoveDetail,
} from './keep-column-details';
import { FA_LIBRARY } from '../../services/icon-library';
import { SETUP_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../../store/account/action';
import { fetchViews, updateSchema } from '../../store/databases/action';
import { SET_ACTIVEVIEWS, type Database } from '../../store/databases/types';
import { setLoading } from '../../store/loading/action';
import { StoreController } from '../../store/StoreController';
import { checkIcon } from '../../styles/scripts';
import { appIconPayload, DEFAULT_APP_ICON_NAME, loadAppIcons } from '../../services/app-icons';
import { apiRequestWithRetry } from '../../utils/api-retry';
import { encodeQueryValue, fullEncode } from '../../utils/common';
import { getLogger } from '../../services/log-service';

const log = getLogger('components/keep-elements/keep-edit-view');

/** A column the user has chosen, as the schema stores it. */
export type KeepEditViewColumn = KeepColumnDetailsColumn;

/** One entry of the design list this dialog offers on the left. */
export interface KeepEditViewDesignColumn {
  /** The Domino item name — the key the design endpoint returned it under. */
  name: string;
  /** The column's display title, which seeds the external name. Sometimes absent. */
  title?: string;
  /** 1-based position in the view design. */
  position?: number;
}

/** A scope, as `FormsContainer` holds them. Only these three fields are read. */
export interface KeepEditViewScope {
  schemaName: string;
  nsfPath: string;
  apiName: string;
}

/** Payload is empty; the event itself is the signal. */
export type KeepEditViewCloseDetail = undefined;

/** `event.detail` of the `schema-change` event. */
export interface KeepEditViewSchemaChangeDetail {
  /** The schema the update endpoint echoed back. */
  schemaData: any;
}

/** Strip the characters Domino allows in a column title but the REST name may not carry. */
function externalNameFor(column: KeepEditViewDesignColumn): string {
  const source = column.title ? column.title : column.name;
  return source.replace(/[$@-]/g, '').replace(/\s/g, '_');
}

/**
 * The Edit View dialog. Tag: `keep-edit-view`.
 *
 * Picks which of a Domino view's design columns the REST API exposes, and under what
 * external name. The left pane lists every column the design endpoint returned; clicking
 * one adds it. The right pane is `keep-column-details`, which owns the per-row editing
 * and reports back — this element owns the list itself, the duplicate detection and the
 * save.
 *
 * ## Store access
 *
 * Two slices are read that `FormsContainer` does not select and does not pass down, so
 * they arrive through `StoreController` rather than as properties and there is nothing
 * for the React bridge to fight over: `loading` gates the left pane's loading state, and
 * `databases.folders` decides whether the design lookup goes to /folders or /views. Both
 * selectors return a slice reference, which is what the controller's identity check wants.
 *
 * ## Two callback props became one event
 *
 * The component this replaces took both `handleClose` and `setOpen`, and its only consumer
 * wired both to the same `setViewOpen(false)`. They are one `dialog-close` event here.
 * `setSchemaData` — handed to the update thunk so the parent's copy of the schema is
 * refreshed from the response — became `schema-change`.
 *
 * ## Saving no longer blanks the schema's owners (#932)
 *
 * The payload used to hardcode `owners: []` and `excludedViews: undefined` while reading
 * every other field off the schema, so choosing which columns a view exposes destroyed the
 * schema's owner list without saying so. The conversion reproduced that deliberately; it is
 * repaired here — see {@link buildUpdatedSchema}.
 *
 * ## Accessibility (#713)
 *
 * Four defects the original carried are fixed rather than reproduced:
 *
 *  - the "Add All" affordance and every column row were click-handling `div`s: not
 *    focusable, not reachable by keyboard, with no accessible name and no role. All are
 *    real buttons now, named for what they do (WCAG 2.1.1, 4.1.2), and the rows are a
 *    list so their count is announced (WCAG 1.3.1).
 *  - the add glyph appeared on pointer hover only, driven by a hovered-column state
 *    field. It is a CSS rule on hover *and* focus now, so a keyboard user sees the same
 *    affordance — and the row no longer reflows when the pointer enters it.
 *  - the dialog title was an unknown `text` element. It is an h2, so the dialog has a
 *    heading, and each dialog carries its own accessible name.
 *  - the reset dialog's body text already had an id and nothing pointed at it; the dialog
 *    is described by it now.
 */
@customElement('keep-edit-view')
export default class EditView extends KeepElement {
  static styles = [
    css`
      /*
       * Web Awesome supplies the page-wide reset as a rule on html plus a universal
       * box-sizing inherit, and a universal selector does not cross a shadow boundary.
       * Stated as border-box rather than inherit on purpose: the percentage insets on the
       * column bar and the Add All control measure their padding either way, and an
       * inherited value loses to any declaration further in.
       */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      /*
       * Nothing here is in flow — two modal dialogs and the unsaved-changes dialog — so the
       * host should not contribute a box to the tab panel it sits in.
       */
      :host {
        display: contents;
      }

      /*
       * The two dialogs. Everything in this rule is a restatement of something the document
       * already says and cannot say in here: the .dialog class from the global sheet, the
       * .edit-view-dialog sizing below it, and Web Awesome's own bare dialog block, which is
       * the easy half to forget — the padding, the raised background, the shadow, the
       * centring and the backdrop all arrive through a bare element selector.
       *
       * The border follows the convergence keep-unsaved-changes-dialog recorded: the legacy
       * sheet pairs a transparent light border with a dark literal, and an element may not
       * carry a light/dark pair (#708), so it reads the border token in both modes.
       */
      dialog {
        display: none;
        flex-direction: column;
        align-items: start;
        gap: 30px;
        inset: 0;
        margin: auto;
        width: 30%;
        height: fit-content;
        max-width: calc(100% - var(--wa-space-l));
        padding: var(--wa-space-l);
        color: var(--wa-color-text-normal);
        background: var(--wa-color-surface-raised);
        border: 1px solid var(--wa-color-surface-border);
        border-radius: 10px;
        box-shadow: var(--wa-shadow-l);
      }

      dialog[open] {
        display: flex;
      }

      dialog:focus {
        outline: none;
      }

      dialog::backdrop {
        background-color: var(--wa-color-overlay-modal, rgb(0 0 0 / 0.25));
      }

      /* was .edit-view-dialog */
      .edit-dialog {
        width: 95vw;
        height: 90vh;
        left: 2.5vw;
        overflow-y: hidden;
      }

      /*
       * The close control. In the document this is a bare button, so it also picked up Web
       * Awesome's native button block through a bare element selector — the control height,
       * the inline padding, the inherited font family and the transparent border. Restated
       * with the class overrides folded in. The original asked for an align-items of right,
       * which is not a valid value and so was dropped at parse; the centring underneath it
       * is what actually rendered, and is what is written here.
       */
      .close-button {
        position: absolute;
        top: 1%;
        right: 1%;
        display: inline-flex;
        align-items: center;
        justify-content: flex-end;
        height: var(--wa-form-control-height);
        padding: 0 var(--wa-form-control-padding-inline);
        color: var(--text-color-primary);
        font-family: inherit;
        font-size: var(--wa-form-control-value-font-size);
        font-weight: var(--wa-font-weight-action);
        vertical-align: middle;
        white-space: nowrap;
        background: transparent;
        border: max(1px, var(--wa-form-control-border-width)) var(--wa-border-style) transparent;
        border-radius: var(--wa-form-control-border-radius);
        cursor: pointer;
        user-select: none;
      }

      /* was .edit-view-title-container */
      .title-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        margin-top: 35px;
        padding-right: 35px;
        padding-left: 35px;
      }

      /*
       * The title. It was an unknown text element carrying only bold and a colour, so its
       * size came from the bare element rule in keep-overrides.css — 12px. That literal is
       * kept, because it is what ships and growing the title is not this pass's call. The
       * margin is explicit because this is a heading now and the user-agent margin would
       * push the row apart.
       */
      .title {
        margin: 0;
        color: var(--text-color-primary);
        font-size: 12px;
        font-weight: bold;
      }

      /* was .edit-view-buttons-container */
      .buttons-container {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 15px;
        width: fit-content;
      }

      /* was .edit-view-button, with the native button block it sat on folded in */
      .action-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        height: var(--wa-form-control-height);
        padding: 0 var(--wa-form-control-padding-inline);
        color: var(--text-color-primary);
        font-family: inherit;
        font-size: 14px;
        font-weight: var(--wa-font-weight-action);
        line-height: 19px;
        text-transform: none;
        vertical-align: middle;
        white-space: nowrap;
        border: 1px solid;
        border-radius: 5px;
        cursor: pointer;
        user-select: none;
      }

      /*
       * The global sheet gives none of these three buttons a focus indicator, and neither
       * does the native block once a background is declared over it. Added here rather than
       * carried over as a gap.
       */
      .close-button:focus-visible,
      .action-button:focus-visible,
      .add-all:focus-visible {
        outline: var(--wa-focus-ring);
        outline-offset: var(--wa-focus-ring-offset);
      }

      /* was .edit-view-reset */
      .reset-button {
        background: var(--wa-color-surface-raised);
      }

      /*
       * The hover was a light/dark literal pair, which an element may not carry (#708). Six
       * per cent of the text colour over the raised surface lands in the same place at both
       * ends and tracks the palette instead of restating it — the same substitution
       * keep-views-table made for its edit control.
       */
      .reset-button:hover {
        background: color-mix(in srgb, currentColor 6%, var(--wa-color-surface-raised));
      }

      /* was .edit-view-save */
      .save-button {
        color: #fff;
        background: var(--button-primary-color);
        border: none;
      }

      /*
       * The disabled rule followed the hover rule at equal specificity in the global sheet,
       * so it already won whenever both matched. Spelled as an exclusion here so the two
       * rules no longer depend on their order.
       */
      .save-button:hover:not(:disabled) {
        background: var(--button-hover-color);
      }

      .save-button:disabled {
        color: #fff;
        background: var(--button-secondary-color);
        cursor: not-allowed;
      }

      /* was .dialog-content.flex-row.mt-20 — the row that holds both panes */
      .dialog-body {
        display: flex;
        flex-direction: row;
        gap: 40px;
        width: 100%;
        margin: 20px 0 0;
        padding: 0;
      }

      /* was .column-bar-container */
      .column-bar {
        width: 20%;
        max-height: 100%;
        margin-left: 2%;
        overflow-x: auto;
        overflow-y: auto;
        background: transparent;
        border: 1px solid var(--wa-color-surface-border);
        border-radius: 10px;
      }

      /*
       * was .add-all-container plus the two flex utilities on it. A button now, so the
       * user-agent control styling is reset first and the inherited font restored before
       * the line-height multiplier the original relied on for its height.
       */
      .add-all {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-end;
        width: 100%;
        height: 10%;
        /*
         * Right-end padding is a fixed 24px rather than the 6% the left side keeps: at this
         * column's width, 6% landed the control right against .column-bar's scrollbar
         * gutter, which eats into the same content box from the other side. A fixed value
         * holds a real gap from it regardless of how narrow the column gets.
         */
        padding-inline: 6% 24px;
        color: var(--keep-text-brand);
        font: inherit;
        line-height: 6;
        text-align: right;
        vertical-align: middle;
        background: none;
        border: none;
        cursor: pointer;
      }

      /*
       * was .add-all-icon. The glyph takes its box from font-size, not width, so the
       * relative measure the original icon set carried has to be spelled as a font-size.
       *
       * line-height: normal overrides the 6 (600%) the button above sets for its own
       * height — inherited, that turned this icon's line box six times taller than its
       * glyph and, combined with the translateY compensating for it, put the icon and the
       * text beside it on visibly different baselines instead of the same line.
       */
      .add-all-icon {
        display: inline-block;
        margin-right: 2%;
        font-size: 1.2em;
        line-height: normal;
      }

      /* was .add-all-text; 12px is the bare element rule again, not a new decision. */
      .add-all-text {
        color: var(--keep-text-brand);
        font-size: 12px;
        line-height: normal;
      }

      /* was .all-columns-list */
      .column-list {
        height: fit-content;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      /*
       * Every row was preceded by a horizontal rule with its margin zeroed. Web Awesome
       * gives that element its line through a bare element selector — one hairline of the
       * surface border colour — and that does not cross the boundary. Drawn as the row's own
       * top border instead: the same pixel, one element fewer, and no separator that
       * assistive technology has to skip.
       */
      .column-item {
        border-top: var(--wa-border-width-s) solid var(--wa-color-surface-border);
      }

      /* was .all-columns-list-item */
      .column-button {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 20px;
        color: inherit;
        font: inherit;
        text-align: left;
        background: none;
        border: none;
        cursor: pointer;
      }

      /*
       * Inset, because the row fills the scrolling column bar and an outset ring would be
       * clipped by it on the first and last rows.
       */
      .column-button:focus-visible {
        outline: var(--wa-focus-ring);
        outline-offset: calc(-1 * var(--wa-focus-ring-offset));
      }

      /*
       * was .all-columns-added-column, another light/dark literal pair. The highlight token
       * is the app's own "this row is picked" surface and is defined at both ends.
       */
      .column-button.added {
        background: var(--keep-surface-highlight);
      }

      /* was .all-columns-column-info plus the two flex utilities on it */
      .column-info {
        display: flex;
        flex-direction: column;
        width: 90%;
        gap: 5px;
      }

      /* was .all-columns-column-name.text-bold.color-text-primary */
      .column-name {
        flex: 0 0 auto;
        color: var(--text-color-primary);
        font-size: 15px;
        font-weight: bold;
        line-height: 19px;
      }

      /* was .small-text.all-columns-column-details */
      .column-detail {
        display: block;
        color: var(--wa-color-text-quiet);
        font-size: 14px;
        line-height: 17px;
        white-space: pre-wrap;
      }

      /* was the .inline-block wrapper and .all-columns-icon inside it, collapsed into one */
      .column-icon {
        display: inline-block;
        flex: 0 0 auto;
        margin: 0;
        font-size: 18px;
      }

      /* was .all-columns-check-icon, a third light/dark literal pair */
      .check-icon {
        color: var(--keep-color-success-text);
      }

      /*
       * The add affordance. Present in the tree at all times so the row does not reflow when
       * it appears, and revealed on focus as well as hover so it is not pointer-only.
       */
      .add-icon {
        visibility: hidden;
      }

      .column-button:hover .add-icon,
      .column-button:focus-visible .add-icon {
        visibility: visible;
      }

      /* was .dialog-content */
      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: 40px;
        width: 100%;
        margin: 0;
        padding: 0;
      }

      /* was .dialog-content-text on an unknown text element: 12px from the bare rule */
      .dialog-content-text {
        margin: 0;
        color: var(--text-color-primary);
        font-size: 12px;
      }

      /* was .dialog-actions */
      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        align-content: center;
        align-items: center;
        gap: 10px;
        width: 100%;
      }
    `,
    // Last, so the dark backdrop wins over the native one restated above.
    modalBackdropStyles,
  ];

  /** Drives `showModal()` on the editor dialog. Owned by the parent. */
  @property({ type: Boolean }) accessor open = false;

  /** The view whose columns are being edited. */
  @property({ type: String, attribute: 'view-name' }) accessor viewName = '';

  /** The schema name, which is what the active-view list is keyed by. */
  @property({ type: String, attribute: 'db-name' }) accessor dbName = '';

  /**
   * The NSF path to look the design up under. Distinct from the schema's own `nsfPath`,
   * which is what the view list is refreshed with — the original kept both and so does this.
   */
  @property({ type: String, attribute: 'nsf-path' }) accessor nsfPathProp = '';

  /**
   * Every scope the app knows about. Nothing is rendered from it: the original derived the
   * matching scope's API name purely to put it in an effect's dependency list, so the design
   * lookup re-runs when it changes. Kept so that trigger is not silently dropped.
   */
  @property({ attribute: false }) accessor scopes: KeepEditViewScope[] = [];

  /** The schema being edited. Owned by the parent, which also re-reads it after a save. */
  @property({ attribute: false }) accessor schemaData: Database | null = null;

  /** The chosen columns, in display order. */
  @state() private accessor chosenColumns: KeepEditViewColumn[] = [];

  /** Every column the design endpoint returned, in the order it returned them. */
  @state() private accessor fetchedColumns: KeepEditViewDesignColumn[] = [];

  @state() private accessor resetDialogOpen = false;

  @state() private accessor showDirtyDialog = false;

  @query('.edit-dialog') private accessor editDialog!: HTMLDialogElement | null;

  @query('.reset-dialog') private accessor resetDialog!: HTMLDialogElement | null;

  private readonly databases = new StoreController(this, (state) => state.databases);

  private readonly loadingState = new StoreController(this, (state) => state.loading);

  /** What {@link chosenColumns} looked like when the dialog last loaded the view. */
  private initialColumns: KeepEditViewColumn[] = [];

  /** The dependency list of the effect this element replaces, as last seen. */
  private lastSync: unknown[] = [];

  private get views(): any[] | undefined {
    return this.schemaData?.views;
  }

  /** The matching scope's API name — a refetch trigger and nothing else. See {@link scopes}. */
  private get scopeApiName(): string {
    const match = this.scopes.find(
      (scope) => scope.schemaName === this.dbName && scope.nsfPath === this.schemaData?.nsfPath,
    );
    return match ? match.apiName : '';
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    // The save payload carries the application icon's base64 next to its name, so the lazy
    // payload chunk (#772) has to be in flight before the user can press Save. Nothing here
    // renders from it, so there is no update to schedule and a failed load simply leaves the
    // icon the schema already carried in place.
    void loadAppIcons().catch(() => {
      /* buildUpdatedSchema falls back to the stored payload */
    });
  }

  disconnectedCallback(): void {
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    super.disconnectedCallback();
  }

  /**
   * The effect the React version ran on every change of open / view name / views / NSF path /
   * scope name / folders. Compared by identity against the last run for the same reason the
   * dependency array existed: reloading the design list on an unrelated store change would
   * throw away whatever the user had chosen.
   *
   * Folders come from the store rather than a property, so a change there does not show up in
   * Lit's changed-properties map — hence the explicit comparison rather than `changed.has`.
   */
  protected willUpdate(): void {
    const folders = this.databases.value.folders;
    const deps: unknown[] = [
      this.open,
      this.viewName,
      this.views,
      this.nsfPathProp,
      this.scopeApiName,
      folders,
    ];
    const unchanged =
      deps.length === this.lastSync.length &&
      deps.every((dep, index) => Object.is(dep, this.lastSync[index]));
    if (unchanged) return;
    this.lastSync = deps;

    this.syncChosenColumns();

    if (this.open) {
      this.loadingState.dispatch(setLoading({ status: true }));
      void this.fetchColumns(folders);
    }
  }

  // `PropertyValues` without a type argument, because `resetDialogOpen` is a private state
  // field and `PropertyValues<this>` only admits the public ones.
  protected updated(changed: PropertyValues): void {
    if (changed.has('open')) toggleModal(this.editDialog, this.open);
    if (changed.has('resetDialogOpen')) toggleModal(this.resetDialog, this.resetDialogOpen);
  }

  /** Reload the chosen list from the schema, discarding anything not yet saved. */
  private syncChosenColumns(): void {
    const view = this.views?.find((entry: any) => entry.name === this.viewName);
    if (!view) return;
    const columns: KeepEditViewColumn[] = view.columns ?? [];
    this.chosenColumns = columns;
    this.initialColumns = columns.map((column) => ({
      name: column.name,
      externalName: column.externalName,
    }));
  }

  private async fetchColumns(folders: { viewName: string }[]): Promise<void> {
    const isFolder = folders.some((folder) => folder.viewName === this.viewName);
    const design = isFolder ? 'folders' : 'views';
    const url =
      `${SETUP_KEEP_API_URL}/design/${design}/${fullEncode(this.viewName)}` +
      `?nsfPath=${encodeQueryValue(this.nsfPathProp)}&raw=false`;

    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      if (!response.ok) throw new Error(JSON.stringify(data.message));

      // Keys beginning with @ are the design metadata, not columns.
      this.fetchedColumns = Object.keys(data)
        .filter((item) => item[0] !== '@')
        .map((item) => ({ ...data[item], name: item }));
    } catch (error) {
      log.error('Error fetching columns', error as Error);
    } finally {
      this.loadingState.dispatch(setLoading({ status: false }));
    }
  }

  private isDirty(): boolean {
    const initial = this.initialColumns;
    if (this.chosenColumns.length !== initial.length) return true;
    return this.chosenColumns.some(
      (column, index) =>
        column.name !== initial[index].name ||
        column.externalName !== initial[index].externalName,
    );
  }

  /** The browser's own leave-site prompt, for a refresh or a URL navigation. */
  private readonly handleBeforeUnload = (event: BeforeUnloadEvent): void => {
    if (this.open && this.isDirty()) {
      event.preventDefault();
      event.returnValue = '';
    }
  };

  private closeWithoutSaving(): void {
    this.showDirtyDialog = false;
    this.chosenColumns = [];
    this.emit<KeepEditViewCloseDetail>('dialog-close');
  }

  private handleClickClose(): void {
    if (this.isDirty()) {
      // .edit-dialog stays open and merely covered by this confirmation, the same "two
      // stacked modals" shape the reset dialog already uses successfully. Closing it here
      // and reopening it on Cancel made the editor visibly vanish behind nothing for as
      // long as the prompt was up, rather than staying visible, dimmed, underneath it —
      // the editor should only actually close once Yes or No resolves the prompt.
      this.showDirtyDialog = true;
    } else {
      this.closeWithoutSaving();
    }
  }

  private handleDirtySave(): void {
    this.showDirtyDialog = false;
    this.handleClickSave();
  }

  /** Cancel on the unsaved-changes prompt: stay right here, editing the same columns. */
  private handleDirtyCancel(): void {
    this.showDirtyDialog = false;
  }

  private handleClickColumn(column: KeepEditViewDesignColumn): void {
    if (this.chosenColumns.some((chosen) => chosen.name === column.name)) return;
    this.chosenColumns = [
      ...this.chosenColumns,
      { name: column.name, externalName: externalNameFor(column), title: column.title },
    ];
  }

  private handleRemoveColumn(name: string): void {
    this.chosenColumns = this.chosenColumns.filter((column) => column.name !== name);
  }

  private handleClickAddAll(): void {
    // The title is deliberately not carried across, matching the original: a column added
    // this way has no fallback title, so clearing its external name falls back to the name.
    this.chosenColumns = this.fetchedColumns.map((column) => {
      const chosen = this.chosenColumns.find((entry) => entry.name === column.name);
      return {
        name: column.name,
        externalName: chosen ? chosen.externalName : externalNameFor(column),
      };
    });
  }

  /**
   * Fold an edited external name back into the list and re-run the duplicate check over the
   * whole list, because clearing a duplicate has to clear its partner's error too.
   */
  private handleEditColumn(edited: KeepEditViewColumn, typed: string): void {
    const fallback = (edited.title ?? edited.name)
      .replaceAll(/[^a-zA-Z0-9 ]/g, '')
      .replaceAll(' ', '_');
    const externalName = typed === '' ? fallback : typed;

    const names = this.chosenColumns.map((column) =>
      column.name === edited.name ? externalName : column.externalName,
    );
    const duplicated = (candidate: string) =>
      names.filter((name) => name === candidate).length > 1 ? 'duplicate' : null;

    this.chosenColumns = this.chosenColumns.map((column) =>
      column.name === edited.name
        ? {
            name: column.name,
            externalName,
            title: column.title,
            error: duplicated(externalName),
          }
        : { ...column, error: duplicated(column.externalName) },
    );
  }

  /**
   * The POST body for a save or a reset.
   *
   * Every field is read from the schema this dialog was handed. `owners` and `excludedViews`
   * used to be the two exceptions — hardcoded to `[]` and `undefined` on a derived object that
   * both save paths spread into the request — so choosing which columns a view exposes blanked
   * the schema's owner list, silently, from a dialog that says nothing about owners (#932).
   *
   * They are echoed rather than omitted because `updateSchema` POSTs this object whole to
   * `/schema?nsfPath=…&configName=…`: an absent key is not a request to leave a value alone.
   * `DetailsSection.tsx`, the app's other full-schema writer, destructures both off the schema
   * and passes them straight through, and this now sends what that one sends.
   *
   * `?? []` on `owners` only. A schema that has never had owners can arrive without the key,
   * and `undefined` there would serialise the field away — which is half of what this fixes.
   * `excludedViews` has no such default: `[]` and absent mean different things to the
   * endpoint, so the schema's own value is passed through untouched.
   */
  private buildUpdatedSchema(views: any[]) {
    const schema = this.schemaData;
    const stored = schema?.iconName ?? '';
    const iconName = checkIcon(stored) ? stored : DEFAULT_APP_ICON_NAME;

    return {
      apiName: schema?.apiName,
      schemaName: this.dbName,
      nsfPath: schema?.nsfPath,
      description: schema?.description,
      isActive: schema?.isActive,
      icon: appIconPayload(iconName) || schema?.icon,
      iconName,
      formulaEngine: schema?.formulaEngine,
      allowCode: schema?.allowCode,
      dqlAccess: schema?.dqlAccess,
      openAccess: schema?.openAccess,
      allowDecryption: schema?.allowDecryption,
      dqlFormula: schema?.dqlFormula,
      requireRevisionToUpdate: schema?.requireRevisionToUpdate,
      agents: schema?.agents,
      views,
      excludedViews: schema?.excludedViews,
      owners: (schema?.owners ?? []) as string[],
      forms: schema?.forms,
    };
  }

  /** Push the payload and refresh the parent's copy of the schema from the response. */
  private saveSchema(views: any[]): void {
    this.databases.dispatch(
      updateSchema(this.buildUpdatedSchema(views), (schemaData: any) =>
        this.emit<KeepEditViewSchemaChangeDetail>('schema-change', { schemaData }),
      ),
    );
  }

  private handleConfirmReset(): void {
    const views = this.views;
    if (!views) return;

    const viewsBuffer = views.map((view: any) => {
      if (view.name !== this.viewName) return view;
      const { columns: _columns, ...withoutColumns } = view;
      return withoutColumns;
    });

    // Closing the edit dialog is the parent's job — it owns `open` and lowers it once
    // `dialog-close` reaches it — but this reset confirmation is this element's own state,
    // and nothing else ever turns it back off. Left set, it stayed open, on top of nothing,
    // after the edit dialog it was raised over had already closed underneath it.
    this.resetDialogOpen = false;
    this.saveSchema(viewsBuffer);
    this.setActiveViews(viewsBuffer);
    this.emit<KeepEditViewCloseDetail>('dialog-close');
  }

  private handleClickSave(): void {
    const views = this.views;
    if (!views) return;

    const columnsPayload = this.chosenColumns.map((column) => ({
      name: column.name,
      externalName: column.externalName,
    }));

    const viewsBuffer =
      columnsPayload.length > 0
        ? views.map((view: any) =>
            view.name === this.viewName
              ? { ...view, columns: columnsPayload, viewUpdated: true }
              : { ...view, viewUpdated: !!view.viewUpdated },
          )
        : views.map((view: any) => {
            if (view.name !== this.viewName) return view;
            const { columns: _columns, ...withoutColumns } = view;
            return withoutColumns;
          });

    this.saveSchema(viewsBuffer);
    this.emit<KeepEditViewCloseDetail>('dialog-close');
    this.setActiveViews(viewsBuffer);
  }

  /** Rebuild the right-hand Active Views panel and re-pull the view list. */
  private setActiveViews(views: any[]): void {
    const viewsList = (views ?? []).map((view: any) => {
      const first = view.alias != null && view.alias.length > 0 ? view.alias[0] : '';
      return {
        viewName: view.name,
        // Suppress an alias that only repeats the name (LABS-1903).
        viewAlias: first === view.name ? '' : first,
        viewUnid: view.unid,
        viewActive: view.active,
        viewColumns: view.columns,
        viewUpdated: !!(view.columns && view.columns.length > 0),
      };
    });

    this.databases.dispatch(fetchViews(this.dbName, this.schemaData?.nsfPath ?? ''));
    this.databases.dispatch({
      type: SET_ACTIVEVIEWS,
      payload: { db: this.dbName, activeViews: viewsList },
    });
  }

  /** Save is refused while two columns would be exposed under the same external name. */
  private get hasDuplicateNames(): boolean {
    const names = this.chosenColumns.map((column) => column.externalName);
    return new Set(names).size !== names.length;
  }

  private renderDesignColumn(column: KeepEditViewDesignColumn) {
    const added = this.chosenColumns.some((chosen) => chosen.name === column.name);

    return html`
      <li class="column-item">
        <button
          type="button"
          class="column-button ${added ? 'added' : ''}"
          aria-label=${added
            ? `Column ${column.name} is already added`
            : `Add column ${column.name}`}
          aria-disabled=${added ? 'true' : nothing}
          @click=${() => this.handleClickColumn(column)}
        >
          <span class="column-info">
            <span class="column-name">${column.name}</span>
            <span class="column-detail">Column Position ${column.position}</span>
            ${column.title && column.title.length > 0
              ? html`<span class="column-detail">Title: ${column.title}</span>`
              : nothing}
          </span>
          <span class="column-icon">
            ${added
              ? html`<wa-icon
                  class="check-icon"
                  library=${FA_LIBRARY}
                  name="circle-check"
                ></wa-icon>`
              : html`<wa-icon
                  class="add-icon"
                  library=${FA_LIBRARY}
                  name="square-plus"
                ></wa-icon>`}
          </span>
        </button>
      </li>
    `;
  }

  private renderDesignList() {
    // The column bar is sized by its content, so the loading state has no parent height to
    // fill and takes the page-height variant instead.
    if (this.loadingState.value.loading.status) {
      return html`<keep-page-loading
        contained
        page-height
        message="Columns are loading. This may take a few seconds..."
      ></keep-page-loading>`;
    }

    return html`
      <ul class="column-list" aria-label="Available columns">
        ${repeat(
          this.fetchedColumns,
          (column) => column.name,
          (column) => this.renderDesignColumn(column),
        )}
      </ul>
    `;
  }

  render() {
    const title = `Edit ${this.viewName} Columns`;

    return html`
      <dialog class="edit-dialog" aria-label=${title}>
        <button
          type="button"
          class="close-button"
          aria-label="Close"
          @click=${this.handleClickClose}
        >
          <wa-icon library=${FA_LIBRARY} name="xmark"></wa-icon>
        </button>
        <div class="title-container">
          <h2 class="title">${title}</h2>
          <div class="buttons-container">
            <button
              type="button"
              class="action-button reset-button"
              @click=${() => {
                this.resetDialogOpen = true;
              }}
            >
              <wa-icon library=${FA_LIBRARY} name="arrows-rotate"></wa-icon>
              <span>Reset</span>
            </button>
            <button
              type="button"
              class="action-button save-button"
              ?disabled=${this.hasDuplicateNames}
              @click=${this.handleClickSave}
            >
              <wa-icon library=${FA_LIBRARY} name="floppy-disk"></wa-icon>
              <span>Save</span>
            </button>
          </div>
        </div>
        <div class="dialog-body">
          <div class="column-bar">
            <button type="button" class="add-all" @click=${this.handleClickAddAll}>
              <span class="add-all-icon"><wa-icon library=${FA_LIBRARY} name="plus"></wa-icon></span>
              <span class="add-all-text">Add All</span>
            </button>
            ${this.renderDesignList()}
          </div>
          <keep-column-details
            .columns=${this.chosenColumns}
            @column-edit=${(event: CustomEvent<KeepColumnEditDetail>) =>
              this.handleEditColumn(event.detail.column, event.detail.externalName)}
            @column-remove=${(event: CustomEvent<KeepColumnRemoveDetail>) =>
              this.handleRemoveColumn(event.detail.name)}
          ></keep-column-details>
        </div>
      </dialog>

      <dialog
        class="reset-dialog"
        aria-label="Reset View?"
        aria-describedby="reset-edit-view-description"
      >
        <keep-form-dialog-header
          heading="Reset View?"
          @header-close=${() => {
            this.resetDialogOpen = false;
          }}
        ></keep-form-dialog-header>
        <div class="dialog-content">
          <p id="reset-edit-view-description" class="dialog-content-text">
            Resetting this view will remove all columns you've previously added including the
            External Names. This will reset the view to its initial state including any changes
            you've made on this page. Are you sure you want to continue with the reset?
          </p>
        </div>
        <div class="dialog-actions">
          <keep-button
            variant="neutral"
            appearance="outlined"
            @click=${() => {
              this.resetDialogOpen = false;
            }}
            >No</keep-button
          >
          <keep-button @click=${this.handleConfirmReset}>Yes</keep-button>
        </div>
      </dialog>

      <keep-unsaved-changes-dialog
        ?open=${this.showDirtyDialog}
        @dialog-save=${this.handleDirtySave}
        @dialog-discard=${this.closeWithoutSaving}
        @dialog-cancel=${this.handleDirtyCancel}
      ></keep-unsaved-changes-dialog>
    `;
  }
}

/**
 * `showModal()` on an already-open dialog throws, whereas `close()` on a closed one is a
 * no-op — so the guard is only needed on the opening side.
 */
function toggleModal(dialog: HTMLDialogElement | null, open: boolean): void {
  if (!dialog) return;
  if (open) {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.close();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-edit-view': EditView;
  }
}
