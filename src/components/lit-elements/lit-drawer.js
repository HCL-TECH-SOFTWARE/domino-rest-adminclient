import { LitElement, html, css } from 'lit';
import '@awesome.me/webawesome/dist/components/drawer/drawer.js';
// Import Shoelace theme (light/dark)
import '@awesome.me/webawesome/dist/styles/webawesome.css';
// Import Shoelace components
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { IMG_DIR } from '../../config.dev';

class Drawer extends LitElement {
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
        }
    `

    static properties = {
        label: { type: String },
        open: { type: Boolean },
        closeFn: { type: Function },
        buttons: { type: Array },
    };
  
    constructor() {
      super()
      this.label = "Drawer Label"
      this.open = false
      this.closeFn = () => {}
      this.buttons = []
    }
  
    render() {
      return html`
        <wa-drawer label="${this.label}" ?open="${this.open}" style="--size: 40vw;" @wa-after-hide="${this.closeFn}">
            <slot></slot>
        </wa-drawer>
      `;
    }
}

customElements.define('lit-drawer', Drawer);

export default Drawer