/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import type { LitElement } from 'lit';

/**
 * Mount a Lit custom element into the jsdom document for testing.
 *
 * Creates the element by tag, assigns the given reactive properties, appends it
 * to `document.body`, and awaits the first render (`updateComplete`) so the
 * shadow root is populated before assertions.
 *
 * @param tagName Registered custom-element tag (import the component module first
 *   so it self-registers via `@customElement`).
 * @param props Partial set of reactive properties to assign before first render.
 */
export async function mountLit<T extends LitElement>(
  tagName: string,
  props: Partial<T> = {},
): Promise<T> {
  const el = document.createElement(tagName) as T;
  Object.assign(el, props);
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

/** Remove everything mounted during a test. Call in `afterEach`. */
export function cleanupLit(): void {
  document.body.innerHTML = '';
}
