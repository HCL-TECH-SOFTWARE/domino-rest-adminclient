/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveWaColors } from '../../src/services/wa-color';

describe('resolveWaColors — real environment (no canvas backend installed)', () => {
  it('returns an empty object for an empty token list without touching the DOM', () => {
    const before = document.body.childElementCount;
    expect(resolveWaColors([])).toEqual({});
    expect(document.body.childElementCount).toBe(before);
  });

  it('returns an empty object when no 2D canvas context is available', () => {
    // This repo's jsdom has no <canvas> backend (the `canvas` npm package isn't
    // installed), so getContext('2d') is null and resolveWaColors takes its
    // documented "no 2D canvas (test env, SSR)" early-out.
    expect(resolveWaColors(['--wa-color-text-normal'])).toEqual({});
  });
});

describe('resolveWaColors — with a mocked canvas backend', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Fake CanvasRenderingContext2D. normalise() assigns a sentinel then the candidate
  // color to fillStyle and compares the two readbacks: a real canvas normalizes a
  // *parseable* color to the same string regardless of the prior fillStyle, while an
  // *unparseable* string is silently rejected, leaving whichever sentinel was just set.
  function createFakeCtx(parseable: Record<string, { canonical: string; pixel: number[] }>) {
    let current = '#000000';
    const pixelByCanonical = new Map<string, number[]>();
    for (const entry of Object.values(parseable)) {
      pixelByCanonical.set(entry.canonical, entry.pixel);
    }
    return {
      set fillStyle(value: string) {
        if (value in parseable) {
          current = parseable[value].canonical;
        } else if (value === '#000000' || value === '#ffffff') {
          current = value;
        }
        // else: unparseable candidate — silently rejected, current unchanged.
      },
      get fillStyle() {
        return current;
      },
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      getImageData: vi.fn(() => ({ data: pixelByCanonical.get(current) ?? [0, 0, 0, 0] })),
    } as unknown as CanvasRenderingContext2D;
  }

  function mockCanvas(fakeCtx: CanvasRenderingContext2D) {
    (vi.spyOn(HTMLCanvasElement.prototype, 'getContext') as unknown as {
      mockReturnValue: (v: unknown) => void;
    }).mockReturnValue(fakeCtx);
  }

  function mockComputedColor(color: string) {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      color,
    } as unknown as CSSStyleDeclaration);
  }

  it('resolves an opaque parseable color to #rrggbb', () => {
    mockCanvas(
      createFakeCtx({
        'rgb(18, 52, 86)': { canonical: 'rgb(18, 52, 86)', pixel: [18, 52, 86, 255] },
      }),
    );
    mockComputedColor('rgb(18, 52, 86)');

    expect(resolveWaColors(['--wa-color-text-normal'])).toEqual({
      '--wa-color-text-normal': '#123456',
    });
  });

  it('resolves a translucent parseable color to #rrggbbaa', () => {
    mockCanvas(
      createFakeCtx({
        'rgba(18, 52, 86, 0.5)': { canonical: 'rgba(18, 52, 86, 0.5)', pixel: [18, 52, 86, 128] },
      }),
    );
    mockComputedColor('rgba(18, 52, 86, 0.5)');

    expect(resolveWaColors(['--wa-color-brand-fill-quiet'])).toEqual({
      '--wa-color-brand-fill-quiet': '#12345680',
    });
  });

  it('omits a token whose computed color the canvas cannot parse', () => {
    mockCanvas(createFakeCtx({})); // nothing is recognized as parseable
    mockComputedColor('not-a-color');

    expect(resolveWaColors(['--wa-color-text-normal'])).toEqual({});
  });

  it('resolves multiple tokens independently, omitting only the unparseable ones', () => {
    mockCanvas(
      createFakeCtx({
        'rgb(0, 0, 0)': { canonical: 'rgb(0, 0, 0)', pixel: [0, 0, 0, 255] },
      }),
    );
    const computedByToken: Record<string, string> = {
      '--good': 'rgb(0, 0, 0)',
      '--bad': 'nonsense',
    };
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
      const raw = (el as HTMLElement).style.color; // "var(--good)" / "var(--bad)"
      const token = raw.slice(4, -1);
      return { color: computedByToken[token] ?? '' } as unknown as CSSStyleDeclaration;
    });

    expect(resolveWaColors(['--good', '--bad'])).toEqual({ '--good': '#000000' });
  });

  it('appends and removes the hidden probe element from the document body', () => {
    mockCanvas(
      createFakeCtx({
        'rgb(1, 2, 3)': { canonical: 'rgb(1, 2, 3)', pixel: [1, 2, 3, 255] },
      }),
    );
    mockComputedColor('rgb(1, 2, 3)');

    const before = document.body.childElementCount;
    resolveWaColors(['--wa-color-text-normal']);
    expect(document.body.childElementCount).toBe(before);
  });
});
