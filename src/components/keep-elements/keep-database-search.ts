/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/divider/divider.js';
import '@awesome.me/webawesome/dist/components/dropdown/dropdown.js';
import '@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { FA_LIBRARY } from '../../services/icon-library';
import { KeepElement } from './keep-element';
import './keep-tooltip';

/** Payload of {@link DatabaseSearch}'s `search-change` event. */
export interface KeepDatabaseSearchChangeDetail {
  /** The field's full contents as typed — not trimmed, not lower-cased. */
  value: string;
}

/** Payload of {@link DatabaseSearch}'s `search-type-change` event. */
export interface KeepDatabaseSearchTypeChangeDetail {
  /** The chosen column, e.g. `SCHEMA NAME` or `NSF NAME`. */
  searchType: string;
}

/** The second search column, offered on both list screens. */
const NSF_SEARCH_TYPE = 'NSF NAME';

/**
 * The search bar above the schema and scope lists: a column picker, a divider and one text
 * field with a clear button. Tag: `keep-database-search`. Exposed to React as
 * `KeepDatabaseSearch`.
 *
 * Distinct from `keep-search-input`, which is the plain filter box the forms/views/agents
 * tabs share. This one has the two extra controls and is used by exactly two screens.
 *
 * ## No router in here
 *
 * The original called `useLocation()` for one thing: `pathname.indexOf('schema') > 0` chose
 * between `SCHEMA NAME` and `SCOPE NAME` for the first menu entry. An element cannot reach
 * the router — it is handed out through React context with no module-level instance — and
 * this codebase has no Lit router controller by design, so the value moves up to the parent
 * and arrives as {@link nameType}. Both parents already hard-code the same string as their
 * initial `searchType`, so nothing new had to be worked out to pass it.
 *
 * ## The field is uncontrolled, deliberately
 *
 * There is no `value` property and adding one would be a bug. The wrapper re-applies every
 * declared property on every parent render with no dirty check, so a `value` fed back from
 * the parent's filter state would overwrite the field on the render the user's own keystroke
 * triggered. The original was an uncontrolled input with a ref for exactly this reason, and
 * the clear button still works the same way: it writes the DOM node, not a property.
 *
 * ## Store access
 *
 * None. `scopePull` gated pointer events here, and both parents already select it, so it
 * arrives as {@link disabled} rather than through a subscription that would fight the
 * parent's re-render.
 *
 * ## Keyboard selection
 *
 * The column picker listens for `wa-select` on the dropdown, not `@click` on each item. Web
 * Awesome fires `wa-select` for pointer *and* keyboard selection but only synthesises a
 * click for the former, so a per-item click handler leaves the menu unusable from the
 * keyboard. The event is composed; it is stopped here so this element's outbound contract is
 * just `search-change` and `search-type-change`.
 *
 * ## What the shadow boundary cost
 *
 * The three Linaria blocks in `styles/search.tsx` (`FormSearchContainer`, `SearchContainer`,
 * `SearchInput`), the `database-search-container-button` rule in `styles.css`, the
 * `pointer-auto` / `pointer-none`, `medium-text` and `color-text-primary` utilities, and —
 * least obviously — Web Awesome's `wa-native` layer, which styles every text input through a
 * bare `input` selector and the box-sizing reset through a universal one. All of it is
 * restated below through the same custom properties, so both colour modes still resolve.
 * Two `!important` flags are dropped: they were on the container's border-radius and
 * background, and nothing inside this root competes with them.
 *
 * Several declarations on the column picker were **already dead** and are honoured here for
 * the first time — the same call the #718 icon pass made. It was a Material button, whose
 * emitted styles are injected after the app stylesheet and therefore win at equal
 * specificity: `justify-content: space-between`, `padding-left: 25px`, `padding-right: 5px`,
 * `min-width: 191px`, `text-transform: none` and the hint-grey colour all lost to the
 * framework's own values, so the picker rendered centred with 8px of padding and a
 * brand-purple caret. It now matches what its class asked for.
 */
