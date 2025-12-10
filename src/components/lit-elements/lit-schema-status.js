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
      cursor: pointer;
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
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }

    .trash-icon {
        cursor: pointer;
        flex-shrink: 0;
        width: 20px;
        height: 20px;
        fill: none;
        stroke: #F75764;
        stroke-width: 1.5;
        transition: fill 0.2s ease, stroke 0.2s ease;
    }

    .trash-icon:hover {
        fill: #F75764;
        stroke: #8B2630;
    }

    sl-icon {
      cursor: pointer;
      flex-shrink: 0;
      transition: filter 0.2s ease;
    }

    div.name {
        text-overflow: ellipsis;
        flex: 1;
        overflow: hidden;
        white-space: nowrap;;
    }

    div.delete {
        cursor: pointer;
    }
  `;

  static properties = {
    item: { type: Object },
    schemasWithScopes: { type: Array },
    isSchema: { type: Boolean },
    name: { type: String },
    status: { type: String },
    usedByScopes: { type: Boolean },
    onDelete: { type: Function },
    onClickOpen: { type: Function },
  };

  constructor() {
    super()
    this.item = {}
    this.isSchema = window.location.pathname.endsWith('/schema')
    this.name = "";
    this.status = this.schemasWithScopes?.includes(this.item.nsfPath + ":" + this.item.schemaName) ? 'Used by Scopes' : 'Not used by Scopes';
    this.usedByScopes = false
    this.onDelete = () => {};
    this.onClickOpen = () => {};
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
        <div class="description" @click=${this.onClickOpen}>
            ${this.isSchema ? html`<sl-tooltip content="${this.status}" placement="top">
                <div class="api-status ${this.usedByScopes ? '' : 'unused'}"></div>
            </sl-tooltip>` : ''}
            <sl-tooltip class="trash-icon" content="${this.name}" style="--max-width: none; --sl-tooltip-arrow-size: 0;" placement="top" hoist>
                <div class="name">${this.name}</div>
            </sl-tooltip>
        </div>
        ${this.isSchema ? html`<div class="delete" @click=${this.onDelete}>
            <svg class="trash-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14M10 11v6M14 11v6"/>
            </svg>
        </div>` : ''}
      </div>
    `;
  }
}

customElements.define('lit-schema-status', SchemaStatus);

export default SchemaStatus