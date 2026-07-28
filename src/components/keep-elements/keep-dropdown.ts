/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/dropdown/dropdown.js';
import '@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js';
import { KeepElement } from './keep-element';

@customElement('keep-dropdown')
export default class Dropdown extends KeepElement {
  static styles = css`
    :host {
      display: var(--keep-dropdown-display, inline-block);
      width: var(--keep-dropdown-width, auto);
    }
    wa-dropdown {
      width: var(--keep-dropdown-width, auto);
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

  // Public reactive property: consumers (e.g. LoginPage) pass `selected` in,
  // and it is also updated internally when a dropdown-item is chosen.
  @property({ type: String }) selected?: string;

/*
 * No `style` passthrough to the inner Web Awesome control.
 *
 * It read the host's own `style` attribute and re-emitted it here, which the production CSP
 * blocks: `style-src-attr 'none'` stops Lit's AttributePart from applying an interpolated
 * `style=`, so the attribute landed in the DOM and did nothing. No caller passed one either
 * — measured across `src`, zero call sites. Size these from `:host` rules or a custom
 * property instead. #685.
 */

  render() {
    return html`
      <wa-dropdown>
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
    'keep-dropdown': Dropdown;
  }
}
