import { LitElement, html, css, render } from 'lit';

// Import Shoelace theme (light/dark)
import '@shoelace-style/shoelace/dist/themes/light.css';
// Import Shoelace components
import '@shoelace-style/shoelace/dist/components/tree/tree.js';
import '@shoelace-style/shoelace/dist/components/tree-item/tree-item.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
// Import setBasePath for Shoelace assets
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path';

class SourceTree extends LitElement {
  static properties = {
    content: { type: Object },
  };

  static styles = css`
    main {
      border: 1px solid #D2D2D2;
    }

    sl-tree {
      --sl-font-size-small: 12px;
      --sl-font-size-medium: 14px;
      --sl-font-size-large: 16px;
      padding: 0;
      margin: 0;
    }
    .custom-icons sl-tree-item::part(expand-button) {
      /* Disable the expand/collapse animation */
      rotate: none;
    }

    input.tree {
      background: transparent;
      border: none;
      border-radius: 1px;
    }
    input.dialog {
      border: 1px solid #B8B8B8;
      border-radius: 5px;
      padding: 5px 10px;
    }
    input:focus {
      border: 1px solid #B8B8B8;
    }

    section.dialog-input {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }
    section.dialog-p {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .key-value-container {
      position: relative;
    }
    .key-value-container .icon-button {
      position: absolute;
      top: -40%;
      right: -4%;
      display: none;
    }
    .key-value-container:hover .icon-button {
      display: block;
    }
    sl-dropdown {
      top: -40%;
      right: -4%;
    }

    .object-array-container {
      position: relative;
    }
    .object-array-container .icon-button {
      position: absolute;
      top: -40%;
      right: -30%;
      display: none;
    }
    .object-array-container:hover .icon-button {
      display: block;
    }

    dialog {
      padding: 10px;
      border-radius: 5px;
      border: 1px solid #D2D2D2;
      border: none;
      flex-direction: row;
      cursor: default;
    }

    .dialog-content {
      display: flex;
      flex-direction: row;
      gap: 10px;
    }
    .dialog-content.buttons {
      flex-direction: row-reverse;
      padding: 20px 0 10px 0;
    }

    sl-select {
      --sl-font-size-small: 12px;
      --sl-font-size-medium: 14px;
      --sl-font-size-large: 16px;
    }

    sl-option {
      --sl-font-size-small: 12px;
      --sl-font-size-medium: 14px;
      --sl-font-size-large: 16px;
    }

    button {
      background-color: #5E1EBE;
      color: white;
      border-radius: 3px;
      border: none;
      padding: 6px 16px;
      font-size: 16px;
    }
    button:hover {
      background-color: #4D1A9A;
      cursor: pointer;
    }
    button.cancel {
      background: none;
      color: black;
    }
  `;

  constructor() {
    super();
    setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.15.1/cdn/')
    this.content = {}
    this.editedContent = JSON.parse(JSON.stringify(this.content))
    this.currentInputValues = {}
  }

  updated(changedProperties) {
    if (changedProperties.has('content')) {
      this.editedContent = JSON.parse(JSON.stringify(this.content))
      this.requestUpdate()
    }
  }

