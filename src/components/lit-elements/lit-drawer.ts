import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/drawer/drawer.js';
// Import Shoelace components
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepLitElement } from './keep-lit-element';

@customElement('lit-drawer')
export default class Drawer extends KeepLitElement {
  static styles = css`
        wa-drawer::part(panel) {
            background: light-dark(#fff, #1e1e2e);
            color: light-dark(inherit, #e0e0e0);
        }
        wa-drawer::part(header) {
            background: light-dark(#fff, #1e1e2e);
            color: light-dark(inherit, #e0e0e0);
        }
        wa-drawer::part(title) {
            background: light-dark(#fff, #1e1e2e);
            color: light-dark(inherit, #e0e0e0);
        }
        wa-drawer::part(header-actions) {
            background: light-dark(#fff, #1e1e2e);
            color: light-dark(inherit, #e0e0e0);
        }
        wa-drawer::part(body) {
            background: light-dark(#fff, #1e1e2e);
            color: light-dark(inherit, #e0e0e0);
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
    'lit-drawer': Drawer;
  }
}
