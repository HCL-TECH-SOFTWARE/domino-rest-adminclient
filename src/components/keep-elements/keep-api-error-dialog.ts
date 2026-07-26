import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './keep-dialog-content';
import './keep-dialog-header';
import './keep-dialog-actions';
import './keep-button-yes';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { IMG_DIR } from '../../config.dev';
import { KeepElement } from './keep-element';

/**
 * "Error calling API" dialog composed from the keep-dialog-* primitives and a
 * keep-button-yes. Tag: `keep-api-error-dialog`.
 */
@customElement('keep-api-error-dialog')
export default class ApiErrorDialog extends KeepElement {
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
        <keep-dialog-header>
          <header>
            <h3>Error calling API</h3>
          </header>
          <button class="close" @click=${this.handleCancel}>
            <wa-icon src="${IMG_DIR}/shoelace/x-lg.svg" label="Close"></wa-icon>
          </button>
        </keep-dialog-header>
        <keep-dialog-content>${this.errorMessage}</keep-dialog-content>
        <keep-dialog-actions>
          <keep-button-yes text="OK" @click=${this.handleCancel}></keep-button-yes>
        </keep-dialog-actions>
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
    'keep-api-error-dialog': ApiErrorDialog;
  }
}
