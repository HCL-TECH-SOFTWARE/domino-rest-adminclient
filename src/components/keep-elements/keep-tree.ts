/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html, nothing, type TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/tree/tree.js';
import '@awesome.me/webawesome/dist/components/tree-item/tree-item.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { FA_LIBRARY } from '../../services/icon-library';
import { KeepElement } from './keep-element';

/**
 * One node of a {@link Tree}. Deliberately domain-free: consumers map their own
 * data onto this shape and read their payload back off {@link KeepTreeSelectDetail}.
 */
export interface KeepTreeNode {
  /** Unique within the tree. Echoed back on `item-select`. */
  id: string;
  /** Text shown for the node. */
  label: string;
  /** Font Awesome glyph name — must be registered in `services/icon-library` ICONS. */
  icon?: string;
  /** Opaque consumer payload, echoed back on `item-select`. */
  value?: unknown;
  /** Child nodes. A node without children is a leaf and is the only selectable kind. */
  children?: KeepTreeNode[];
}

/** `event.detail` of the `item-select` event. */
export interface KeepTreeSelectDetail {
  id: string;
  label: string;
  value?: unknown;
  node: KeepTreeNode;
}

/**
 * Hierarchical list built on `<wa-tree>` / `<wa-tree-item>`. Tag: `keep-tree`.
 *
 * Feed it a {@link KeepTreeNode} array; it renders the whole tree (recursively)
 * and emits `item-select` when a **leaf** is clicked. Branches only expand and
 * collapse — matching `<wa-tree selection="leaf">` — so nothing is emitted for
 * them.
 *
 * @fires item-select - `CustomEvent<KeepTreeSelectDetail>` when a leaf is chosen.
 */
@customElement('keep-tree')
export default class Tree extends KeepElement {
  static styles = css`
    :host {
      color-scheme: inherit;
      color: var(--wa-color-text-normal);
      display: block;
    }

    wa-tree {
      color: var(--wa-color-text-normal);
    }

    /* Disable the expand/collapse rotation: the slotted icons already swap. */
    wa-tree-item::part(expand-button) {
      rotate: none;
    }

    wa-tree-item {
      color: var(--wa-color-text-normal);
    }

    wa-tree-item::part(label) {
      color: var(--wa-color-text-normal);
    }

    .node-label {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 0;
      font-size: var(--wa-font-size-m);
    }

  `;

  /** The nodes to render. Top level of the tree. */
  @property({ type: Array }) nodes: KeepTreeNode[] = [];

  render() {
    return html`
      <wa-tree selection="leaf">
        <wa-icon library="${FA_LIBRARY}" name="square-plus" slot="expand-icon"></wa-icon>
        <wa-icon library="${FA_LIBRARY}" name="square-minus" slot="collapse-icon"></wa-icon>
        ${(this.nodes ?? []).map((node) => this.renderNode(node))}
      </wa-tree>
    `;
  }

  private renderNode(node: KeepTreeNode): TemplateResult {
    const children = node.children ?? [];
    const isLeaf = children.length === 0;

    return html`
      <wa-tree-item
        data-id="${node.id}"
        @click="${isLeaf ? () => this.handleSelect(node) : null}"
      >
        <span class="node-label">
          ${node.icon
            ? html`<wa-icon library="${FA_LIBRARY}" name="${node.icon}"></wa-icon>`
            : nothing}
          <span class="node-text">${node.label}</span>
        </span>
        ${children.map((child) => this.renderNode(child))}
      </wa-tree-item>
    `;
  }

  /** Only ever bound to leaf items, so branches stay non-selectable. */
  private handleSelect(node: KeepTreeNode): void {
    this.emit<KeepTreeSelectDetail>('item-select', {
      id: node.id,
      label: node.label,
      value: node.value,
      node,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-tree': Tree;
  }
}
