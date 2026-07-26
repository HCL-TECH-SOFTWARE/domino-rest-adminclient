import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './keep-textform';
import './keep-button-yes';
import './keep-button-neutral';
import './keep-dialog-content';
import './keep-dialog-header';
import './keep-dialog-actions';
import '@awesome.me/webawesome/dist/components/details/details.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { IMG_DIR } from '../../config.dev';
import { KeepElement } from './keep-element';

type Rule = Record<string, any>;

/**
 * Editable list of formula rules with add/delete dialogs. Tag:
 * `keep-textform-array`. Each rule is edited via a nested keep-textform, and
 * changes are pushed up through the `setData` callback.
 */
@customElement('keep-textform-array')
export default class TextFormArray extends KeepElement {
  static styles = css`
    .container {
      padding: 10px;
      margin-bottom: 10px;
    }

    wa-details {
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
      border: 1px solid light-dark(#000, #e0e0e0);
      padding: 5px;
      border-radius: 5px;
      gap: 5px;
      color: light-dark(#000, #e0e0e0);

      &:hover {
          cursor: pointer;
      }

      &.add {
        &:hover {
          background-color: light-dark(#F0F0F0, #3a3a4a);
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

    wa-details {
      color: light-dark(inherit, #e0e0e0);
    }

    wa-details::part(base) {
      background: light-dark(#fff, #252535);
      color: light-dark(inherit, #e0e0e0);
      border-color: light-dark(#e0e0e0, #3a3a4a);
    }

    wa-details::part(header) {
      color: light-dark(inherit, #e0e0e0);
    }

    wa-details::part(content) {
      background: light-dark(#fff, #252535);
      color: light-dark(inherit, #e0e0e0);
    }

    h3 {
      font-weight: 400;
      color: light-dark(#000, #e0e0e0);
    }

    dialog {
        border: none;
        border-radius: 10px;
        padding: 0;
        background-color: light-dark(#fff, #252535);
        color: light-dark(#000, #e0e0e0);
    }

    dialog#add {
      min-width: 50vw;
      min-height: 30vh;
      overflow: auto;
    }

    header {
      display: flex;
      flex: 1;
    }
  `;

  @property({ type: Array }) data: Rule[] = [];
  @property({ type: String }) title = '';
  // Loose parameter type so consumer callbacks with a more specific row shape
  // (e.g. ScriptEditor's setValidationRules) remain assignable under
  // contravariant function-parameter checking.
  @property({ attribute: false }) setData: (data: any[]) => void = () => {};

  @state() private deleteRule = '';
  private index = 0;

  handleDataChanged(index: number, event: Event) {
    const newData = [...this.data];
    newData[index] = (event as CustomEvent).detail;
    this.data = newData;
    this.setData(newData);
  }

  handleDelete(e: Event) {
    const newData = this.data.filter((_, i) => i !== this.index);
    this.data = newData;
    this.setData(newData);
    const dialog = (e.target as HTMLElement)
      .closest('div')!
      .querySelector('dialog#delete') as HTMLDialogElement;
    dialog.close();
  }

  handleCancel(e: Event) {
    const dialog = (e.target as HTMLElement)
      .closest('div')!
      .querySelector('dialog#delete') as HTMLDialogElement;
    dialog.close();
  }

  handleClickDelete(e: Event, index: number) {
    this.deleteRule = this.data[index].message;
    this.index = index;
    const dialog = (e.target as HTMLElement)
      .closest('div')!
      .querySelector('dialog#delete') as HTMLDialogElement;
    dialog.showModal();
  }

  handleCancelAdd(e: Event) {
    const dialog = (e.target as HTMLElement)
      .closest('div')!
      .querySelector('dialog#add') as HTMLDialogElement;
    dialog.close();
  }

  handleClickAdd(e: Event) {
    const dialog = (e.target as HTMLElement)
      .closest('div')!
      .querySelector('dialog#add') as HTMLDialogElement;
    dialog.showModal();
  }

  handleAdd(e: Event) {
    const dialog = (e.target as HTMLElement)
      .closest('div')!
      .querySelector('dialog#add') as HTMLDialogElement;
    const form = (e.target as HTMLElement)
      .closest('dialog#add')!
      .querySelector('keep-textform') as HTMLElement & { data: Rule };
    this.data = [...this.data, form.data];
    this.setData(this.data);
    dialog.close();
  }

  handleCloseDialog(e: any) {
    this.handleCancelAdd(e.detail);
  }

  render() {
    return html`
      <div class="container">
        <section class="buttons-container top">
          <button class="add" @click=${this.handleClickAdd}>
              <wa-icon src="${IMG_DIR}/shoelace/plus-circle.svg" label="Add"></wa-icon>
              Add Rule
          </button>
        </section>
        ${this.data.map(
          (item, index) => html`
            <wa-details summary=${item[this.title] || `Item ${index + 1}`}>
              <keep-textform .data=${item} @data-changed=${(event: Event) => this.handleDataChanged(index, event)}></keep-textform>
              <section class="buttons-container">
                <button class="delete" @click=${(e: Event) => this.handleClickDelete(e, index)}>
                    <wa-icon src="${IMG_DIR}/shoelace/trash.svg" label="Delete"></wa-icon>
                    Delete Rule
                </button>
              </section>
            </wa-details>
          `,
        )}
        <dialog id="delete">
          <keep-dialog-header>
            <header>
              <h3>Delete Rule</h3>
            </header>
            <button class="close" @click=${this.handleCancel}>
              <wa-icon src="${IMG_DIR}/shoelace/x-lg.svg" label="Close"></wa-icon>
            </button>
          </keep-dialog-header>
          <keep-dialog-content>
            Are you sure you want to delete this validation rule: <strong>${this.deleteRule}</strong>?
          </keep-dialog-content>
          <keep-dialog-actions>
            <keep-button-yes text="Delete" @click=${this.handleDelete}></keep-button-yes>
            <keep-button-neutral text="Cancel" @click=${this.handleCancel}></keep-button-neutral>
          </keep-dialog-actions>
        </dialog>
        <dialog id="add">
          <keep-dialog-header>
            <header>
              <h3>Add Rule</h3>
            </header>
            <button class="close" @click=${this.handleCancelAdd}>
                <wa-icon src="${IMG_DIR}/shoelace/x-lg.svg" label="Close"></wa-icon>
            </button>
          </keep-dialog-header>
          <keep-dialog-content>
            <keep-textform .data=${{ formulaType: 'domino', formula: '', message: '' }}></keep-textform>
          </keep-dialog-content>
          <keep-dialog-actions>
            <keep-button-yes text="Add" @click=${this.handleAdd}></keep-button-yes>
            <keep-button-neutral text="Cancel" @click=${this.handleCancelAdd}></keep-button-neutral>
          </keep-dialog-actions>
        </dialog>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-textform-array': TextFormArray;
  }
}
