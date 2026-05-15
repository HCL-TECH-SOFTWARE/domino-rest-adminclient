import { LitElement, html, css } from 'lit';
// Import Shoelace theme (light/dark)
import '@awesome.me/webawesome/dist/styles/webawesome.css';
// Import Shoelace components
import '@awesome.me/webawesome/dist/components/icon/icon.js';

class DialogContent extends LitElement {
  static styles = css`
    section {
      padding: 10px 20px;
      margin: 0;
    }
  `;

  constructor() {
    super()
  }

  render() {
    return html`
      <section>
          <slot></slot>
      </section>
    `;
  }
}

customElements.define('lit-dialog-content', DialogContent);

export default DialogContent