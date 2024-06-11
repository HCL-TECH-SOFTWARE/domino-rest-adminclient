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

    section.modified {
      // background-color: red;
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
      // position: absolute;
      top: -40%;
      right: -4%;
    }

    dialog {
      padding: 10px;
      border-radius: 5px;
      border: 1px solid #D2D2D2;
      border: none;
      flex-direction: row;
      cursor: default;
    }

    sl-divider {
      
    }

    sl-menu {
      
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
    this.editedContent = {...this.content}
    this.currentInputValues = {}
  }

  updated(changedProperties) {
    if (changedProperties.has('content')) {
      this.editedContent = {...this.content}
    }
  }

  // generateTreeItems = (obj, path = '') => {
  //   return Object.entries(obj).map(([key, value]) => {
  //     const fullPath = path ? `${path}.${key}` : key;
  //     if (typeof value === 'object' && value !== null) {
  //       return html`
  //         <sl-tree-item>
  //           ${`${key} ${Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}` }`}
  //           ${this.generateTreeItems(value, fullPath)}
  //         </sl-tree-item>
  //       `;
  //     } else {
  //       // console.log(fullPath)
  //       const dialog = this.shadowRoot.querySelector('sl-dialog')
  //       const button = this.shadowRoot.querySelector('sl-icon-button')
  //       // button.addEventListener('click', () => {
  //       //   dialog.show()
  //       // })
  //       return html`
  //         <sl-tree-item>
  //           <section class="key-value-container ${this.currentInputValues[fullPath] !== value ? 'modified' : ''}">
  //             <span>${key}:</span>
  //             <input @input=${(e) => {
  //               this.currentInputValues = {
  //                 ...this.currentInputValues,
  //                 [fullPath]: e.target.value
  //               }
  //               // this.requestUpdate()
  //               // console.log(this.currentInputValues[fullPath])
  //               // console.log(value)
  //               // console.log(this.currentInputValues[fullPath] !== value)
  //               this.updateEditedContent(key, this.editedContent, e.target.value)
  //             }} value=${value}>
  //             <sl-icon-button class="icon-button" slot="trigger" name="caret-down-square" label="Settings" @click="${this.menuOpenClick()}">Test</sl-icon-button>
  //             <sl-dialog label="Dialog" class="dialog-overview">
                // <sl-menu>
                //   <sl-menu-item>Option 1</sl-menu-item>
                //   <sl-menu-item>Option 2</sl-menu-item>
                // </sl-menu>
  //             </sl-dialog>
  //           </section>
  //         </sl-tree-item>
  //       `;
  //       // <sl-dropdown>
  //       //   <sl-icon-button class="" slot="trigger" name="caret-down-square" label="Settings">Test</sl-icon-button>
  //       //   <sl-menu>
  //       //     <sl-menu-item>Option 1</sl-menu-item>
  //       //     <sl-menu-item>Option 2</sl-menu-item>
  //       //   </sl-menu>
  //       // </sl-dropdown>
  //     }
  //   });
  // };

  render() {
    const generateTreeItems = (obj, path = '') => {
      return Object.entries(obj).map(([key, value]) => {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
          return html`
            <sl-tree-item>
              ${`${key} ${Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}` }`}
              ${generateTreeItems(value, fullPath)}
            </sl-tree-item>
          `;
        } else {
          // console.log(fullPath)
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
                  <sl-icon-button class="icon-button" slot="trigger" name="caret-down-square" label="Context Menu"></sl-icon-button>
                  <sl-menu>
                    <sl-menu-item @click="${(e) => this.handleClickAdd(e, fullPath)}">
                      Add
                      <sl-icon slot="prefix" name="plus-circle"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item @click="${(e) => {this.handleClickEdit(e)}}">
                      Edit
                      <sl-icon slot="prefix" name="pencil"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item>
                      Duplicate
                      <sl-icon slot="prefix" name="copy"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item @click="${(e) => this.handleClickRemove(e, key, this.editedContent)}">
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
                <sl-dropdown>
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
                  <button @click="${(e) => this.handleClickInsert(e, fullPath)}">Insert</button>
                  <button class="cancel" @click="${this.handleClickCancel}">Cancel</button>
                </section>
              </dialog>
            </sl-tree-item>
          `;
        }
      });
    };

    return html`
      <div>
        <sl-tree>
            ${generateTreeItems(this.content)}
        </sl-tree>
      </div>
    `;
  }

  handleClickAdd(e, dialogId) {
    const dialog = e.target.closest('sl-tree-item').querySelector('dialog')
    if (dialog) {
      console.log(e.target.closest('sl-tree-item'))
      dialog.showModal();
    } else {
      console.error('Dialog element not found');
    }
  }

  handleClickEdit(e) {
    const inputToFocus = e.target.closest('sl-tree-item').querySelector(`input`)
    setTimeout(() => {
      if (inputToFocus) {
        inputToFocus.focus()
      }
    })
  }

  handleClickRemove(e, key, parentObj)  {
    if (parentObj.hasOwnProperty(key)) {
      if (Object.keys(parentObj).length === 1) {
        delete parentObj[key]
      }
      // delete parentObj[key]
      const node = e.target.closest('sl-tree-item')
      node.remove()
    } else {
      for (let prop in parentObj) {
        if (typeof parentObj[prop] === 'object' && parentObj[prop] !== null) {
          this.handleClickRemove(e, key, parentObj[prop])
        }
      }
    }
    this.editedContent = parentObj
    // console.log(this.editedContent)
  }

  handleRightClick(e) {
    e.preventDefault(); // Prevent the default context menu from showing up
    const dropdown = e.target.closest('sl-tree-item').querySelector('sl-dropdown');
    if (dropdown) {
      dropdown.open = true
    }
  }

  handleClickCancel(e) {
    e.target.closest('sl-tree-item').querySelector('dialog').close()
  }

  handleClickInsert(e, fullPath) {
    const paths = fullPath.split('.')
    const newKey = e.target.closest('sl-tree-item').querySelector('#new-key').value
    const newValue = e.target.closest('sl-tree-item').querySelector('#new-value').value
    let obj = this.editedContent
    
    for (let i = 0; i < paths.length; i++) {
      if (i === paths.length - 2) {
        // If we're at the last key in the path, add the new key-value pair
        obj[paths[i]][newKey] = newValue
        e.target.closest('sl-tree-item').querySelector('dialog').close()
      } else {
        // Otherwise, move to the next level of the object
        obj = obj[paths[i]]
      }
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
    this.editedContent = parentObj;
    // console.log(this.editedContent)
  }

  // menuOpenClick() {
  //   const dialog = this.shadowRoot.querySelector('sl-dialog')
  //   console.log(dialog)
  //   dialog.show()
  // }
  
}

customElements.define('lit-source', SourceTree)

export default SourceTree