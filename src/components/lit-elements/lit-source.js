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
// Import setBasePath for Shoelace assets
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path';

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
    }

    sl-divider {
      padding: 0;
      margin: 0;
    }

    .dialog-content {
      display: flex;
      flex-direction: row;
      gap: 10px;
    }

    sl-select {
      --sl-font-size-small: 12px;
      --sl-font-size-medium: 14px;
      --sl-font-size-large: 16px;
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
                <input class="tree" @input=${(e) => {
                  this.currentInputValues = {
                    ...this.currentInputValues,
                    [fullPath]: e.target.value
                  }
                  // console.log(this.currentInputValues[fullPath])
                  // console.log(value)
                  // console.log(this.currentInputValues[fullPath] !== value)
                  this.updateEditedContent(key, this.editedContent, e.target.value)
                }} value=${value}>
                <sl-dropdown>
                  <sl-icon-button class="icon-button" slot="trigger" name="caret-down-square" label="Settings"></sl-icon-button>
                  <sl-menu>
                    <sl-menu-item>
                      Add
                      <sl-icon slot="prefix" name="plus-circle"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item @click="${this.handleClick}">
                      Edit
                      <sl-icon slot="prefix" name="pencil"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item>
                      Duplicate
                      <sl-icon slot="prefix" name="copy"></sl-icon>
                    </sl-menu-item>
                    <sl-menu-item>
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
              <dialog>
                <section class="dialog-content">
                  <section class="dialog-input">
                    Key
                    <input class="dialog">
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
                    <input class="dialog">
                  </section>
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

  handleClick() {
    const dialog = this.shadowRoot.querySelector('dialog');
    if (dialog) {
      dialog.showModal();
    } else {
      console.error('Dialog element not found');
    }
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