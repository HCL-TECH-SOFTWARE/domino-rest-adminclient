import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepLitElement } from './keep-lit-element';

/**
 * Primary confirm button. Renders a plain `<button>` showing `text`.
 * Tag: `lit-button-yes`. Exposed via `LitElements.tsx` as `LitButtonYes`.
 */
@customElement('lit-button-yes')
export default class ButtonYes extends KeepLitElement {
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

  @property({ type: String }) text = '';

  render() {
    return html`
      <button style="${this.getAttribute('style') || ''}">${this.text}</button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-button-yes': ButtonYes;
  }
}
