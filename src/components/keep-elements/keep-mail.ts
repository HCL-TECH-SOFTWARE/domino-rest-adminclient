/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import { FA_LIBRARY } from '../../services/icon-library';

/**
 * The `/mail` placeholder screen — a hero envelope glyph over the word "Mail".
 *
 * **Nothing renders this yet.** The route is parked in a note on `keep-views`' route table,
 * blocked on LABS-1214 (#698); the sidenav entry that would reach it sits behind a
 * `false &&` switch. The screen is converted rather than deleted because #806 asks for it,
 * so that re-enabling the page is a routing change and not a rewrite. Consequently there is
 * deliberately **no `@lit/react` wrapper**: a wrapper with no consumer in `src` is dead code
 * that `test/keep-element-wrappers.test.ts` fails on, and when the route comes back it comes
 * back as `<keep-mail></keep-mail>`.
 *
 * ## Where the styling went
 *
 * The React original was a `FormContainer` (a Linaria `styled.div`) wrapping one utility-class
 * div. None of that crosses a shadow boundary, so it is restated in `static styles` below.
 * Two of the four utility classes it used have no other consumer left once this file replaces
 * it — their rules in `styles.css` are now dead and want deleting, but that sheet belongs to a
 * later pass, so they are not named here: `test/styles/dead-selectors.test.ts` matches raw
 * text and a mention would keep them looking alive.
 *
 * ## The glyph colour is not the one the original computed
 *
 * The secondary-text utility resolves to `--text-color-secondary`, which is a **mode-invariant
 * `#e0e0e0`** — near-white in both themes. On the light surface this screen sits on that is
 * roughly 1.2:1, i.e. a 60px glyph nobody can see; only dark mode ever looked right. It was
 * survivable before #718 because the icon was a Material SvgIcon whose own emotion class set
 * `color: inherit` at equal specificity and later injection order, so the utility never won
 * and the glyph simply inherited body text. Swapping in `wa-icon` handed the utility the
 * argument, and the parked route meant nobody saw the result.
 *
 * `--wa-color-text-quiet` is the mode-aware secondary-text token the rest of the tree uses
 * for exactly this (see `keep-slim-database-card`, which rejected the same property for the
 * same reason). The suite cannot see any of this — it runs with `css: false` — so the
 * comparison was made against the token definitions, and the screen still wants a human
 * eyeball in both modes if the route is ever un-parked.
 */
@customElement('keep-mail')
export default class Mail extends KeepElement {
  static styles = css`
    /*
     * was <FormContainer>. Its box is a plain zero-padding block: the justify-content and
     * align-items it declares are inert on a block container, and its nested
     * .button-create rule has nothing to match on this screen. So all that survives is
     * the block box itself.
     */
    :host {
      display: block;
    }

    /* was .flex .flex-col .justify-center .items-center */
    .page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    /*
     * The hero size the original asked for, kept as a font-size because that is the only
     * lever wa-icon has — it exposes no size property, and a .wa-size-* utility could not
     * have reached this shadow root anyway. See the class note above for the colour.
     */
    .glyph {
      font-size: 60px;
      color: var(--wa-color-text-quiet);
    }

    /*
     * was .large-text + .color-text-primary on a <span>. It is an <h1> now, so the user-agent
     * defaults that come with the tag (2em, bold, block margins) are wound back to what the
     * span rendered. The colour is the custom property rather than the literal #000 the
     * utility sets: that utility's dark-mode override is a light-DOM descendant selector and
     * cannot reach in here, so the literal would render black on near-black.
     */
    .title {
      font-size: 20px;
      font-weight: 400;
      margin: 0;
      color: var(--text-color-primary);
    }
  `;

  render() {
    // The glyph carries no label, so wa-icon renders it aria-hidden — correct, because the
    // heading beside it says the same thing and an announced "envelope" would be a
    // duplicate. The heading itself is an <h1> rather than the original's <span>: this is
    // the whole content of a routed screen, and without it the page has no heading at all,
    // so a screen-reader user landing on /mail gets nothing to orient by (#713).
    return html`
      <div class="page">
        <wa-icon class="glyph" library=${FA_LIBRARY} name="envelope" canvas="auto"></wa-icon>
        <h1 class="title">Mail</h1>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-mail': Mail;
  }
}
