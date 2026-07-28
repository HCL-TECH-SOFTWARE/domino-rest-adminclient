/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepInputBase } from './keep-input-base';

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
            @input="${this.handleInput}"
        >
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
