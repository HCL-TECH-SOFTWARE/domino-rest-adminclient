/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepInputBase } from './keep-input-base';
import { KeepElement } from './keep-element';

/**
 * Password field, with WebAwesome's reveal toggle. Tag: `keep-input-password`.
 *
 * The styles and the value/validity API live on {@link KeepInputBase}, shared with
 * `keep-input-text` — see the notes there, including why `:state(user-invalid)` replaced
 * the Shoelace-era `data-user-invalid` attribute (#742).
 */
@customElement('keep-input-password')
export default class InputPassword extends KeepInputBase {
  @property({ type: String }) helpText?: string;

  /** Plain field used by render() (matches original — not the `helpText` property). */
  hint = '';

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
        style="${this.getAttribute('style') || ''}"
        type="password"
        label="${this.label}"
        hint="${this.hint}"
        placeholder="${this.placeholder}"
        password-toggle
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
    'keep-input-password': InputPassword;
  }
}
