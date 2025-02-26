import { LitElement, html, css } from 'lit';
// Import Shoelace theme (light/dark)
import '@shoelace-style/shoelace/dist/themes/light.css';
// Import Shoelace components
import '@shoelace-style/shoelace/dist/components/input/input.js';

class InputText extends LitElement {
  static styles = css`
    text {
      font-size: 12px;
    }

    sl-input[data-user-invalid]::part(base) {
      border-color: var(--sl-color-danger-600);
      box-shadow: 0 0 0 var(--sl-focus-ring-width) var(--sl-color-danger-300);
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
    this.helpText = ''
    this.placeholder = ''
    this.required = false
  }

  render() {
    return html`
        <text>${this.label}</text>
        <sl-input
            style="${this.getAttribute('style') || ''}"
            help-text="${this.helpText}"
            placeholder="${this.placeholder}"
            ?required="${this.required}"
        >
            <slot></slot>
        </sl-input>
    `;
  }
}

customElements.define('lit-input-text', InputText);

export default InputText