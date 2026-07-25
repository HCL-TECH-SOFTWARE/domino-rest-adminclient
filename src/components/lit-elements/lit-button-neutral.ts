import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepLitElement } from './keep-lit-element';

/**
 * Plain neutral (outlined) button. Tag: `lit-button-neutral`.
 * Exposed via `LitElements.tsx` as `LitButtonNeutral`.
 */
@customElement('lit-button-neutral')
export default class ButtonNeutral extends KeepLitElement {
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

  @property({ type: String }) text = '';

  render() {
    return html`
      <button style="${this.getAttribute('style') || ''}">${this.text}</button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-button-neutral': ButtonNeutral;
  }
}
