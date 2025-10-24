import { LitElement, html } from 'lit';
import '@shoelace-style/shoelace/dist/components/switch/switch.js';

class Switch extends LitElement {

  static properties = {
    onToggle: { type: Function },
  };

  constructor() {
    super()
    this.onToggle = null
  }

  render() {
    return html`
      <sl-switch @sl-change=${this.onToggle}>
        <slot></slot>
      </sl-switch>
    `;
  }
}

customElements.define('lit-switch', Switch);

export default Switch