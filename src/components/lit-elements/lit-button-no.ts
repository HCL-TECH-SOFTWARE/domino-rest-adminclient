import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepLitElement } from './keep-lit-element';

@customElement('lit-button-no')
export default class ButtonNo extends KeepLitElement {
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

  @property({ type: String }) text = '';

  render() {
    return html`
      <button style="${this.getAttribute('style') || ''}">${this.text}</button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-button-no': ButtonNo;
  }
}
