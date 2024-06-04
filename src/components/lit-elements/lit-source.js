import { LitElement, html, css } from 'lit';

import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/components/tree/tree.js';
import '@shoelace-style/shoelace/dist/components/tree-item/tree-item.js';

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
    input:hover, input:focus {
      border: 1px solid #B8B8B8;
    }
  `;

  constructor() {
    super();
    setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.15.1/cdn/');
    this.content = {}
    this.editedContent = {...this.content}
  }

  updated(changedProperties) {
    if (changedProperties.has('content')) {
      this.editedContent = {...this.content}
    }
  }

  render() {
    const generateTreeItems = (obj) => {
      return Object.entries(obj).map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return html`
            <sl-tree-item>
              ${`${key} ${Array.isArray(value) ? `[${value.length}]` : `{${Object.keys(value).length}}` }`}
              ${generateTreeItems(value)}
            </sl-tree-item>
          `;
        } else {
          return html`
            <sl-tree-item>
              <section>
                <span>${key}:</span>
                <input @input=${(e) => this.updateEditedContent(key, this.editedContent, e.target.value)} value=${value}>
              </section>
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
  }
  
}

customElements.define('lit-source', SourceTree)

export default SourceTree