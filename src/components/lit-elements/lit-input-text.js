import { LitElement, html, css } from 'lit';
// Import Shoelace theme (light/dark)
import '@shoelace-style/shoelace/dist/themes/light.css';
// Import Shoelace components
import '@shoelace-style/shoelace/dist/components/input/input.js';

class InputText extends LitElement {
  static styles = css`
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
        <sl-input
            style="${this.getAttribute('style') || ''}"
            label="${this.label}"
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