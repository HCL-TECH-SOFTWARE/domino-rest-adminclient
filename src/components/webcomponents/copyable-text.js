class CopyableText extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }
  
    static get observedAttributes() {
      return ['tooltip'];
    }
  
    attributeChangedCallback(name, oldValue, newValue) {
      if (name === 'tooltip') {
        this.tooltip = newValue;
        this.render();
      }
    }
  
    connectedCallback() {
      this.render();
      this.shadowRoot.querySelector('span').addEventListener('click', this.copyToClipboard)
    }
  
    render() {
      this.shadowRoot.innerHTML = `
        <style>
        span {
            cursor: pointer;
            position: relative;
            display: inline-block;
          }
          span:hover:after {
            content: "${this.tooltip}";
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            background-color: #555;
            color: #fff;
            padding: 5px;
            border-radius: 5px;
            opacity: 0.8;
            white-space: nowrap;
          }
          span:hover:before {
            content: "";
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            border-width: 5px;
            border-style: solid;
            border-color: #555 transparent transparent transparent; /* Change the border color order */
          }
        </style>
        <span title="Click to copy">${this.textContent}</span>
      `;
    }
  
    copyToClipboard(event) {
      const text = event.target.textContent;
      navigator.clipboard.writeText(text).then(() => {
        console.log('Text copied to clipboard');
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
    }
  }
  
  customElements.define('copyable-text', CopyableText);