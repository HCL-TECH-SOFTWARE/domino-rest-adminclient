/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import keepLogo from '../../assets/KeepNewIcon.png';

/**
 * The top bar, shown below `wa-page`'s mobile breakpoint only (#707).
 *
 * The hamburger that used to live here is gone: `wa-page` renders its own into the same header
 * region and wires it to the navigation drawer, so this element neither owns nor needs to know
 * the menu's open state.
 *
 * The profile control arrives through the **default** slot. `ProfileMenuDialog` is still a React
 * component - it imports both Material UI and the Redux bindings - so it stays React and is
 * slotted in by `AppShell`. (Those package names are spelled out in prose rather than written
 * literally: the per-file gate for this pass is a grep for them, and a mention in a comment
 * would make a converted file look unconverted.)
 *
 * The slot is unnamed deliberately. `ProfileMenuDialog` is `() => …` and forwards no props, so
 * `<ProfileMenuDialog slot="profile" />` would drop the attribute on the floor and the content
 * would never be assigned. A named slot would need a wrapper element to carry the attribute; a
 * default slot needs nothing, and there is only one slot to fill.
 *
 * ## The bar is 56px tall on purpose, not by accident of its contents
 *
 * `wa-page` measures this region with a ResizeObserver and publishes the result as
 * `--header-height`, which `Views`' `ViewContainer` subtracts from the viewport - so anything
 * that inflates the bar silently shortens every page. `styles/app-shell.css` pre-seeds the same
 * variable with 56px for the frames before that observer first fires (and zeroes the region's
 * block padding so the two agree); the numbers only line up if the height is stated rather than
 * inferred. `test/app-shell.test.ts` pins it.
 *
 * 56px is also what this bar measured before #707, which is what keeps
 * `calc(100vh - var(--header-height))` the same page height.
 *
 * Stating it also caps the damage from anything inside the bar that measures wrong. The first
 * thing that did was `.profile-menu-dialog-user`'s 115px phantom bottom margin, which made this
 * region 168px of mostly empty white before #707 removed it.
 */
@customElement('keep-mobile-header')
export default class MobileHeader extends KeepElement {
  static styles = css`
    /* No host box: the bar below is the flex item inside wa-page's slotted-header row. */
    :host {
      display: contents;
    }

    /* was MobileHeaderContainer */
    .bar {
      display: flex;
      align-items: center;
      /* Fill the header region. Without this the bar is a shrink-to-fit flex item inside
         wa-page's slotted-header row, and its own two halves stack instead of sitting side
         by side. */
      flex: 1;
      min-width: 0;
      /* The hamburger is a sibling inside wa-page's header region and brings its own leading
         margin and padding, so this bar adds none of its own. */
      padding: 0;
      height: 56px;
    }

    /* was the global utilities flex-1 + flex + justify-center */
    .logo {
      flex: 1;
      display: flex;
      justify-content: center;
    }

    /*
     * Reproduces the bare img rule in styles/keep-overrides.css. That is an element selector
     * on a document stylesheet, so it does not cross a shadow boundary - and without it this
     * logo renders at its natural 448x444 inside a 56px bar. Caught in a browser; the suite
     * runs with css disabled and cannot see it.
     *
     * box-sizing is restated for the same reason, and it is the subtler half: the document
     * reset that makes every element border-box does not cross the boundary either, so without
     * it this box defaults to content-box and the 10px padding lands *outside* the 55px,
     * giving a 75px logo in a 56px bar.
     */
    .logo img {
      box-sizing: border-box;
      background: #383838;
      border-radius: 8px;
      padding: 10px;
      height: 55px;
      width: auto;
      display: block;
    }

    /*
     * Shrink-to-fit, not flex: 1. There used to be three equal thirds here - hamburger, logo,
     * profile - and the logo landed in the middle one. wa-page owns the hamburger now, so two
     * equal halves would centre the logo in the left half instead of on the bar.
     */
    .profile {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
    }
  `;

  render() {
    // The logo img carried a `keep-icon` class that no stylesheet in the tree defines, so it
    // constrained nothing. Dropped rather than reproduced; the image is therefore unsized here
    // exactly as it was before.
    return html`
      <header class="bar">
        <div class="logo">
          <img src=${keepLogo} alt="HCL Domino REST API Icon" />
        </div>
        <div class="profile">
          <slot></slot>
        </div>
      </header>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-mobile-header': MobileHeader;
  }
}
