/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, render, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';

// Import Shoelace components
import '@awesome.me/webawesome/dist/components/tree/tree.js';
import '@awesome.me/webawesome/dist/components/tree-item/tree-item.js';
import '@awesome.me/webawesome/dist/components/dialog/dialog.js';
import '@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/divider/divider.js';
import '@awesome.me/webawesome/dist/components/dropdown/dropdown.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/select/select.js';
import '@awesome.me/webawesome/dist/components/option/option.js';
import '@awesome.me/webawesome/dist/components/input/input.js';
import { FA_LIBRARY } from '../../services/icon-library';
import { getLogger } from '../../services/log-service';

const log = getLogger('components/keep-source');
import { KeepElement } from './keep-element';

/** WebAwesome custom elements are not typed as native inputs — narrow only the
 *  members the code actually touches (matches reports/02 §6.3 guidance). */
type WithValue = HTMLElement & { value: string };
type WithValidatedValue = HTMLElement & { value: string; pattern: string; validity: ValidityState };
type WithOpen = HTMLElement & { open: boolean };
type WithLazy = HTMLElement & { lazy: boolean };

type JsonRecord = Record<string, any>;

function parseStringToArray(input: string): any[] {
  // Ensure the input is encased in []
  if (!input.startsWith('[') || !input.endsWith(']')) {
    throw new Error('Input must be encased in []');
  }

  // Remove the enclosing []
  input = input.slice(1, -1).trim();

  const result: any[] = [];
  let currentItem = '';
  let inString = false;
  let stack: string[] = [];

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char === '"' && input[i - 1] !== '\\') {
      inString = !inString;
    }

    if (!inString) {
      if (char === '{') {
        stack.push(char);
      } else if (char === '}') {
        stack.pop();
      } else if (char === '[') {
        stack.push(char);
      } else if (char === ']') {
        stack.pop();
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

function parseItem(item: string): any {
  // Check for object values (using JSON.parse)
  if (item.startsWith('{') && item.endsWith('}')) {
    try {
      return JSON.parse(item);
    } catch {
      log.error('Invalid JSON object', { item });
      throw new Error('Invalid JSON object');
    }
  }

  // Check for boolean values
  if (item.toLowerCase() === 'true') return true;
  if (item.toLowerCase() === 'false') return false;

  // Check for number values
  if (!isNaN(item as any) && item !== '') return Number(item);

  // Check for array values (recursively parse)
  if (item.startsWith('[') && item.endsWith(']')) {
    return parseStringToArray(item);
  }

  // Default to string
  return item;
}

function getLabelName(arrayName: string, key: string): string {
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
@customElement('keep-source-tree')
export default class SourceTree extends KeepElement {
  @property({ type: Object }) content: JsonRecord = {};

  /** Working copy of `content`; read externally by `keep-source-header`. Plain
   *  (non-reactive) field: reassignments drive renders via explicit
   *  `requestUpdate()` calls, exactly as in the original. */
  editedContent: JsonRecord = {};

  /** Tracks in-flight leaf input values. Plain (non-reactive) field — updating
   *  it must NOT itself trigger a render (matches the original). */
  currentInputValues: JsonRecord = {};

  /* The `.input-validation-pattern` rules below use `:state(user-invalid)` /
     `:state(user-valid)`, not the Shoelace-era `data-user-*` attributes WebAwesome 3.x
     never sets — see the note in keep-input-text.ts, including why it is out here (#742). */
  static styles = css`
    :host {
      color-scheme: inherit;
      color: var(--wa-color-text-normal);
    }

    main {
      border: 1px solid var(--wa-color-surface-border);
      background-color: var(--wa-color-surface-default);
    }

    wa-tree {
      padding: 0;
      margin: 0;
      color: var(--wa-color-text-normal);
    }
    .custom-icons wa-tree-item::part(expand-button) {
      /* Disable the expand/collapse animation */
      rotate: none;
    }

    wa-tree-item {
      color: var(--wa-color-text-normal);
    }

    wa-tree-item::part(label) {
      color: var(--wa-color-text-normal);
    }

    .key-value-container span {
      color: light-dark(#0451A5, #9CDCFE) !important;
    }

    /*
     * The neutral-text overrides that used to sit here are gone (#708): the rules
     * above now use --wa-color-text-normal, and a custom property inherits through
     * a shadow boundary reliably, which is precisely what color-scheme -- and so
     * bare light-dark() -- did not.
     *
     * What remains covers the editor palette below, which is deliberately still
     * written as light-dark() literals — those are VS Code's syntax colours, not
     * UI chrome, and have no WA semantic token to point at.
     */
    :host-context(body[data-theme="dark"]) .object-array-container,
    :host-context(body[data-theme="dark"]) .object-array-container * {
      color: #9CDCFE !important;
    }
    :host-context(body[data-theme="dark"]) .key-value-container span {
      color: #9CDCFE !important;
    }
    :host-context(body[data-theme="dark"]) input.tree {
      color: #CE9178 !important;
    }

    input.tree {
      background: transparent;
      border: none;
      border-radius: 1px;
      color: light-dark(#C7621D, #CE9178) !important;
    }
    input.dialog {
      border: 1px solid var(--wa-color-border-normal);
      border-radius: var(--wa-border-radius-m);
      padding: 5px 10px;
      background-color: var(--wa-color-surface-raised);
      color: var(--wa-color-text-normal);
    }
    input:focus {
      border: 1px solid var(--wa-color-border-normal);
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
    wa-dropdown {
      top: -40%;
      right: -4%;
    }

    .object-array-container {
      position: relative;
      color: light-dark(#0451A5, #9CDCFE) !important;
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
      border-radius: var(--wa-border-radius-m);
      border: 1px solid var(--wa-color-surface-border);
      background-color: var(--wa-color-surface-raised);
      color: var(--wa-color-text-normal);
      flex-direction: row;
      cursor: default;
    }
    .dialog-error {
      color: red;
      font-size: var(--wa-font-size-s);
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
    .input-validation-pattern wa-input:state(user-invalid)::part(base) {
      border-color: var(--wa-color-danger-600);
    }

    .input-validation-pattern :state(user-invalid)::part(form-control-label),
    .input-validation-pattern :state(user-invalid)::part(form-control-help-text) {
      color: var(--wa-color-danger-700);
    }

    .input-validation-pattern wa-input:focus-within:state(user-invalid)::part(base) {
      border-color: var(--wa-color-danger-600);
      box-shadow: 0 0 0 var(--wa-focus-ring-width) var(--wa-color-danger-300);
    }

    /* User valid styles */
    .input-validation-pattern wa-input:state(user-valid)::part(base) {
      border-color: var(--wa-color-success-600);
    }

    .input-validation-pattern :state(user-valid)::part(form-control-label),
    .input-validation-pattern :state(user-valid)::part(form-control-help-text) {
      color: var(--wa-color-success-700);
    }

    .input-validation-pattern wa-input:focus-within:state(user-valid)::part(base) {
      border-color: var(--wa-color-success-600);
      box-shadow: 0 0 0 var(--wa-focus-ring-width) var(--wa-color-success-300);
    }

    wa-select {
    }

    wa-option {
    }

    button {
      background-color: #5E1EBE;
      color: white;
      border-radius: var(--wa-border-radius-s);
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
      color: var(--wa-color-text-normal);
    }

    /* All five were style attributes until #685; see the note in keep-element.ts. */
    .json-key {
      color: light-dark(#0451a5, #9cdcfe);
    }

    .json-value {
      color: light-dark(#c7621d, #ce9178);
    }

    .hidden {
      display: none;
    }
  `;

  updated(changedProperties: PropertyValues) {
    if (changedProperties.has('content')) {
      this.editedContent = JSON.parse(JSON.stringify(this.content))
      this.requestUpdate()
    }
  }

  updatePattern(event: Event) {
    const selectElement = event.target as WithValue;
    const selectedType = selectElement.value;
    const inputElement = (event.target as HTMLElement).closest('wa-tree-item')!.querySelector('#new-value') as WithValidatedValue | null;

    const patterns: Record<string, string> = {
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
    const generateTreeItems = (obj: JsonRecord, path = ''): unknown => {
      return Object.entries(obj).map(([key, value]) => {
        const fullPath = path ? `${path}.${key}` : key
        const isObjectOrArray = typeof value === 'object' && value !== null;
        const isModified = this.currentInputValues[fullPath] !== value;
        const keyNames = fullPath.split('.')
        const element = keyNames[keyNames.length - 2]
        const isArrayChild = !isNaN(keyNames[keyNames.length - 1] as any)
        const label = isArrayChild && isObjectOrArray ? (value[getLabelName(element, key)] || key) : key
        const type = isObjectOrArray ? Array.isArray(value) ? 'array' : 'object' : 'other'

        return html`
          <wa-tree-item class="custom-icons" ?lazy=${isObjectOrArray} @wa-lazy-load="${isObjectOrArray ? (e: Event) => this.handleLazyLoad(e, value, fullPath, generateTreeItems) : null}">
            <wa-icon library="${FA_LIBRARY}" name="square-plus" slot="expand-icon"></wa-icon>
            <wa-icon library="${FA_LIBRARY}" name="square-minus" slot="collapse-icon"></wa-icon>
            <section class="${isObjectOrArray ? 'object-array-container' : `key-value-container ${isModified ? 'modified' : ''}`}">
              ${isObjectOrArray ? html`
                ${`${label} ${Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}`}`}
              ` : html`
                <span class="json-key">${label}:</span>
                <input
                  id="input-${fullPath}"
                  data-id="input-${fullPath}"
                  class="tree json-value"
                  @input=${(e: Event) => {
                    this.currentInputValues = {
                      ...this.currentInputValues,
                      [fullPath]: (e.target as HTMLInputElement).value
                    }
                    this.updateEditedContent(e, key, this.editedContent, (e.target as HTMLInputElement).value, fullPath)
                  }}
                  value=${value}
                  @contextmenu="${this.handleRightClick}"
                >
              `}
              <wa-dropdown>
                <wa-button>
                  <wa-icon appearance="filled" class="icon-button" slot="trigger" library="${FA_LIBRARY}" name="square-caret-down" label="Context Menu"></wa-icon>
                </wa-button>
                <wa-dropdown-item @click="${(e: Event) => this.handleClickAdd(e)}">
                  Add
                  <wa-icon slot="prefix" library="${FA_LIBRARY}" name="circle-plus"></wa-icon>
                </wa-dropdown-item>
                <wa-dropdown-item ?disabled=${isObjectOrArray} @click="${isObjectOrArray ? null : (e: Event) => {this.handleClickEdit(e, key, value)}}">
                  Edit
                  <wa-icon slot="prefix" library="${FA_LIBRARY}" name="pencil"></wa-icon>
                </wa-dropdown-item>
                <wa-dropdown-item ?disabled=${!isObjectOrArray} @click="${isObjectOrArray ? (e: Event) => {this.handleClickDuplicate(e, fullPath, key, value)} : null}">
                  Duplicate
                  <wa-icon slot="prefix" library="${FA_LIBRARY}" name="copy"></wa-icon>
                </wa-dropdown-item>
                <wa-dropdown-item @click="${() => this.handleClickRemove(key, this.editedContent, fullPath)}">
                  Remove
                  <wa-icon slot="prefix" library="${FA_LIBRARY}" name="trash"></wa-icon>
                </wa-dropdown-item>
              </wa-dropdown>
            </section>
            <dialog id="${fullPath}" aria-label="${type}">
              <form class="input-validation-pattern">
                <section class="dialog-content">
                  <section class="dialog-input">
                    ${type === 'array' ?
                      html`<wa-input label="Key" disabled title="Key is not required when adding to an array"></wa-input>
                      <wa-input disabled id="new-key" value="${value.length}" class="hidden"></wa-input>`
                      :
                      html`<wa-input label="Key" required id="new-key" @wa-invalid="${this.handleInvalid}"></wa-input>`}
                    <div id="key-error" class="dialog-error" aria-live="polite" hidden></div>
                  </section>
                  <section class="dialog-p">
                    <p>:</p>
                  </section>
                  <section class="dialog-input">
                    <wa-select label="Type" hoist id="new-type" placement="bottom" value="String" @wa-change="${this.updatePattern}">
                      <wa-option value="String">String</wa-option>
                      <wa-option value="Boolean">Boolean</wa-option>
                      <wa-option value="Number">Number</wa-option>
                      <wa-option value="Array">Array</wa-option>
                      <wa-option value="Object">Object</wa-option>
                    </wa-select>
                  </section>
                  <section class="dialog-input">
                    <wa-input label="Value" required id="new-value" pattern=".*" @wa-invalid="${this.handleInvalid}"></wa-input>
                    <div id="value-error" class="dialog-error" aria-live="polite" hidden></div>
                  </section>
                </section>
                <section class="dialog-content buttons">
                  <button id="dialog-insert" class="hidden" @click="${(e: Event) => this.handleInsertButtonClick(e, fullPath)}">Insert</button>
                  <button id="dialog-edit" class="hidden" @click="${(e: Event) => this.handleClickDialogEdit(e, key, fullPath)}">Edit</button>
                  <button class="cancel" @click="${this.handleClickCancel}">Cancel</button>
                </section>
              </form>
            </dialog>
          </wa-tree-item>
        `;
      })
    }

    return html`
      <main>
        <wa-tree class="custom-icons">
          <wa-icon library="${FA_LIBRARY}" name="square-plus" slot="expand-icon"></wa-icon>
          <wa-icon library="${FA_LIBRARY}" name="square-minus" slot="collapse-icon"></wa-icon>
          ${generateTreeItems(this.editedContent)}
        </wa-tree>
      </main>
    `;
  }

  handleClickAdd(e: Event) {
    const dialog = (e.target as HTMLElement).closest('wa-tree-item')!.querySelector('dialog')!
    const insertButton = dialog.querySelector('#dialog-insert')!
    const editButton = dialog.querySelector('#dialog-edit')!
    // classList, not setAttribute('style', …): the production CSP sends
    // style-src-attr 'none', which blocks the latter outright. With the template's static
    // display:none applying and the un-hide blocked, these two buttons never appeared. #685.
    insertButton.classList.remove('hidden')
    editButton.classList.add('hidden')
    if (dialog) {
      dialog.showModal();
    }
  }

  handleClickEdit(e: Event, key: string, value: any) {
    const dialog = (e.target as HTMLElement).closest('wa-tree-item')!.querySelector('dialog')
    const insertButton = dialog!.querySelector('#dialog-insert')!
    const editButton = dialog!.querySelector('#dialog-edit')!
    insertButton.classList.add('hidden')
    editButton.classList.remove('hidden')
    if (dialog) {
      (dialog.querySelector('#new-key') as WithValue).value = key
      ;(dialog.querySelector('#new-value') as WithValue).value = value
      dialog.showModal();
    } else {
      log.error('Dialog element not found');
    }
  }

  handleClickRemove(key: string, parentObj: JsonRecord, fullPath: string)  {
    this.removeItem(key, parentObj, fullPath)
    this.editedContent = parentObj

    this.requestUpdate()
  }

  removeItem(key: string, parentObj: JsonRecord, fullPath?: string) {
    const keys = fullPath!.split('.')
    // Traverse the parentObj using the keys array
    const lastKey = keys.pop();
    const targetObj = keys.reduce((obj: any, k) => (obj && obj[k] !== 'undefined') ? obj[k] : undefined, parentObj);
    if (targetObj && lastKey !== undefined) {
      if (Array.isArray(targetObj)) {
        const index = parseInt(key, 10);
        if (!isNaN(index) && index >= 0 && index < targetObj.length) {
          targetObj.splice(index, 1);
          // Set the new value of the parentObj following the original path
          keys.reduce((obj: any, k, i) => {
            if (i === keys.length - 1) {
              obj[k] = targetObj;
            }
            return obj[k];
          }, parentObj);
        }
      } else if (targetObj.hasOwnProperty(lastKey)) {
        delete targetObj[lastKey];
      }
    } else if (parentObj.hasOwnProperty(key)) {
      delete parentObj[key]
    } else {
      for (let prop in parentObj) {
        if (typeof parentObj[prop] === 'object' && parentObj[prop] !== null) {
          this.removeItem(key, parentObj[prop], fullPath)
        }
      }
    }
    this.editedContent = parentObj

  }

  handleClickDuplicate(_e: Event, fullPath: string, key: string, value: any) {
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

  handleRightClick(e: Event) {
    e.preventDefault(); // Prevent the default context menu from showing up
    const dropdown = (e.target as HTMLElement).closest('wa-tree-item')!.querySelector('wa-dropdown') as WithOpen | null;
    if (dropdown) {
      dropdown.open = true
    }
  }

  handleClickCancel(e: Event) {
    ((e.target as HTMLElement).closest('wa-tree-item')!.querySelector('#new-key') as WithValue).value = ''
    ;((e.target as HTMLElement).closest('wa-tree-item')!.querySelector('#new-value') as WithValue).value = ''
    ;(e.target as HTMLElement).closest('wa-tree-item')!.querySelector('dialog')!.close()
  }

  insertItem(e: Event, fullPath: string) {
    const paths = fullPath.split('.')
    const keyType = (e.target as HTMLElement).closest('dialog')!.getAttribute('aria-label')
    const newKey = ((e.target as HTMLElement).closest('wa-tree-item')!.querySelector('#new-key') as WithValue).value
    let newValue: any = ((e.target as HTMLElement).closest('wa-tree-item')!.querySelector('#new-value') as WithValue).value
    const newType = ((e.target as HTMLElement).closest('wa-tree-item')!.querySelector('#new-type') as WithValue).value
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

    const lastIndex = keyType === "object" || keyType === "array" ? paths.length - 1 : paths.length - 2;
    if (paths.length === 1) {
      if (keyType === "object" || keyType === "array") {
        obj[paths[0]][newKey] = newValue
      } else {
        obj[newKey] = newValue
      }
      ;(e.target as HTMLElement).closest('wa-tree-item')!.querySelector('dialog')!.close()
      if (!isNaN(newKey as any) && newKey.trim() !== '') {
        ((e.target as HTMLElement).closest('wa-tree-item')!.querySelector('#new-key') as WithValue).value = (Number(newKey) + 1).toString();
      }
    } else {
      for (let i = 0; i <= lastIndex; i++) {
        if (i === lastIndex) {
          // If we're at the last key in the path, add the new key-value pair
          obj[paths[i]][newKey] = newValue
          ;(e.target as HTMLElement).closest('wa-tree-item')!.querySelector('dialog')!.close()
          if (!isNaN(newKey as any) && newKey.trim() !== '') {
            ((e.target as HTMLElement).closest('wa-tree-item')!.querySelector('#new-key') as WithValue).value = (Number(newKey) + 1).toString();
          }
        } else {
          // Otherwise, move to the next level of the object
          obj = obj[paths[i]]
        }
      }
    }
  }

  handleClickInsert(e: Event, fullPath: string, edit = false) {
    e.preventDefault()
    const newKey = ((e.target as HTMLElement).closest('wa-tree-item')!.querySelector('#new-key') as WithValue).value

    this.insertItem(e, fullPath)

    if (edit) {
      this.removeItem(newKey, this.editedContent)
    }

    // Trigger a re-render
    this.requestUpdate()
  }

  handleInvalid(e: Event) {
    // Suppress the browser's constraint validation message
    e.preventDefault();

    const errorMessage: Record<string, string> = {
      String: 'string',
      Boolean: 'true | false',
      Number: '12345',
      Array: '[1, 2, 3, "one", "two", "three", { "key": "value" }]',
      Object: '{ "key": "value" }'
    }

    const target = e.target as HTMLElement;
    if (target.id === 'new-key') {
      const keyError = target.closest('wa-tree-item')!.querySelector('#key-error') as HTMLElement;
      keyError.textContent = `Error: This input field is required.`;
      keyError.hidden = false;
      return
    } else if (target.id === 'new-value') {
      const typeInputElement = target.closest('wa-tree-item')!.querySelector('#new-type') as WithValue
      const valueInputElement = target.closest('wa-tree-item')!.querySelector('#new-value') as WithValidatedValue
      const valueError = target.closest('wa-tree-item')!.querySelector('#value-error') as HTMLElement;
      if (valueInputElement.validity.patternMismatch) {
        valueError.textContent = `Error: Make sure to follow the appropriate format - ${errorMessage[typeInputElement.value]}`;
        valueError.hidden = false;
      } else {
        valueError.textContent = `Error: This input field is required.`;
        valueError.hidden = false;
      }
    }

    target.focus();
  }

  async handleInsertButtonClick(e: Event, fullPath: string) {
    // Hide the error messages
    const keyError = (e.target as HTMLElement).closest('wa-tree-item')!.querySelector('#key-error') as HTMLElement
    const valueError = (e.target as HTMLElement).closest('wa-tree-item')!.querySelector('#value-error') as HTMLElement
    keyError.hidden = true
    valueError.hidden = true

    const form = (e.target as HTMLElement).closest('wa-tree-item')!.querySelector('.input-validation-pattern') as HTMLFormElement;

    // Wait for controls to be defined before attaching form listeners
    await Promise.all([
      customElements.whenDefined('wa-button'),
      customElements.whenDefined('wa-input')
    ]);

    if (form.checkValidity()) {
      // Insert the new key-value pair
      this.handleClickInsert(e, fullPath);
    }
  }

  handleClickDialogEdit(e: Event, key: string, fullPath: string) {
    e.preventDefault()
    const treeItem = (e.target as HTMLElement).closest('wa-tree-item')!
    const newKey = (treeItem.querySelector('#new-key') as WithValue).value
    const section = treeItem.querySelector('section.key-value-container')!
    const inputField = section.querySelector('input')!
    let newValue = ((e.target as HTMLElement).closest('wa-tree-item')!.querySelector('#new-value') as WithValue).value
    const dialog = treeItem.querySelector('dialog')!
    if (dialog.id === fullPath)  {
      newValue = (dialog.querySelector('#new-value') as WithValue).value
    }
    inputField.value = newValue

    this.insertItem(e, fullPath)
    if (newKey !== key)  {
      this.removeItem(key, this.editedContent)
    }

    // Trigger a re-render
    this.requestUpdate()
  }

  updateEditedContent(_e: Event, key: string, parentObj: JsonRecord, newValue: any, fullPath: string) {
    const paths = fullPath.split('.')
    newValue = newValue === "true" ? true : newValue === "false" ? false : newValue
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

  handleLazyLoad(e: Event, value: any, fullPath: string, generate: (obj: JsonRecord, path?: string) => unknown) {
    const treeItem = (e.target as HTMLElement).closest('wa-tree-item[lazy]') as WithLazy

    // Prevent re-rendering the same tree item
    if (treeItem.hasAttribute('data-processed')) return

    // Generate the tree items for the object
    const section = document.createElement('wa-tree-item')
    const child = generate(value, fullPath)
    const container = document.createElement('section')
    render(child, container)
    section.appendChild(container)
    treeItem.append(section)
    treeItem.lazy = false

    treeItem.setAttribute('data-processed', 'true')
  }

}

declare global {
  interface HTMLElementTagNameMap {
    'keep-source-tree': SourceTree;
  }
}
