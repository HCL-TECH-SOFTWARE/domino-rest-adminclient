import { LitElement, html, css } from 'lit';
// Import Shoelace theme (light/dark)
import '@shoelace-style/shoelace/dist/themes/light.css';
// Import Shoelace components
import '@shoelace-style/shoelace/dist/components/input/input.js';

class InputPassword extends LitElement {
  static styles = css`
    text {
      font-size: 12px;
    }
  `;

  static properties = {
    label: { type: String },
    helpText: { type: String },
    placeholder: { type: String },
  };

  constructor() {
    super()
    this.label = ''
    this.helpText = ''
    this.placeholder = ''
  }

  render() {
    return html`
        <text>${this.label}</text>
        <sl-input
            style="${this.getAttribute('style') || ''}"
            type="password"
            help-text="${this.helpText}"
            placeholder="${this.placeholder}"
            password-toggle
        >
            <slot></slot>
        </sl-input>
    `;
  }
}

customElements.define('lit-input-password', InputPassword);

export default InputPassword