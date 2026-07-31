/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';

/**
 * Full-column loading state: four pulsing dots over a caption.
 *
 * Three layouts, selected by the `contained` and `pageHeight` properties:
 *
 *   - default — a page-level overlay: absolutely positioned, `100vh - 100px` tall. This is
 *     what the route fallbacks in `App.tsx` / `keep-views` and the applications list use.
 *   - `contained` — normal flow, filling its parent box. This is the shape the old
 *     `GenericLoading` had, and it is what a loading state nested inside an already-laid-out
 *     panel needs; the overlay variant would escape that panel and cover the page.
 *   - `contained page-height` — normal flow, but sized from the viewport because the parent
 *     has no height of its own to fill. This is the shape the old `APILoadingProgress` had.
 *
 * Three values below are carried over from the Linaria original **unchanged and on purpose**,
 * so that this conversion is behaviour-preserving. All three are lane B's to fix, not this
 * pass's:
 *
 *   - `background: white` under the mobile query is mode-invariant, so it flashes white in
 *     dark mode.
 *   - the dot colour `#1966b3` is a literal, not a `--wa-color-*` token.
 *   - `max-width: 768px` is the old MUI-style boundary, which *includes* 768. The shell has
 *     since moved to `(width < 768px)`, which excludes it. Aligning them shifts behaviour by
 *     one pixel, so it is deliberately left alone here.
 */
@customElement('keep-page-loading')
export default class PageLoading extends KeepElement {
  static styles = css`
    :host {
      display: flex;
      height: calc(100vh - 100px);
      position: absolute;
      flex-direction: column;
      width: 100%;
      left: 0;
      flex: 1;
      align-items: center;
      justify-content: center;
    }

    /*
     * Only the overlay variant needs to paint over whatever it is covering. A contained
     * instance sits inside a panel that already has its own background, and a hard white
     * there would be a light patch in dark mode.
     */
    @media only screen and (max-width: 768px) {
      :host(:not([contained])) {
        background: white;
      }
    }

    /*
     * Contained variant: fill the parent in normal flow rather than overlay the page.
     * Only these two declarations differ — putting the host back in flow is what makes the
     * width and centring above take effect, and the left offset becomes inert. Between them
     * the two sizings cover both kinds of parent: in a flex column the flex-grow above wins,
     * in a block parent the percentage does, and it resolves against the parent's *content*
     * box, so a padded parent does not overflow.
     */
    :host([contained]) {
      position: static;
      height: 100%;
    }

    /*
     * The page-height modifier covers the third kind of parent: one with no definite height
     * of its own. An auto-height flex column (the consents dialog) or a fit-content list (the
     * edit-view column bar) resolves the percentage above to auto, and a zero flex-basis
     * contributes nothing either, so the box collapses onto the dots and the indicator crowds
     * the top of the panel instead of sitting in the middle of it. 100vh - 170px is the
     * page-body height the rest of the app uses for exactly this — see
     * keep-schema-contents-tree, which met the same problem inside its own shadow root.
     *
     * A minimum rather than the fixed height the original carried, for the same reason that
     * element gives: identical whenever this is the only thing in the box, which is the only
     * time it is on screen, and it cannot clip a parent that turns out taller.
     *
     * Deliberately not applied to a bare contained instance. The access panel is
     * 100vh - 200px, i.e. 30px shorter than this, so an unconditional minimum would hand that
     * panel a scrollbar it does not have today.
     */
    :host([contained][page-height]) {
      min-height: calc(100vh - 170px);
    }

    .dots {
      display: flex;
      position: relative;
      height: 30px;
      justify-content: center;
      align-items: center;
    }

    .dots div {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #1966b3;
      animation-timing-function: cubic-bezier(0, 1, 1, 0);
    }

    .dots div:nth-child(1) {
      left: 8px;
      animation: dot-in 0.6s infinite;
    }

    .dots div:nth-child(2) {
      left: 28px;
      animation: dot-shift 0.6s infinite;
    }

    .dots div:nth-child(3) {
      left: 32px;
      animation: dot-shift 0.6s infinite;
    }

    .dots div:nth-child(4) {
      left: 56px;
      animation: dot-out 0.6s infinite;
    }

    @keyframes dot-in {
      0% {
        transform: scale(0);
      }
      100% {
        transform: scale(1);
      }
    }

    @keyframes dot-out {
      0% {
        transform: scale(1);
      }
      100% {
        transform: scale(0);
      }
    }

    @keyframes dot-shift {
      0% {
        transform: translate(0, 0);
      }
      100% {
        transform: translate(24px, 0);
      }
    }

    /*
     * The caption is rendered even with no message, so the live region already exists when
     * the text arrives — but then its default block margin still pushes the dots off centre.
     * The class is set in render() rather than matched with an empty-element pseudo-class,
     * so the suite can assert it: the tests run with CSS disabled.
     */
    p.empty {
      margin: 0;
    }

    /* The dots convey the same thing the caption does, so stopping them costs nothing. */
    @media (prefers-reduced-motion: reduce) {
      .dots div {
        animation: none;
      }
    }
  `;

  /** The caption under the dots. Announced, so it should say what is loading. */
  @property({ type: String }) accessor message = '';

  /**
   * Lay out in normal flow, filling the parent, instead of overlaying the page.
   * Reflected because the two layouts are selected entirely in `static styles`.
   */
  @property({ type: Boolean, reflect: true }) accessor contained = false;

  /**
   * Take the page-body height instead of the parent's, for a `contained` instance whose
   * parent has none to give. A modifier on `contained`: on its own it does nothing, because
   * the overlay variant is already sized from the viewport. Reflected for the same reason.
   */
  @property({ type: Boolean, reflect: true, attribute: 'page-height' })
  accessor pageHeight = false;

  render() {
    // The dots are decorative; the caption carries the information. `role="status"` has an
    // implicit `aria-live="polite"`, so the message is announced when it appears without
    // interrupting whatever the user is doing (WCAG 2.1 AA, 4.1.3) (#713).
    return html`
      <div class="dots" aria-hidden="true">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      <p role="status" class=${this.message ? nothing : 'empty'}>${this.message}</p>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-page-loading': PageLoading;
  }
}
