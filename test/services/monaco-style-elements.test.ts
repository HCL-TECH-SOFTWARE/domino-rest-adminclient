/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it } from 'vitest';
import { adoptStyleElements } from '../../src/services/monaco-style-elements';

/**
 * #1002 — the last class of the editor's CSP violations.
 *
 * jsdom has the constructed-stylesheet half (`new CSSStyleSheet()`, `replaceSync`) but not
 * `adoptedStyleSheets` on a document or shadow root, and no CSP at all. So the target here
 * is a plain object with an `adoptedStyleSheets` array — which is exactly the shape the code
 * uses — and "and therefore nothing is refused" was measured in Chrome against the built
 * bundle, not asserted here.
 */

const target = () => ({ adoptedStyleSheets: [] as readonly CSSStyleSheet[] });

/** Waits for a MutationObserver callback, which is delivered as a microtask. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('adoptStyleElements', () => {
  it('adopts a style element rather than inserting it', () => {
    const container = document.createElement('div');
    const owner = target();
    adoptStyleElements(container, owner);

    const style = document.createElement('style');
    style.textContent = '.view-line { color: red; }';
    container.appendChild(style);

    expect(container.children).toHaveLength(0);
    expect(owner.adoptedStyleSheets).toHaveLength(1);
    expect(owner.adoptedStyleSheets[0].cssRules[0].cssText).toContain('.view-line');
  });

  it('returns the element, the way appendChild does', () => {
    // Monaco keeps the return value: `createStyleSheet` hands it back to its caller, which
    // holds it to rewrite the theme later.
    const container = document.createElement('div');
    adoptStyleElements(container, target());

    const style = document.createElement('style');
    expect(container.appendChild(style)).toBe(style);
  });

  it('leaves anything that is not a style element alone', () => {
    const container = document.createElement('div');
    const owner = target();
    adoptStyleElements(container, owner);

    const div = document.createElement('div');
    container.appendChild(div);

    expect(container.children).toHaveLength(1);
    expect(owner.adoptedStyleSheets).toHaveLength(0);
  });

  /**
   * Monaco rewrites the theme sheet's text in place when the theme changes — measured, once
   * per switch. The element is detached by then, which is safe only because observers fire
   * on detached nodes; without this the editor would keep the colours it started with.
   */
  it('replays a later rewrite of the element text', async () => {
    const container = document.createElement('div');
    const owner = target();
    adoptStyleElements(container, owner);

    const style = document.createElement('style');
    style.textContent = '.mtk1 { color: red; }';
    container.appendChild(style);

    style.textContent = '.mtk1 { color: blue; }';
    await flush();

    expect(owner.adoptedStyleSheets[0].cssRules[0].cssText).toContain('blue');
  });

  it('stops adopting once released, and stops replaying too', async () => {
    const container = document.createElement('div');
    const owner = target();
    const release = adoptStyleElements(container, owner);

    const adopted = document.createElement('style');
    adopted.textContent = '.mtk1 { color: red; }';
    container.appendChild(adopted);

    release();

    adopted.textContent = '.mtk1 { color: blue; }';
    await flush();
    expect(
      owner.adoptedStyleSheets[0].cssRules[0].cssText,
      'a released observer went on syncing',
    ).toContain('red');

    const later = document.createElement('style');
    later.textContent = '.mtk2 { color: green; }';
    container.appendChild(later);
    expect(container.children, 'appendChild was not restored').toHaveLength(1);
    expect(owner.adoptedStyleSheets).toHaveLength(1);
  });

  /**
   * Where adoption is unavailable the element must still be inserted. Losing the stylesheet
   * entirely is strictly worse than the violation this exists to prevent, and it is the
   * degradation `keep-monaco-editor`'s `adoptStyles()` already makes.
   */
  it('falls back to inserting when the target cannot adopt', () => {
    const container = document.createElement('div');
    const release = adoptStyleElements(container, {} as { adoptedStyleSheets: CSSStyleSheet[] });

    const style = document.createElement('style');
    style.textContent = '.view-line { color: red; }';
    container.appendChild(style);

    expect(container.children).toHaveLength(1);
    expect(() => release()).not.toThrow();
  });
});

describe('installDocumentHeadAdoption', () => {
  it('wraps document.head once, however often it is called', async () => {
    // Called from `fetchMonaco()`, which is memoised — but a second editor mounting after a
    // hot reload, or any future caller, must not stack a wrapper per call.
    (document as unknown as { adoptedStyleSheets: CSSStyleSheet[] }).adoptedStyleSheets ??= [];
    const { installDocumentHeadAdoption } = await import(
      '../../src/services/monaco-style-elements'
    );

    installDocumentHeadAdoption();
    const wrapped = document.head.appendChild;
    installDocumentHeadAdoption();

    expect(document.head.appendChild).toBe(wrapped);
  });
});
