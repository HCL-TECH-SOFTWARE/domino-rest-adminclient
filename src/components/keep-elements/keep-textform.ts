import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './keep-autocomplete';
import { KeepElement } from './keep-element';

type FormData = Record<string, any>;

/**
 * Key/value editor for a single formula rule. Tag: `keep-textform`.
 * Emits a (non-bubbling) `data-changed` CustomEvent with the updated data.
 */
@customElement('keep-textform')
export default class TextForm extends KeepElement {
  static styles = css`
    .row {
      display: flex;
      align-items: center;
      margin-bottom: 5px;
      justify-content: center;
    }

    .key {
      font-weight: bold;
      font-size: 14px;
      margin-right: 10px;
      width: auto;
      white-space: nowrap;
      flex: 1;
      color: light-dark(#000, #e0e0e0);
    }

    .value {
      flex: 1;
    }

    input[type="text"] {
      padding: 15px 10px;
      border: 1px solid light-dark(#ccc, #3a3a4a);
      border-radius: 5px;
      width: 100%;
      box-sizing: border-box;
      font-size: 14;
      background-color: light-dark(#fff, #1e1e2e);
      color: light-dark(#000, #e0e0e0);
    }

    keep-autocomplete {
      padding: 0;
    }
  `;

  @property({ type: Object }) data: FormData = {};

  private conversion: Record<string, string> = {
    formulaType: 'Formula Type',
    formula: 'Formula',
    message: 'Error Message',
  };

  private handleInputChange(key: string, event: Event) {
    const target = event.target as HTMLInputElement & { selectedOption?: any };
    const newValue = key === 'formulaType' ? target.selectedOption : target.value;
    this.data = { ...this.data, [key]: newValue };
    this.dispatchEvent(new CustomEvent('data-changed', { detail: this.data }));
  }

  render() {
    return html`
      ${Object.keys(this.data).map(
        (key) => html`
          <div class="row">
            <div class="key">${this.conversion[key] ? this.conversion[key] : key}</div>
            <div class="value">
              ${key === 'formulaType'
                ? html`
                  <keep-autocomplete .options=${['domino']} .initialOption="${this.data[key]}" @input=${(event: Event) => this.handleInputChange(key, event)}></keep-autocomplete>`
                : html`
                  <input type="text" .value=${this.data[key]} @input=${(event: Event) => this.handleInputChange(key, event)} />
                `}
            </div>
          </div>
        `,
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-textform': TextForm;
  }
}
