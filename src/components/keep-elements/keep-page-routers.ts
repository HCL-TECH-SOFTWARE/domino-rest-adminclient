/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KeepElement } from './keep-element';

/**
 * The breadcrumb strip above the page, hidden on mobile.
 *
 * Its one child is `keep-breadcrumb-router`, converted in #806 wave 7 and slotted in from
 * `keep-views` since #719 P4. The two could now collapse into one element — this host adds a
 * height, a mobile hide and nothing else — but that is a pure CSS merge with a layout risk the
 * suite cannot see (`css: false`), so it is left for a change that can be checked in a browser.
 *
 * The Linaria block also carried a `.arrow-left { width: 70px }` rule. Nothing in the tree has
 * ever had that class, so it is dropped rather than moved - which is fortunate, because a rule
 * reaching into a *slotted* child could not have stayed in this shadow root at all:
 * `::slotted()` matches only the slotted node itself, never its descendants.
 */
@customElement('keep-page-routers')
export default class PageRouters extends KeepElement {
  static styles = css`
    /* was PageRouterContainer */
    :host {
      height: 60px;
      display: block;
      justify-content: center;
      align-items: center;
      flex: 1;
    }

    /* Carried over as-is, including the old MUI-style boundary that includes 768. The shell
       uses (width < 768px) now; aligning them shifts behaviour by one pixel, so it is left
       for lane B. */
    @media only screen and (max-width: 768px) {
      :host {
        display: none;
      }
    }
  `;

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-page-routers': PageRouters;
  }
}
