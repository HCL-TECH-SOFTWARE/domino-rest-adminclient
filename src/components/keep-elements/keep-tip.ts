/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/card/card.js';
import { KeepElement } from './keep-element';
import { RouterController } from '../../router/RouterController';

/**
 * One of the four overview tiles on the `/` route, on `<wa-card>`. Tag: `keep-tip`.
 *
 * It replaces the card stack that `components/home/sections/Tip.tsx` rendered, and since
 * #806 wave 8 it replaces that file as well: the tile owns its link and its image instead of
 * taking them as slotted light DOM.
 *
 * ## The anchor is in this shadow root now — the note that said it could not be is wrong
 *
 * This element used to carry a long argument for keeping the `<a>` outside, in the caller's
 * light DOM, because a click from a shadow tree is *retargeted* and three things read the
 * anchor off the click. All three have since moved:
 *
 * 1. The unsaved-changes guard no longer does `e.target.closest('a[href]')`. #884/#901
 *    changed it to `e.composedPath().find(...)`, which walks *into* an open shadow root and
 *    finds this anchor. `keep-tip.test.ts` mounts the real guard — `keep-navigation-guard`,
 *    which was `navigation/NavigationGuard.tsx` until wave 8 — clicks this anchor and asserts
 *    the navigation is held; and asserts alongside it that the traversal #901 replaced still
 *    finds nothing, so the pass is `composedPath()` doing the work.
 * 2. Client-side navigation was the router's React `Link`. {@link RouterController} (#926)
 *    supplies `href` and `navigate` to any element, so the anchor can be built here.
 * 3. Hover prefetching of the route chunk (#813) hung off the same `Link`, and the
 *    controller exposes `prefetch` too.
 *
 * What is left of the old constraint is the one real limit, recorded so it is not
 * rediscovered: `composedPath()` stops at a **closed** shadow root. Lit opens its roots, so
 * nothing here is affected.
 *
 * Moving the anchor in is what lets the tile be one link with one accessible name: the
 * heading and description are the anchor's own content, and its `::after` stretches over the
 * card so the whole tile is the hit area. That could not be expressed from outside —
 * `::slotted(a)::after` matches nothing, which is why the stretch rule used to live in a
 * document-scope Linaria block.
 *
 * ## Two things that were silently broken before this rewrite
 *
 * - The card asked for `--wa-spacing-l`, which **no stylesheet in this repo or in Web
 *   Awesome defines** — it is the Shoelace-era spelling of `--wa-space-l`. An unresolved
 *   custom property makes the declaration invalid at computed-value time, so the four tiles
 *   have been sitting flush against each other with their raised shadows overlapping.
 * - The link had **no accessible name**. It wrapped only the decorative image, whose `alt`
 *   is empty precisely so the tile is not announced twice — so a screen reader read out
 *   "link" and nothing else, four times.
 */

/**
 * How long a pointer must rest on a link before it counts as intent to go there (#813).
 *
 * The same 80 ms `router/react.tsx` uses for `Link` and `keep-side-nav` uses for the rail.
 * This is now the third copy; they should become one helper (`router/prefetch-intent.ts`)
 * once no agent owns the other two.
 */
const PREFETCH_INTENT_MS = 80;

/** `navigator.connection`, which TypeScript's DOM lib does not declare. */
type NetworkInformation = { saveData?: boolean; effectiveType?: string };

/** Whether speculative fetching is welcome on this connection. Mirrors `router/react.tsx`. */
const prefetchIsWelcome = (): boolean => {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  return connection.effectiveType !== '2g' && connection.effectiveType !== 'slow-2g';
};

