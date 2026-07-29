/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * DOM queries that pierce open shadow roots.
 *
 * Testing Library's `screen` queries stop at the shadow boundary. The table
 * characterization tests (#771) must keep passing after PRs 4 and 5, where the pagination
 * chrome moves from MUI's light-DOM `<tfoot>` into `<keep-data-table>`'s shadow root. A
 * safety net that has to be edited by the very change it guards is not a safety net, so
 * these helpers look in the light DOM *and* in every open shadow root, and the same call
 * site holds before and after.
 *
 * Deliberately dumb: no caching, no MutationObserver, no closed-root handling. Every root
 * in this app is open (Lit's default), and the suites are small enough that walking the
 * tree per query costs nothing worth optimising.
 */

/** The document, then every open shadow root beneath it, depth-first. */
export function allRoots(root: Document | ShadowRoot = document): Array<Document | ShadowRoot> {
  const roots: Array<Document | ShadowRoot> = [root];
  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (el.shadowRoot) roots.push(...allRoots(el.shadowRoot));
  }
  return roots;
}

/** Every match for `selector`, across all roots, in document order per root. */
export function deepQueryAll<E extends Element = Element>(selector: string): E[] {
  return allRoots().flatMap((root) => Array.from(root.querySelectorAll<E>(selector)));
}

/** The first match for `selector`, or `null`. */
export function deepQuery<E extends Element = Element>(selector: string): E | null {
  return deepQueryAll<E>(selector)[0] ?? null;
}

/**
 * A `<button>` by its `aria-label`, wherever it lives.
 *
 * Throws rather than returning null: a missing pagination button is always a test failure,
 * and `deepButton('Next Page').click()` on null reports a useless `TypeError`.
 *
 * MUI's `IconButton` and `keep-data-table`'s nav both label these buttons `First Page`,
 * `Previous Page`, `Next Page`, `Last Page` — so this is the one query that spans the
 * migration unchanged.
 */
export function deepButton(accessibleName: string): HTMLButtonElement {
  const found = deepQuery<HTMLButtonElement>(`button[aria-label="${accessibleName}"]`);
  if (!found) {
    const available = deepQueryAll<HTMLButtonElement>('button[aria-label]')
      .map((b) => b.getAttribute('aria-label'))
      .join(', ');
    throw new Error(`No button labelled "${accessibleName}". Available: [${available}]`);
  }
  return found;
}
