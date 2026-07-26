import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';

/**
 * Plain neutral (outlined) button. Tag: `keep-button-neutral`.
 * Exposed via `KeepElements.tsx` as `KeepButtonNeutral`.
 */
@customElement('keep-button-neutral')
export default class ButtonNeutral extends KeepElement {
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
    'keep-button-neutral': ButtonNeutral;
  }
}
