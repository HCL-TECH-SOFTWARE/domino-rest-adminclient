/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { LitElement } from 'lit';

/**
 * Shared base class for every Keep Lit element.
 *
 * Kept intentionally thin during the `.js` → TypeScript conversion (reports/02
 * §6.1, §6.7). Its two current jobs:
 *
 * 1. Give one place for future shared theme/token wiring (see reports/03) so
 *    per-component dark-mode overrides can be consolidated later without
 *    touching every element again.
 * 2. Standardise the outbound event contract (reports/02 §6.4) via {@link emit}:
 *    a composed, bubbling `CustomEvent` that reliably crosses the shadow
 *    boundary and is picked up by the `@lit/react` wrappers in
 *    `KeepElements.tsx`.
 *
 * ## No `style` attributes in these templates
 *
 * The production CSP (`jar/config/config.json`) sends **`style-src-attr 'none'`**, so a
 * `style="…"` attribute set at runtime does not apply. Measured in Chrome against that
 * policy — the distinction is exact and worth knowing, because it is why this went
 * unnoticed for so long:
 *
 * | How the style gets there | Applies? |
 * |---|---|
 * | `element.setAttribute('style', …)` | **no** |
 * | Lit **interpolated** `style="${…}"` (an `AttributePart`, i.e. `setAttribute`) | **no** |
 * | Lit **static** `style="…"` (cloned with the template, never re-parsed) | yes |
 * | `element.style.setProperty(…)` — the CSSOM | yes |
 *
 * So the static ones worked and the interpolated ones silently did not: the attribute
 * appears in the DOM and inspects correctly, the styling just never lands. `keep-default
 * -card`'s status dot rendered with no colour and `keep-autocomplete`'s caret never
 * rotated, for as long as that policy has shipped.
 *
 * Lit's `styleMap` directive is **not** a fix: its first render returns a string that Lit
 * sets as an attribute, and only later updates go through `style.setProperty`.
 *
 * Use a class and a rule in `static styles`. `test/csp-inline-styles.test.ts` keeps the
 * count at zero — including the static ones, which work today but are one interpolation
 * away from not working. #685.
 */
export class KeepElement extends LitElement {
  /**
   * Dispatch a `CustomEvent` that bubbles and crosses the shadow boundary.
   *
   * @param type   Event name (e.g. `'change'`, `'data-changed'`).
   * @param detail Optional payload placed on `event.detail`.
   * @param options Extra `EventInit` overrides (e.g. `cancelable`).
   * @returns The dispatched event (so callers can read `defaultPrevented`).
   */
  protected emit<T = unknown>(type: string, detail?: T, options?: EventInit): CustomEvent<T> {
    const event = new CustomEvent<T>(type, {
      bubbles: true,
      composed: true,
      cancelable: false,
      ...options,
      detail: detail as T,
    });
    this.dispatchEvent(event);
    return event;
  }
}
