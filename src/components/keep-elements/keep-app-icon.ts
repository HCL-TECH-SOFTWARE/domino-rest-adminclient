/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { appIconUri, appIconsLoaded, isAppIconName, loadAppIcons } from '../../services/app-icons';
import { appIconSkeleton, appIconSkeletonStyles } from './app-icon-skeleton';

/**
 * One of the 86 application icons, resolved from the lazily loaded payload chunk (#772).
 *
 * Three states, and the distinction matters: an *unknown* name is a permanent condition
 * that shows the `fallback` slot immediately (the names are bundled eagerly, so this is
 * decided on the first render), whereas a *known* name whose payload has not arrived yet
 * is a transient one that shows a skeleton and resolves itself. Collapsing the first two
 * is the tempting simplification and the wrong one — it makes every card with a stale
 * `iconName` pulse forever.
 *
 * ## The two escape hatches the component had, and what became of them
 *
 * #806 parked this file for three waves because both of its escape hatches were typed
 * against the view library rather than against the DOM.
 *
 * `fallback` took a node and rendered it in place of the whole component. It is now the
 * named `fallback` slot, which is strictly better: the fallback stays in the caller's own
 * light DOM, so the caller's classes still reach it.
 *
 * `as` took an element type and rendered the loaded icon through it — the two application
 * lists passed a styled image so the icon kept a background plate, a radius and a fixed
 * height. **That has no equivalent here and is deliberately not replaced.** A custom
 * element cannot be told to render its internal image as something else, and once that
 * image is in a shadow root no styled component can reach it either. The image is exposed
 * as `part="icon"` instead, and each of those two call sites carries a
 * `keep-app-icon::part(icon)` rule with the declarations its styled image used to hold.
 *
 * ## Where the size comes from
 *
 * The caller's class now lands on the host, where it used to land on the image, so the
 * host is the sized box and the image fills it. A site that sized the image (90 square,
 * 35 square) gets the same box; a site that left the image to size itself still shrinks
 * the host to the image, and reaches the image through the part.
 */
@customElement('keep-app-icon')
export default class AppIcon extends KeepElement {
  static styles = [
    appIconSkeletonStyles,
    css`
      /* The document's border-box reset stops at this boundary, and the padding a call
         site puts on the image part has to come out of the height it declares beside it
         — as it did when that rule was an ordinary class on an ordinary image. */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      :host {
        display: inline-block;
      }

      img,
      .app-icon-skeleton {
        width: 100%;
        height: 100%;
      }

      img {
        display: block;
        object-fit: contain;
      }

      /* The floor the placeholder carried before, for the sites whose class sizes nothing
         and leaves the box to the image: without it the placeholder is zero wide until
         the payload chunk lands, and the slot it stands in collapses. The square itself
         comes from the shared aspect-ratio rule. */
      .app-icon-skeleton {
        min-width: 1em;
        min-height: 1em;
      }
    `,
  ];

  /** The persisted `iconName`. Anything outside the 86 known names renders the slot. */
  @property({ type: String }) accessor name: string | null | undefined = '';

  /**
   * Alternative text for the loaded icon. Empty by default, which is the decorative
   * reading — correct wherever a visible label sits beside the icon.
   */
  @property({ type: String }) accessor alt = '';

  /** Flipped when the lazy payload chunk lands, so render swaps skeleton for icon. */
  @state() private accessor iconsReady = appIconsLoaded();

  connectedCallback(): void {
    super.connectedCallback();
    if (this.iconsReady) return;
    loadAppIcons()
      .then(() => {
        this.iconsReady = true;
      })
      .catch(() => {
        /* leave the placeholder up; the next mount retries the chunk */
      });
  }

  render() {
    if (!isAppIconName(this.name)) return html`<slot name="fallback"></slot>`;
    // The decision is the truthiness of the URI, not the ready flag alone: a known name
    // whose payload is somehow absent from a loaded map is the same transient nothing as
    // one still in flight, and `src="data:image/svg+xml;base64,undefined"` is what a
    // broken-image flash looks like. The flag is read here so the reactive dependency
    // that swaps placeholder for icon is visible in the template rather than implied.
    const uri = this.iconsReady ? appIconUri(this.name) : '';
    if (!uri) return appIconSkeleton();
    return html`<img part="icon" src=${uri} alt=${this.alt} />`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-app-icon': AppIcon;
  }
}
