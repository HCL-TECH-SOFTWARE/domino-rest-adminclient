import { LitElement, html, css } from 'lit';
// Import Shoelace theme (light/dark)
import '@awesome.me/webawesome/dist/styles/webawesome.css';
// Import Shoelace components
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/dropdown/dropdown.js';
import '@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js';

class Dropdown extends LitElement {
    static styles = css`
      :host {
        display: var(--lit-dropdown-display, inline-block);
        width: var(--lit-dropdown-width, auto);
      }
      wa-dropdown {
        width: var(--lit-dropdown-width, auto);
      }
      wa-dropdown::part(base) {
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
      }

      wa-button::part(base) {
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
          <wa-dropdown style="${this.getAttribute('style') || ''}">
              <wa-button appearance="filled" slot="trigger" with-caret>${this.selected}</wa-button>
                ${this.choices.map(choice => html`
                    <wa-dropdown-item @click=${() => this.changeSelected(choice)}>${choice}</wa-dropdown-item>
                `)}
          </wa-dropdown>
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