  render() {
    const generateTreeItems = (obj, path = '') => {
      return Object.entries(obj).map(([key, value]) => {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
          return html`
            <sl-tree-item lazy @sl-lazy-load="${(e) => this.handleLazyLoad(e, value, fullPath, generateTreeItems)}">
              <section class="object-array-container">
                ${`${key} ${Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}` }`}
                <sl-dropdown>
                  <sl-icon-button class="icon-button" slot="trigger" src="/admin/img/shoelace/caret-down-square.svg" label="Context Menu"></sl-icon-button>
                  <sl-menu>
                    <sl-menu-item @click="${(e) => this.handleClickAdd(e, fullPath)}">
                      Add
                      <sl-icon slot="prefix" src="/admin/img/shoelace/plus-circle.svg"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item disabled>
                      Edit
                      <sl-icon slot="prefix" src="/admin/img/shoelace/pencil.svg"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item @click="${(e) => {this.handleClickDuplicate(e, fullPath, key, value)}}">
                      Duplicate
                      <sl-icon slot="prefix" src="/admin/img/shoelace/copy.svg"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item @click="${() => this.handleClickRemove(key, this.editedContent)}">
                      Remove
                      <sl-icon slot="prefix" src="/admin/img/shoelace/trash.svg"></sl-icon>
                    </sl-menu-item>
                    <!--
                    <sl-divider></sl-divider>
                    <sl-menu-item>
                      Insert Before
                      <sl-icon slot="prefix" name="arrow-up-circle"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item>
                      Insert After
                      <sl-icon slot="prefix" name="arrow-down-circle"></sl-icon>
                    </sl-menu-item>
                    -->
                  </sl-menu>
                </sl-dropdown>
              </section>
            </sl-tree-item>
          `;
        } else {
          return html`
            <sl-tree-item>
              <section class="key-value-container ${this.currentInputValues[fullPath] !== value ? 'modified' : ''}">
                <span>${key}:</span>
                <input
                  id="input-${fullPath}"
                  class="tree"
                  @input=${(e) => {
                    this.currentInputValues = {
                      ...this.currentInputValues,
                      [fullPath]: e.target.value
                    }
                    this.updateEditedContent(key, this.editedContent, e.target.value)
                  }}
                  value=${value}
                  @contextmenu="${this.handleRightClick}"
                >
                <sl-dropdown>
                  <sl-icon-button class="icon-button" slot="trigger" src="/admin/img/shoelace/caret-down-square.svg" label="Context Menu"></sl-icon-button>
                  <sl-menu>
                    <sl-menu-item @click="${(e) => this.handleClickAdd(e, fullPath)}">
                      Add
                      <sl-icon slot="prefix" src="/admin/img/shoelace/plus-circle.svg"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item @click="${(e) => {this.handleClickEdit(e, key, value, fullPath)}}">
                      Edit
                      <sl-icon slot="prefix" src="/admin/img/shoelace/pencil.svg"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item disabled>
                      Duplicate
                      <sl-icon slot="prefix" src="/admin/img/shoelace/copy.svg"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item @click="${() => this.handleClickRemove(key, this.editedContent)}">
                      Remove
                      <sl-icon slot="prefix" src="/admin/img/shoelace/trash.svg"></sl-icon>
                    </sl-menu-item>
                    <!--
                    <sl-divider></sl-divider>
                    <sl-menu-item>
                      Insert Before
                      <sl-icon slot="prefix" name="arrow-up-circle"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item>
                      Insert After
                      <sl-icon slot="prefix" name="arrow-down-circle"></sl-icon>
                    </sl-menu-item>
                    -->
                  </sl-menu>
                </sl-dropdown>
              </section>
              <dialog id="${key}">
                <section class="dialog-content">
                  <section class="dialog-input">
                    Key
                    <sl-input id="new-key"></sl-input>
                  </section>
                  <section class="dialog-p">
                    <p>:</p>
                  </section>
                  <section class="dialog-input">
                    Type
                    <sl-select hoist placement="bottom" value="String">
                      <sl-option value="String">String</sl-option>
                      <sl-option value="Boolean">Boolean</sl-option>
                      <sl-option value="Number">Number</sl-option>
                      <sl-option value="Array">Array</sl-option>
                      <sl-option value="Object">Object</sl-option>
                    </sl-select>
                  </section>
                  <section class="dialog-input">
                    Value
                    <sl-input id="new-value"></sl-input>
                  </section>
                </section>
                <section class="dialog-content buttons">
                  <button id="dialog-insert" style="display:none;" @click="${(e) => this.handleClickInsert(e, fullPath)}">Insert</button>
                  <button id="dialog-edit" style="display:none;" @click="${(e) => this.handleClickDialogEdit(e, key, fullPath)}">Edit</button>
                  <button class="cancel" @click="${this.handleClickCancel}">Cancel</button>
                </section>
              </dialog>
            </sl-tree-item>
          `;
        }
      });
    };

    return html`
      <main>
        <sl-tree class="custom-icons">
          <sl-icon src="/admin/img/shoelace/plus-square.svg" slot="expand-icon"></sl-icon>
          <sl-icon src="/admin/img/shoelace/dash-square.svg" slot="collapse-icon"></sl-icon>
          ${generateTreeItems(this.editedContent)}
        </sl-tree>
      </main>
    `;
  }

  handleClickAdd(e) {
    const dialog = e.target.closest('sl-tree-item').querySelector('dialog')
    const insertButton = dialog.querySelector('#dialog-insert')
    const editButton = dialog.querySelector('#dialog-edit')
    insertButton.setAttribute('style', 'display:block')
    editButton.setAttribute('style', 'display:none')
    if (dialog) {
      dialog.showModal();
    }
  }

  handleClickEdit(e, key, value, fullPath) {
    const dialog = e.target.closest('sl-tree-item').querySelector('dialog')
    const insertButton = dialog.querySelector('#dialog-insert')
    const editButton = dialog.querySelector('#dialog-edit')
    insertButton.setAttribute('style', 'display:none')
    editButton.setAttribute('style', 'display:block')
    if (dialog) {
      dialog.querySelector('#new-key').value = key
      dialog.querySelector('#new-value').value = value
      dialog.showModal();
    } else {
      console.error('Dialog element not found');
    }
  }

  handleClickRemove(key, parentObj)  {
    this.removeItem(key, parentObj)
    this.editedContent = parentObj

    this.requestUpdate()
  }

  removeItem(key, parentObj) {
    if (parentObj.hasOwnProperty(key)) {
      delete parentObj[key]
    } else {
      for (let prop in parentObj) {
        if (typeof parentObj[prop] === 'object' && parentObj[prop] !== null) {
          this.removeItem(key, parentObj[prop])
        }
      }
    }
    this.editedContent = parentObj
  
  }

  handleClickDuplicate(e, fullPath, key, value) {
    const paths = fullPath.split('.')
    let obj = this.editedContent
    const newKey = `${key}_copy`

    if (paths.length === 1) {
      obj[newKey] = value
    } else {
      for (let i = 0; i < paths.length - 1; i++) {
        if (i === paths.length - 2) {
          // If we're at the last key in the path, add the new key-value pair
          obj[paths[i]][newKey] = value
        } else {
          // Otherwise, move to the next level of the object
          obj = obj[paths[i]]
        }
      }
    }

    this.requestUpdate()
  }

  handleRightClick(e) {
    e.preventDefault(); // Prevent the default context menu from showing up
    const dropdown = e.target.closest('sl-tree-item').querySelector('sl-dropdown');
    if (dropdown) {
      dropdown.open = true
    }
  }

  handleClickCancel(e) {
    e.target.closest('sl-tree-item').querySelector('#new-key').value = ''
    e.target.closest('sl-tree-item').querySelector('#new-value').value = ''
    e.target.closest('sl-tree-item').querySelector('dialog').close()
  }

  insertItem(e, fullPath) {
    const paths = fullPath.split('.')
    const newKey = e.target.closest('sl-tree-item').querySelector('#new-key').value
    const newValue = e.target.closest('sl-tree-item').querySelector('#new-value').value
    let obj = this.editedContent
    
    if (paths.length === 1) {
      obj[newKey] = newValue
      e.target.closest('sl-tree-item').querySelector('dialog').close()
    } else {
      for (let i = 0; i < paths.length - 1; i++) {
        if (i === paths.length - 2) {
          // If we're at the last key in the path, add the new key-value pair
          obj[paths[i]][newKey] = newValue
          e.target.closest('sl-tree-item').querySelector('dialog').close()
        } else {
          // Otherwise, move to the next level of the object
          obj = obj[paths[i]]
        }
      }
    }
  }

  handleClickInsert(e, fullPath, edit = false) {
    const newKey = e.target.closest('sl-tree-item').querySelector('#new-key').value

    this.insertItem(e, fullPath)

    if (edit) {
      this.removeItem(newKey, this.editedContent)
    }
  
    // Trigger a re-render
    this.requestUpdate()
  }

  handleClickDialogEdit(e, key, fullPath) {
    const newKey = e.target.closest('sl-tree-item').querySelector('#new-key').value

    this.insertItem(e, fullPath)
    if (newKey !== key)  {
      this.removeItem(key, this.editedContent)
    }
  
    // Trigger a re-render
    this.requestUpdate()
  }

  updateEditedContent(key, parentObj, newValue) {
    if (parentObj.hasOwnProperty(key)) {
      parentObj[key] = newValue;
    } else {
      for (let prop in parentObj) {
        if (typeof parentObj[prop] === 'object' && parentObj[prop] !== null) {
          this.updateEditedContent(key, parentObj[prop], newValue);
        }
      }
    }
    this.editedContent = parentObj
  }

  handleLazyLoad(e, value, fullPath, generate) {
    const treeItem = e.target.closest('sl-tree-item[lazy]')
    
    // Prevent re-rendering the same tree item
    if (treeItem.hasAttribute('data-processed')) return

    // Generate the tree items for the object
    const section = document.createElement('sl-tree-item')
    const child = generate(value, fullPath)
    const container = document.createElement('section')
    render(child, container)
    section.appendChild(container)
    treeItem.append(section)
    treeItem.lazy = false

    treeItem.setAttribute('data-processed', 'true')
  }
  
}

customElements.define('lit-source-tree', SourceTree)

export default SourceTree