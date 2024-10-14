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
import { IMG_DIR } from '../../config.dev';

function parseStringToArray(input) {
  // Ensure the input is encased in []
  if (!input.startsWith('[') || !input.endsWith(']')) {
    throw new Error('Input must be encased in []');
  }

  // Remove the enclosing []
  input = input.slice(1, -1).trim();

  const result = [];
  let currentItem = '';
  let inString = false;
  let inObject = false;
  let inArray = false;
  let stack = [];

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '"' && input[i - 1] !== '\\') {
      inString = !inString;
    }

    if (!inString) {
      if (char === '{') {
        inObject = true;
        stack.push(char);
      } else if (char === '}') {
        stack.pop();
        if (stack.length === 0) {
          inObject = false;
        }
      } else if (char === '[') {
        inArray = true;
        stack.push(char);
      } else if (char === ']') {
        stack.pop();
        if (stack.length === 0) {
          inArray = false;
        }
      } else if (char === ',' && stack.length === 0) {
        result.push(parseItem(currentItem.trim()));
        currentItem = '';
        continue;
      }
    }

    currentItem += char;
  }

  if (currentItem.trim()) {
    result.push(parseItem(currentItem.trim()));
  }

  return result;
}

function parseItem(item) {
  // Check for object values (using JSON.parse)
  if (item.startsWith('{') && item.endsWith('}')) {
    try {
      return JSON.parse(item);
    } catch (e) {
      console.error('Invalid JSON object:', item);
      throw new Error('Invalid JSON object');
    }
  }

  // Check for boolean values
  if (item.toLowerCase() === 'true') return true;
  if (item.toLowerCase() === 'false') return false;

  // Check for number values
  if (!isNaN(item) && item !== '') return Number(item);

  // Check for array values (recursively parse)
  if (item.startsWith('[') && item.endsWith(']')) {
    return parseStringToArray(item);
  }

  // Default to string
  return item;
}

