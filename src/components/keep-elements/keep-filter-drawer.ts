/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import './keep-drawer';
import './keep-button';

/**
 * The chrome every filter drawer in this app shares. Tag: `keep-filter-drawer`.
 *
 * Two screens open a right-hand drawer, stack a column of labelled filter sections in it,
 * and close it with the same three-button footer: the Applications list
 * ({@link ../keep-app-filter}) and the OAuth consents list ({@link ../keep-consent-filter}).
 * A careful diff of the two during wave 2 found that what they share is a **shell**, not a
 * body — the panel, the column, the rules between the sections and the footer are identical;
 * everything inside is not. So the shell is what this element is, and the body arrives
 * through the default slot.
 *
 * ## What a consumer supplies, and what it must not
 *
 * The slot takes the sections **and the rules between them**, as direct children, in render
 * order:
 *
 * ```html
 * <keep-filter-drawer label="Filter" ?open=${…} resettable>
 *   <section class="section">…</section>
 *   <hr class="divider" />
 *   <section class="section">…</section>
 * </keep-filter-drawer>
 * ```
 *
 * The rules are the consumer's because their *placement* differs: the applications filter
 * ends with one before the footer, the consents filter does not. Their *appearance* is this
 * element's, through the two slotted rules below — which is why they must be direct
 * children. A `::slotted()` selector matches assigned nodes only, never their descendants.
 *
 * ## Events, and why there are only three
 *
 * A filter drawer has exactly three exits, and each one is a decision the consumer owns
 * because only the consumer knows what a filter *is*:
 *
 *  - `filter-apply` — Show Results.
 *  - `filter-reset` — Reset. Rendered only when {@link resettable} is set.
 *  - `filter-cancel` — Cancel, **and** every other way the drawer can close: Escape, a click
 *    on the overlay, and the drawer's own close button. They mean the same thing, so they
 *    arrive under the same name; a consumer that keeps its open flag in the store guards on
 *    that flag rather than distinguishing them.
 *
 * The element deliberately owns no draft, no store subscription and no open flag of its own.
 * {@link open} is an input, and it never writes to it.
 *
 * ## Styling
 *
 * Four Linaria blocks (`DrawerFormContainer`, `FilterContainer`, `Section`,
 * `ButtonsContainer`) and the utility classes that travelled with them reached these nodes
 * through the light DOM as class selectors, and a class selector does not cross a shadow
 * boundary. They are restated below, reading custom properties — which do cross, and stay
 * mode-aware — wherever the originals used a literal.
 *
 * @fires filter-apply - `CustomEvent<void>`
 * @fires filter-reset - `CustomEvent<void>`
 * @fires filter-cancel - `CustomEvent<void>`
 */
@customElement('keep-filter-drawer')
export default class FilterDrawer extends KeepElement {
  static styles = css`
    /*
     * The page's border-box reset is a universal selector in WebAwesome's wa-native layer,
     * and a universal selector does not cross a shadow boundary. Without it the divider's
     * padding would be added to its height rather than counted inside it.
     */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    :host {
      display: contents;
    }

    /* DrawerFormContainer, plus the w-35vw utility that every call site passed with it. */
    .drawer-form {
      display: flex;
      flex-direction: column;
      width: 35vw;
      height: 100%;
      max-height: 100vh;
      overflow: hidden;
    }

    @media only screen and (max-width: 768px) {
      .drawer-form {
        width: 100vw;
      }
    }

    /* FilterContainer. Its .title rule is dropped: nothing in the markup ever had it. */
    .filter {
      display: flex;
      flex-direction: column;
      padding: 20px;
      gap: 10px;
    }

    /*
     * Section, which both drawers carried verbatim. Its .header, .text, .toggle-area and
     * .scope-group rules stay with the consents body, which is the only markup that ever
     * had a node carrying them.
     *
     * The slot itself is left at the display value the UA gives it, so the sections and
     * rules assigned to it are the flex items of .filter above and pick up its gap.
     */
    ::slotted(.section) {
      padding-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /*
     * The divider was an hr carrying the divider utility and some spacing. The visible line
     * is not that utility's own background but the border-bottom WebAwesome's wa-native
     * layer puts on every hr, which is a bare element selector and so does not cross the
     * boundary either. Restated with the same token, which keeps it mode-aware.
     */
    ::slotted(hr.divider) {
      width: 100%;
      height: 1px;
      padding: 5px 0 10px;
      margin: 0 0 10px;
      border: none;
      border-bottom: solid var(--wa-border-width-s) var(--wa-color-surface-border);
      background: none;
    }

    /* ButtonsContainer. */
    .buttons {
      display: flex;
      justify-content: flex-end;
      padding-top: 20px;
      gap: 20px;
    }
  `;

  /** The drawer's heading, rendered by `keep-drawer` in the panel's own header. */
  @property({ type: String }) accessor label = 'Filter';

  /**
   * Whether the panel is showing. An input: the consumer owns the flag, and this element
   * reports a close as `filter-cancel` rather than writing to it.
   */
  @property({ type: Boolean }) accessor open = false;

  /** Offer a Reset button. Only the applications filter has one. */
  @property({ type: Boolean }) accessor resettable = false;

  /**
   * Bound once rather than per render. `closeFn` is a property on `keep-drawer`, so a fresh
   * arrow each render would be a fresh value each render and would dirty that element on
   * every update of this one.
   */
  private readonly _handleHide = () => this.emit('filter-cancel');

  render() {
    return html`
      <keep-drawer label=${this.label} ?open=${this.open} .closeFn=${this._handleHide}>
        <div class="drawer-form">
          <div class="filter">
            <slot></slot>
            <div class="buttons">
              ${this.resettable
                ? html`
                    <keep-button
                      variant="neutral"
                      appearance="outlined"
                      @click=${() => this.emit('filter-reset')}
                    >
                      Reset
                    </keep-button>
                  `
                : nothing}
              <keep-button variant="danger" @click=${() => this.emit('filter-cancel')}>
                Cancel
              </keep-button>
              <keep-button @click=${() => this.emit('filter-apply')}>Show Results</keep-button>
            </div>
          </div>
        </div>
      </keep-drawer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-filter-drawer': FilterDrawer;
  }
}
