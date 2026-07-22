import { LitElement, html, css } from 'lit';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';

class Button extends LitElement {
  static styles = [
    css`
      :host {
        display: var(--lit-button-display, inline-block);
        width: var(--lit-button-width, auto);
      }
      wa-button {
        width: var(--lit-button-width, auto);
      }
      :host([data-theme="dark"]) wa-button[appearance="outlined"]::part(base) {
        --wa-color-brand-50: #f4e9ff;
        --wa-color-brand-border-loud: #f4e9ff;
        --wa-color-brand-fill-loud: #f4e9ff;
        border-color: #f4e9ff !important;
        color: #f4e9ff !important;
      }
    `
  ];

  static properties = {
    src: { type: String },
    variant: { type: String },
    disabled: { type: Boolean },
    outline: { type: Boolean },
    pill: { type: Boolean },
  };

  constructor() {
    super()
    this.src = ''
    this.variant = 'brand'
    this.disabled = false
    this.appearance = 'accent'
    this.pill = false
  }

  render() {
    return html`
      <wa-button
        variant='${this.variant}'
        ${this.src ? `src=${this.src}` : ''}
        ?disabled="${this.disabled}"
        style="${this.getAttribute('style') || ''}"
        appearance="${this.appearance}"
        ?pill="${this.pill}"
    >
        ${this.src ? html`<wa-icon src='${this.src}'></wa-icon>` : ''}
        <slot></slot>
      </wa-button>
    `;
  }
}

customElements.define('lit-button', Button);

export default Button