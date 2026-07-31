/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { deepButton, deepQuery, deepQueryAll } from './shadow';

/** A host whose shadow root holds a labelled button — stands in for keep-data-table's nav. */
class ShadowHost extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    this.attachShadow({ mode: 'open' }).innerHTML =
      '<button aria-label="Next Page">next</button><span class="range">1–5 of 42</span>';
  }
}
customElements.define('test-shadow-host', ShadowHost);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('shadow-piercing queries', () => {
  it('finds a light-DOM element', () => {
    document.body.innerHTML = '<button aria-label="Next Page">next</button>';
    expect(deepButton('Next Page').textContent).toBe('next');
  });

  it('finds an element inside a shadow root', () => {
    document.body.innerHTML = '<test-shadow-host></test-shadow-host>';
    expect(deepButton('Next Page').textContent).toBe('next');
  });

  // The point of the helper: a plain document query cannot see this, which is exactly the
  // failure mode PRs 4/5 would otherwise hit.
  it('sees what document.querySelector cannot', () => {
    document.body.innerHTML = '<test-shadow-host></test-shadow-host>';
    expect(document.querySelector('.range')).toBeNull();
    expect(deepQuery('.range')?.textContent).toBe('1–5 of 42');
  });

  it('returns matches from both the light DOM and shadow roots', () => {
    document.body.innerHTML =
      '<span class="range">light</span><test-shadow-host></test-shadow-host>';
    expect(deepQueryAll('.range').map((el) => el.textContent)).toEqual(['light', '1–5 of 42']);
  });

  it('returns null rather than throwing when nothing matches', () => {
    expect(deepQuery('.nothing-here')).toBeNull();
  });

  it('throws a listing of available labels when a button is missing', () => {
    document.body.innerHTML = '<button aria-label="First Page">first</button>';
    expect(() => deepButton('Last Page')).toThrow(/Available: \[First Page\]/);
  });
});
