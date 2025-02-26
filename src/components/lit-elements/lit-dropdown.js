import { LitElement, html, css } from 'lit';
// Import Shoelace theme (light/dark)
import '@shoelace-style/shoelace/dist/themes/light.css';
// Import Shoelace components
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';

class Dropdown extends LitElement {
    static styles = css`
      sl-dropdown::part(base) {
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
      }

      sl-button::part(base) {
        width: 100%;
      }

      sl-menu {
        width: 100%;
      }
    `;
  
    static properties = {
      choices: { type: Array },
    };
  
    constructor() {
      super()
      this.choices = []
      this.selected = this.choices[0]
    }
  
    render() {
      return html`
          <sl-dropdown style="${this.getAttribute('style') || ''}">
              <sl-button slot="trigger" caret>${this.selected}</sl-button>
              <sl-menu>
                ${this.choices.map(choice => html`
                    <sl-menu-item @click=${() => this.changeSelected(choice)}>${choice}</sl-menu-item>
                `)}
              </sl-menu>
          </sl-dropdown>
      `;
    }

    firstUpdated() {
        this.selected = this.choices[0]
        this.requestUpdate()
    }

    changeSelected(choice) {
        this.selected = choice
        this.requestUpdate()
    }

  }
  
  customElements.define('lit-dropdown', Dropdown);
  
  export default Dropdown