@customElement('keep-tip')
export default class Tip extends KeepElement {
  static readonly styles = css`
    /* The document's border-box reset does not cross a shadow boundary. */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    :host {
      display: flex;
      flex: 1;
      color-scheme: inherit;
    }

    /*
     * NO BACKTICKS ANYWHERE IN THIS BLOCK. It sits inside a css tagged-template literal, so
     * a backtick ends the template and the file stops parsing. Cost me a dev-server crash.
     *
     * The tile has to read as a raised surface in LIGHT mode, where WebAwesome gives it
     * almost nothing to work with:
     *
     * - --wa-color-surface-raised and --wa-color-surface-default are BOTH white. The
     *   original set background: var(--wa-color-surface-raised) and so was white on white;
     *   only the framework's own elevation shadow separated it from the page.
     * - --wa-color-surface-border is --wa-color-neutral-90, and the neutral ramp is
     *   mode-invariant, so in light mode that is a near-white line on a white page.
     * - wa-card's own box-shadow: var(--wa-shadow-s) resolves to about 0 2px 2px -1px:
     *   real, but not enough to lift a near-white card off white.
     *
     * So: --wa-shadow-l for elevation you can actually see, and the NEUTRAL border ramp
     * rather than the surface one. Border and shadow were both raised a step after looking
     * at them on the page -- quiet (neutral-90 in light) and shadow-m still read as faint.
     * neutral-border-normal is neutral-80 in light and neutral-30 in dark, so it holds up
     * both ways; the dark surfaces already differ (#1e1e2e against #252535, keep-theme.css).
     *
     * Nothing here sets --wa-panel-background-color, --wa-panel-border-color or
     * --border-radius: wa-card reads none of the three. It reads --wa-color-surface-*,
     * --wa-panel-border-radius and --wa-shadow-s. Setting the others looks like theming and
     * does nothing at all -- they were copied from keep-default-card, where they are equally
     * inert.
     *
     * position: relative is the containing block for the stretched link overlay below. It
     * is on the card rather than on the host so the hit area is exactly the visible tile;
     * against the host it would cover the surrounding space too, and two neighbouring tiles
     * would meet with no dead space between their click targets.
     *
     * The inline margin is 0 and the space between tiles is a gap on the row instead
     * (#963). As two touching margins it was 2 x --wa-space-l, i.e. 48px, which is set by
     * nothing that names it -- a gap says the number once, and says it where the tiles are
     * laid out rather than inside one tile. The block margin stays: it is this element's own
     * breathing room above and below, not spacing between siblings.
     */
    wa-card {
      --wa-panel-border-radius: var(--wa-border-radius-l);
      position: relative;
      margin: var(--wa-space-l) 0;
      border-color: var(--wa-color-neutral-border-normal);
      box-shadow: var(--wa-shadow-l);
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    /*
     * The document sheet sizes images through a bare img selector and that does not cross a
     * shadow boundary. wa-card's own media rule covers the same ground for a slotted child,
     * but it is one version bump from not doing so, and this is one declaration.
     */
    img {
      display: block;
      width: 100%;
      height: auto;
    }

    /*
     * The tile link. It is the card body, and its overlay is the rest of the card: one link,
     * one accessible name, whole tile clickable. It must not look like body text set in link
     * blue -- the framework styles bare anchors from a document layer that stops at this
     * boundary, so the reset here is what the tile has always rendered as.
     */
    .tile {
      display: block;
      color: inherit;
      text-decoration: none;
    }

    .tile::after {
      content: '';
      position: absolute;
      inset: 0;
    }

    /*
     * The focus ring traces the whole hit area rather than the two lines of text, so what is
     * focused and what a click will hit are the same shape. Negative offset keeps it inside
     * the card, which clips its own overflow.
     */
    .tile:focus-visible {
      outline: none;
    }

    .tile:focus-visible::after {
      outline: var(--wa-focus-ring);
      outline-offset: calc(-1 * var(--wa-focus-ring-width));
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

  /** The tile's title, e.g. "Database Management - REST API". */
  @property({ type: String }) accessor heading = '';

  /** The line under it. */
  @property({ type: String }) accessor description = '';

  /** Base-relative route this tile leads to, e.g. `/schema`. */
  @property({ type: String }) accessor uri = '';

  /** The card's media image. Decorative — the heading and description carry the meaning. */
  @property({ type: String }) accessor image = '';

  /**
   * The app's router (#926).
   *
   * The tile never reads the location — only moves it — so the selector is constant and this
   * host never re-renders on navigation. `href`, `navigate` and `prefetch` read the router on
   * each call, which is what lets a test install a memory-backed one after the element exists.
   */
  private readonly route = new RouterController(this, () => null);

  private prefetchTimer?: ReturnType<typeof setTimeout>;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    // A tile can be unmounted mid-hover — the route changes under it. Without this the timer
    // still fires and fetches a chunk for a tile that is no longer on screen.
    this.cancelPrefetch();
  }

  /**
   * Plain left-click navigates in-app; everything else belongs to the browser, so modified
   * clicks still open a tab or a window.
   *
   * When the unsaved-changes guard blocks the click it has already called
   * `stopPropagation()` in the capture phase, so this never runs.
   */
  private readonly onClick = (event: MouseEvent): void => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    this.route.navigate(this.uri);
  };

  private readonly startPrefetch = (): void => {
    if (this.prefetchTimer !== undefined || !prefetchIsWelcome()) return;
    this.prefetchTimer = setTimeout(() => {
      this.prefetchTimer = undefined;
      this.route.prefetch(this.uri);
    }, PREFETCH_INTENT_MS);
  };

  private readonly cancelPrefetch = (): void => {
    if (this.prefetchTimer === undefined) return;
    clearTimeout(this.prefetchTimer);
    this.prefetchTimer = undefined;
  };

  render() {
    return html`
      <wa-card appearance="filled-outlined">
        ${this.image ? html`<img slot="media" src=${this.image} alt="" />` : nothing}
        <a
          class="tile"
          href=${this.route.href(this.uri)}
          @click=${this.onClick}
          @pointerenter=${this.startPrefetch}
          @pointerleave=${this.cancelPrefetch}
          @focus=${this.startPrefetch}
          @blur=${this.cancelPrefetch}
        >
          <span class="heading">${this.heading}</span>
          <span class="description">${this.description}</span>
        </a>
      </wa-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-tip': Tip;
  }
}
