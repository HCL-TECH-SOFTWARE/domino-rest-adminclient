import { LitElement, html, css } from 'lit';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/button/button.js';
// Import Shoelace theme (light/dark)
import '@shoelace-style/shoelace/dist/themes/light.css';
// Import Shoelace components
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import { IMG_DIR } from '../../config.dev';

class Alert extends LitElement {
    static styles = css`
        sl-alert {
            line-height: 1.2;
        }

        div.container {
            display: flex;
            align-items: center;
            gap: 15px;
        }
        div.text {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .icon.primary {
            fill: var(--sl-color-primary-600);
        }
        .icon.success {
            fill: var(--sl-color-success-600);
        }
        .icon.warning {
            fill: var(--sl-color-warning-600);
        }
        .icon.danger {
            fill: var(--sl-color-danger-600);
        }
        .icon.neutral {
            fill: var(--sl-color-neutral-600);
        }
    `

    static properties = {
        variant: { type: String },
        heading: { type: String },
        text: { type: String },
        icon: { type: String },
        closable: { type: Boolean },
        duration: { type: Number },
    };
  
    constructor() {
      super()
      this.variant = 'primary'; // Default variant
      this.icon = this.getIcon(this.variant);
      this.heading = "Test heading"
      this.text = "Test text"
      this.closable = true
      this.duration = 0; // Duration in milliseconds
    }

    updated(changedProperties) {
        if (changedProperties.has('variant')) {
            this.icon = this.getIcon(this.variant);
        }
    }

    // Method to determine the icon based on the variant
    getIcon(variant) {
        switch (variant) {
            case 'success':
                return 'check2-circle';
            case 'neutral':
                return 'gear';
            case 'warning':
                return 'exclamation-triangle';
            case 'danger':
                return 'exclamation-octagon';
            default:
                return 'info-circle';
        }
    }
  
    render() {
      return html`
        <sl-alert variant="${this.variant}" open closable>
            <div class="container">
                <div style="font-size: 20px;">
                    <sl-icon
                        src="${IMG_DIR}/shoelace/${this.icon}.svg"
                        slot="icon"
                        class="icon ${this.variant}"
                    ></sl-icon>
                </div>
                <div class="text">
                    <strong>${this.heading}</strong>
                    <text>${this.text}</text>
                </div>
            </div>
        </sl-alert>
      `;
    }
}
  
customElements.define('lit-alert', Alert);

export default Alert