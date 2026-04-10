import { LitElement, html, css } from 'lit';
import '@shoelace-style/shoelace/dist/components/drawer/drawer.js';
// Import Shoelace theme (light/dark)
import '@shoelace-style/shoelace/dist/themes/light.css';
// Import Shoelace components
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import { IMG_DIR } from '../../config.dev';

class Drawer extends LitElement {
    static styles = css`
        sl-drawer::part(panel) {
            background: light-dark(#fff, #1e1e2e);
            color: light-dark(inherit, #e0e0e0);
        }
        sl-drawer::part(header) {
            color: light-dark(inherit, #e0e0e0);
        }
        sl-drawer::part(title) {
            color: light-dark(inherit, #e0e0e0);
        }
        sl-drawer::part(body) {
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
        <sl-drawer label="${this.label}" ?open="${this.open}" style="--size: 40vw;" @sl-after-hide="${this.closeFn}">
            <slot></slot>
        </sl-drawer>
      `;
    }
}

customElements.define('lit-drawer', Drawer);

export default Drawer