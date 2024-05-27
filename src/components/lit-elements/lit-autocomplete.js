import { LitElement, html, css } from 'lit';

class Autocomplete extends LitElement {
  static properties = {
    options: { type: Array },
    selectedOption: { type: String }
  };

  static styles = css`
    .autocomplete-container {
      position: relative;
      display: inline-block;
      width: 95%;
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      display: none;
      background-color: white;
      border: 1px solid #ccc;
      border-radius: 5px;
      width: 100%;
      z-index: 1;
      max-height: 30vh;
      overflow: scroll;
    }
    
    .show {
      display: block;
    }

    .input-container {
      width: 100%;
      border: 1px solid #BBBDBF;
      border-radius: 5px;
      padding: 15px 10px;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    input {
      width: 85%;
      border: none;
      padding: 0;
      margin: 0;
      outline: none;
    }

    .button-container {
      width: 8%;
      padding: 0;
      margin: 0;
    }

    button {
      border: none;
      padding: 0;
      margin: 0;
      width: 100%;
      background: none;

      &:hover {
        cursor: pointer;
      }
    }

    svg {
      background: none;
    }

    ul {
      padding: 0;
      margin: 0;

      &:hover {
        cursor: pointer;
      }
    }

    li {
      list-style-type: none;
      padding: 10px 15px;
      margin: 0;
    }
    li:hover, li.highlighted {
      background-color: #e5e5e5;
    }

    @media only screen and (min-width: 992px) {
      :host {
        font-size: 16px;
      }

      input, .input-container {
        font-size: 16px;
      }
    }
  `;


  constructor() {
    super();
    this.options = [];
    this.selectedOption = '';
    this.filteredOptions = this.options.filter(option => option.toLowerCase().includes(this.selectedOption.toLowerCase()));
    this.highlightedOptionIndex = -1;
    this.showDropdown = false;
  }

  render() {
    return html`
      <section class="autocomplete-container" @focusout="${this._handleFocusOut}">
        <section class="input-container">
          <input
            list="autocomplete-options"
            .value="${this.selectedOption}"
            @input="${this._handleInput}"
            @click="${this._handleInput}"
            @keydown="${this._handleKeyDown}"
          >
          <section class="button-container">
            ${this.selectedOption !== '' ? html`
              <button @click="${this._handleClearInput}">
                <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg" style="width: 15px; height: 15px">
                  <line x1="10" y1="10" x2="40" y2="40" stroke="#808283" stroke-width="5" />
                  <line x1="10" y1="40" x2="40" y2="10" stroke="#808283" stroke-width="5" />
                </svg>
              </button>
          ` : html``}
          </section>
          <section class="button-container">
            <button @click="${this._toggleDropdown}">
              <svg
                viewBox="0 0 50 50"
                xmlns="http://www.w3.org/2000/svg"
                style="width: 12px; height: 12px; transform: ${this.showDropdown ? 'rotate(0deg)' : 'rotate(180deg)'}"
              >
                <polygon points="25,10 45,40 5,40" fill="#808283" />
              </svg>
            </button>
          </section>
        </section>
        <section class="dropdown ${this.showDropdown ? 'show' : ''}">
          <ul>
            ${this.filteredOptions.map((option, index) => html`
              <li
                id="option-${index}"
                class="${index === this.highlightedOptionIndex ? 'highlighted' : ''}"
                @mousedown="${() => this._handleOptionClick(option)}"
              >
                ${option}
              </li>
            `)}
          </ul>
        </section>
      </section>
    `;
  }

  _handleInput(e) {
    this.showDropdown = true;
    this.selectedOption = e.target.value;
    this.filteredOptions = this.options.filter(option => option.toLowerCase().includes(this.selectedOption.toLowerCase()));
    this.requestUpdate();
  }

  _handleOptionClick(option) {
    this.selectedOption = option;
    this.showDropdown = false;
    this.requestUpdate();
  }

  _handleFocusOut(e) {
    // Check if the new focused element is outside the component
    if (!this.shadowRoot.contains(e.relatedTarget)) {
      setTimeout(() => {
        this.showDropdown = false;
        this.requestUpdate();
      }, 0);
    }
  }

  _handleKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown':
        if (this.highlightedOptionIndex < this.filteredOptions.length - 1) {
          this.highlightedOptionIndex++;
        }
        break;
      case 'ArrowUp':
        if (this.highlightedOptionIndex > 0) {
          this.highlightedOptionIndex--;
        }
        break;
      case 'Enter':
        if (this.highlightedOptionIndex >= 0) {
          this.selectedOption = this.filteredOptions[this.highlightedOptionIndex];
        }
        this.showDropdown = false;
        break;
      default:
        break;
    }
    this.requestUpdate();
    this._scrollIntoView();
  }

  _scrollIntoView() {
    if (this.highlightedOptionIndex >= 0) {
      const optionElement = this.shadowRoot.getElementById(`option-${this.highlightedOptionIndex}`);
      if (optionElement) {
        optionElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  _handleClearInput() {
    this.selectedOption = ''
    this.filteredOptions = this.options
    this.requestUpdate()
  }

  _toggleDropdown() {
    this.filteredOptions = this.selectedOption !== '' ? this.options.filter(option => option.toLowerCase().includes(this.selectedOption.toLowerCase())) : this.options;
    this.showDropdown = !this.showDropdown;
    this.requestUpdate();
  }
}

customElements.define('my-autocomplete', Autocomplete)

export default Autocomplete