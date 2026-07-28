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

/*
 * No `style` passthrough to the inner Web Awesome control.
 *
 * It read the host's own `style` attribute and re-emitted it here, which the production CSP
 * blocks: `style-src-attr 'none'` stops Lit's AttributePart from applying an interpolated
 * `style=`, so the attribute landed in the DOM and did nothing. No caller passed one either
 * — measured across `src`, zero call sites. Size these from `:host` rules or a custom
 * property instead. #685.
 */

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
