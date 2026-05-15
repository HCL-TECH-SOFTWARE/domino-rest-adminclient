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
    :host {
      display: block;
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
    this.heading = 'Error logging in!';
    this._visible = false;
    this._timer   = null;
  }
 
  /**
   * Show the alert for `duration` ms (default 1 000 — change to 5 000 for production).
   * Called externally by the notify() helper.
   */
  show(message, variant = 'neutral', duration = 1000) {
    clearTimeout(this._timer);
 
    this.message  = message;
    this.variant  = variant;
    this._visible = true;
 
    // Wait one microtask so Lit has rendered .visible before we start the timer
    this.updateComplete.then(() => {
      this._timer = setTimeout(() => this._hide(), duration);
    });
  }
 
  _hide() {
    const wrapper = this.shadowRoot?.querySelector('.toast-wrapper');
    if (!wrapper) return;
 
    wrapper.classList.remove('visible');
    wrapper.classList.add('hiding');
 
    wrapper.addEventListener(
      'animationend',
      () => {
        wrapper.classList.remove('hiding');
        this._visible = false;
        // Notify the host so it can restore pointer-events: none
        this.dispatchEvent(new CustomEvent('alert-closed', { bubbles: true, composed: true }));
      },
      { once: true },
    );
  }
 
  _onClose() {
    clearTimeout(this._timer);
    this._hide();
  }
 
  // After every render that makes the wrapper visible, ensure the class is present
  updated(changed) {
    if (changed.has('_visible') && this._visible) {
      // Ensure .visible is set on the wrapper after Lit stamps the DOM
      const wrapper = this.shadowRoot?.querySelector('.toast-wrapper');
      wrapper?.classList.add('visible');
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