@customElement('keep-database-search')
export default class DatabaseSearch extends KeepElement {
  static styles = css`
    /* was FormSearchContainer, styles/search.tsx. */
    :host {
      box-sizing: border-box;
      display: flex;
      flex: 1;
      height: 43px;
      justify-content: center;
      border: 1px solid var(--wa-color-surface-border);
      border-radius: var(--wa-border-radius-l);
      background: var(--wa-color-surface-raised);
    }

    /*
     * The page's border-box reset is a universal selector and does not cross a shadow
     * boundary. Without it the field's inline padding is added to its 100 % width and
     * overflows the bar.
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

    /* was SearchContainer, styles/search.tsx. */
    .search-container {
      display: flex;
      align-items: center;
      padding: 0;
      width: 100%;
    }

    /*
     * was .database-search-container-button in styles.css. wa-dropdown and its wa-popup are
     * both display: contents, so this button is the flex item and the menu is taken out of
     * flow by the popup's own positioning.
     */
    .type-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 255px;
      min-width: 191px;
      height: 100%;
      padding-left: 25px;
      padding-right: 5px;
      border: 0;
      background: none;
      cursor: pointer;
      white-space: nowrap;
      text-transform: none;
      font-family: inherit;
      font-size: 16px;
      color: var(--hint-text-color);
    }

    .type-trigger:focus {
      outline: none;
    }

    .type-trigger:focus-visible {
      outline: var(--wa-focus-ring);
      outline-offset: calc(-1 * var(--wa-focus-ring-width));
    }

    /* was the medium-text utility on the label span, which set its own colour and so did
       not inherit the hint grey the caret beside it takes. */
    .type-label {
      font-size: 16px;
      color: var(--wa-color-text-normal);
    }

    /*
     * wa-icon has no size attribute — the glyph takes its box from font-size, and the
     * wa-size-* utilities that used to supply it live in a layer in the document sheet.
     * --wa-font-size-xl is the token those utilities read, i.e. the same ~22px.
     */
    .caret {
      font-size: var(--wa-font-size-xl);
    }

    /*
     * The separator was a Material divider with flexItem, i.e. full height and no margin.
     * wa-divider's vertical form already stretches; its default --spacing would add a full
     * space-m either side, which the two neighbours already provide.
     */
    wa-divider {
      --spacing: 0;
    }

    /* the .search-icon rule from styles/search.tsx. canvas is an attribute on the tag rather
       than a declaration here: Web Awesome's own default is a 1.25em box. */
    .search-icon {
      margin-left: 10px;
      font-size: 19px;
      color: var(--wa-color-text-normal);
    }

    .search-input {
      /*
       * Web Awesome's wa-native layer, restated. Its selector is a bare element one so it
       * does not reach in here, but the tokens it reads are custom properties, which do
       * inherit across the boundary and stay mode-aware.
       */
      height: var(--wa-form-control-height);
      padding: 0 var(--wa-form-control-padding-inline);
      font-family: inherit;
      font-weight: var(--wa-form-control-value-font-weight);
      line-height: var(--wa-form-control-value-line-height);
      vertical-align: middle;
      cursor: text;

      /* was SearchInput, styles/search.tsx — unlayered, so it outranked the block above. */
      border: 0;
      width: 100%;
      background: none;
      font-size: 16px;

      /* was the color-text-primary utility, whose light value is the literal #000 and whose
         dark override is a light-DOM descendant selector that cannot reach a shadow root. */
      color: var(--wa-color-text-normal);
    }

    .search-input::placeholder {
      color: var(--wa-form-control-placeholder-color);
      user-select: none;
      -webkit-user-select: none;
    }

    /*
     * The Linaria block set outline: none unconditionally, so the field had no visible focus
     * indicator for anyone driving it from the keyboard (WCAG 2.4.7). The ring comes back on
     * :focus-visible only, which is the state the blanket removal was aimed at. The offset is
     * negative so the ring stays inside the bar's own border instead of spilling over it.
     */
    .search-input:focus {
      outline: none;
    }

    .search-input:focus-visible {
      outline: var(--wa-focus-ring);
      outline-offset: calc(-1 * var(--wa-focus-ring-width));
    }

    /* was a small Material icon button: a round 5px-padded hit area around the glyph. */
    .clear-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 5px;
      margin-right: 5px;
      border: 0;
      border-radius: 50%;
      background: none;
      cursor: pointer;
      color: inherit;
    }

    .clear-button:hover {
      background: var(--wa-color-surface-lowered);
    }

    /* the .clear-icon rule from styles/search.tsx. */
    .clear-icon {
      font-size: 19px;
      color: var(--wa-color-text-normal);
    }
  `;

