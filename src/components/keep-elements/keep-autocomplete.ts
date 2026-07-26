import { html, css } from 'lit';
import type { PropertyValues } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { KeepElement } from './keep-element';

/**
 * Autocomplete text input with a filterable dropdown of options.
 * Tag: `keep-autocomplete`. Exposed via `KeepElements.tsx` as `KeepAutocomplete`.
 */
@customElement('keep-autocomplete')
export default class Autocomplete extends KeepElement {
  static styles = css`
    .parent-container {
      position: relative;
      display: inline-block;
      width: 100%;
      overflow: visible;
    }

    .autocomplete-container {
      position: relative;
      display: inline-block;
      width: 100%;
    }

    .dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 1000;
      visibility: hidden;
      background-color: light-dark(white, #1e1e2e);
      border: 1px solid light-dark(#ccc, #3a3a4a);
      border-radius: 5px;
      width: 100%;
      z-index: 9999;
      max-height: 30vh;
      overflow: auto;
    }
    .dropdown.show {
      visibility: visible;
    }
    .dropdown--above {
      top: auto;
      bottom: 100%;
    }

    .input-container {
      width: 97%;
      border: 1px solid light-dark(#BBBDBF, #3a3a4a);
      border-radius: 5px;
      padding: 15px 10px;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin: 0;
      position: relative;
      background-color: light-dark(#fff, #1e1e2e);
      color: light-dark(inherit, #e0e0e0);
    }
    .input-container.error {
      border: 1px solid red;
    }

    input {
      width: 85%;
      border: none;
      padding: 0;
      margin: 0;
      outline: none;
      background-color: transparent;
      color: inherit;
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

    p {
      margin: 8px 0 0 2px;
      font-size: 14px;
      color: red;
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
      color: light-dark(inherit, #e0e0e0);
    }
    li:hover, li.highlighted {
      background-color: light-dark(#e5e5e5, #353548);
    }

    @media only screen and (min-width: 992px) {
      :host {
        font-size: 16px;
      }

      input, .input-container {
        font-size: 16px;
      }

      p {
        font-size: 12px;
      }
    }
  `;

  @property({ type: Array }) options: string[] = [];
  @property({ type: String }) selectedOption = '';
  @property({ type: Boolean }) error = false;
  @property({ type: String }) errorMessage = '';
  @property({ type: String }) initialOption = '';
  @property({ type: Object }) icons: Record<string, string> = {};

  @state() private filteredOptions: string[] = [];
  @state() private highlightedOptionIndex = -1;
  @state() private showDropdown = false;

  /**
   * Cached in `updated()` and read during `render()`. Deliberately NOT reactive
   * (kept a plain field, matching the original): assigning it must not trigger
   * an extra render on its own.
   */
  private hasIcons = false;

  @query('input') private _input!: HTMLInputElement;
  @query('.dropdown') private _dropdown!: HTMLElement;

  updated(changedProperties: PropertyValues): void {
    if (changedProperties.has('icons')) {
      this.hasIcons = Object.keys(this.icons).length > 0;
    }
  }

  render() {
    return html`
      <div class="parent-container">
        <section class="autocomplete-container">
          <section class="input-container ${this.error ? 'error' : ''}">
            ${this.hasIcons && this.selectedOption && this.icons[this.selectedOption] ? html`
              <img
                src="data:image/svg+xml;base64,${this.icons[this.selectedOption]}"
                alt=""
                style="width:24px; height:24px; vertical-align: middle; margin-right: 8px;"
              >
            ` : ''}
            <input
              list="autocomplete-options"
              .value="${this.selectedOption.length > 0 ? this.selectedOption : this.initialOption}"
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
          <section class="dropdown ${this.showDropdown ? 'show' : ''}" @focusout="${this._handleFocusOut}">
            <ul>
              ${this.filteredOptions.map((option, index) => html`
                <li
                  id="option-${index}"
                  class="${index === this.highlightedOptionIndex ? 'highlighted' : ''}"
                  @mousedown="${() => this._handleOptionClick(option)}"
                  style="display: flex; align-items: center;"
                >
                  ${this.hasIcons ?
                    html`<img
                      src="data:image/svg+xml;base64,${this.icons[option]}"
                      alt=""
                      style="width:24px; height:24px; vertical-align: middle; margin-right: 8px;"
                    >`
                    :
                    ''} ${option}
                </li>
              `)}
            </ul>
          </section>
          <p>${this.error ? this.errorMessage : ""}</p>
        </section>
      </div>
    `;
  }

  private _handleInput(e: Event): void {
    this.showDropdown = true;
    this.selectedOption = (e.target as HTMLInputElement).value;
    this.emit('change');
    this.filteredOptions = this.options.filter(option => option.toLowerCase().includes(this.selectedOption.toLowerCase()));
    this.requestUpdate();
    setTimeout(() => {
      if (this.showDropdown) {
        this._adjustDropdownPosition();
      }
    }, 0);
  }

  private _handleOptionClick(option: string): void {
    this.selectedOption = option;
    this.emit('change');
    this.showDropdown = false;
    this.requestUpdate();
  }

  private _handleFocusOut(e: FocusEvent): void {
    // Check if the new focused element is outside the component
    if (!this.shadowRoot!.contains(e.relatedTarget as Node | null)) {
      setTimeout(() => {
        this.showDropdown = false;
        this.requestUpdate();
      }, 0);
    }
  }

  private _handleKeyDown(e: KeyboardEvent): void {
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
          this.emit('change');
        }
        this.showDropdown = false;
        break;
      default:
        break;
    }
    this.requestUpdate();
    this._scrollIntoView();
  }

  private _scrollIntoView(): void {
    if (this.highlightedOptionIndex >= 0) {
      const optionElement = this.shadowRoot!.getElementById(`option-${this.highlightedOptionIndex}`);
      if (optionElement) {
        optionElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }

  private _handleClearInput(): void {
    this.selectedOption = ''
    this.emit('change');
    this.initialOption = ''
    this.filteredOptions = this.options
    this.requestUpdate()
  }

  private _toggleDropdown(): void {
    this.filteredOptions = this.selectedOption !== '' ? this.options.filter(option => option.toLowerCase().includes(this.selectedOption.toLowerCase())) : this.options;
    this.showDropdown = !this.showDropdown;
    this.requestUpdate();
    setTimeout(() => {
      if (this.showDropdown) {
        this._adjustDropdownPosition();
      }
    }, 0);
  }

  private _adjustDropdownPosition(): void {
    const inputRect = this._input.getBoundingClientRect();
    const dropdown = this._dropdown;
    const spaceBelow = window.innerHeight - inputRect.bottom;
    const spaceAbove = inputRect.top;

    // Assume dropdown height is 200px, or measure it dynamically
    const dropdownHeight = dropdown.offsetHeight || 200;

    if (spaceBelow < dropdownHeight && spaceAbove > dropdownHeight) {
      dropdown.classList.add('dropdown--above');
    } else {
      dropdown.classList.remove('dropdown--above');
    }
    this.requestUpdate();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-autocomplete': Autocomplete;
  }
}
