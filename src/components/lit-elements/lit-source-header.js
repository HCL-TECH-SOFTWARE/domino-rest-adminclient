import { LitElement, html, css } from 'lit';
import './lit-source.js';
// Import Shoelace theme (light/dark)
import '@shoelace-style/shoelace/dist/themes/light.css';
// Import Shoelace components
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import { IMG_DIR } from '../../config.dev';

class SourceContents extends LitElement {
  static styles = css`
    select {
        border: none;
        background-color: #D7EBFD;
        padding: 5px;
        font-size: 15px;

        &:hover {
            cursor: pointer;
        }
    }

    textarea {
        width: 100%;
        height: 60vh;
        width: 100%;
        background-color: white;
        resize: none;
    }

    header {
        background-color: #D7EBFD;
        border-top: 1px solid #D2D2D2;
        border-left: 1px solid #D2D2D2;
        border-right: 1px solid #D2D2D2;
        padding: 5px 15px 5px 10px;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }

    section {
        color: #4a90e2;
    }
    section.buttons-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 40px;
    }

    main {
        max-width: 100%;
        max-height: 60vh;
    }

    button {
        background-color: transparent;
        border: none;
        padding: 0;
        margin: 0;

        &:hover {
            cursor: pointer;
        }
    }
    button[disabled] {
        cursor: not-allowed;
    }
  `;

  static properties = {
    selectedOption: { type: String },
    content: { type: Object },
    onSave: { type: Function },
    onCancel: { type: Function },
  };

  constructor() {
    super()
    this.selectedOption = 'tree'
    this.content = {}
    this.onSave = () => {}
    this.onCancel = () => {}
  }

  handleDropdownChange(event) {
    const newOption = event.target.value
    if (newOption === 'text' && this.selectedOption !== 'text') {
        const confirmSwitch = confirm('Switching to text view will discard any current changes. Do you want to proceed?');
        if (confirmSwitch) {
            this.selectedOption = newOption
        } else {
            event.target.value = this.selectedOption
        }
    } else {
        this.selectedOption = newOption
    }
  }

  handleSaveClick() {
    if (this.onSave) {
        this.content = this.getEditedContent()
        this.onSave()
    }
  }

  handleCancelClick() {
    if (this.onCancel) {
        this.content = this.getEditedContent()
        this.onCancel()
    }
  }

  handleCopyClick() {
    const content = this.getEditedContent();
    navigator.clipboard.writeText(JSON.stringify(content, null, 2))
      .then(() => {
        alert('Schema copied to clipboard!')
      })
      .catch(err => {
        alert('Failed to copy schema: ', err);
      });
  }

  handleDownloadClick() {
    const content = this.getEditedContent()
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'schema.json'
    a.click()
    URL.revokeObjectURL(url)
    alert('Schema downloaded as schema.json!')
  }

  getEditedContent() {
    if (this.shadowRoot.querySelector('lit-source-tree')) {
        return this.shadowRoot.querySelector('lit-source-tree').editedContent
    } else {
        return this.content
    }
  }

  render() {
    return html`
        <header>
            <select @change="${this.handleDropdownChange}">
                <option value="tree">Tree View</option>
                <option value="text">Text View</option>
            </select>
            <section class="buttons-container">
                <section style="display: flex; flex-direction: row; align-items: center; gap: 13px;">
                    <button title="Copy" style="color: #000;" @click="${this.handleCopyClick}"><sl-icon src="${IMG_DIR}/shoelace/copy.svg"></sl-icon></button>
                    <button title="Download" style="color: #000;" @click="${this.handleDownloadClick}"><sl-icon src="${IMG_DIR}/shoelace/download.svg"></sl-icon></button>
                </section>
                <section style="display: flex; flex-direction: row; align-items: center; gap: 13px;">
                    <section>
                        <button title="Cancel" style="color: ${this.selectedOption === 'tree' ? '#ED0000' : '#A9A9A9'};" @click="${this.handleCancelClick}" ?disabled="${this.selectedOption !== 'tree'}">
                            <sl-icon src="${IMG_DIR}/shoelace/x-lg.svg"></sl-icon>
                        </button>
                    </section>
                    <section>
                        <button title="Save" style="color: ${this.selectedOption === 'tree' ? '#007E0D' : '#A9A9A9'};" @click="${this.handleSaveClick}" ?disabled="${this.selectedOption !== 'tree'}">
                            <sl-icon src="${IMG_DIR}/shoelace/floppy.svg"></sl-icon>
                        </button>
                    </section>
                </section>
            </section>
        </header>
        <main>
            ${this.selectedOption === 'tree' ? html`
                <lit-source-tree .content="${this.content}"></lit-source-tree>
                ` : html`
                <textarea disabled>${JSON.stringify(this.content, null, 2)}</textarea>
            `}
        </main>
    `;
  }
}

customElements.define('lit-source', SourceContents);

export default SourceContents