  /**
   * The column currently being searched, shown on the picker. Owned by the parent, which
   * needs it to filter with; the element only reports changes to it.
   */
  @property({ type: String }) accessor searchType = 'SCOPE NAME';

  /**
   * The entity-name column offered alongside `NSF NAME` — `SCHEMA NAME` on the schema
   * screen, `SCOPE NAME` on the scope screen. Was derived from the URL pathname.
   */
  @property({ type: String }) accessor nameType = 'SCOPE NAME';

  /**
   * Blocks pointer input while the scope list behind the screen is still being pulled.
   *
   * Not the controls' own disabled state — as before, they keep their place in the tab order
   * and stay operable from the keyboard. They gain an `aria-disabled` they did not have, so
   * the state is at least announced. Reflected, because the rule implementing it is an
   * attribute selector on the host.
   */
  @property({ type: Boolean, reflect: true }) accessor disabled = false;

  /** Whether the field has text in it, and so whether the clear button is rendered. */
  @state() accessor hasText = false;

  /**
   * Typed non-null, and not guarded below. The clear button is rendered from `hasText`,
   * which only becomes true on an input event from this very field — so if the query ever
   * came back empty the template had changed underneath, and throwing says so. A `null`
   * guard there would instead emit an empty `search-change` while leaving the visible text
   * in place.
   */
  @query('.search-input') private accessor _input!: HTMLInputElement;

  private _handleInput(event: Event) {
    const { value } = event.target as HTMLInputElement;
    this.hasText = value.length > 0;
    this.emit<KeepDatabaseSearchChangeDetail>('search-change', { value });
  }

  private _handleClear() {
    this._input.value = '';
    this.hasText = false;
    this.emit<KeepDatabaseSearchChangeDetail>('search-change', { value: '' });
  }

  private _handleSelect(event: Event) {
    event.stopPropagation();
    const { item } = (event as CustomEvent<{ item: { value: string } }>).detail;
    this.emit<KeepDatabaseSearchTypeChangeDetail>('search-type-change', { searchType: item.value });
  }

  render() {
    const searchTypes = [this.nameType, NSF_SEARCH_TYPE];
    return html`
      <div class="search-container" role="search">
        <wa-dropdown @wa-select=${this._handleSelect}>
          <button
            class="type-trigger"
            slot="trigger"
            type="button"
            aria-disabled=${this.disabled ? 'true' : 'false'}
          >
            <span class="type-label">${this.searchType}</span>
            <wa-icon
              class="caret"
              library=${FA_LIBRARY}
              name="caret-down"
              canvas="auto"
            ></wa-icon>
          </button>
          ${searchTypes.map(
            (type) => html`<wa-dropdown-item value=${type}>${type}</wa-dropdown-item>`,
          )}
        </wa-dropdown>
        <wa-divider orientation="vertical"></wa-divider>
        <wa-icon
          class="search-icon"
          library=${FA_LIBRARY}
          name="magnifying-glass"
          canvas="auto"
        ></wa-icon>
        <input
          class="search-input"
          type="text"
          placeholder="Search"
          aria-label="Search"
          aria-disabled=${this.disabled ? 'true' : 'false'}
          @input=${this._handleInput}
        />
        ${this.hasText
          ? html`
              <keep-tooltip content="Clear" placement="bottom">
                <button
                  class="clear-button"
                  type="button"
                  aria-label="clear search bar"
                  @click=${this._handleClear}
                >
                  <wa-icon
                    class="clear-icon"
                    library=${FA_LIBRARY}
                    name="xmark"
                    canvas="auto"
                  ></wa-icon>
                </button>
              </keep-tooltip>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-database-search': DatabaseSearch;
  }
}
