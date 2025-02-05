import { LitElement, html } from 'lit';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';

class Button extends LitElement {

  static properties = {
    src: { type: String },
    variant: { type: String },
    disabled: { type: Boolean },
  };

  constructor() {
    super()
    this.src = ''
    this.variant = 'primary'
    this.disabled = false
  }

  render() {
    return html`
      <sl-button
        variant='${this.variant}'
        ${this.src ? `src=${this.src}` : ''}
        ?disabled="${this.disabled}"
        style="${this.getAttribute('style') || ''}"    
    >
        ${this.src ? html`<sl-icon src='${this.src}'></sl-icon>` : ''}
        <slot></slot>
      </sl-button>
    `;
  }
}

customElements.define('lit-button', Button);

export default Button