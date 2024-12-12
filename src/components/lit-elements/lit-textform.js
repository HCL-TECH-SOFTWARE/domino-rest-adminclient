import { LitElement, html, css } from 'lit';
import './lit-autocomplete.js';

class TextForm extends LitElement {
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
    }

    .value {
      flex: 1;
    }

    input[type="text"] {
      padding: 15px 10px;
      border: 1px solid #ccc;
      border-radius: 5px;
      width: 100%;
      box-sizing: border-box;
      font-size: 14;
    }

    lit-autocomplete {
      padding: 0;
    }
  `;

  static properties = {
    data: { type: Object },
  };

  constructor() {
    super()
    this.data = {};

    this.conversion = {
      formulaType: 'Formula Type',
      formula: 'Formula',
      message: 'Error Message',
    }
  }

  handleInputChange(key, event) {
    let newValue
    if (key === 'formulaType') {
      newValue = event.target.selectedOption
    } else {
      newValue = event.target.value
    }
    this.data = { ...this.data, [key]: newValue };
    this.dispatchEvent(new CustomEvent('data-changed', { detail: this.data }))
  }

  render() {
    return html`
      ${Object.keys(this.data).map(
        (key) => html`
          <div class="row">
            <div class="key">${!!this.conversion[key] ? this.conversion[key] : key}</div>
            <div class="value">
              ${key === 'formulaType' ? html`
                  <lit-autocomplete .options=${["domino"]} .initialOption="${this.data[key]}" @input=${(event) => this.handleInputChange(key, event)}></lit-autocomplete>`
                :
                html`
                  <input type="text" .value=${this.data[key]} @input=${(event) => this.handleInputChange(key, event)} />
                `
              }
            </div>
          </div>
        `
      )}
    `;
  }
}

customElements.define('lit-textform', TextForm);

export default TextForm