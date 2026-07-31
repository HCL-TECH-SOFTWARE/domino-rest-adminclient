/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  applyHoistedStyles,
  hoistInlineStyles,
  installInlineStyleHoisting,
} from '../../src/services/monaco-inline-styles';

/**
 * #1002 — the two halves of moving Monaco's inline styles across the line
 * `style-src-attr 'none'` draws: the attribute is refused, `style.setProperty` is not.
 *
 * These are jsdom tests of string rewriting and CSSOM writes, both of which jsdom does
 * faithfully. What jsdom cannot do is CSP, so "and therefore nothing is refused" is not
 * assertable here — that was measured in Chrome against the built bundle under the
 * `/admin/ui` policy, scrolling a 500-line document.
 */

const HOISTED = 'data-keep-monaco-style';

describe('hoistInlineStyles', () => {
  it('moves a style attribute to the data attribute', () => {
    const html = '<div style="top:0px;height:18px;">x</div>';

    expect(hoistInlineStyles(html)).toBe(`<div ${HOISTED}="top:0px;height:18px;">x</div>`);
  });

  it('leaves markup without a style attribute untouched', () => {
    const html = '<span class="mtk1">const x = 1;</span>';

    expect(hoistInlineStyles(html)).toBe(html);
  });

  it('keeps the other attributes, whichever side of style they sit on', () => {
    const html = '<div class="view-line" style="top:36px" data-i="2">x</div>';

    const out = hoistInlineStyles(html);

    expect(out).toContain('class="view-line"');
    expect(out).toContain('data-i="2"');
    expect(out).toContain(`${HOISTED}="top:36px"`);
    expect(out).not.toContain(' style=');
  });

  it('rewrites every tag in a batch, the way a rendered viewport arrives', () => {
    const html = Array.from(
      { length: 3 },
      (_, i) => `<div style="top:${i * 18}px;height:18px;"><span class="mtk1">line</span></div>`,
    ).join('');

    const out = hoistInlineStyles(html);

    expect(out.match(new RegExp(HOISTED, 'g'))).toHaveLength(3);
    expect(out).not.toContain(' style=');
  });

  /**
   * The one that decides whether this approach is safe at all.
   *
   * The editor renders source code, and Monaco's escaper touches only `<`, `>` and `&` —
   * so a document containing an HTML style attribute reaches the rewrite as text with real
   * quotes in it. Rewriting that would corrupt the file on screen. Scoping the match to tag
   * interiors is what prevents it, and `<`/`>` being escaped is why that scoping holds.
   */
  it('does not touch a style attribute that is part of the rendered document text', () => {
    const html = '<span class="mtk1">&lt;p style="color:red"&gt;hello&lt;/p&gt;</span>';

    expect(hoistInlineStyles(html)).toBe(html);
  });
});

describe('applyHoistedStyles', () => {
  it('replays declarations through the CSSOM and clears the marker', () => {
    const root = document.createElement('div');
    root.innerHTML = `<div ${HOISTED}="top:36px;height:18px;line-height:18px;">x</div>`;

    applyHoistedStyles(root);

    const line = root.firstElementChild as HTMLElement;
    expect(line.style.top).toBe('36px');
    expect(line.style.height).toBe('18px');
    expect(line.style.lineHeight).toBe('18px');
    expect(line.hasAttribute(HOISTED)).toBe(false);
  });

  it('applies every marked node under the root, however deep', () => {
    const root = document.createElement('div');
    root.innerHTML =
      `<div ${HOISTED}="top:0px"><span ${HOISTED}="width:22px"><b ${HOISTED}="left:4px">x</b></span></div>`;

    applyHoistedStyles(root);

    expect(root.querySelectorAll(`[${HOISTED}]`)).toHaveLength(0);
    expect((root.querySelector('b') as HTMLElement).style.left).toBe('4px');
  });

  it('skips a malformed declaration instead of throwing away the rest of the batch', () => {
    // A throw here would land inside a MutationObserver callback on the render path and
    // take the remaining records with it.
    const root = document.createElement('div');
    root.innerHTML = `<div ${HOISTED}="nonsense;top:12px">x</div>`;

    expect(() => applyHoistedStyles(root)).not.toThrow();
    expect((root.firstElementChild as HTMLElement).style.top).toBe('12px');
  });

  it('is a no-op when nothing is marked', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div class="view-line">x</div>';

    expect(() => applyHoistedStyles(root)).not.toThrow();
    expect(root.innerHTML).toBe('<div class="view-line">x</div>');
  });
});

describe('installInlineStyleHoisting', () => {
  let original: unknown;

  beforeEach(() => {
    original = self.MonacoEnvironment;
  });

  afterEach(() => {
    self.MonacoEnvironment = original as typeof self.MonacoEnvironment;
  });

  it('installs a policy whose createHTML hoists', () => {
    self.MonacoEnvironment = undefined;

    installInlineStyleHoisting();
    const policy = self.MonacoEnvironment!.createTrustedTypesPolicy!('editorViewLayer', {
      createHTML: (value: string) => value,
    });

    expect(policy!.createHTML!('<div style="top:0px">x</div>')).toBe(
      `<div ${HOISTED}="top:0px">x</div>`,
    );
  });

  it("passes the caller's createHTML the rewritten markup, not the original", () => {
    self.MonacoEnvironment = undefined;
    const seen: string[] = [];

    installInlineStyleHoisting();
    const policy = self.MonacoEnvironment!.createTrustedTypesPolicy!('editorViewLayer', {
      createHTML: (value: string) => {
        seen.push(value);
        return value;
      },
    });
    policy!.createHTML!('<div style="top:0px">x</div>');

    expect(seen).toEqual([`<div ${HOISTED}="top:0px">x</div>`]);
  });

  /**
   * `defaultWorkerFactory` asks for a `createScriptURL` policy and never calls
   * `createHTML`. Dropping it takes out the language services — diagnostics, completion —
   * with nothing in the styling path to hint at why.
   */
  it('passes createScriptURL through for the worker factory policy', () => {
    self.MonacoEnvironment = undefined;
    const createScriptURL = (value: string) => `${value}?trusted`;

    installInlineStyleHoisting();
    const policy = self.MonacoEnvironment!.createTrustedTypesPolicy!('defaultWorkerFactory', {
      createScriptURL,
    });

    expect(policy!.createScriptURL!('/worker.js')).toBe('/worker.js?trusted');
  });

  it('preserves an environment that is already there', () => {
    const getWorker = () => ({}) as Worker;
    self.MonacoEnvironment = { getWorker } as typeof self.MonacoEnvironment;

    installInlineStyleHoisting();

    expect(self.MonacoEnvironment!.getWorker).toBe(getWorker);
    expect(self.MonacoEnvironment!.createTrustedTypesPolicy).toBeTypeOf('function');
  });
});
