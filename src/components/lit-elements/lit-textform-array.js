import { LitElement, html, css } from 'lit';
import './lit-textform.js';
import './lit-button-yes.js';
import './lit-button-neutral.js';
import './lit-dialog-content.js';
import './lit-dialog-header.js';
import './lit-dialog-actions.js';
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
      gap: 10px;
    }

    .top {
      margin: 0 0 10px 0;
    }

    button {
      display: flex;
      flex-direction: row;
      justify-content: center;
      background: none;
      border: 1px solid #000;
      padding: 5px;
      border-radius: 5px;
      gap: 5px;

      &:hover {
          cursor: pointer;
      }

      &.add {
        &:hover {
          background-color: #F0F0F0;
        }
      }

      &.delete {
        &:hover {
          background-color: #F01648;
          border: 1px solid #F01648;
          color: #FFFFFF;
          text-color: #FFFFFF;
        }
      }

      .close {
        border: none;
        display: block;
      }
    }

    button.close {
      border: none;
      display: block;
    }

    h3 {
      font-weight: 400;
    }

    dialog {
        border: none;
        border-radius: 10px;
        padding: 20px 0;
    }

    dialog#add {
      padding-top: 0;
      padding-bottom: 0;
      min-width: 50vw;
      min-height: 30vh;
      overflow: auto;
    }

    header {
      display: flex;
      flex: 1;
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
    this.deleteRule = ''
    this.index = 0
  }

  handleDataChanged(index, event) {
    const newData = [...this.data]
    newData[index] = event.detail
    this.data = newData
    this.setData(newData)
  }

  handleDelete(e) {
    const newData = this.data.filter((_, i) => i !== this.index)
    this.data = newData
    this.setData(newData)
    const dialog = e.target.closest('div').querySelector('dialog#delete')
    dialog.close()
  }

  handleCancel(e) {
    const dialog = e.target.closest('div').querySelector('dialog#delete')
    dialog.close()
  }

  handleClickDelete(e, index) {
    this.deleteRule = this.data[index].message
    this.requestUpdate()
    this.index = index
    const dialog = e.target.closest('div').querySelector('dialog#delete')
    dialog.showModal()
  }

  handleCancelAdd(e) {
    const dialog = e.target.closest('div').querySelector('dialog#add')
    dialog.close()
  }

  handleClickAdd(e) {
    const dialog = e.target.closest('div').querySelector('dialog#add')
    dialog.showModal()
  }

  handleAdd(e) {
    const dialog = e.target.closest('div').querySelector('dialog#add')
    const form = e.target.closest('dialog#add').querySelector('lit-textform')
    this.data = [...this.data, form.data]
    this.setData(this.data)
    dialog.close()
  }

  handleCloseDialog(e) {
    this.handleCancelAdd(e.detail);
  }

  render() {
    return html`
      <div class="container">
        <section class="buttons-container top">
          <button class="add" @click=${this.handleClickAdd}>
              <sl-icon src="${IMG_DIR}/shoelace/plus-circle.svg" label="Add"></sl-icon>
              Add Rule
          </button>
        </section>
        ${this.data.map(
          (item, index) => html`
            <sl-details summary=${item[this.title] || `Item ${index + 1}`}>
              <lit-textform .data=${item} @data-changed=${(event) => this.handleDataChanged(index, event)}></lit-textform>
              <section class="buttons-container">
                <button class="delete" @click=${(e) => this.handleClickDelete(e, index)}>
                    <sl-icon src="${IMG_DIR}/shoelace/trash.svg" label="Delete"></sl-icon>
                    Delete Rule
                </button>
              </section>
            </sl-details>
          `
        )}
        <dialog id="delete">
          Delete Rule: <strong>${this.deleteRule}</strong>?
          <section class="buttons-container">
            <lit-button-yes text="Delete" @click=${this.handleDelete}></lit-button-yes>
            <lit-button-neutral text="Cancel" @click=${this.handleCancel}></lit-button-neutral>
          </section>
        </dialog>
        <dialog id="add">
          <lit-dialog-header heading="Add Rule" .closeFunction=${(e) => this.handleCancelAdd(e)} @close-dialog=${this.handleCloseDialog}>
            <header>
              <h3>Add Rule</h3>
          </header>
          <button class="close" @click=${this.handleCancelAdd}>
              <sl-icon src="${IMG_DIR}/shoelace/x-lg.svg" label="Close"></sl-icon>
          </button>
          </lit-dialog-header>
          <lit-dialog-content>
            <lit-textform .data=${{formulaType: 'domino', formula: '', message: ''}}></lit-textform>
          </lit-dialog-content>
          <lit-dialog-actions>
            <lit-button-yes text="Add" @click=${this.handleAdd}></lit-button-yes>
            <lit-button-neutral text="Cancel" @click=${this.handleCancelAdd}></lit-button-neutral>
          </lit-dialog-actions>
        </dialog>
      </div>
    `;
  }
}

customElements.define('lit-textform-array', TextFormArray);

export default TextFormArray