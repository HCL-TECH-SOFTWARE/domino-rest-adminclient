import { LitElement, html, css } from 'lit';

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
      width: 100%;
      box-sizing: border-box;
    }
  `;

  static properties = {
    data: { type: Object },
  };

  constructor() {
    super()
    this.data = {};
  }

  handleInputChange(key, event) {
    const newValue = event.target.value;
    this.data = { ...this.data, [key]: newValue };
    this.dispatchEvent(new CustomEvent('data-changed', { detail: this.data }))
  }

  render() {
    return html`
      ${Object.keys(this.data).map(
        (key) => html`
          <div class="row">
            <div class="key">${key}</div>
            <div class="value">
              <input
                type="text"
                .value=${this.data[key]}
                @input=${(event) => this.handleInputChange(key, event)}
              />
            </div>
          </div>
        `
      )}
    `;
  }
}

customElements.define('lit-textform', TextForm);

export default TextForm