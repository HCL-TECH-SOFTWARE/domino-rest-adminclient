import { html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KeepLitElement } from './keep-lit-element';

@customElement('lit-dialog-actions')
export default class DialogActions extends KeepLitElement {
  static styles = css`
    section {
      display: flex;
      flex-direction: row-reverse;
      gap: 10px;
      padding: 10px 20px;
    }
  `;

  render() {
    return html`
      <hr>
      <section>
          <slot></slot>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-dialog-actions': DialogActions;
  }
}
