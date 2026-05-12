import { LitElement, html, css } from 'lit';
import '@awesome.me/webawesome/dist/components/switch/switch.js';

class Switch extends LitElement {

  static styles = css`
    :host {
      color-scheme: inherit;
    }
    /* Slotted label text (e.g. "Show Active"). In dark mode it sits on
       the dark page background, so render it white. */
    wa-switch::part(label) {
      color: light-dark(inherit, #ffffff);
    }
    :host-context(body[data-theme="dark"]) wa-switch::part(label) {
      color: #ffffff !important;
    }
    /* The slot content itself (the \`<slot></slot>\` is light-DOM-distributed
       into wa-switch's label slot); style it explicitly too. */
    ::slotted(*) {
      color: light-dark(inherit, #ffffff);
    }
    :host-context(body[data-theme="dark"]) ::slotted(*) {
      color: #ffffff !important;
    }
  `;

  static properties = {
    onToggle: { type: Function },
  };

  constructor() {
    super()
    this.onToggle = null
  }

  render() {
    return html`
      <wa-switch @wa-change=${this.onToggle}>
        <slot></slot>
      </wa-switch>
    `;
  }
}

customElements.define('lit-switch', Switch);

export default Switch