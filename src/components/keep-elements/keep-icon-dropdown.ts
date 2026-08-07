/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/dropdown/dropdown.js';
import '@awesome.me/webawesome/dist/components/dropdown-item/dropdown-item.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import { appIconSkeleton, appIconSkeletonStyles } from './app-icon-skeleton';
import { FA_LIBRARY } from '../../services/icon-library';
import {
  APP_ICON_NAMES,
  DEFAULT_APP_ICON_NAME,
  appIconUri,
  loadAppIcons,
} from '../../services/app-icons';

/** Payload of {@link IconDropdown}'s `icon-select` event. */
export interface KeepIconSelectDetail {
  /** One of the 86 names in `APP_ICON_NAMES`. */
  iconName: string;
}

/** `wa-dropdown`'s selection event, narrowed to the two fields this element reads. */
type WaSelect = Event & { detail: { item: { value: string; checked: boolean } } };

/**
 * The application-icon picker: a trigger showing the current icon and its name, and a menu
 * of all 86. Tag: `keep-icon-dropdown`. Exposed to React as `KeepIconDropdown`.
 *
 * ## It resolves icons from the service, not from the React icon component
 *
 * The component this replaces rendered `AppIcon`, which stays React (#806 parks it: its
 * `as` prop takes a component type, which has no custom-element equivalent, and its other
 * call sites are form files). Nothing here needed the component — only the `data:` URI
 * behind the name — so `appIconUri` is called directly and `AppIcon` is untouched. The
 * three-state handling it provides is reproduced: an unknown name falls back to the default
 * icon, a known name whose payload has not landed shows the shared skeleton, and #772's
 * lazily loaded payload chunk is requested on connect.
 *
 * ## Selection comes from `wa-select`, not from a click on each item
 *
 * Web Awesome synthesises a click only for *pointer* selection, so a per-item click handler
 * is dead for anyone driving the menu with the arrow keys and Enter, and it fires on a
 * disabled item because a listener bound to one still runs. `wa-select` is the only path
 * that covers both and honours `disabled` (#925). The event is composed, so it is stopped
 * here: `icon-select` is this element's whole outbound contract.
 *
 * ## The parent still owns the value
 *
 * {@link iconName} comes down as a property and a pick leaves as `icon-select`; the element
 * never writes its own value. That is the same division the React pair had, and it is what
 * the wrapper requires — `@lit/react` re-applies every prop on every parent render with no
 * dirty check, so an element that also set the value would fight it.
 *
 * Two props of the original are gone. `selectedIndex` was a second source of truth for the
 * same fact: the caller kept an index *and* a name and they could disagree, and they did —
 * the dialog started at index 1 (`barcode_scanner`) while displaying `beach`, so the menu
 * opened with the tick on the wrong row, and loading a schema from a file moved the name
 * without moving the index. The tick is derived from {@link iconName} here, so they cannot
 * drift. `anchorEl`/`handleClose` were the old menu's manual positioning and dismissal,
 * which `wa-dropdown` owns. A `size` prop was declared, passed as 45, and never read.
 *
 * ## What the shadow boundary cost
 *
 * All of it — the container's padding came from a styled block, the trigger and the label
 * from class selectors, and the image's box from Web Awesome's bare `img` rule in the
 * native layer. All are restated below.
 *
 * **The icon tile has a size for the first time.** Its class asked for `35` with no unit on
 * both `width` and `height`; unitless lengths are a quirks-mode quirk, and the app has a
 * doctype, so both declarations were dropped at parse and the only thing bounding a 150px
 * image was the native layer's `max-width: 100%`. The tile therefore rendered at whatever
 * width the flex row happened to leave it. Verified in Chrome by loading the same rule with
 * and without a doctype: 35px in quirks mode, 36.3px (i.e. the container, not the rule) in
 * standards mode. It is 35px now, which is what the rule always meant and what the
 * equivalent tile in the Quick Config form uses.
 */
