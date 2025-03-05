import { LitElement, html, css } from 'lit';

class AppStatus extends LitElement {

  static properties = {
    status: { type: Boolean },
  };

  static styles = css`
    div {
        display: flex;
        gap: 5px;
        border-radius: 3px;
        color: var(--status-color, #6C7882);
        background-color: var(--status-bg-color, #E6EBF5);
        flex-direction: row;
        align-items: center;
        width: fit-content;
        font-size: 12px;
        padding: 0 5px;
    }
  `;

  constructor() {
    super()
    this.status = false
  }

  updated(changedProperties) {
    if (changedProperties.has('status')) {
      this.style.setProperty('--status-color', this.status ? '#000' : '#6C7882');
      this.style.setProperty('--status-bg-color', this.status ? '#A1E596' : '#E6EBF5');
    }
  }

  render() {
    return html`
      <div>
        <svg width="5" height="5" viewBox="0 0 5 5" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="2.5" cy="2.5" r="2.5" fill="${this.status ? '#003122' : '#6C7882'}"></circle>
        </svg>
        ${this.status ? 'Active' : 'Inactive'}
      </div>
    `;
  }
}

customElements.define('lit-app-status', AppStatus);

export default AppStatus