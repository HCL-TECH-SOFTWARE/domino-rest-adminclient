/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import { FA_LIBRARY } from '../../services/icon-library';

/**
 * Thin wrapper around `<wa-button>` (+ optional leading `<wa-icon>`).
 * Tag: `keep-button`. Exposed via `KeepElements.tsx` as `KeepButton`.
 *
 * The *only* button element (#701). It replaced `keep-button-yes`, `keep-button-no`
 * and `keep-button-neutral`, which each rendered a plain `<button>` with hardcoded
 * hex and so inherited no tokens, no dark mode, no focus ring and none of Web
 * Awesome's accessibility behaviour. They map onto `variant`/`appearance`:
 *
 *   keep-button-yes     -> <keep-button>                                 (brand/accent)
 *   keep-button-no      -> <keep-button variant="danger">
 *   keep-button-neutral -> <keep-button variant="neutral" appearance="outlined">
 *
 * Label content is a slot, not a `text` property — the three legacy elements took
 * `text` and ignored their children.
 */
@customElement('keep-button')
export default class Button extends KeepElement {
  /*
   * No dark-mode override in these styles, deliberately (#682).
   *
   * There was one, guarded by `:host([data-theme='dark'])`. That selector requires the
   * attribute on the keep-button element itself, and nothing has ever set it —
   * `theme-service.ts` writes `document.body.dataset.theme`, and no consumer passes
   * `data-theme` down. So the rule never matched: its styling has never rendered once.
   *
   * Removed rather than repaired. Switching it to the `:host-context(...)` form the other
   * themed elements use would turn on never-before-seen styling as a side effect of a bug
   * fix. Re-add it deliberately, with that selector, if the outlined-button dark treatment
   * is wanted. Guarded by `test/components/keep-elements/theme-selectors.test.ts`.
   */
  static styles = [
    css`
      :host {
        display: var(--keep-button-display, inline-block);
        width: var(--keep-button-width, auto);
      }
      wa-button {
        width: var(--keep-button-width, auto);
      }
    `,
  ];

  /** Font Awesome glyph name — must be registered in `services/icon-library` ICONS. */
  @property({ type: String }) icon = '';

  /** Web Awesome colour role: `brand` | `danger` | `neutral` | `success` | `warning`. */
  @property({ type: String }) variant = 'brand';

  /**
   * Web Awesome fill style: `accent` (filled) | `outlined` | `plain` | `filled`.
   *
   * Reactive as of #701. It used to be a plain class field, which worked only because
   * React 19 sets an unknown prop on a custom element as a property when one exists on
   * the instance, and did so before the first render — so it looked fine on mount but
   * nothing re-rendered if it changed afterwards.
   */
  @property({ type: String }) appearance = 'accent';

  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) pill = false;

  render() {
    return html`
      <wa-button
        variant="${this.variant}"
        ?disabled="${this.disabled}"
        style="${this.getAttribute('style') || ''}"
        appearance="${this.appearance}"
        ?pill="${this.pill}"
      >
        ${this.icon ? html`<wa-icon library="${FA_LIBRARY}" name="${this.icon}"></wa-icon>` : ''}
        <slot></slot>
      </wa-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-button': Button;
  }
}
