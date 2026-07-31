/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { StoreController } from '../../store/StoreController';
import type { AvailableDatabases } from '../../store/databases/types';
import './keep-tree';
import type { KeepTreeNode, KeepTreeSelectDetail } from './keep-tree';

/** Font Awesome glyphs registered in `services/icon-library`. */
const FOLDER_ICON = 'folder';
const DOCUMENT_ICON = 'file';

/** Intermediate shape while the flat `a/b/c.nsf` titles are folded into a tree. */
interface PathBranch {
  path: string;
  fullpath: string;
  children?: Record<string, PathBranch>;
}

/**
 * Fold one `a/b/c.nsf` title into `branches`, creating the intermediate folders
 * on the way. `segments` is consumed (shifted) as the recursion descends.
 */
const addPath = (
  fullpath: string,
  segments: string[],
  branches: Record<string, PathBranch>,
): Record<string, PathBranch> => {
  const segment = segments.shift() as string;
  const current = branches[segment] || (branches[segment] = { path: segment, fullpath });
  if (segments.length) {
    addPath(fullpath, segments, current.children || (current.children = {}));
  }
  return branches;
};

/** Map the folded path tree onto the generic node shape `keep-tree` renders. */
const toTreeNodes = (branches: Record<string, PathBranch>, parentId = ''): KeepTreeNode[] =>
  Object.values(branches).map((branch) => {
    const id = parentId ? `${parentId}/${branch.path}` : branch.path;
    const children = branch.children ? toTreeNodes(branch.children, id) : undefined;
    return {
      id,
      label: branch.path,
      // Matches the previous MUI rendering: a folder glyph on branches, a document
      // glyph on leaves — in addition to the expand/collapse icons `keep-tree` slots in.
      icon: children ? FOLDER_ICON : DOCUMENT_ICON,
      value: branch.fullpath,
      children,
    };
  });

/**
 * The `a/b/c.nsf` database picker. Tag: `keep-file-contents-tree`.
 *
 * Folds flat `AvailableDatabases` titles into a tree and hands them to `keep-tree`, emitting
 * `nsf-select` with the chosen full path. Only leaves emit, so folders stay click-inert.
 *
 * **`nodes` is derived in `willUpdate`, not in `render`.** The React version memoised the fold
 * on `[contents]` because the reduce mutates its accumulator and rebuilding it every render
 * handed `KeepTree` a fresh array each time — which, with `@lit/react` re-applying every prop
 * on every parent render, meant the tree re-rendered whether or not the databases had moved.
 * Recomputing only when `contents` actually changes keeps that property here.
 *
 * The loading state is the element's own: `APILoadingProgress` was MUI `CircularProgress`, and
 * a React component cannot render inside this shadow root.
 */
@customElement('keep-file-contents-tree')
export default class FileContentsTree extends KeepElement {
  static styles = css`
    :host {
      display: block;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 24px 0;
      color: var(--wa-color-text-normal);
      font-size: var(--wa-font-size-s);
      text-align: center;
    }

    /* Same two-second sweep the rest of the app uses for an indeterminate wait, rather than
       a second spinner implementation. Honours reduced-motion by standing still. */
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--wa-color-surface-border);
      border-top-color: var(--wa-color-brand-fill-loud);
      border-radius: 50%;
      animation: file-tree-spin 1s linear infinite;
    }

    @keyframes file-tree-spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .spinner {
        animation: none;
      }
    }
  `;

  /** The flat list to fold. Sorting is the caller's business, as it was in React. */
  @property({ attribute: false }) accessor contents: AvailableDatabases[] = [];

  /**
   * `databasePull` only — not the whole slice. This is the narrowing #895 asks for: the tree
   * needs one boolean, and `state.databases` changes constantly.
   */
  private readonly pulled = new StoreController(this, (state) => state.databases.databasePull);

  private nodes: KeepTreeNode[] = [];

  protected willUpdate(changed: PropertyValues): void {
    if (!changed.has('contents')) return;
    const branches = this.contents.reduce<Record<string, PathBranch>>(
      (acc, content) => addPath(content.title, content.title.split('/'), acc),
      {},
    );
    this.nodes = toTreeNodes(branches);
  }

  /**
   * Translates `keep-tree`'s generic `item-select` into the domain event.
   *
   * `item-select` composes, so it escapes this root too and a parent could listen for it
   * directly — but then the parent is coupled to the tree's node shape. A distinct name means
   * no double delivery (the two events differ) and one place that knows a node value is an
   * `nsfPath`.
   */
  private handleItemSelect(event: CustomEvent<KeepTreeSelectDetail>): void {
    this.emit<KeepNsfSelectDetail>('nsf-select', { nsfPath: event.detail.value as string });
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
            <div class="spinner" aria-hidden="true"></div>
            <span>Databases are loading. This may take a few seconds...</span>
          </div>`}
    `;
  }
}

/** `detail` of the `nsf-select` event: the full `a/b/c.nsf` path of the chosen leaf. */
export interface KeepNsfSelectDetail {
  nsfPath: string;
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-file-contents-tree': FileContentsTree;
  }
}
