/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, type PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';

/**
 * Custom-styled tooltip. Tag: `keep-tooltip`. Exposed via `KeepElements.tsx` as
 * `KeepTooltip`.
 *
 * The trigger is projected through a default `<slot>`; the popup and arrow are
 * created imperatively and appended to the nearest `<dialog>` ancestor (or the
 * document body) so they sit in the correct top-layer context.
 */
@customElement('keep-tooltip')
export default class Tooltip extends KeepElement {
  static styles = css`
    :host {
      display: inline-block;
    }
  `;

  @property({ type: String }) content = '';
  @property({ type: String }) placement = 'top';
  @property({ attribute: 'without-arrow', type: Boolean }) withoutArrow = false;

  private _popup: HTMLDivElement | null = null;
  private _arrow: HTMLDivElement | null = null;
  private _visible = false;
  private readonly _showBound = this._showPopup.bind(this);
  private readonly _hideBound = this._hidePopup.bind(this);

  private _findContainer(): HTMLElement {
    // Walk up the composed path to find the nearest <dialog> ancestor.
    // showModal() promotes <dialog> to the top layer; any popup appended
    // to document.body would render *below* it. Appending inside the
    // dialog keeps the popup in the same top-layer context.
    let node: Node | null = this.parentNode;
    while (node) {
      if (node instanceof HTMLDialogElement) return node;
      node = (node.parentNode || (node instanceof ShadowRoot ? node.host : null)) as Node | null;
    }
    return document.body;
  }

  connectedCallback(): void {
    super.connectedCallback();

    this._popup = document.createElement('div');
    this._popup.setAttribute('role', 'tooltip');
    Object.assign(this._popup.style, {
      position: 'fixed',
      zIndex: '9999',
      background: 'var(--keep-tooltip-surface)',
      color: 'var(--keep-tooltip-on)',
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: 'var(--wa-font-size-s)',
      fontFamily: 'var(--wa-font-sans, inherit)',
      lineHeight: '1.4',
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
      pointerEvents: 'none',
      whiteSpace: 'normal',
      wordBreak: 'break-word',
      textAlign: 'center',
      maxWidth: '480px',
      width: 'max-content',
      display: 'none',
    });

    this._arrow = document.createElement('div');
    Object.assign(this._arrow.style, {
      position: 'fixed',
      zIndex: '9998',
      width: '0',
      height: '0',
      pointerEvents: 'none',
      display: 'none',
    });

    // Append to nearest <dialog> ancestor (if any) so the popup sits in
    // the same top-layer context as a showModal() dialog. Falls back to
    // document.body for normal page use.
    const container = this._findContainer();
    container.appendChild(this._popup);
    container.appendChild(this._arrow);
    this.addEventListener('mouseenter', this._showBound);
    this.addEventListener('mouseleave', this._hideBound);
    this.addEventListener('focus', this._showBound, true);
    this.addEventListener('blur', this._hideBound, true);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._popup?.remove();
    this._arrow?.remove();
    this._popup = null;
    this._arrow = null;
    this._visible = false;
    this.removeEventListener('mouseenter', this._showBound);
    this.removeEventListener('mouseleave', this._hideBound);
    this.removeEventListener('focus', this._showBound, true);
    this.removeEventListener('blur', this._hideBound, true);
  }

  updated(changed: PropertyValues): void {
    // If content changes while the tooltip is open, update it live
    if (changed.has('content') && this._visible && this._popup) {
      this._popup.textContent = this.content;
      this._position();
    }
  }

  private _showPopup(): void {
    if (!this._popup || !this.content) return;
    this._visible = true;
    this._popup.textContent = this.content;

    // No theme branch here: --keep-tooltip-surface flips under .wa-dark, and the
    // popup is appended to the document (or the enclosing <dialog>), so it inherits
    // the custom property from :root either way. connectedCallback() already set the
    // background to that var; re-asserting it per show would only undo a caller's
    // override for no benefit.
    this._popup.style.display = 'block';
    if (!this.withoutArrow && this._arrow) this._arrow.style.display = 'block';
    this._position();
  }

  private _hidePopup(): void {
    this._visible = false;
    if (this._popup) this._popup.style.display = 'none';
    if (this._arrow) this._arrow.style.display = 'none';
  }

  private _position(): void {
    // Use the first slotted child's rect for centering so the arrow points
    // to the actual trigger element, not the (potentially wider) host.
    const slot = this.shadowRoot?.querySelector('slot');
    const assigned = slot?.assignedElements() ?? [];
    const anchorEl = assigned[0] ?? this;
    const rect = anchorEl.getBoundingClientRect();
    const pop = this._popup;
    const arrow = this._arrow;
    if (!pop || !arrow) return;
    const gap = 6;
    const arrowSize = 6;

    pop.style.visibility = 'hidden';
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    pop.style.visibility = '';

    const bg = 'var(--keep-tooltip-surface)';
    let popTop, popLeft, arrowTop, arrowLeft, arrowBorder;

    switch (this.placement) {
      case 'bottom':
        popTop = rect.bottom + gap + arrowSize;
        popLeft = rect.left + rect.width / 2 - pw / 2;
        arrowTop = rect.bottom + gap;
        arrowLeft = rect.left + rect.width / 2 - arrowSize;
        arrowBorder = `0 ${arrowSize}px ${arrowSize}px ${arrowSize}px`;
        arrow.style.borderColor = `transparent transparent ${bg} transparent`;
        break;
      case 'left':
        popTop = rect.top + rect.height / 2 - ph / 2;
        popLeft = rect.left - pw - gap - arrowSize;
        arrowTop = rect.top + rect.height / 2 - arrowSize;
        arrowLeft = rect.left - gap - arrowSize * 2;
        arrowBorder = `${arrowSize}px 0 ${arrowSize}px ${arrowSize}px`;
        arrow.style.borderColor = `transparent transparent transparent ${bg}`;
        break;
      case 'right':
        popTop = rect.top + rect.height / 2 - ph / 2;
        popLeft = rect.right + gap + arrowSize;
        arrowTop = rect.top + rect.height / 2 - arrowSize;
        arrowLeft = rect.right + gap;
        arrowBorder = `${arrowSize}px ${arrowSize}px ${arrowSize}px 0`;
        arrow.style.borderColor = `transparent ${bg} transparent transparent`;
        break;
      case 'top':
      default:
        popTop = rect.top - ph - gap - arrowSize;
        popLeft = rect.left + rect.width / 2 - pw / 2;
        arrowTop = rect.top - gap - arrowSize;
        arrowLeft = rect.left + rect.width / 2 - arrowSize;
        arrowBorder = `${arrowSize}px ${arrowSize}px 0 ${arrowSize}px`;
        arrow.style.borderColor = `${bg} transparent transparent transparent`;
    }

    pop.style.top = `${Math.max(4, popTop)}px`;
    pop.style.left = `${Math.max(4, popLeft)}px`;

    arrow.style.borderWidth = arrowBorder;
    arrow.style.borderStyle = 'solid';
    arrow.style.top = `${arrowTop}px`;
    arrow.style.left = `${arrowLeft}px`;
  }

  render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-tooltip': Tooltip;
  }
}
