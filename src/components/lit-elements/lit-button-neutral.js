import { LitElement, html, css } from 'lit';

class ButtonNeutral extends LitElement {
  static styles = css`
    button {
        padding: 6px 16px;
        height: 31px;
        text-transform: none;
        line-height: 19px;
        border: 1px solid #000;
        border-radius: 5px;
        background: none;

        &:hover {
            cursor: pointer;
            background-color: #D3D3D3;
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
      <button>${this.text}</button>
    `;
  }
}

customElements.define('lit-button-neutral', ButtonNeutral);

export default ButtonNeutral