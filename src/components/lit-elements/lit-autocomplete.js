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
    }
    .dropdown.show {
      display: block;
    }

    input {
      width: 100%;
      border: 1px solid #BBBDBF;
      border-radius: 5px;
      padding: 20px 10px;
      font-size: 14px;
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

      &:hover {
        background-color: #e5e5e5;
      }
    }

    @media only screen and (min-width: 992px) {
      :host {
        font-size: 16px;
      }

      input {
        font-size: 16px;
      }
    }
  `;


  constructor() {
    super();
    this.options = [];
    this.selectedOption = '';
    this.filteredOptions = this.options.filter(option => option.toLowerCase().includes(this.selectedOption.toLowerCase()));
  }

  render() {
    return html`
      <section class="autocomplete-container">
        <input
          list="autocomplete-options"
          .value="${this.selectedOption}"
          @input="${this._handleInput}"
          @click="${this._handleInput}"
          @focus="${this._handleFocus}"
          @blur="${this._handleBlur}"
        >
        <section class="dropdown ${this.showDropdown ? 'show' : ''}">
          <ul>
            ${this.filteredOptions.map(option => html`<li @click="${() => this._handleOptionClick(option)}">${option}</li>`)}
          </ul>
        </section>
      </section>
    `;
  }

  _handleInput(e) {
    this.selectedOption = e.target.value;
    this.filteredOptions = this.options.filter(option => option.toLowerCase().includes(this.selectedOption.toLowerCase()));
    this.requestUpdate();
  }

  _handleOptionClick(option) {
    this.selectedOption = option;
    this.requestUpdate();
  }

  _handleFocus() {
    this.showDropdown = true;
    this.requestUpdate();
  }
  
  _handleBlur() {
    this.showDropdown = false;
    this.requestUpdate();
  }
}

customElements.define('my-autocomplete', Autocomplete)

export default Autocomplete