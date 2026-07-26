import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './lit-dialog-content';
import './lit-dialog-header';
import './lit-dialog-actions';
import './lit-button-yes';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { IMG_DIR } from '../../config.dev';
import { KeepLitElement } from './keep-lit-element';

/**
 * "Error calling API" dialog composed from the lit-dialog-* primitives and a
 * lit-button-yes. Tag: `lit-api-error-dialog`.
 */
@customElement('lit-api-error-dialog')
export default class ApiErrorDialog extends KeepLitElement {
  static styles = css`
    dialog {
      padding: 0 0 10px 0;
      background-color: light-dark(#fff, #252535);
      color: light-dark(inherit, #e0e0e0);
      border-radius: 10px;
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      zIndex: 1000;
      box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.25);
    }
  `;

  @property({ type: String }) errorMessage = '';
  @property({ type: Boolean }) showDialog = false;

  render() {
    return html`
      <dialog id="api-error-dialog" ?open="${this.showDialog}">
        <lit-dialog-header>
          <header>
            <h3>Error calling API</h3>
          </header>
          <button class="close" @click=${this.handleCancel}>
            <wa-icon src="${IMG_DIR}/shoelace/x-lg.svg" label="Close"></wa-icon>
          </button>
        </lit-dialog-header>
        <lit-dialog-content>${this.errorMessage}</lit-dialog-content>
        <lit-dialog-actions>
          <lit-button-yes text="OK" @click=${this.handleCancel}></lit-button-yes>
        </lit-dialog-actions>
      </dialog>
    `;
  }

  private handleCancel(e: Event) {
    const dialog = (e.target as HTMLElement).closest('dialog');
    dialog?.close();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-api-error-dialog': ApiErrorDialog;
  }
}
