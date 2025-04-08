import { LitElement, html, css } from 'lit';
import './lit-dialog-content.js';
import './lit-dialog-header.js';
import './lit-dialog-actions.js';
import './lit-button-yes.js';
// Import Shoelace theme (light/dark)
import '@shoelace-style/shoelace/dist/themes/light.css';
// Import Shoelace components
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import { IMG_DIR } from '../../config.dev';

class ApiErrorDialog extends LitElement {
    static styles = css`
      dialog {
            padding: 0 0 10px 0;
            background-color: #FFF;
            border-radius: 10px;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            zIndex: 1000;
            box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.25);
      }
    `;
  
    static properties = {
        errorMessage: { type: String },
        showDialog: { type: Boolean },
    };
  
    constructor() {
      super()
      this.errorMessage = ''
      this.showDialog = false
    }
  
    render() {
      return html`
        <dialog id="api-error-dialog" ?open="${this.showDialog}">
            <lit-dialog-header>
                <header>
                    <h3>Error calling API</h3>
                </header>
                <button class="close" @click=${this.handleCancel}>
                    <sl-icon src="${IMG_DIR}/shoelace/x-lg.svg" label="Close"></sl-icon>
                </button>
            </lit-dialog-header>
            <lit-dialog-content>${this.errorMessage}</lit-dialog-content>
            <lit-dialog-actions>
                <lit-button-yes text="OK" @click=${this.handleCancel}></lit-button-yes>
            </lit-dialog-actions>
        </dialog>
      `;
    }

    handleCancel(e) {
        const dialog = e.target.closest('dialog')
        dialog.close()
    }
}
  
customElements.define('lit-api-error-dialog', ApiErrorDialog);

export default ApiErrorDialog