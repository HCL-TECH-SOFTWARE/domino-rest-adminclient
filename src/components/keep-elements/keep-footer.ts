/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { BUILD_VERSION } from '../../config.dev';

/**
 * The build-stamp meta tag is injected by `stampBuildVersion()` in `vite.config.mts` and is
 * deliberately absent from the tracked `index.html`, so it exists in a build and not in
 * `vite dev`. The old React footer interpolated the lookup result straight into the string,
 * which rendered the literal text `Build 1.2.3 undefined` whenever the tag was missing.
 * Here the suffix is omitted instead.
 */
const DAILY_BUILD_META = 'meta[name="admin-ui-daily-build-version"]';

/**
 * The fixed copyright strip at the bottom of the shell.
 *
 * Class names are short because they are shadow-scoped, and deliberately *not* the names the
 * global sheet used. `test/styles/dead-selectors.test.ts` matches raw text across `src` and
 * `test`, so reusing a global class name here - even inside a comment - would have kept the
 * orphaned `styles.css` rule looking alive and left two dead rules in the sheet.
 */
@customElement('keep-footer')
export default class Footer extends KeepElement {
  static styles = css`
    /* No host box: the bar inside is fixed and out of flow anyway. */
    :host {
      display: contents;
    }

    .bar {
      display: flex;
      position: fixed;
      padding: 0 15px;
      bottom: 0;
      width: 100%;
      justify-content: flex-end;
      /* Mode-invariant on purpose - the strip is dark in both colour modes, so these are
         literals rather than surface tokens. Carried over unchanged from styles.css. */
      background: #212121;
    }

    /* Hidden below wa-page's mobile breakpoint, where the header bar takes the vertical
       budget this overlay would otherwise claim. Keep the query in step with
       MOBILE_BREAKPOINT_PX in src/AppShell.tsx. */
    @media screen and (width < 768px) {
      .bar {
        display: none;
      }
    }

    .copyright {
      margin: 0;
      margin-right: 20px;
      color: #f5f5f5;
      font-size: 14px;
    }
  `;

  /** Empty when the meta tag is absent, which is the `vite dev` case. */
  @state() accessor dailyBuild = '';

  connectedCallback(): void {
    super.connectedCallback();
    this.dailyBuild = document.querySelector(DAILY_BUILD_META)?.getAttribute('content') ?? '';
  }

  render() {
    const build = this.dailyBuild
      ? `Build ${BUILD_VERSION} ${this.dailyBuild}`
      : `Build ${BUILD_VERSION}`;

    // A real <footer> rather than a div with role="contentinfo": it sits outside wa-page,
    // so it is not nested in another landmark, and the native element needs no ARIA (#713).
    return html`
      <footer class="bar">
        <p class="copyright">
          ${`© ${new Date().getFullYear()}. HCL America Inc. All Rights Reserved.`}
        </p>
        <span class="copyright">${build}</span>
      </footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-footer': Footer;
  }
}
