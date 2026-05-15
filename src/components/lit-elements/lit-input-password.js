import { LitElement, html, css } from 'lit';
// Import Shoelace theme (light/dark)
import '@awesome.me/webawesome/dist/styles/webawesome.css';
// Import Shoelace components
import '@awesome.me/webawesome/dist/components/input/input.js';

class InputPassword extends LitElement {
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

  static properties = {
    label: { type: String },
    helpText: { type: String },
    placeholder: { type: String },
    required: { type: Boolean },
  };

  constructor() {
    super()
    this.label = ''
    this.hint = ''
    this.placeholder = ''
    this.required = false
  }

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
        >
            <slot></slot>
        </wa-input>
    `;
  }
}

customElements.define('lit-input-password', InputPassword);

export default InputPassword