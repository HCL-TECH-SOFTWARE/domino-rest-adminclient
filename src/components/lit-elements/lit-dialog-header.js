import { LitElement, html, css } from 'lit';
// Import Shoelace theme (light/dark)
import '@shoelace-style/shoelace/dist/themes/light.css';
// Import Shoelace components
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import { IMG_DIR } from '../../config.dev';

class DialogHeader extends LitElement {
  static styles = css`
    section {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      padding: 0 20px;
      margin: 0;
    }

    hr {
      padding: 0;
      margin: 0 0 10px 0;
    }

    button {
      border: none;
      background: none;

      &:hover {
          cursor: pointer;
      }
    }

    ::slotted(button) {
      background: none;
      border: none;
    }

    ::slotted(button:hover) {
      cursor: pointer;
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
      <hr>
    `;
  }
}

customElements.define('lit-dialog-header', DialogHeader);

export default DialogHeader