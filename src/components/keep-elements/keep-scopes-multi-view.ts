/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import './keep-scopes-cards-view';
import './keep-scopes-default-view';
import './keep-scopes-alphabetical-view';
import './keep-scopes-stacks-view';

/**
 * Picks which of the four scope views to render. The last piece of the scopes subtree, and with
 * it the whole subtree is Lit: tier A converted the card and nsf views, and this pass the
 * alphabetical and stack ones.
 *
 * It does not re-emit `scope-open`. `KeepElement.emit` composes, so a child's event crosses
 * this element's shadow boundary on its own and arrives at `ScopeLists` retargeted to this
 * host — adding a listener here to dispatch a copy would deliver it twice.
 *
 * An unrecognised `view` renders nothing, as the React version did: it was four independent
 * `view === '…' &&` expressions rather than a switch with a default.
 */
@customElement('keep-scopes-multi-view')
export default class ScopesMultiView extends KeepElement {
  static styles = css`
    :host {
      display: contents;
    }
  `;

  /** `card` | `nsf` | `alphabetical` | `stack`. */
  @property({ type: String }) accessor view = 'card';

  @property({ attribute: false }) accessor databases: any[] = [];

  render() {
    switch (this.view) {
      case 'card':
        return html`<keep-scopes-cards-view
          .databases=${this.databases}
        ></keep-scopes-cards-view>`;
      case 'nsf':
        return html`<keep-scopes-default-view
          .databases=${this.databases}
        ></keep-scopes-default-view>`;
      case 'alphabetical':
        return html`<keep-scopes-alphabetical-view
          .databases=${this.databases}
        ></keep-scopes-alphabetical-view>`;
      case 'stack':
        return html`<keep-scopes-stacks-view
          .databases=${this.databases}
        ></keep-scopes-stacks-view>`;
      default:
        return nothing;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-scopes-multi-view': ScopesMultiView;
  }
}
