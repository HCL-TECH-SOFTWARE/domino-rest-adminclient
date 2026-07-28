/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepInputBase } from './keep-input-base';

/**
 * Single-line text field. Tag: `keep-input-text`.
 *
 * The styles and the value/validity API live on {@link KeepInputBase}, shared with
 * `keep-input-password` — see the notes there, including why `:state(user-invalid)`
 * replaced the Shoelace-era `data-user-invalid` attribute (#742).
 */
@customElement('keep-input-text')
export default class InputText extends KeepInputBase {
  @property({ type: String }) hint = '';

  render() {
    return html`
      <wa-input
        label="${this.label}"
        style="${this.getAttribute('style') || ''}"
        hint="${this.hint}"
        placeholder="${this.placeholder}"
        ?required="${this.required}"
        .value="${this.value}"
        @input="${this.handleInput}">
        <slot></slot>
      </wa-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-input-text': InputText;
  }
}
