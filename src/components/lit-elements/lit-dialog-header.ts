import { html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
// Import Shoelace components
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { IMG_DIR } from '../../config.dev';
import { KeepLitElement } from './keep-lit-element';

@customElement('lit-dialog-header')
export default class DialogHeader extends KeepLitElement {
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

  render() {
    return html`
      <section>
          <slot></slot>
      </section>
      <hr>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-dialog-header': DialogHeader;
  }
}
