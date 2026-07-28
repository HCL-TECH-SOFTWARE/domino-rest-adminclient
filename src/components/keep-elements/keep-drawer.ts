import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/drawer/drawer.js';
// Import Shoelace components
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';

@customElement('keep-drawer')
export default class Drawer extends KeepElement {
  static styles = css`
        wa-drawer::part(panel) {
            background: var(--wa-color-surface-default);
            color: var(--wa-color-text-normal);
        }
        wa-drawer::part(header) {
            background: var(--wa-color-surface-default);
            color: var(--wa-color-text-normal);
        }
        wa-drawer::part(title) {
            background: var(--wa-color-surface-default);
            color: var(--wa-color-text-normal);
        }
        wa-drawer::part(header-actions) {
            background: var(--wa-color-surface-default);
            color: var(--wa-color-text-normal);
        }
        wa-drawer::part(body) {
            background: var(--wa-color-surface-default);
            color: var(--wa-color-text-normal);
            /* Prevent the drawer body itself from scrolling — inner regions handle their own scroll. */
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
    `;

  @property({ type: String }) label = 'Drawer Label';
  @property({ type: Boolean }) open = false;
  @property({ attribute: false }) closeFn: (...args: unknown[]) => void = () => {};
  @property({ type: Array }) buttons: unknown[] = [];

  render() {
    return html`
      <wa-drawer
        label="${this.label}"
        ?open="${this.open}"
        style="--size: 40vw;"
        @wa-after-hide="${this.closeFn}"
      >
        <slot></slot>
      </wa-drawer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-drawer': Drawer;
  }
}
