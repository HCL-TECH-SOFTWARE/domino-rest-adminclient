import { LitElement, html, css } from 'lit';
import './lit-source.js';
// Import Shoelace theme (light/dark)
import '@shoelace-style/shoelace/dist/themes/light.css';
// Import Shoelace components
import '@shoelace-style/shoelace/dist/components/details/details.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import { IMG_DIR } from '../../config.dev';

class TextFormArray extends LitElement {
  static styles = css`
    .container {
      padding: 10px;
      margin-bottom: 10px;
    }

    sl-details {
      margin-bottom: 10px;
    }

    .buttons-container {
        display: flex;
        flex-direction: row-reverse;
        margin-top: 10px;
    }

    button {
        display: flex;
        flex-direction: row;
        justify-content: center;
        background: none;
        border: none;
        padding: 5px;
        border-radius: 5px;
        gap: 5px;

        &:hover {
            cursor: pointer;
            background-color: #F01648;
        }
    }
  `;

  static properties = {
    data: { type: Array },
    title: { type: String },
    setData: { type: Function },
  };

  constructor() {
    super()
    this.data = [];
    this.title = '';
    this.setData = (data) => {};
  }

  handleDataChanged(index, event) {
    const newData = [...this.data]
    newData[index] = event.detail
    this.data = newData
    this.setData(newData)
  }

  handleDelete(index) {
    const newData = this.data.filter((_, i) => i !== index)
    this.data = newData
    this.setData(newData)
  }

  render() {
    return html`
      <div class="container">
        ${this.data.map(
          (item, index) => html`
            <sl-details summary=${item[this.title] || `Item ${index + 1}`}>
              <lit-textform .data=${item} @data-changed=${(event) => this.handleDataChanged(index, event)}></lit-textform>
              <section class="buttons-container">
                <button @click=${() => this.handleDelete(index)}>
                    <sl-icon src="${IMG_DIR}/shoelace/trash.svg" label="Delete"></sl-icon>
                    Delete Rule
                </button>
              </section>
            </sl-details>
          `
        )}
      </div>
    `;
  }
}

customElements.define('lit-textform-array', TextFormArray);

export default TextFormArray