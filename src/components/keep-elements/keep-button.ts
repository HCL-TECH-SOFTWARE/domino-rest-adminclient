import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';

/**
 * Thin wrapper around `<wa-button>` (+ optional leading `<wa-icon>`).
 * Tag: `keep-button`. Exposed via `KeepElements.tsx` as `KeepButton`.
 */
@customElement('keep-button')
export default class Button extends KeepElement {
  static styles = [
    css`
      :host {
        display: var(--keep-button-display, inline-block);
        width: var(--keep-button-width, auto);
      }
      wa-button {
        width: var(--keep-button-width, auto);
      }
      :host([data-theme='dark']) wa-button[appearance='outlined']::part(base) {
        --wa-color-brand-50: #f4e9ff;
        --wa-color-brand-border-loud: #f4e9ff;
        --wa-color-brand-fill-loud: #f4e9ff;
        border-color: #f4e9ff !important;
        color: #f4e9ff !important;
      }
    `,
  ];

  @property({ type: String }) src = '';
  @property({ type: String }) variant = 'brand';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) outline = false;
  @property({ type: Boolean }) pill = false;

  /** Fixed visual appearance; not a reactive attribute (matches original). */
  appearance = 'accent';

  render() {
    return html`
      <wa-button
        variant="${this.variant}"
        ?disabled="${this.disabled}"
        style="${this.getAttribute('style') || ''}"
        appearance="${this.appearance}"
        ?pill="${this.pill}"
      >
        ${this.src ? html`<wa-icon src="${this.src}"></wa-icon>` : ''}
        <slot></slot>
      </wa-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-button': Button;
  }
}
