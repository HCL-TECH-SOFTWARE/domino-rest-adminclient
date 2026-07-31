/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/dropdown/dropdown.js';
import '@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { FA_LIBRARY } from '../../services/icon-library';
import { KeepElement } from './keep-element';

/** Payload of {@link CardViewOptions}'s `view-change` event. */
export interface KeepViewChangeDetail {
  /** `stack` | `card` | `alphabetical` | `nsf` — the key the multi-view switches on. */
  view: string;
}

/** Menu labels, in the order the original listed them. */
const VIEW_LABELS = ['Stack View', 'Card View', 'Alphabetical View', 'NSF View'];

/** `'Alphabetical View'` → `'alphabetical'`, exactly as the original derived it. */
const keyOf = (label: string) => label.replace(' View', '').toLowerCase();

/** `'nsf'` → `'NSF View'`, anything else → `'Card View'`. */
const labelOf = (view: string) =>
  `${view === 'nsf' ? view.toUpperCase() : view.charAt(0).toUpperCase() + view.slice(1)} View`;

/**
 * The view picker beside the search bar on the schema and scope list screens. Tag:
 * `keep-card-view-options`. No wrapper: both screens are Lit and compose it directly (#806).
 *
 * ## No router in here, and no location either
 *
 * The original read `useLocation()` and parsed `?view=` out of `search` to label itself.
 * An element cannot do that: the router is handed to React through context with no
 * module-level instance to reach for, and this codebase has no Lit router controller — the
 * precedent set by `keep-schemas-multi-view` is that location and navigation move **up** to
 * the nearest surviving React component rather than down into a new controller.
 *
 * So the current view arrives as {@link view} and a pick leaves as `view-change`. What the
 * parent passes is its own `view` state, **not** a re-parse of `location.search`, which
 * removes a duplicated parse and closes a small pre-existing inconsistency: the two were
 * computed independently, so a browser Back button moved the label without moving the list
 * it labelled. They cannot disagree now.
 *
 * ## Store access
 *
 * None. The original held its own subscription for `scopePull`, but both parents already
 * select it for their own purposes, so it arrives as {@link disabled} instead — a store
 * subscription in a leaf whose parent owns the same flag fights the wrapper's dirty-check-free
 * re-application of props on every parent render.
 *
 * ## Keyboard selection, and why the handler is on the dropdown
 *
 * `wa-select` rather than a `@click` on each item. Web Awesome fires `wa-select` for both
 * pointer and keyboard selection, but only synthesises a click for the former — a per-item
 * click handler silently does nothing for anyone driving the menu with the arrow keys and
 * Enter, which is the shape three other elements in this directory are already written in.
 * The event is composed, so it is stopped here: `view-change` is this element's whole
 * outbound contract.
 *
 * ## What the shadow boundary cost
 *
 * Everything: the `multicard-view-container` rule in `styles.css` and the six utility
 * classes on the trigger are all class selectors, and none of them reaches into a shadow
 * root. They are restated below through the same custom properties, so both colour modes
 * still resolve themselves.
 *
 * Two of those utilities were **already dead** before the conversion and are honoured here
 * for the first time, which is a deliberate visible change (the same call the #718 icon pass
 * made). The trigger was a Material button whose emitted styles are injected after the app
 * stylesheet, so at equal specificity they won: `justify-between` lost to the framework's
 * `justify-content: center`, and `color-text-primary` lost to a theme override that painted
 * the label in the brand purple. The label and caret therefore sat centred and purple, while
 * the class list asked for them spread to the edges in the normal text colour. They now are.
 */
@customElement('keep-card-view-options')
export default class CardViewOptions extends KeepElement {
  static styles = css`
    /* was .multicard-view-container in styles.css. */
    :host {
      box-sizing: border-box;
      width: 200px;
      height: 43px;
      display: flex;
      justify-content: center;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      margin-left: 15px;
      font-size: 14px;
      background: var(--body-color);
    }

    /*
     * The page's border-box reset is a universal selector, which does not cross a shadow
     * boundary. Without it the trigger's own inline padding would be added to its 100 %
     * width and overflow the 200px box.
     */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    /* was the pointer-none / pointer-auto pair, toggled while the scope list is loading. */
    :host([disabled]) {
      pointer-events: none;
    }

    /*
     * wa-dropdown and its wa-popup are both display: contents, so the trigger below is the
     * flex item of :host and the menu is taken out of flow by the popup's own positioning.
     */
    .trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0 8px;
      border: 0;
      background: none;
      cursor: pointer;

      /* were the text-transform-none, medium-text and color-text-primary utilities. The
         colour is the mode-aware token rather than the utility's light-mode #000 literal,
         whose dark override is a light-DOM descendant selector that cannot reach in here. */
      font-family: inherit;
      font-size: 16px;
      text-transform: none;
      color: var(--wa-color-text-normal);
    }

    /* A native button draws a focus ring on pointer clicks too, which is what the framework
       button it replaces suppressed. Keyboard users keep theirs. */
    .trigger:focus {
      outline: none;
    }

    .trigger:focus-visible {
      outline: var(--wa-focus-ring);
      outline-offset: calc(-1 * var(--wa-focus-ring-width));
    }

    /*
     * wa-icon has no size attribute — the glyph takes its box from font-size, and the
     * wa-size-* utilities that used to supply it live in a layer in the document sheet.
     * --wa-font-size-xl is the token those utilities read, i.e. the same ~22px.
     */
    .caret {
      font-size: var(--wa-font-size-xl);
    }
  `;

  /**
   * The view currently on screen: `stack`, `card`, `alphabetical` or `nsf`.
   *
   * Supplied by the parent, which owns both this and the multi-view it selects. Anything
   * unrecognised is capitalised and labelled as-is, as the original did.
   */
  @property({ type: String }) accessor view = 'card';

  /**
   * Blocks pointer input while the scope list behind the screen is still being pulled.
   *
   * Not the trigger's own disabled state — as before, the control keeps its place in the tab
   * order. It gains an `aria-disabled` it did not have, so the state is at least announced.
   * Reflected, because the rule implementing it is an attribute selector on the host.
   */
  @property({ type: Boolean, reflect: true }) accessor disabled = false;

  private _handleSelect(event: Event) {
    event.stopPropagation();
    const { item } = (event as CustomEvent<{ item: { value: string } }>).detail;
    this.emit<KeepViewChangeDetail>('view-change', { view: item.value });
  }

  render() {
    return html`
      <wa-dropdown @wa-select=${this._handleSelect}>
        <button
          class="trigger"
          slot="trigger"
          type="button"
          aria-disabled=${this.disabled ? 'true' : 'false'}
        >
          <span>${labelOf(this.view)}</span>
          <wa-icon
            class="caret"
            library=${FA_LIBRARY}
            name="caret-down"
            canvas="auto"
          ></wa-icon>
        </button>
        ${VIEW_LABELS.map(
          (label) => html`<wa-dropdown-item value=${keyOf(label)}>${label}</wa-dropdown-item>`,
        )}
      </wa-dropdown>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-card-view-options': CardViewOptions;
  }
}
