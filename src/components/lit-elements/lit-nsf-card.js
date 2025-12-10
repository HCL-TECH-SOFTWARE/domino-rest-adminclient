import { LitElement, css, html } from 'lit';
import './lit-schema-status.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import { IMG_DIR } from '../../config.dev.js';
import appIcons from '../../styles/app-icons.js';

class NsfCard extends LitElement {

  static styles = css`
    section {
      border: 1px solid #ccc;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.1);
      width: 25vw;
      height: 392px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    div.list-container {
      border: 1px solid #eee;
      border-radius: 5px;
      background-color: #FAFDFF;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      overflow-x: visible;
      box-sizing: border-box;
    }

    div.card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-direction: row;
      align-content: center;
    }

    text.nsf-filename {
      font-size: 17px;
      font-weight: 600;
    }
  `;

  static properties = {
    database: { type: Object },
    items: { type: Array },
    schemasWithScopes: { type: Array },
    iconName: { type: String },
    deleteFn: { type: Function },
    openSchema: { type: Function },
  };

  constructor() {
    super()
    this.database = {}
    this.items = []
    this.isSchema = window.location.pathname.endsWith('/schema')
    this.schemasWithScopes = []
    this.iconName = 'beach'
    this.searchItem = ''
    this.deleteFn = (data) => {}
    this.openSchema = (schema) => {}
  }

  updated(changedProperties) {
    if (changedProperties.has('database')) {
      this.items = this.isSchema ? this.database.databases || [] : this.database.apis || [];
      this.schemasWithScopes = this.schemasWithScopes || [];
      this.iconName = this.database.databases ? this.database.databases[0]?.iconName : 'beach';
    }
  }

  _handleSearchInput(e) {
    this.searchItem = e.target.value;
    this.items = this.isSchema ? this.database.databases.filter((item) => item.schemaName.toLowerCase().includes(this.searchItem.toLowerCase())) : this.database.apis.filter((item) => item.apiName.toLowerCase().includes(this.searchItem.toLowerCase()));
  }

  render() {
    return html`
      <section>
        <div class="card-title">
            <div style="font-size: 32px;">
                ${this.iconName && appIcons[this.iconName] ? html`
                    <sl-icon 
                        src=${`data:image/svg+xml;base64,${appIcons[this.iconName]}`} 
                        label=${this.iconName}
                    ></sl-icon>
                ` : html`
                    <sl-icon src=${`data:image/svg+xml;base64,${appIcons['beach']}`} ></sl-icon>
                `}
            </div>
            <text class="nsf-filename">${this.database.fileName}</text>
        </div>
        <sl-input
            placeholder="Search Schema"
            style="width: 100%;"
            .value=${this.searchItem}
            @sl-input=${this._handleSearchInput}
        >
            <sl-icon slot="prefix" src="${IMG_DIR}/shoelace/search.svg"></sl-icon>
        </sl-input>
        <div class="list-container">
            ${this.items.map(item => html`
                <lit-schema-status
                    key=${item.schemaName + '-' + item.nsfPath}
                    .item=${item}
                    .isSchema=${this.isSchema}
                    .schemasWithScopes=${this.schemasWithScopes || []}
                    .onDelete=${() => this.deleteFn(item)}
                    .onClickOpen=${() => this.openSchema(item)}
                >
                </lit-schema-status>`
            )}
        </div>
      </section>
    `;
  }
}

customElements.define('lit-nsf-card', NsfCard);

export default NsfCard