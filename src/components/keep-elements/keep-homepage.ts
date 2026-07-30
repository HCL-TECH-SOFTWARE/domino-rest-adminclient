/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KeepElement } from './keep-element';

/**
 * The `/` route's scroll container.
 *
 * Its child is still React (`home/sections/Section`, which reads the store), so it arrives as
 * slotted light DOM from `Views.tsx`. That is the coexistence pattern the other 73 tier B/C
 * files will need: a converted parent does not force its children to convert, it slots them.
 */
@customElement('keep-homepage')
export default class Homepage extends KeepElement {
  static readonly styles = css`
    /* was HomepageContainer, a styled.div - hence display: block */
    :host {
      display: block;
      overflow-y: auto;
    }
  `;

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-homepage': Homepage;
  }
}
