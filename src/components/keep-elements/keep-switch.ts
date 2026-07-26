import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/switch/switch.js';
import { KeepElement } from './keep-element';

/**
 * Thin wrapper around `<wa-switch>`.
 * Tag: `keep-switch`. Exposes a single `onToggle` callback wired to the inner
 * switch's `wa-change` event.
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
      color: light-dark(inherit, #ffffff);
    }
    :host-context(body[data-theme="dark"]) wa-switch::part(label) {
      color: #ffffff !important;
    }
    /* The slot content itself (the \`<slot></slot>\` is light-DOM-distributed
       into wa-switch's label slot); style it explicitly too. */
    ::slotted(*) {
      color: light-dark(inherit, #ffffff);
    }
    :host-context(body[data-theme="dark"]) ::slotted(*) {
      color: #ffffff !important;
    }
  `;

  @property({ attribute: false }) onToggle: ((e: Event) => void) | null = null;

  render() {
    return html`
      <wa-switch @wa-change=${this.onToggle}>
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
