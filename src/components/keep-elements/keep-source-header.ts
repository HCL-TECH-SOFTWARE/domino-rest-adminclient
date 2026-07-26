import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import './keep-source';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { IMG_DIR } from '../../config.dev';
import { KeepElement } from './keep-element';

type TreeEl = HTMLElement & { editedContent: unknown };

/**
 * Source editor chrome: a Tree/Text view switcher plus copy/download/cancel/save
 * actions, wrapping the `keep-source-tree` editor. Tag: `keep-source` (note: the
 * file is `keep-source-header` but the registered tag is `keep-source`).
 */
@customElement('keep-source')
export default class SourceContents extends KeepElement {
  static styles = css`
    select {
        border: none;
        background-color: light-dark(#D7EBFD, #3a3a5a);
        color: light-dark(inherit, #e0e0e0);
        padding: 5px;
        font-size: 15px;

        &:hover {
            cursor: pointer;
        }
    }

    textarea {
        width: 100%;
        height: 60vh;
        background-color: light-dark(white, #1e1e2e);
        color: light-dark(inherit, #e0e0e0);
        resize: none;
    }

    header {
        background-color: light-dark(#D7EBFD, #3a3a5a);
        border-top: 1px solid light-dark(#D2D2D2, #3a3a4a);
        border-left: 1px solid light-dark(#D2D2D2, #3a3a4a);
        border-right: 1px solid light-dark(#D2D2D2, #3a3a4a);
        color: light-dark(inherit, #e0e0e0);
        padding: 5px 15px 5px 10px;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
    }

    section {
        color: light-dark(#4a90e2, #8CC7F9);
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
        color: light-dark(#000, #e0e0e0);

        &:hover {
            cursor: pointer;
        }
    }
    button[disabled] {
        cursor: not-allowed;
    }
  `;

  @property({ type: String }) selectedOption = '';
  @property({ type: Object }) content: Record<string, unknown> = {};
  @property({ attribute: false }) onSave: () => void = () => {};
  @property({ attribute: false }) onCancel: () => void = () => {};
  @property({ attribute: false }) onDropdownChange: (newOption: string) => void = () => {};
  @property({ attribute: false }) getExternalContent: () => string = () => '';

  handleDropdownChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const newOption = target.value;
    const confirmSwitch = confirm(
      'Switching the view will discard any current changes. Do you want to proceed?',
    );
    if (confirmSwitch) {
      this.selectedOption = newOption;
      this.onDropdownChange(newOption);
    } else {
      target.value = this.selectedOption;
    }
  }

  handleSaveClick() {
    if (this.onSave) {
      this.content = this.getEditedContent() as Record<string, unknown>;
      this.onSave();
    }
  }

  handleCancelClick() {
    if (this.onCancel) {
      this.content = this.getEditedContent() as Record<string, unknown>;
      this.onCancel();
    }
  }

  handleCopyClick() {
    let content: unknown;
    if (this.selectedOption === 'tree') {
      content = this.getEditedContent();
    } else {
      content = JSON.parse(this.getExternalContent());
    }
    navigator.clipboard
      .writeText(JSON.stringify(content, null, 2))
      .then(() => {
        alert('Schema copied to clipboard!');
      })
      .catch((err) => {
        alert('Failed to copy schema: ' + err);
      });
  }

  handleDownloadClick() {
    let content: unknown;
    if (this.selectedOption === 'tree') {
      content = this.getEditedContent();
    } else {
      content = JSON.parse(this.getExternalContent());
    }
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schema.json';
    a.click();
    URL.revokeObjectURL(url);
    alert('Schema downloaded as schema.json!');
  }

  getEditedContent(): unknown {
    const tree = this.shadowRoot!.querySelector('keep-source-tree') as TreeEl | null;
    if (tree) {
      return tree.editedContent;
    }
    return this.content;
  }

  render() {
    return html`
        <header>
            <select @change="${this.handleDropdownChange}" .value="${this.selectedOption}">
                <option value="tree">Tree View</option>
                <option value="text">Text View</option>
            </select>
            <section class="buttons-container">
                <section style="display: flex; flex-direction: row; align-items: center; gap: 13px;">
                    <button title="Copy" style="color: light-dark(#000, #e0e0e0);" @click="${this.handleCopyClick}"><wa-icon src="${IMG_DIR}/shoelace/copy.svg"></wa-icon></button>
                    <button title="Download" style="color: light-dark(#000, #e0e0e0);" @click="${this.handleDownloadClick}"><wa-icon src="${IMG_DIR}/shoelace/download.svg"></wa-icon></button>
                </section>
                <section style="display: flex; flex-direction: row; align-items: center; gap: 13px;">
                    <section>
                        <button title="Cancel" style="color: #ED0000" @click="${this.handleCancelClick}">
                            <wa-icon src="${IMG_DIR}/shoelace/x-lg.svg"></wa-icon>
                        </button>
                    </section>
                    <section>
                        <button title="Save" style="color: #007E0D" @click="${this.handleSaveClick}">
                            <wa-icon src="${IMG_DIR}/shoelace/floppy.svg"></wa-icon>
                        </button>
                    </section>
                </section>
            </section>
        </header>
        <main>
            ${this.selectedOption === 'tree'
              ? html`
                <keep-source-tree .content="${this.content}"></keep-source-tree>
                `
              : html`
                <section></section>
            `}
        </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-source': SourceContents;
  }
}
