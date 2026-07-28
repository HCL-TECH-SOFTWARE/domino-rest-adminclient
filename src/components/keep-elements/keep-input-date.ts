/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import '@awesome.me/webawesome/dist/components/input/input.js';

/**
 * Date field built on the native `<wa-input type="date">` (#703).
 *
 * Replaces `@mui/x-date-pickers`' `DatePicker`, which pulled in MUI X and dayjs for two
 * filter inputs. WebAwesome ships no date picker in any tier, but neither call site
 * needs one: they pick a single day to filter by, with no range, min/max, or locale
 * formatting. The native control is free, accessible, and already themed by WA.
 *
 * The value crossing this boundary is an ISO `YYYY-MM-DD` string, not a `Date`. Callers
 * convert, because parsing `YYYY-MM-DD` with `new Date()` interprets it as **UTC** and
 * can land on the previous day west of Greenwich — see `dateValue`/`onDateChange` in
 * `ConsentFilterContainer`.
 */
@customElement('keep-input-date')
export default class InputDate extends KeepElement {
  static styles = css`
    :host {
      color-scheme: inherit;
    }
    :host-context(body[data-theme='dark']) wa-input::part(form-control-label),
    :host-context(body[data-theme='dark']) wa-input::part(label) {
      color: #ffffff !important;
    }
    :host-context(body[data-theme='dark']) wa-input::part(input) {
      color: var(--wa-color-brand-50) !important;
      -webkit-text-fill-color: var(--wa-color-brand-50) !important;
      caret-color: var(--wa-color-brand-50);
    }
  `;

  /** ISO `YYYY-MM-DD`. */
  @property({ type: String }) value = '';
  @property({ type: String }) label = '';

  private _onInput(event: Event) {
    const next = (event.target as HTMLInputElement).value;
    this.value = next;
    // `date-change` rather than reusing `input`: the WA event also bubbles out of the
    // shadow root, so a consumer listening for `input` would see both.
    this.emit('date-change', { value: next });
  }

  render() {
    return html`
      <wa-input
        type="date"
        label="${this.label}"
        .value="${this.value}"
        style="${this.getAttribute('style') || ''}"
        @input="${this._onInput}"
      ></wa-input>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-input-date': InputDate;
  }
}
