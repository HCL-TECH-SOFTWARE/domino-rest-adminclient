import { html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KeepLitElement } from './keep-lit-element';
// Import Shoelace components
import '@awesome.me/webawesome/dist/components/icon/icon.js';

@customElement('lit-dialog-content')
export default class DialogContent extends KeepLitElement {
  static styles = css`
    section {
      padding: 10px 20px;
      margin: 0;
    }
  `;

  render() {
    return html`
      <section>
          <slot></slot>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-dialog-content': DialogContent;
  }
}
