/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import './keep-schemas-cards-view';
import './keep-schemas-default-view';
import './keep-schemas-alphabetical-view';
import './keep-schemas-stacks-view';

/**
 * Picks which of the four schema views to render. The last file in
 * `commons/cardviews/displays/`, so that directory goes with it and both card-view families are
 * entirely Lit.
 *
 * **Navigation moves up to `SchemasLists`, not into a router controller.** The previous pass put
 * a `useNavigate` here because three views had stopped navigating for themselves; now that all
 * four are elements this file has no React left to hold it, so the `schema-open` event travels
 * one boundary further to `SchemasLists`, which is React and stays that way until #719. That is
 * the same shape the scopes family already has, and it means **no `RouterController` is needed
 * for these views** — only for the route components themselves, later.
 *
 * It does not re-emit the event: `KeepElement.emit` composes, so a child's `schema-open` crosses
 * both shadow boundaries on its own and would be delivered twice if this element forwarded it.
 *
 * An unrecognised `view` renders nothing, as the React version did.
 */
@customElement('keep-schemas-multi-view')
export default class SchemasMultiView extends KeepElement {
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
        return html`<keep-schemas-cards-view
          .databases=${this.databases}
        ></keep-schemas-cards-view>`;
      case 'nsf':
        return html`<keep-schemas-default-view
          .databases=${this.databases}
        ></keep-schemas-default-view>`;
      case 'alphabetical':
        return html`<keep-schemas-alphabetical-view
          .databases=${this.databases}
        ></keep-schemas-alphabetical-view>`;
      case 'stack':
        return html`<keep-schemas-stacks-view
          .databases=${this.databases}
        ></keep-schemas-stacks-view>`;
      default:
        return nothing;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-schemas-multi-view': SchemasMultiView;
  }
}
