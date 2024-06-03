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
  `;


  constructor() {
    super();
    setBasePath('https://cdn.jsdelivr.net/npm/@shoelace-style/shoelace@2.15.1/cdn/');
    this.content = {}
  }

  render() {
    const generateTreeItems = (obj, depth = 0) => {
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
                        ${key}: ${value}
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

  
}

customElements.define('lit-source', SourceTree)

export default SourceTree