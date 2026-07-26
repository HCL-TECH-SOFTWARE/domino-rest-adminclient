import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';

/**
 * Primary confirm button. Renders a plain `<button>` showing `text`.
 * Tag: `keep-button-yes`. Exposed via `KeepElements.tsx` as `KeepButtonYes`.
 */
@customElement('keep-button-yes')
export default class ButtonYes extends KeepElement {
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
    'keep-button-yes': ButtonYes;
  }
}
