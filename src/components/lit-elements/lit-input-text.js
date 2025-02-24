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
            help-text="${this.helpText}"
            placeholder="${this.placeholder}"
        >
            <slot></slot>
        </sl-input>
    `;
  }
}

customElements.define('lit-input-text', InputText);

export default InputText