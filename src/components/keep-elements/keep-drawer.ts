/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/drawer/drawer.js';
// Import Shoelace components
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';

@customElement('keep-drawer')
export default class Drawer extends KeepElement {
  static styles = css`
        /* dialog, not panel: wa-drawer exposes dialog, header, header-actions, title,
           close-button, close-button__base, body and footer. */
        wa-drawer::part(dialog) {
            background: var(--wa-color-surface-default);
            color: var(--wa-color-text-normal);
        }
        wa-drawer::part(header) {
            background: var(--wa-color-surface-default);
            color: var(--wa-color-text-normal);
        }
        wa-drawer::part(title) {
            background: var(--wa-color-surface-default);
            color: var(--wa-color-text-normal);
        }
        wa-drawer::part(header-actions) {
            background: var(--wa-color-surface-default);
            color: var(--wa-color-text-normal);
        }
        wa-drawer::part(body) {
            background: var(--wa-color-surface-default);
            color: var(--wa-color-text-normal);
            /* Prevent the drawer body itself from scrolling — inner regions handle their own scroll. */
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
  
    /* Was a style attribute on wa-drawer until #685; see the note in keep-element.ts. */
    wa-drawer {
      --size: 40vw;
    }
  `;

  @property({ type: String }) accessor label = 'Drawer Label';
  @property({ type: Boolean }) accessor open = false;
  @property({ attribute: false }) accessor closeFn: (...args: unknown[]) => void = () => {};
  @property({ type: Array }) accessor buttons: unknown[] = [];

  // wa-hide bubbles from child dropdowns/popups. wa-drawer's own `source` lives in its shadow
  // root (internal <dialog> for programmatic/Escape, close-button for the header X), so allow
  // only when `source` is inside the target drawer's shadow root; block everything else.
  private handleHideRequest = (event: CustomEvent<{ source: Element }>) => {
    const target = event.target as Element | null;
    if (!target || target.tagName?.toLowerCase() !== 'wa-drawer') return;
    const source = event.detail?.source;
    if (source && target.shadowRoot?.contains(source)) return;
    event.preventDefault();
  };

  // wa-after-hide also bubbles — ignore ones from child dropdowns.
  private handleAfterHide = (event: CustomEvent) => {
    const target = event.target as Element | null;
    if (!target || target.tagName?.toLowerCase() !== 'wa-drawer') return;
    this.closeFn(event);
  };

  render() {
    return html`
      <wa-drawer
        label="${this.label}"
        ?open="${this.open}"
        @wa-hide="${this.handleHideRequest}"
        @wa-after-hide="${this.handleAfterHide}"
      >
        <slot></slot>
      </wa-drawer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-drawer': Drawer;
  }
}
