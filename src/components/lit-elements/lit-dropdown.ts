import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/dropdown/dropdown.js';
import '@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js';
import { KeepLitElement } from './keep-lit-element';

@customElement('lit-dropdown')
export default class Dropdown extends KeepLitElement {
  static styles = css`
    :host {
      display: var(--lit-dropdown-display, inline-block);
      width: var(--lit-dropdown-width, auto);
    }
    wa-dropdown {
      width: var(--lit-dropdown-width, auto);
    }
    wa-dropdown::part(base) {
      width: 100%;
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
    }

    wa-button::part(base) {
      width: 100%;
    }
  `;

  @property({ type: Array }) choices: string[] = [];

  @state() private selected?: string;

  render() {
    return html`
      <wa-dropdown style="${this.getAttribute('style') || ''}">
        <wa-button appearance="filled" slot="trigger" with-caret>${this.selected}</wa-button>
        ${this.choices.map(
          (choice) =>
            html`<wa-dropdown-item @click=${() => this.changeSelected(choice)}>${choice}</wa-dropdown-item>`,
        )}
      </wa-dropdown>
    `;
  }

  firstUpdated() {
    this.selected = this.choices[0];
  }

  changeSelected(choice: string) {
    this.selected = choice;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-dropdown': Dropdown;
  }
}
