import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import { FA_LIBRARY } from '../../services/icon-library';

/**
 * Thin wrapper around `<wa-button>` (+ optional leading `<wa-icon>`).
 * Tag: `keep-button`. Exposed via `KeepElements.tsx` as `KeepButton`.
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
  @property({ type: String }) variant = 'brand';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) outline = false;
  @property({ type: Boolean }) pill = false;

  /** Fixed visual appearance; not a reactive attribute (matches original). */
  appearance = 'accent';

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
