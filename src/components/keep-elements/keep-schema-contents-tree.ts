/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/spinner/spinner.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import type { AvailableDatabases } from '../../store/databases/types';
import './keep-tree';
import type { KeepTreeNode, KeepTreeSelectDetail } from './keep-tree';

/** Font Awesome glyphs registered in `services/icon-library`. */
const DATABASE_ICON = 'database';
const DOCUMENT_ICON = 'file';

/** Payload carried on the schema (leaf) nodes and echoed back on selection. */
interface SchemaValue {
  nsfpath: string;
  api: string;
}

/**
 * The schema picker for the scope drawer. Tag: `keep-schema-contents-tree`.
 *
 * Two levels only: each database is a branch, each of its (de-duplicated) API names is a
 * selectable leaf. Choosing a leaf emits `schema-select` carrying both halves the caller
 * needs — the database path and the schema name.
 *
 * ## Why this is not `keep-file-contents-tree`
 *
 * That element looks similar and shares the same `keep-tree` primitive, but nothing below
 * the surface lines up: it folds `a/b/c.nsf` *titles* into an n-deep path hierarchy keyed on
 * slash segments, glyphs branches as folders, and emits a single path string. This one is a
 * fixed two-level database/API grouping with database and document glyphs and a two-field
 * payload. Merging them would mean a mode flag that forks the fold, the icons and the event
 * — two elements sharing a constructor. The reuse that matters is `keep-tree`, and both do
 * that.
 *
 * ## `nodes` is derived in `willUpdate`, not in `render`
 *
 * The React version rebuilt the node array in its render body, so every parent render handed
 * the tree a fresh array — and the wrapper layer re-applies every property on every render
 * with no dirty check, so the tree re-rendered whether or not the databases had moved.
 * Recomputing only when `contents` actually changes removes that.
 *
 * The loading state is the element's own: the shared loading component is a React component
 * built on a Material spinner, and a React component cannot render inside this shadow root.
 *
 * @fires schema-select - `CustomEvent<KeepSchemaSelectDetail>` when a schema leaf is chosen.
 */
@customElement('keep-schema-contents-tree')
export default class SchemaContentsTree extends KeepElement {
  static styles = css`
    :host {
      display: block;
    }

    /*
     * Was the Linaria LoadingContainer: a full-column centred box, so the spinner sits in
     * the middle of the scroll area rather than crowding the top of it. A minimum height
     * rather than the original's fixed one — identical while the tree above is empty, which
     * is the only time this shows, and it cannot clip if a partial list has already arrived.
     */
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: calc(100vh - 170px);
      /*
       * Was the color-text-primary class — a class selector, so it does not cross this shadow
       * boundary, and its dark-mode value came from a body[data-theme] rule that does not
       * either. The token below is mode-aware on its own.
       */
      color: var(--wa-color-text-normal);
      text-align: center;
    }

    /*
     * 40px and a 4px track are the Material spinner's defaults, which is what this replaces.
     * The spinner sizes from font-size only; width/height would break its animation.
     */
    .loading wa-spinner {
      font-size: 40px;
      --track-width: 4px;
    }

    /* Was the Linaria LabelContainer. */
    .loading span {
      margin: 10px 0;
    }
  `;

  /** The databases to list. Filtering and sorting stay the caller's business, as in React. */
  @property({ attribute: false }) accessor contents: AvailableDatabases[] = [];

  /**
   * `databasePull` only — not the whole slice. The tree needs one boolean and
   * `state.databases` changes constantly; a primitive also keeps the controller's `Object.is`
   * check meaningful.
   */
  private readonly pulled = new StoreController(this, (state) => state.databases.databasePull);

  private nodes: KeepTreeNode[] = [];

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('contents')) return;
    this.nodes = (this.contents ?? []).map((content, idx) => ({
      id: `db-${idx}`,
      label: content.title,
      icon: DATABASE_ICON,
      children: [...new Set(content.apinames)].map((api, apiIdx) => ({
        // Index-based, exactly as the React version built them. `keep-tree` keys its
        // expand/collapse state on the id, so changing the scheme changes which branch
        // reopens after a search re-filters the list.
        id: `db-${idx}-${api}-${apiIdx}`,
        label: api,
        icon: DOCUMENT_ICON,
        value: { nsfpath: content.nsfpath, api } satisfies SchemaValue,
      })),
    }));
  }

  /**
   * Translates `keep-tree`'s generic `item-select` into the domain event.
   *
   * `item-select` composes, so it escapes this root too and the parent could listen for it
   * directly — but then the parent is coupled to the tree's node shape. A distinct name means
   * no double delivery (the two events differ) and one place that knows a node value is a
   * database path plus a schema name.
   */
  private handleItemSelect(event: CustomEvent<KeepTreeSelectDetail>): void {
    const value = event.detail.value as SchemaValue | undefined;
    // A database with no APIs has no children, so `keep-tree` treats it as a selectable leaf.
    // It carries no payload and was not clickable before.
    if (!value) return;
    this.emit<KeepSchemaSelectDetail>('schema-select', {
      nsfPath: value.nsfpath,
      schemaName: value.api,
    });
  }

  render() {
    return html`
      <keep-tree
        .nodes=${this.nodes}
        @item-select=${(e: CustomEvent<KeepTreeSelectDetail>) => this.handleItemSelect(e)}
      ></keep-tree>
      ${this.pulled.value
        ? nothing
        : html`<div class="loading" role="status">
            <wa-spinner aria-hidden="true"></wa-spinner>
            <span>Schemas are loading. This may take a few seconds...</span>
          </div>`}
    `;
  }
}

/** `detail` of the `schema-select` event: the chosen schema and the database holding it. */
export interface KeepSchemaSelectDetail {
  /** Full path of the database the schema belongs to. */
  nsfPath: string;
  /** The API (schema) name chosen. */
  schemaName: string;
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-schema-contents-tree': SchemaContentsTree;
  }
}
