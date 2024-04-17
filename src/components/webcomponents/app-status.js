class AppStatus extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
  
    static get observedAttributes() {
      return ['status'];
    }
  
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'status') {
        this.status = newValue === 'true';
        this.render();
      }
    }
  
    connectedCallback() {
      this.render();
    }
  
    render() {
      this.shadowRoot.innerHTML = `
        <style>
          div {
            display: flex;
            gap: 5px;
            border-radius: 3px;
            color: ${this.status ? '#000' : '#6C7882'};
            background-color: ${this.status ? '#A1E596' : '#E6EBF5'};
            flex-direction: row;
            align-items: center;
            width: fit-content;
            font-size: 12px;
            padding: 0 5px;
          }
        </style>
        <div>
            <svg width="5" height="5" viewBox="0 0 5 5" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="2.5" cy="2.5" r="2.5" fill="${this.status ? '#003122' : '#6C7882'}">
            </svg>
            ${this.status ? 'Active' : 'Inactive'}
        </div>
      `;
    }
  }
  
  customElements.define('app-status', AppStatus);