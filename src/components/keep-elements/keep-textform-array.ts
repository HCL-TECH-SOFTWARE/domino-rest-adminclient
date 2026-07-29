/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import './keep-textform';
import './keep-button';
import './keep-dialog-content';
import './keep-dialog-header';
import './keep-dialog-actions';
import '@awesome.me/webawesome/dist/components/details/details.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { FA_LIBRARY } from '../../services/icon-library';
import { KeepElement } from './keep-element';
import { modalBackdropStyles } from './modal-backdrop';

type Rule = Record<string, any>;

/**
 * Editable list of formula rules with add/delete dialogs. Tag:
 * `keep-textform-array`. Each rule is edited via a nested keep-textform, and
 * changes are pushed up through the `setData` callback.
 */
@customElement('keep-textform-array')
export default class TextFormArray extends KeepElement {
  static styles = [
    modalBackdropStyles,
    css`
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
      border: 1px solid var(--wa-color-text-normal);
      padding: 5px;
      border-radius: var(--wa-border-radius-m);
      gap: 5px;
      color: var(--wa-color-text-normal);

      &:hover {
          cursor: pointer;
      }

      &.add {
        &:hover {
          background-color: var(--wa-color-surface-border);
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
      color: var(--wa-color-text-normal);
    }

    wa-details::part(base) {
      background: var(--wa-color-surface-raised);
      color: var(--wa-color-text-normal);
      border-color: var(--wa-color-surface-border);
    }

    wa-details::part(header) {
      color: var(--wa-color-text-normal);
    }

    wa-details::part(content) {
      background: var(--wa-color-surface-raised);
      color: var(--wa-color-text-normal);
    }

    h3 {
      font-weight: 400;
      color: var(--wa-color-text-normal);
    }

    dialog {
        border: none;
        border-radius: var(--wa-border-radius-l);
        padding: 0;
        background-color: var(--wa-color-surface-raised);
        color: var(--wa-color-text-normal);
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
  `,
  ];

  @property({ type: Array }) accessor data: Rule[] = [];
  @property({ type: String }) accessor title = '';
  // Loose parameter type so consumer callbacks with a more specific row shape
  // (e.g. ScriptEditor's setValidationRules) remain assignable under
  // contravariant function-parameter checking.
  @property({ attribute: false }) accessor setData: (data: any[]) => void = () => {};

  @state() private accessor deleteRule = '';
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
              <wa-icon library="${FA_LIBRARY}" name="circle-plus" label="Add"></wa-icon>
              Add Rule
          </button>
        </section>
        ${this.data.map(
          (item, index) => html`
            <wa-details summary=${item[this.title] || `Item ${index + 1}`}>
              <keep-textform .data=${item} @data-changed=${(event: Event) => this.handleDataChanged(index, event)}></keep-textform>
              <section class="buttons-container">
                <button class="delete" @click=${(e: Event) => this.handleClickDelete(e, index)}>
                    <wa-icon library="${FA_LIBRARY}" name="trash" label="Delete"></wa-icon>
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
              <wa-icon library="${FA_LIBRARY}" name="xmark" label="Close"></wa-icon>
            </button>
          </keep-dialog-header>
          <keep-dialog-content>
            Are you sure you want to delete this validation rule: <strong>${this.deleteRule}</strong>?
          </keep-dialog-content>
          <keep-dialog-actions>
            <keep-button @click=${this.handleDelete}>Delete</keep-button>
            <keep-button variant="neutral" appearance="outlined" @click=${this.handleCancel}>Cancel</keep-button>
          </keep-dialog-actions>
        </dialog>
        <dialog id="add">
          <keep-dialog-header>
            <header>
              <h3>Add Rule</h3>
            </header>
            <button class="close" @click=${this.handleCancelAdd}>
                <wa-icon library="${FA_LIBRARY}" name="xmark" label="Close"></wa-icon>
            </button>
          </keep-dialog-header>
          <keep-dialog-content>
            <keep-textform .data=${{ formulaType: 'domino', formula: '', message: '' }}></keep-textform>
          </keep-dialog-content>
          <keep-dialog-actions>
            <keep-button @click=${this.handleAdd}>Add</keep-button>
            <keep-button variant="neutral" appearance="outlined" @click=${this.handleCancelAdd}>Cancel</keep-button>
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
