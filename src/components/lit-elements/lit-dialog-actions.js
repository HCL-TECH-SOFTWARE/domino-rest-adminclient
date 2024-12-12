import { LitElement, html, css } from 'lit';

class DialogActions extends LitElement {
  static styles = css`
    section {
      display: flex;
      flex-direction: row-reverse;
      gap: 10px;
      padding: 10px 20px;
    }
  `;

  constructor() {
    super()
  }

  render() {
    return html`
      <hr>
      <section>
          <slot></slot>
      </section>
    `;
  }
}

customElements.define('lit-dialog-actions', DialogActions);

export default DialogActions