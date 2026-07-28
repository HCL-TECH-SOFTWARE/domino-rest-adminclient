/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, PropertyValues } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/checkbox/checkbox.js';
import { KeepElement } from './keep-element';

type WaCheckbox = HTMLElement & { checked: boolean; updateComplete?: Promise<unknown> };

/**
 * Thin wrapper around `<wa-checkbox>`. Tag: `keep-checkbox`.
 *
 * Re-emits a single composed `change` event when the inner control toggles: the
 * inner (composed) event is stopped at the shadow boundary and a fresh `change`
 * is dispatched from the host, so outside listeners fire exactly once.
 */
@customElement('keep-checkbox')
export default class Checkbox extends KeepElement {
  static styles = css``;

  @property({ type: Boolean }) accessor checked = false;
  @property({ type: Boolean }) accessor disabled = false;
  @property({ type: String }) accessor size = 's';

  private waCheckbox: WaCheckbox | null = null;
  private readonly boundOnChange = (e: Event) => this.onInnerChange(e);

  protected firstUpdated(): void {
    this.waCheckbox = this.shadowRoot?.querySelector('wa-checkbox') as WaCheckbox | null;
    if (!this.waCheckbox) return;
    this.waCheckbox.addEventListener('wa-change', this.boundOnChange);
    this.waCheckbox.addEventListener('change', this.boundOnChange);
    this.waCheckbox.updateComplete?.then(() => this.syncControlBackground(this.checked));
  }

  protected updated(changedProperties: PropertyValues): void {
    if (changedProperties.has('checked') && this.waCheckbox) {
      // Set the property (not just the ?checked attribute) so wa-checkbox
      // updates its internal state reliably.
      this.waCheckbox.checked = this.checked;
      const sync = () => this.syncControlBackground(this.checked);
      if (this.waCheckbox.updateComplete) {
        this.waCheckbox.updateComplete.then(sync);
      } else {
        requestAnimationFrame(sync);
      }
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.waCheckbox) {
      this.waCheckbox.removeEventListener('wa-change', this.boundOnChange);
      this.waCheckbox.removeEventListener('change', this.boundOnChange);
    }
  }

  private syncControlBackground(isChecked: boolean): void {
    const sr = this.waCheckbox?.shadowRoot;
    if (!sr) return;
    const control =
      sr.querySelector('[part~="control"]') ||
      sr.querySelector('[part~="base"]') ||
      sr.querySelector('span');
    if (!control) return;
    (control as HTMLElement).style.backgroundColor = isChecked ? '' : 'transparent';
  }

  private onInnerChange(e: Event): void {
    // Stop the inner wa-checkbox event from crossing the shadow boundary, so an
    // outside listener isn't triggered twice (once by the composed inner event,
    // once by our re-dispatch below).
    e?.stopPropagation?.();
    const newChecked = this.waCheckbox?.checked ?? !this.checked;
    if (this.checked === newChecked) return;
    this.checked = newChecked;
    this.syncControlBackground(newChecked);
    this.emit('change');
  }

  render() {
    return html`
      <wa-checkbox ?checked=${this.checked} ?disabled=${this.disabled} size=${this.size}>
        <slot></slot>
      </wa-checkbox>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-checkbox': Checkbox;
  }
}