@customElement('keep-icon-dropdown')
export default class IconDropdown extends KeepElement {
  static styles = [
    appIconSkeletonStyles,
    css`
      /* The page's border-box reset is a universal selector and does not cross a shadow
         boundary. The trigger below is sized from its content plus padding, so without it
         the tile and the caret sit on a box measured content-box while every sibling in
         the dialog measures border-box. */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      /* Was the input-container styled block: padding above and below, nothing else. */
      :host {
        display: block;
        padding: 5px 0;
      }

      /* Was a framework text button. A native button instead, so the control keeps its
         semantics without the framework's emitted styles — which, being injected after the
         app sheet, beat the app's own class at equal specificity and painted the label in
         the brand purple and upper case. Only the label span escaped that, because its own
         rule targeted the span directly; the caret did not, and is the normal text colour
         here for the first time. Display is vertical (flex-column) to match Quick Config. */
      .trigger {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        padding: 0;
        border: 0;
        background: none;
        cursor: pointer;
        font-family: inherit;
        font-size: inherit;
        color: var(--wa-color-text-normal);
      }

      /* A native button draws a ring on pointer clicks too, which the framework button
         suppressed. Keyboard users keep theirs. */
      .trigger:focus {
        outline: none;
      }

      .trigger:focus-visible {
        outline: var(--wa-focus-ring);
        outline-offset: calc(-1 * var(--wa-focus-ring-width));
      }

      /* The tile. See the class docblock for why it has a size at all. The rounding comes
         from Web Awesome's native layer, which styles every image through a bare element
         selector and therefore stops at this boundary. */
      .icon-image,
      .trigger .app-icon-skeleton {
        width: 35px;
        height: 35px;
        object-fit: contain;
        display: block;
        margin-bottom: 8px;
        border-radius: var(--wa-border-radius-m);
      }

      /* The name label below the icon in vertical layout. */
      .name {
        text-transform: capitalize;
        padding: 0;
        color: var(--wa-color-text-normal);
      }

      /* wa-icon has no size property — the glyph takes its box from font-size, and the
         utility class that used to supply it is in the document sheet. 18px is what that
         class set. */
      .caret {
        font-size: 18px;
      }

      /* The items are direct children of wa-dropdown — no wrapper around them. Its item
         lookup reads the default slot's assigned elements, which are top-level
         assignments and not descendants, so a wrapping element leaves that list empty: no
         arrow keys, no Home/End, no type-ahead, no roving focus, and no checkmark-column
         alignment. Clicks keep working, because the click handler walks up from the event
         target instead — the same shape as #925, working for the mouse and dead for the
         keyboard. It also puts a plain container inside the panel's menu role.

         Nothing is lost by dropping the wrapper: the panel already caps itself to the
         space available and scrolls, which is what a 86-item list needs. */
      .menu-image,
      wa-dropdown-item .app-icon-skeleton {
        width: 20px;
        height: 20px;
        object-fit: contain;
        display: block;
        border-radius: var(--wa-border-radius-s);
      }
    `,
  ];

  /**
   * The icon currently chosen. Owned by the parent — see the class docblock.
   *
   * Anything outside the 86 known names displays the default icon, as the picker's three
   * render sites did before through the React icon component's own fallback.
   */
  @property({ type: String }) accessor iconName = DEFAULT_APP_ICON_NAME;

  /**
   * What the trigger calls itself to a screen reader, before the current value.
   *
   * The visible caption sits in the parent's light DOM and an IDREF cannot cross a shadow
   * boundary, so the name is built here instead. The original set `aria-controls` to an id
   * that existed on no element, and left the button's accessible name as the icon name
   * alone — which says what is chosen but not what is being chosen.
   */
  @property({ type: String }) accessor label = 'Icon';

  /** Set once the lazily loaded payload chunk (#772) lands, so `render` swaps in the icons. */
  @state() private accessor iconsReady = false;

  connectedCallback(): void {
    super.connectedCallback();
    void loadAppIcons().then(
      () => {
        this.iconsReady = true;
      },
      () => {
        /* leave the skeletons up; nothing here can retry usefully */
      },
    );
  }

  private handleSelect(event: Event): void {
    // The event is composed and would otherwise surface on the parent as a Web Awesome
    // event it never asked for. Only stopPropagation to let dropdown close normally.
    event.stopPropagation();
    const { item } = (event as WaSelect).detail;

    // wa-dropdown flips a checkbox item's own `checked` before it emits. Here the ticks
    // mirror `iconName`, which only the parent can change, so it is put straight back: the
    // committed value of the binding has not moved, and re-picking the icon that is already
    // chosen would otherwise leave its row visibly unticked until some other render.
    item.checked = item.value === this.iconName;

    this.emit<KeepIconSelectDetail>('icon-select', { iconName: item.value });
  }

  /** The tile for `name`, or the shared skeleton while its payload is still in flight. */
  private renderIcon(name: string, className: string) {
    if (!this.iconsReady) return appIconSkeleton();
    const src = appIconUri(name) || appIconUri(DEFAULT_APP_ICON_NAME);
    return html`<img class=${className} src=${src} alt="" />`;
  }

  render() {
    return html`
      <wa-dropdown @wa-select=${this.handleSelect}>
        <button
          class="trigger"
          slot="trigger"
          type="button"
          aria-label="${this.label}: ${this.iconName}"
        >
          ${this.renderIcon(this.iconName, 'icon-image')}
          <span class="name">${this.iconName.toLowerCase()}</span>
          <wa-icon class="caret" library=${FA_LIBRARY} name="chevron-down" canvas="auto"></wa-icon>
        </button>
        ${APP_ICON_NAMES.map(
          (name) => html`
            <wa-dropdown-item type="checkbox" value=${name} ?checked=${name === this.iconName}>
              <span slot="icon">${this.renderIcon(name, 'menu-image')}</span>
              ${name}
            </wa-dropdown-item>
          `,
        )}
      </wa-dropdown>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-icon-dropdown': IconDropdown;
  }
}
