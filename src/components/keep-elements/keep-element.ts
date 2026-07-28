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
