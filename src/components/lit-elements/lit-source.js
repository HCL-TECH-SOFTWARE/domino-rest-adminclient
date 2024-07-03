import { LitElement, html, css } from 'lit';

// Import Shoelace theme (light/dark)
import '@shoelace-style/shoelace/dist/themes/light.css';
// Import Shoelace components
import '@shoelace-style/shoelace/dist/components/tree/tree.js';
import '@shoelace-style/shoelace/dist/components/tree-item/tree-item.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/components/menu-label/menu-label.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
// Import setBasePath for Shoelace assets
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path';

function removeEmpty(obj) {
  Object.keys(obj).forEach(key => {
    if (obj[key] && typeof obj[key] === 'object') {
      removeEmpty(obj[key]);
      if ((Object.keys(obj[key]).length === 0 && obj[key].constructor === Object) || (Array.isArray(obj[key]) && obj[key].length === 0)) {
        delete obj[key];
      }
    } else if (obj[key] == null) {
      delete obj[key];
    }
  });
  return obj;
}

function getValueAtPath(obj, path) {
  const keys = path.split('.'); // Assuming dot notation for path
  let current = obj;
  for (const key of keys) {
    if (current[key] === undefined) return undefined; // Path does not exist
    current = current[key];
  }
  return current; // Return the value at the path
}

class SourceTree extends LitElement {
  static properties = {
    content: { type: Object },
  };

