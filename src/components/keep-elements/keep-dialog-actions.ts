/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KeepElement } from './keep-element';

@customElement('keep-dialog-actions')
export default class DialogActions extends KeepElement {
  static styles = css`
    section {
      display: flex;
      flex-direction: row-reverse;
      gap: 10px;
      padding: 10px 20px;
    }
  `;

  render() {
    return html`
      <hr>
      <section>
          <slot></slot>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-dialog-actions': DialogActions;
  }
}
