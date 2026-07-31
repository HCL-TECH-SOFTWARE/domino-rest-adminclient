/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
// Import Shoelace components
import '@awesome.me/webawesome/dist/components/icon/icon.js';

@customElement('keep-dialog-content')
export default class DialogContent extends KeepElement {
  static styles = css`
    section {
      padding: 10px 20px;
      margin: 0;
    }
  `;

  render() {
    return html`
      <section>
          <slot></slot>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-dialog-content': DialogContent;
  }
}
