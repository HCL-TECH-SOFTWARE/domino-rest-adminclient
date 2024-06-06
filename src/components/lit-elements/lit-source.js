import { LitElement, html, css } from 'lit';

import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/tree/tree.js';
import '@shoelace-style/shoelace/dist/components/tree-item/tree-item.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';

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

    input {
      background: transparent;
      border: none;
      border-radius: 1px;
    }
    input:focus {
      border: 1px solid #B8B8B8;
    }

    section.modified {
      // background-color: red;
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
  `;

  constructor() {
    super();
    setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.15.1/cdn/');
    this.content = {}
    this.editedContent = {...this.content}
    this.currentInputValues = {}
  }

  updated(changedProperties) {
    if (changedProperties.has('content')) {
      this.editedContent = {...this.content}
    }
  }

  generateTreeItems = (obj, path = '') => {
    return Object.entries(obj).map(([key, value]) => {
      const fullPath = path ? `${path}.${key}` : key;
      if (typeof value === 'object' && value !== null) {
        return html`
          <sl-tree-item>
            ${`${key} ${Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}` }`}
            ${this.generateTreeItems(value, fullPath)}
          </sl-tree-item>
        `;
      } else {
        // console.log(fullPath)
        const dialog = this.shadowRoot.querySelector('sl-dialog')
        const button = this.shadowRoot.querySelector('sl-icon-button')
        button.addEventListener('click', () => {
          dialog.show()
        })
        return html`
          <sl-tree-item>
            <section class="key-value-container ${this.currentInputValues[fullPath] !== value ? 'modified' : ''}">
              <span>${key}:</span>
              <input @input=${(e) => {
                this.currentInputValues = {
                  ...this.currentInputValues,
                  [fullPath]: e.target.value
                }
                // this.requestUpdate()
                // console.log(this.currentInputValues[fullPath])
                // console.log(value)
                // console.log(this.currentInputValues[fullPath] !== value)
                this.updateEditedContent(key, this.editedContent, e.target.value)
              }} value=${value}>
              <sl-icon-button class="icon-button" slot="trigger" name="caret-down-square" label="Settings">Test</sl-icon-button>
              <sl-dialog label="Dialog" class="dialog-overview">
                <sl-menu>
                  <sl-menu-item>Option 1</sl-menu-item>
                  <sl-menu-item>Option 2</sl-menu-item>
                </sl-menu>
              </sl-dialog>
            </section>
          </sl-tree-item>
        `;
        // <sl-dropdown>
        //   <sl-icon-button class="" slot="trigger" name="caret-down-square" label="Settings">Test</sl-icon-button>
        //   <sl-menu>
        //     <sl-menu-item>Option 1</sl-menu-item>
        //     <sl-menu-item>Option 2</sl-menu-item>
        //   </sl-menu>
        // </sl-dropdown>
      }
    });
  };

  render() {
    // const generateTreeItems = (obj, path = '') => {
    //   return Object.entries(obj).map(([key, value]) => {
    //     const fullPath = path ? `${path}.${key}` : key;
    //     if (typeof value === 'object' && value !== null) {
    //       return html`
    //         <sl-tree-item>
    //           ${`${key} ${Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}` }`}
    //           ${generateTreeItems(value, fullPath)}
    //         </sl-tree-item>
    //       `;
    //     } else {
    //       // console.log(fullPath)
    //       return html`
    //         <sl-tree-item>
    //           <section class=${this.currentInputValues[fullPath] !== value ? 'modified' : ''}>
    //             <span>${key}:</span>
    //             <input @input=${(e) => {
    //               this.currentInputValues = {
    //                 ...this.currentInputValues,
    //                 [fullPath]: e.target.value
    //               }
    //               console.log(this.currentInputValues[fullPath])
    //               console.log(value)
    //               console.log(this.currentInputValues[fullPath] !== value)
    //               this.updateEditedContent(key, this.editedContent, e.target.value)
    //             }} value=${value}>
    //           </section>
    //         </sl-tree-item>
    //       `;
    //     }
    //   });
    // };

    return html`
      <div>
        <sl-tree>
            ${this.generateTreeItems(this.content)}
        </sl-tree>
      </div>
    `;
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
  
}

customElements.define('lit-source', SourceTree)

export default SourceTree