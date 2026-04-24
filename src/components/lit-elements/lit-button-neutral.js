import { LitElement, html, css } from 'lit';

class ButtonNeutral extends LitElement {
  static styles = css`
    button {
        padding: 6px 16px;
        height: 31px;
        text-transform: none;
        line-height: 19px;
        border: 1px solid var(--theme-btn-neutral-border);
        border-radius: 5px;
        background: none;
        color: var(--theme-btn-neutral-text);

        &:hover {
            cursor: pointer;
            background-color: var(--theme-btn-neutral-hover);
        }

        &:disabled {
            background-color: #808080;
            color: #0C0D0D;
            text-color: #0C0D0D;
        }
    }
  `;

  static properties = {
    text: { type: String },
  };

  constructor() {
    super()
    this.text = ''
  }

  render() {
    return html`
      <button style="${this.getAttribute('style') || ''}">${this.text}</button>
    `;
  }
}

customElements.define('lit-button-neutral', ButtonNeutral);

export default ButtonNeutral