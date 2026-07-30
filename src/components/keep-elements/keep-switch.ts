/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import { KeepElement } from './keep-element';

/**
 * Thin wrapper around `<wa-switch>`.
 * Tag: `keep-switch`. Exposes a single `onToggle` callback wired to the inner switch's
 * `change` event.
 *
 * ## The event is `change`, not `wa-change`
 *
 * This was bound to `wa-change` and had been dead for as long as it has shipped: the switch
 * flipped visually and the callback never ran. Web Awesome prefixes only the events that have
 * no native equivalent — `wa-invalid` is prefixed, `change`, `input`, `focus` and `blur` are
 * not — and `wa-switch` documents plain `change`.
 *
 * Every consumer is a "Show Active" filter (the Forms, Views and Agents tabs), so all three
 * filters silently did nothing. Verified in a browser before and after: the inner control
 * reports `checked === true` after a click either way, which is why it looked fine.
 *
 * The test that covered this dispatched `new Event('wa-change')` by hand, so it passed against
 * the broken binding. It now dispatches what `wa-switch` actually emits.
 */
@customElement('keep-switch')
export default class Switch extends KeepElement {
  static styles = css`
    :host {
      color-scheme: inherit;
    }
    /* Slotted label text (e.g. "Show Active"). In dark mode it sits on
       the dark page background, so render it white. */
    wa-switch::part(label) {
      color: var(--wa-color-text-loud);
    }
    :host-context(body[data-theme="dark"]) wa-switch::part(label) {
      color: #ffffff !important;
    }
    /* The slot content itself (the \`<slot></slot>\` is light-DOM-distributed
       into wa-switch's label slot); style it explicitly too. */
    ::slotted(*) {
      color: var(--wa-color-text-loud);
    }
    :host-context(body[data-theme="dark"]) ::slotted(*) {
      color: #ffffff !important;
    }
  `;

  @property({ attribute: false }) accessor onToggle: ((e: Event) => void) | null = null;

  render() {
    return html`
      <wa-switch @change=${this.onToggle}>
        <slot></slot>
      </wa-switch>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-switch': Switch;
  }
}
