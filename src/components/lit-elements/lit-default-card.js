import { LitElement, html, css } from 'lit';
import '@shoelace-style/shoelace/dist/components/card/card.js';

class DefaultCard extends LitElement {
    static styles = css`
        sl-card {
            padding: 10px;
            border-radius: 3px;
            border: none;
            border-radius: 5px;
    
            &:hover {
                cursor: pointer;
            }
        }
    `;

    static properties = {
      status: { type: Boolean },
      icon: { type: String },
      title: { type: String },
      subtitle: { type: String },
      acl: { type: String },
      description: { type: String },
      delete: { type: Boolean },
      onClick: { type: Function },
      onDelete: { type: Function },
    };
  
    constructor() {
        super()
        this.status = false
        this.icon = ''
        this.title = ''
        this.subtitle = ''
        this.acl = '*Editor'
        this.description = ''
        this.delete = false
        this.onClick = () => {}
        this.onDelete = () => {}
    }
  
    render() {
      return html`
        <sl-card>
            <text>Test</text>
        </sl-card>
      `;
    }
  }
  
  customElements.define('lit-default-card', DefaultCard);
  
  export default DefaultCard