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
export default class InputPassword extends KeepElement {
  /* `:state(user-invalid)` below, not the Shoelace-era `data-user-invalid` attribute —
     see the note in keep-input-text.ts, including why it is out here (#742). */
  static styles = css`
    :host {
      color-scheme: inherit;
    }
    text {
      font-size: var(--wa-font-size-s);
    }

    wa-input:state(user-invalid)::part(base) {
      border-color: var(--wa-color-danger-fill-loud);
      box-shadow: 0 0 0 var(--wa-focus-ring-width) var(--wa-color-danger-fill-quiet);
    }

    /* Dark mode: white label and brand-tinted input text so a
       pre-filled value isn't pure white on the dark background. */
    :host-context(body[data-theme="dark"]) wa-input::part(form-control-label),
    :host-context(body[data-theme="dark"]) wa-input::part(label) {
      color: #ffffff !important;
    }
    :host-context(body[data-theme="dark"]) wa-input::part(input) {
      color: var(--wa-color-brand-50) !important;
      -webkit-text-fill-color: var(--wa-color-brand-50) !important;
      caret-color: var(--wa-color-brand-50);
    }
  `;

  @property({ type: String }) label = '';
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
