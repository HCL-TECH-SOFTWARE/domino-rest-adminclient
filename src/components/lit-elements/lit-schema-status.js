import { LitElement, css, html } from 'lit';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import { IMG_DIR } from '../../config.dev.js';

class SchemaStatus extends LitElement {

  static styles = css`
    div.main {
      display: flex;
      width: 100%;
      justify-content: space-between;
    }
  `;

  static properties = {
    schema: { type: Object },
  };

  constructor() {
    super()
    this.schema = {}
  }

  updated(changedProperties) {
    if (changedProperties.has('variant')) {
        // this.icon = this.getIcon(this.variant);
    }
  }

  render() {
    return html`
      <div class="main">
        <div>

        </div>
        <sl-icon slot="prefix" src="${IMG_DIR}/shoelace/trash.svg"></sl-icon>
      </div>
    `;
  }
}

customElements.define('lit-schema-status', SchemaStatus);

export default SchemaStatus