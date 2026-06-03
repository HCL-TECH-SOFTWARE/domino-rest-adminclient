import { LitElement, html, css } from 'lit';
import '@awesome.me/webawesome/dist/components/callout/callout.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/button/button.js';
// Import Shoelace theme (light/dark)
import '@awesome.me/webawesome/dist/styles/webawesome.css';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import '@awesome.me/webawesome/dist/components/callout/callout.js';

class Alert extends LitElement {
  static properties = {
    message: { type: String },
    variant: { type: String },  // brand | success | warning | danger | neutral
    heading: { type: String },
    _visible: { type: Boolean, state: true },
  };
 
  static styles = css`
    /* Reset default popover UA styles and anchor top-right.
       Popover puts us in the top layer, which renders above <dialog> elements like wa-drawer. */
    :host {
      display: block;
      position: fixed;
      top: 1rem;
      right: 1rem;
      left: auto;
      bottom: auto;
      margin: 0;
      padding: 0;
      border: none;
      background: transparent;
      overflow: visible;
      width: auto;
      height: auto;
      max-width: none;
      max-height: none;
      color: inherit;
      z-index: 2147483647;
    }

    :host(:not(:popover-open)) {
      display: none;
    }
 
    .toast-wrapper {
      position: relative;
      min-width: 280px;
      max-width: 420px;
      /* Hidden by default; shown via .visible */
      opacity: 0;
      pointer-events: none;
    }
 
    .toast-wrapper.visible {
      animation: slideIn 0.3s ease forwards;
      pointer-events: auto;
    }
 
    .toast-wrapper.hiding {
      animation: slideOut 0.25s ease forwards;
      pointer-events: none;
    }
 
    @keyframes slideIn {
      from { opacity: 0; transform: translateX(32px); }
      to   { opacity: 1; transform: translateX(0);    }
    }
 
    @keyframes slideOut {
      from { opacity: 1; transform: translateX(0);    }
      to   { opacity: 0; transform: translateX(32px); }
    }
 
    /* Close button — floats in the top-right corner of the callout */
    .close-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: transparent;
      cursor: pointer;
      color: currentColor;
      opacity: 0.6;
      transition: opacity 0.15s ease, background 0.15s ease;
      z-index: 1;
    }
 
    .close-btn:hover {
      opacity: 1;
      background: color-mix(in srgb, currentColor 12%, transparent);
    }
 
    .close-btn svg {
      width: 14px;
      height: 14px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2.5;
      stroke-linecap: round;
    }
 
    /* Give the callout message room so it never slides under the X button */
    wa-callout::part(base),
    wa-callout::part(message),
    wa-callout::part(body) {
      padding-right: 2.5rem;
    }
 
    .message {
      display: block;
      padding-right: 2rem;
    }
    
    @media (prefers-color-scheme: dark) {
      .close-btn {
        color: #888;
      }
    }

    :host-context(body[data-theme="dark"]) .close-btn {
      color: #888 !important;
    }
  `;
 
  constructor() {
    super();
    this.message  = '';
    this.variant  = 'neutral';
    this.heading = 'Network error!';
    this._visible = false;
    this._timer   = null;
  }

  connectedCallback() {
    super.connectedCallback();
    // Enable Popover API so we render in the top layer (above wa-drawer's <dialog>).
    if (!this.hasAttribute('popover')) {
      this.setAttribute('popover', 'manual');
    }
  }
 
  /**
   * Show the alert for `duration` ms (default 1 000 — change to 5 000 for production).
   * Called externally by the notify() helper.
   */
  show(message, variant = 'neutral', duration = 5000, heading) {
    clearTimeout(this._timer);

    this.message  = message;
    this.variant  = variant;
    if (heading !== undefined) {
      this.heading = heading;
    }
    this._visible = true;

    // Move to body so we're not trapped inside another component's shadow tree.
    if (!this._movedToBody && this.isConnected && this.parentNode !== document.body) {
      document.body.appendChild(this);
      this._movedToBody = true;
    }

    // Open via Popover API → places this element in the top layer, above any <dialog>.
    try {
      if (typeof this.showPopover === 'function' && !this.matches(':popover-open')) {
        this.showPopover();
      }
    } catch (_) { /* already open */ }

    this.updateComplete.then(() => {
      this._timer = setTimeout(() => this._hide(), duration);
    });
  }
 
  _hide() {
    const wrapper = this.shadowRoot?.querySelector('.toast-wrapper');
    const finish = () => {
      this._visible = false;
      try {
        if (typeof this.hidePopover === 'function' && this.matches(':popover-open')) {
          this.hidePopover();
        }
      } catch (_) { /* not open */ }
      this.dispatchEvent(new CustomEvent('alert-closed', { bubbles: true, composed: true }));
    };

    if (!wrapper) { finish(); return; }

    wrapper.classList.remove('visible');
    wrapper.classList.add('hiding');
    wrapper.addEventListener(
      'animationend',
      () => {
        wrapper.classList.remove('hiding');
        finish();
      },
      { once: true },
    );
  }
 
  _onClose() {
    clearTimeout(this._timer);
    this._hide();
  }
 
  // Auto-show whenever the `message` attribute/property transitions to a non-empty value.
  // This lets React consumers just render <lit-alert message={msg} /> without manually calling show().
  updated(changed) {
    if (changed.has('_visible') && this._visible) {
      const wrapper = this.shadowRoot?.querySelector('.toast-wrapper');
      wrapper?.classList.add('visible');
    }
    if (changed.has('message')) {
      const prev = changed.get('message');
      if (this.message && this.message !== prev) {
        this.show(this.message, this.variant, undefined, this.heading);
      }
    }
  }
 
  render() {
    return html`
      <div class="toast-wrapper">
        <wa-callout variant=${this.variant}>
            <strong>${this.heading}</strong>
          <span class="message">${this.message}</span>
        </wa-callout>
        <button
          class="close-btn"
          aria-label="Dismiss notification"
          @click=${this._onClose}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <line x1="2" y1="2" x2="14" y2="14"/>
            <line x1="14" y1="2" x2="2"  y2="14"/>
          </svg>
        </button>
      </div>
    `;
  }
}

customElements.define('lit-alert', Alert);

export default Alert