import { LitElement, html, css } from 'lit';

class ButtonNeutral extends LitElement {
  static styles = css`
    button {
        padding: 6px 16px;
        height: 31px;
        text-transform: none;
        line-height: 19px;
        border: 1px solid;
        border: none;
        border-radius: 5px;

        &:hover {
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

customElements.define('lit-button-neutral', ButtonNeutral);

export default ButtonNeutral