function getLabelName(arrayName, key) {
  switch (arrayName) {
    case 'forms':
      return 'formName'
    case 'views':
    case 'agents':
    case 'fields':
    case 'readAccessFields':
    case 'writeAccessFields':
    case 'columns':
      return 'name'
    case 'formModes':
      return 'modeName'
    case 'itemFlags':
    case 'alias':
      return '0'
    default:
      return key
  }
}
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
    .dialog-error {
      color: red;
      font-size: 12px;
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

    /* user invalid styles */
    .input-validation-pattern sl-input[data-user-invalid]::part(base) {
      border-color: var(--sl-color-danger-600);
    }

    .input-validation-pattern [data-user-invalid]::part(form-control-label),
    .input-validation-pattern [data-user-invalid]::part(form-control-help-text) {
      color: var(--sl-color-danger-700);
    }

    .input-validation-pattern sl-input:focus-within[data-user-invalid]::part(base) {
      border-color: var(--sl-color-danger-600);
      box-shadow: 0 0 0 var(--sl-focus-ring-width) var(--sl-color-danger-300);
    }

    /* User valid styles */
    .input-validation-pattern sl-input[data-user-valid]::part(base) {
      border-color: var(--sl-color-success-600);
    }

    .input-validation-pattern [data-user-valid]::part(form-control-label),
    .input-validation-pattern [data-user-valid]::part(form-control-help-text) {
      color: var(--sl-color-success-700);
    }

    .input-validation-pattern sl-input:focus-within[data-user-valid]::part(base) {
      border-color: var(--sl-color-success-600);
      box-shadow: 0 0 0 var(--sl-focus-ring-width) var(--sl-color-success-300);
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

  updatePattern(event) {
    const selectElement = event.target;
    const selectedType = selectElement.value;
    const inputElement = event.target.closest('sl-tree-item').querySelector('#new-value');

    const patterns = {
      String: '.*',
      Boolean: '^(true|True|false|False)$',
      Number: '^-?\\d+$',
      Array: '^\\[.*\\]$',
      Object: '^\\{.*\\}$'
    }
    if (inputElement) {
      inputElement.pattern = patterns[selectedType] || '.*';
    }
  }

  render() {
    const generateTreeItems = (obj, path = '') => {
      return Object.entries(obj).map(([key, value]) => {
        const fullPath = path ? `${path}.${key}` : key
        const isObjectOrArray = typeof value === 'object' && value !== null;
        const isModified = this.currentInputValues[fullPath] !== value;

        return html`
          <sl-tree-item class="custom-icons" ?lazy=${isObjectOrArray} @sl-lazy-load="${isObjectOrArray ? (e) => this.handleLazyLoad(e, value, fullPath, generateTreeItems) : null}">
            <sl-icon src="${IMG_DIR}/shoelace/plus-square.svg" slot="expand-icon"></sl-icon>
            <sl-icon src="${IMG_DIR}/shoelace/dash-square.svg" slot="collapse-icon"></sl-icon>
            <section class="${isObjectOrArray ? 'object-array-container' : `key-value-container ${isModified ? 'modified' : ''}`}">
              ${isObjectOrArray ? html`
                ${`${key} ${Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}`}`}
              ` : html`
                <span>${key}:</span>
                <input
                  id="input-${fullPath}"
                  data-id="input-${fullPath}"
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
              `}
              <sl-dropdown>
                <sl-icon-button class="icon-button" slot="trigger" src="${IMG_DIR}/shoelace/caret-down-square.svg" label="Context Menu"></sl-icon-button>
                <sl-menu>
                  <sl-menu-item @click="${(e) => this.handleClickAdd(e, fullPath)}">
                    Add
                    <sl-icon slot="prefix" src="${IMG_DIR}/shoelace/plus-circle.svg"></sl-icon>
                  </sl-menu-item>
                  <sl-menu-item ?disabled=${isObjectOrArray}>
                    Edit
                    <sl-icon slot="prefix" src="${IMG_DIR}/shoelace/pencil.svg"></sl-icon>
                  </sl-menu-item>
                  <sl-menu-item ?disabled=${!isObjectOrArray} @click="${isObjectOrArray ? (e) => {this.handleClickDuplicate(e, fullPath, key, value)} : null}">
                    Duplicate
                    <sl-icon slot="prefix" src="${IMG_DIR}/shoelace/copy.svg"></sl-icon>
                  </sl-menu-item>
                  <sl-menu-item @click="${() => this.handleClickRemove(key, this.editedContent)}">
                    Remove
                    <sl-icon slot="prefix" src="${IMG_DIR}/shoelace/trash.svg"></sl-icon>
                  </sl-menu-item>
                </sl-menu>
              </sl-dropdown>
            </section>
            <dialog id="${fullPath}">
              <form class="input-validation-pattern">
                <section class="dialog-content">
                  <section class="dialog-input">
                    <sl-input label="Key" required id="new-key" @sl-invalid="${this.handleInvalid}"></sl-input>
                    <div id="key-error" class="dialog-error" aria-live="polite" hidden></div>
                  </section>
                  <section class="dialog-p">
                    <p>:</p>
                  </section>
                  <section class="dialog-input">
                    <sl-select label="Type" hoist id="new-type" placement="bottom" value="String" @sl-change="${this.updatePattern}">
                      <sl-option value="String">String</sl-option>
                      <sl-option value="Boolean">Boolean</sl-option>
                      <sl-option value="Number">Number</sl-option>
                      <sl-option value="Array">Array</sl-option>
                      <sl-option value="Object">Object</sl-option>
                    </sl-select>
                  </section>
                  <section class="dialog-input">
                    <sl-input label="Value" required id="new-value" pattern=".*" @sl-invalid="${this.handleInvalid}"></sl-input>
                    <div id="value-error" class="dialog-error" aria-live="polite" hidden></div>
                  </section>
                </section>
                <section class="dialog-content buttons">
                  <button id="dialog-insert" style="display:none;" @click="${(e) => this.handleInsertButtonClick(e, fullPath)}">Insert</button>
                  <button id="dialog-edit" style="display:none;" @click="${(e) => this.handleClickDialogEdit(e, key, fullPath)}">Edit</button>
                  <button class="cancel" @click="${this.handleClickCancel}">Cancel</button>
                </section>
              </form>
            </dialog>
          </sl-tree-item>
        `;
      })
    }

    return html`
      <main>
        <sl-tree class="custom-icons">
          <sl-icon src="${IMG_DIR}/shoelace/plus-square.svg" slot="expand-icon"></sl-icon>
          <sl-icon src="${IMG_DIR}/shoelace/dash-square.svg" slot="collapse-icon"></sl-icon>
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
    let newValue = e.target.closest('sl-tree-item').querySelector('#new-value').value
    const newType = e.target.closest('sl-tree-item').querySelector('#new-type').value
    let obj = this.editedContent

    if (newType === 'Boolean') {
      if (newValue === 'true' || newValue === 'True') {
        newValue = true
      } else if (newValue === 'false' || newValue === 'False') {
        newValue = false
      }
    } else if (newType === 'Number') {
      newValue = Number(newValue)
    } else if (newType === 'Array') {
      newValue = parseStringToArray(newValue)
    } else if (newType === 'Object') {
      newValue = JSON.parse(newValue)
    }
    
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
    e.preventDefault()
    const newKey = e.target.closest('sl-tree-item').querySelector('#new-key').value

    this.insertItem(e, fullPath)

    if (edit) {
      this.removeItem(newKey, this.editedContent)
    }
  
    // Trigger a re-render
    this.requestUpdate()
  }

  handleInvalid(e) {
    // Suppress the browser's constraint validation message
    e.preventDefault();

    const errorMessage = {
      String: 'string',
      Boolean: 'true | false',
      Number: '12345',
      Array: '[1, 2, 3, "one", "two", "three", { "key": "value" }]',
      Object: '{ "key": "value" }'
    }

    if (e.target.id === 'new-key') {
      const keyError = e.target.closest('sl-tree-item').querySelector('#key-error');
      keyError.textContent = `Error: This input field is required.`;
      keyError.hidden = false;
      return
    } else if (e.target.id === 'new-value') {
      const typeInputElement = e.target.closest('sl-tree-item').querySelector('#new-type')
      const valueInputElement = e.target.closest('sl-tree-item').querySelector('#new-value')
      const valueError = e.target.closest('sl-tree-item').querySelector('#value-error');
      if (valueInputElement.validity.patternMismatch) {
        valueError.textContent = `Error: Make sure to follow the appropriate format - ${errorMessage[typeInputElement.value]}`;
        valueError.hidden = false;
      } else {
        valueError.textContent = `Error: This input field is required.`;
        valueError.hidden = false;
      }
    }

    e.target.focus();
  }

  async handleInsertButtonClick(e, fullPath) {
    // Hide the error messages
    const keyError = e.target.closest('sl-tree-item').querySelector('#key-error')
    const valueError = e.target.closest('sl-tree-item').querySelector('#value-error')
    keyError.hidden = true
    valueError.hidden = true
    
    const form = e.target.closest('sl-tree-item').querySelector('.input-validation-pattern');
    
    // Wait for controls to be defined before attaching form listeners
    await Promise.all([
      customElements.whenDefined('sl-button'),
      customElements.whenDefined('sl-input')
    ]);

    if (form.checkValidity()) {
      // Insert the new key-value pair
      this.handleClickInsert(e, fullPath);
    }
  }

  handleClickDialogEdit(e, key, fullPath) {
    const treeItem = e.target.closest('sl-tree-item')
    const newKey = treeItem.querySelector('#new-key').value
    const section = treeItem.querySelector('section.key-value-container')
    const inputField = section.querySelector(`input`)
    let newValue = e.target.closest('sl-tree-item').querySelector('#new-value').value
    const dialog = treeItem.querySelector(`dialog`)
    if (dialog.id === fullPath)  {
      newValue = dialog.querySelector('#new-value').value
    }
    inputField.value = newValue

    this.insertItem(e, fullPath)
    if (newKey !== key)  {
      this.removeItem(key, this.editedContent)
    }
  
    // Trigger a re-render
    this.requestUpdate()
  }

  updateEditedContent(e, key, parentObj, newValue, fullPath) {
    const paths = fullPath.split('.')
    if (paths.length === 1) {
      parentObj[key] = newValue
    } else {
      for (let i = 0; i < paths.length - 1; i++) {
        if (i === paths.length - 2) {
          // If we're at the last key in the path, add the new key-value pair
          parentObj[paths[i]][key] = newValue
        } else {
          // Otherwise, move to the next level of the object
          parentObj = parentObj[paths[i]]
        }
      }
    }
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