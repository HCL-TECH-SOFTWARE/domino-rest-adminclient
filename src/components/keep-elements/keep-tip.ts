/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/card/card.js';
import { KeepElement } from './keep-element';

/**
 * One of the four overview tiles, on `<wa-card>`.
 * Tag: `keep-tip`. Exposed via `KeepElements.tsx` as `KeepTip`.
 *
 * Replaces the MUI `Card`/`CardActionArea`/`CardContent`/`CardMedia` stack that
 * `components/home/sections/Tip.tsx` used to render.
 *
 * ## The link stays in the light DOM, deliberately
 *
 * The caller passes the anchor in, rather than this element taking an `href` and rendering
 * one:
 *
 * ```html
 * <keep-tip heading="Schemas" description="…">
 *   <a slot="media" href="/admin/ui/schema"><img src="…" alt=""></a>
 * </keep-tip>
 * ```
 *
 * Three things depend on that anchor being reachable from the document, and all three break
 * silently if it moves inside this shadow root — a click from a shadow tree is *retargeted*,
 * so listeners above see this host and not the `<a>`:
 *
 * 1. `NavigationGuardContext` catches in-app navigation with a document-level capture
 *    listener doing `e.target.closest('a[href]')`. Retargeted, that returns `null` and the
 *    unsaved-changes prompt stops appearing.
 * 2. The router's own `Link` click handler, which is what makes navigation client-side
 *    rather than a full page load.
 * 3. Hover prefetching of the route's chunk (#813 step 4), which hangs off the same `Link`.
 *
 * So the element owns the *card*, and the caller owns the *link*. The Lit `<keep-link>` that
 * replaces `Link` when the views convert will slot in here unchanged.
 *
 * `<slot name="media" slot="media">` forwards whatever is passed into `<wa-card>`'s own media
 * slot — a slot inside a shadow root can itself be assigned to a slot further down.
 *
 * ## Stretching the click target
 *
 * The whole tile is clickable, as it was when the anchor wrapped everything. `:host` is the
 * positioning context and the caller's stylesheet stretches the anchor's `::after` across
 * it. That half cannot live here: shadow CSS can style a slotted element with `::slotted()`,
 * but not its pseudo-elements — `::slotted(a)::after` matches nothing.
 */
@customElement('keep-tip')
export default class Tip extends KeepElement {
  static styles = css`
    :host {
      /* The positioning context the caller's stretched-link ::after resolves against. */
      position: relative;
      display: flex;
      flex: 1;
      color-scheme: inherit;
    }

    wa-card {
      --wa-panel-background-color: var(--wa-color-surface-raised);
      --wa-panel-border-color: var(--wa-color-surface-border);
      --border-radius: var(--wa-border-radius-l);
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /* The media is a link wrapping an image; both need to fill the slot rather than sit
       at their intrinsic size. */
    ::slotted([slot='media']) {
      display: block;
      line-height: 0;
    }

    .heading {
      display: block;
      font-size: var(--wa-font-size-l);
      color: var(--wa-color-text-loud);
    }

    .description {
      display: block;
      font-size: var(--wa-font-size-s);
      color: var(--wa-color-text-normal);
    }
  `;

  /** The tile's title, e.g. "Schemas". */
  @property({ type: String }) accessor heading = '';

  /** The line under it. */
  @property({ type: String }) accessor description = '';

  render() {
    return html`
      <wa-card appearance="filled-outlined">
        <slot name="media" slot="media"></slot>
        <span class="heading">${this.heading}</span>
        <span class="description">${this.description}</span>
      </wa-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-tip': Tip;
  }
}
