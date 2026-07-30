/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KeepElement } from './keep-element';

/**
 * The scrolling page body of the schema and scope list screens. Tag:
 * `keep-wrapper-container`. Exposed to React as `KeepWrapperContainer`.
 *
 * ## Why this is an element and not a rule folded into someone else's `static styles`
 *
 * It was `commons/Wrappers.tsx` — one bare Linaria `styled.div` with five declarations and
 * a breakpoint, which report 02 marks "→ css" and the tier-A design note expects to
 * *dissolve* into whichever element ends up owning the box.
 *
 * No element owns it yet. Its only two consumers are `SchemasLists` and `ScopeLists`, both
 * of which stay React in this wave, and both render it as their outermost box — so there is
 * no `static styles` to absorb it into. The two remaining homes for the rules were a new
 * class in `src/styles/styles.css` (that tree is frozen until the consumers convert) or a
 * duplicated Linaria block in each consumer. A slotted host with the rules on `:host` beats
 * both: one copy, no global class, and the children stay in the light DOM so their own
 * Linaria classes keep applying.
 *
 * **This element is expected to disappear.** When `SchemasLists` and `ScopeLists` become Lit
 * elements, these six declarations belong on their `:host` and this file, its wrapper and
 * its barrel line should go with them.
 *
 * There is nothing to restate for the shadow boundary: the box has no border, no padding
 * and no colour, so neither the document's `box-sizing` reset nor any utility class changes
 * what it computes to.
 */
@customElement('keep-wrapper-container')
export default class WrapperContainer extends KeepElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      height: calc(100% - 120px);
    }

    /* The 120px is the fixed page chrome above the list, which the mobile layout drops. */
    @media only screen and (max-width: 768px) {
      :host {
        height: 100%;
      }
    }
  `;

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-wrapper-container': WrapperContainer;
  }
}
