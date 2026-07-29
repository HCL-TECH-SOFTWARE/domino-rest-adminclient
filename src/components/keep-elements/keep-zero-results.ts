/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';

/**
 * The "nothing here" state for a list or search result.
 *
 * The React original composed five global utility classes (`large-text`,
 * `color-text-primary`, `m-0`, `mt-15` and a bottom-margin one); their computed values are
 * inlined below, since global CSS does not cross a shadow boundary. The first four are still
 * used by other files and stay in `styles.css`. The fifth had no other consumer, so its rule
 * is deleted with this commit - and is not named here, because
 * `test/styles/dead-selectors.test.ts` matches raw text and a mention would have kept it
 * looking alive.
 *
 * The text colour is the `--text-color-primary` custom property, **not** the `#000` that
 * `color-text-primary` sets. That utility has a dark-mode override
 * (`body[data-theme="dark"] .color-text-primary`) which lives in `styles.css` rather than
 * `dark-mode.css`, and it is a light-DOM descendant selector, so it cannot reach into this
 * shadow root. Copying the light-mode literal renders black on a near-black background in dark
 * mode; the custom property is mode-aware and inherits across the boundary. Found in the
 * browser, not by the suite - which runs with `css: false` and cannot see any of this.
 *
 * The Linaria block also defined `.no-result` and `.not-found`, which the markup never
 * applied. Both are dropped.
 */
@customElement('keep-zero-results')
export default class ZeroResults extends KeepElement {
  static styles = css`
    /* No host box - the panel below reproduces the single div the React version rendered. */
    :host {
      display: contents;
    }

    .panel {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      width: 100%;
    }

    /* was .large-text + .color-text-primary */
    .main {
      font-size: 20px;
      color: var(--text-color-primary);
    }

    /* the margin utilities collapsed to their computed result, + .color-text-primary */
    .secondary {
      margin: 15px 0;
      color: var(--text-color-primary);
    }
  `;

  /** The headline, e.g. "Sorry, no result found". */
  @property({ type: String }) accessor mainLabel = '';

  /** The explanatory line under it. */
  @property({ type: String }) accessor secondaryLabel = '';

  render() {
    // role="status" (implicit aria-live="polite") because this replaces a result list that
    // was there a moment ago - a sighted user sees the list vanish, and this is the only
    // signal a screen-reader user gets (WCAG 2.1 AA 4.1.3) (#713).
    return html`
      <div class="panel" role="status">
        <span class="main" data-testid="no-search-result">${this.mainLabel}</span>
        <span class="secondary">${this.secondaryLabel}</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-zero-results': ZeroResults;
  }
}