  static styles = css`
    sl-tree {
      --sl-font-size-small: 12px;
      --sl-font-size-medium: 14px;
      --sl-font-size-large: 16px;
      padding: 0;
      margin: 0;
    }
    
    sl-tree-item.modified {
      background-color: #FFDEEA;
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
    section.modified {
      background-color: #FFDEEA;
    }

    .key-value-container {
      position: relative;
      width: 100%;
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

    p.tip {
      font-size: 12px;
      padding: 10px;
      background-color: #FAF9FF;
      color: #454545;
    }
    p.tip:hover {
      cursor: default;
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
        const fullPath = path ? `${path}.${key}` : key
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(obj)) {
            console.log(obj)
          }
          return html`
            <sl-tree-item>
              ${generateTreeItems(value, fullPath)}
              <section class="object-array-container">
                ${`${key} ${Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}` }`}
                <sl-dropdown>
                  <sl-icon-button class="icon-button" slot="trigger" name="caret-down-square" label="Context Menu"></sl-icon-button>
                  <sl-menu>
                    <sl-menu-item @click="${(e) => this.handleClickAdd(e, fullPath)}">
                      Add
                      <sl-icon slot="prefix" name="plus-circle"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item disabled>
                      Edit
                      <sl-icon slot="prefix" name="pencil"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item @click="${(e) => {this.handleClickDuplicate(e, fullPath, key, value)}}">
                      Duplicate
                      <sl-icon slot="prefix" name="copy"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item @click="${() => this.handleClickRemove(key, this.editedContent)}">
                      Remove
                      <sl-icon slot="prefix" name="trash"></sl-icon>
                    </sl-menu-item>
                    <sl-divider></sl-divider>
                    <sl-menu-item>
                      Insert Before
                      <sl-icon slot="prefix" name="arrow-up-circle"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item>
                      Insert After
                      <sl-icon slot="prefix" name="arrow-down-circle"></sl-icon>
                    </sl-menu-item>
                  </sl-menu>
                </sl-dropdown>
              </section>
            </sl-tree-item>
          `;
        } else {
          const modified = getValueAtPath(this.content, fullPath) !== value
          return html`
            <sl-tree-item class="${modified ? 'modified' : ''}">
              <section id="key-value-container" class="key-value-container ${modified ? 'modified' : ''}">
                <span>${key}:</span>
                <input
                  id="input-${fullPath}"
                  class="tree"
                  @input=${(e) => {
                    this.currentInputValues = {
                      ...this.currentInputValues,
                      [fullPath]: e.target.value
                    }
                    this.updateEditedContent(e, key, this.editedContent, e.target.value, fullPath)
                  }}
                  value=${value}
                  @contextmenu="${this.handleRightClick}"
                >
                <sl-dropdown>
                  <sl-icon-button class="icon-button" slot="trigger" name="caret-down-square" label="Context Menu"></sl-icon-button>
                  <sl-menu>
                    <sl-menu-item @click="${(e) => this.handleClickAdd(e, fullPath)}">
                      Add
                      <sl-icon slot="prefix" name="plus-circle"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item @click="${(e) => {this.handleClickEdit(e, key, value, fullPath)}}">
                      Edit
                      <sl-icon slot="prefix" name="pencil"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item disabled>
                      Duplicate
                      <sl-icon slot="prefix" name="copy"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item @click="${() => this.handleClickRemove(key, this.editedContent)}">
                      Remove
                      <sl-icon slot="prefix" name="trash"></sl-icon>
                    </sl-menu-item>
                    <sl-divider></sl-divider>
                    <sl-menu-item disabled="${Array.isArray(obj) ? 'false' : 'true'}">
                      Insert Before
                      <sl-icon slot="prefix" name="arrow-up-circle"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item disabled="${Array.isArray(obj) ? 'false' : 'true'}">
                      Insert After
                      <sl-icon slot="prefix" name="arrow-down-circle"></sl-icon>
                    </sl-menu-item>
                    <p class="tip">
                      <sl-icon name="question-circle"></sl-icon>
                      Tip: You can open this context menu via right-click
                    </p>
                  </sl-menu>
                </sl-dropdown>
              </section>
            </sl-tree-item>
          `;
        }
      });
    };

    return html`
      <div id="main">
        <sl-tree>
            ${generateTreeItems(this.editedContent)}
        </sl-tree>
        <dialog>
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
            <button id="dialog-insert" style="display:none;" @click="${this.handleClickInsert}">Insert</button>
            <button id="dialog-edit" style="display:none;" @click="${this.handleClickDialogEdit}">Edit</button>
            <button class="cancel" @click="${this.handleClickCancel}">Cancel</button>
          </section>
        </dialog>
      </div>
    `;
  }

  handleClickAdd(e, fullPath) {
    const dialog = e.target.closest('div#main').querySelector(`dialog`)
    const insertButton = dialog.querySelector('#dialog-insert')
    dialog.setAttribute('data-fullpath', fullPath)
    const editButton = dialog.querySelector('#dialog-edit')
    insertButton.setAttribute('style', 'display:block')
    editButton.setAttribute('style', 'display:none')
    if (dialog) {
      dialog.showModal();
    }
  }

  handleClickEdit(e, key, value, fullPath) {
    const dialog = e.target.closest('div#main').querySelector(`dialog`)
    const insertButton = dialog.querySelector('#dialog-insert')
    const editButton = dialog.querySelector('#dialog-edit')
    dialog.setAttribute('data-fullpath', fullPath)
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

  handleClickInsertBeforeAfter(e, fullPath) {
    const dialog = e.target.closest('div#main').querySelector(`dialog`)
    const insertButton = dialog.querySelector('#dialog-insert')
    dialog.setAttribute('data-fullpath', fullPath)
    const editButton = dialog.querySelector('#dialog-edit')
    insertButton.setAttribute('style', 'display:block')
    editButton.setAttribute('style', 'display:none')
    if (dialog) {
      dialog.showModal();
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
    e.target.closest('div#main').querySelector('#new-key').value = ''
    e.target.closest('div#main').querySelector('#new-value').value = ''
    e.target.closest('div#main').querySelector('dialog').close()
  }

  insertItem(e, fullPath) {
    const paths = fullPath.split('.')
    const newKey = e.target.closest('div#main').querySelector('#new-key').value
    let newValue = e.target.closest('div#main').querySelector('#new-value').value
    let obj = this.editedContent

    const type = e.target.closest('div#main').querySelector('sl-option[aria-selected="true"]').value
    switch (type) {
      case 'Object':
        newValue = JSON.parse(newValue)
        break
      case 'Array':
        newValue = newValue.split(",")
        break
      default:
        break
    }
    
    if (paths.length === 1) {
      obj[newKey] = newValue
      e.target.closest('div#main').querySelector('dialog').close()
    } else {
      for (let i = 0; i < paths.length - 1; i++) {
        if (i === paths.length - 2) {
          // If we're at the last key in the path, add the new key-value pair
          obj[paths[i]][newKey] = newValue
          e.target.closest('div#main').querySelector('dialog').close()
        } else {
          // Otherwise, move to the next level of the object
          obj = obj[paths[i]]
        }
      }
    }

    e.target.closest('div#main').querySelector('#new-key').value = ''
    e.target.closest('div#main').querySelector('#new-value').value = ''
  }

  handleClickInsert(e, edit = false) {
    const newKey = e.target.closest('div#main').querySelector('#new-key').value
    const fullPath = e.target.closest('div#main').querySelector('dialog').getAttribute('data-fullpath')

    this.insertItem(e, fullPath)

    if (edit) {
      this.removeItem(newKey, this.editedContent)
    }
  
    // Trigger a re-render
    this.requestUpdate()
  }

  handleClickDialogEdit(e, key) {
    const newKey = e.target.closest('div#main').querySelector('#new-key').value
    const fullPath = e.target.closest('div#main').querySelector('dialog').getAttribute('data-fullpath')

    this.insertItem(e, fullPath)
    if (newKey !== key)  {
      this.removeItem(key, this.editedContent)
    }
  
    // Trigger a re-render
    this.requestUpdate()
  }

  updateEditedContent(e, key, parentObj, newValue, fullPath) {
    if (parentObj.hasOwnProperty(key)) {
      parentObj[key] = newValue;
      const section = e.target.closest('sl-tree-item').querySelector('section#key-value-container')
      const treeItem = e.target.closest('sl-tree-item')
      if (getValueAtPath(this.editedContent, fullPath) === getValueAtPath(this.content, fullPath)) {
        // treeItem.classList.remove('modified')
        section.classList.remove('modified')
      } else {
        // treeItem.classList.add('modified')
        section.classList.add('modified')
      }
    } else {
      for (let prop in parentObj) {
        if (typeof parentObj[prop] === 'object' && parentObj[prop] !== null) {
          this.updateEditedContent(key, parentObj[prop], newValue, fullPath);
        }
      }
    }
    this.editedContent = parentObj
  }
  
}

customElements.define('lit-source', SourceTree)

export default SourceTree