import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepLitElement } from './keep-lit-element';
// Import Shoelace components
import '@awesome.me/webawesome/dist/components/input/input.js';

@customElement('lit-input-text')
export default class InputText extends KeepLitElement {
  static styles = css`
    :host {
      color-scheme: inherit;
    }
    text {
      font-size: 12px;
    }

    wa-input[data-user-invalid]::part(base) {
      border-color: var(--wa-color-danger-600);
      box-shadow: 0 0 0 var(--wa-focus-ring-width) var(--wa-color-danger-300);
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
  @property({ type: String }) hint = '';
  @property({ type: String }) placeholder = '';
  @property({ type: Boolean }) required = false;

  render() {
    return html`
        <wa-input
            label="${this.label}"
            style="${this.getAttribute('style') || ''}"
            hint="${this.hint}"
            placeholder="${this.placeholder}"
            ?required="${this.required}"
        >
            <slot></slot>
        </wa-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-input-text': InputText;
  }
}
