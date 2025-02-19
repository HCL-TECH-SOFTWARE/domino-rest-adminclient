import { LitElement, html, css } from 'lit';

class ButtonYes extends LitElement {
  static styles = css`
    button {
        padding: 6px 16px;
        height: 31px;
        text-transform: none;
        border-radius: 3px;
        line-height: 19px;
        background-color: #0F5FDC;
        color: #FFFFFF;
        text-color: #FFFFFF;
        border: none;
        border-radius: 5px;

        &:hover {
            background-color: #0B4AAE;
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
      <button style="${this.getAttribute('style') || ''}">${this.text}</button>
    `;
  }
}

customElements.define('lit-button-yes', ButtonYes);

export default ButtonYes