import { LitElement, css, html } from 'lit';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import { IMG_DIR } from '../../config.dev.js';

class NsfCard extends LitElement {

  static styles = css`
    section {
      border: 1px solid #ccc;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.1);
      width: 392px;
      height: 392px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    div {
      border: 1px solid #eee;
      border-radius: 4px;
      background-color: #FAFDFF;
      width: 100%;
      height: 100%;
    }
  `;

  static properties = {
    database: { type: Object },
  };

  constructor() {
    super()
    this.database = {}
  }

  render() {
    return html`
      <section>
        <sl-input placeholder="Search Schema" style="width: 100%;">
            <sl-icon slot="prefix" src="${IMG_DIR}/shoelace/search.svg"></sl-icon>
        </sl-input>
        <div>

        </div>
        <lit-schema-status .schema=${this.database.schema}></lit-schema-status>
      </section>
    `;
  }
}

customElements.define('lit-nsf-card', NsfCard);

export default NsfCard