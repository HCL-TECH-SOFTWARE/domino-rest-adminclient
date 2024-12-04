import { LitElement, html, css } from 'lit';

class ButtonNo extends LitElement {
  static styles = css`
    button {
        padding: 6px 16px;
        height: 31px;
        text-transform: none;
        line-height: 19px;
        background-color: #F01648;
        color: #FFFFFF;
        text-color: #FFFFFF;
        border: none;
        border-radius: 5px;

        &:hover {
            background-color: #F01648;
            cursor: pointer;
        }

        &:disabled {
            background-color: #96BCF8;
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

customElements.define('lit-button-no', ButtonNo);

export default ButtonNo