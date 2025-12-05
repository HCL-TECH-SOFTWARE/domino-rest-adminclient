import { LitElement, css, html } from 'lit';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
import { IMG_DIR } from '../../config.dev.js';

class SchemaStatus extends LitElement {

  static styles = css`
    div.main {
      display: flex;
      width: 100%;
      justify-content: space-between;
      padding: 10px 15px;
      box-sizing: border-box;
      align-items: center;
      gap: 8px;
    }

    div.api-status {
        width: 4px;
        height: 20px;
        flex-shrink: 0;
        background: #82DC73;
    }

    div.unused {
        background: #F75764;
    }

    div.description {
      display: flex;
      min-width: 0;
      align-items: center;
      flex-direction: row;
      gap: 6px;
      flex: 1;
      overflow: hidden;
    }

    sl-icon {
      cursor: pointer;
      flex-shrink: 0;
    }

    div.name {
        text-overflow: ellipsis;
        flex: 1;
        overflow: hidden;
        white-space: nowrap;
        cursor: default;
    }
  `;

  static properties = {
    item: { type: Object },
    schemasWithScopes: { type: Array },
    isSchema: { type: Boolean },
    name: { type: String },
    status: { type: String },
    usedByScopes: { type: Boolean }
  };

  constructor() {
    super()
    this.item = {}
    this.isSchema = window.location.pathname.endsWith('/schema')
    this.name = "";
    this.status = this.schemasWithScopes?.includes(this.item.nsfPath + ":" + this.item.schemaName) ? 'Used by Scopes' : 'Not used by Scopes';
    this.usedByScopes = false
  }

  updated(changedProperties) {
    if (changedProperties.has('item')) {
        this.name = this.isSchema ? this.item.schemaName : this.item.apiName;
        this.usedByScopes = this.schemasWithScopes?.includes(this.item.nsfPath + ":" + this.item.schemaName)
        this.status = this.usedByScopes ? 'Used by Scopes' : 'Not used by Scopes';
    }
  }

  render() {
    return html`
      <div class="main">
        <div class="description">
            <sl-tooltip content="${this.status}" placement="top">
                <div class="api-status ${this.usedByScopes ? '' : 'unused'}"></div>
            </sl-tooltip>
            <sl-tooltip content="${this.name}" style="--max-width: none; --sl-tooltip-arrow-size: 0;" placement="top" hoist>
                <div class="name">${this.name}</div>
            </sl-tooltip>
        </div>
        <sl-icon slot="prefix" src="${IMG_DIR}/shoelace/trash.svg"></sl-icon>
      </div>
    `;
  }
}

customElements.define('lit-schema-status', SchemaStatus);

export default SchemaStatus