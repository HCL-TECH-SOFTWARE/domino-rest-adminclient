// Copyright (C) 2026 HCL America Inc.
// Licensed under the Apache 2.0 License (https://www.apache.org/licenses/LICENSE-2.0.txt)

import { describe, it, expect, afterEach, vi } from 'vitest';
import { resolveWaTypography } from '../../src/services/wa-typography';

describe('resolveWaTypography — real environment (no theme loaded)', () => {
  it('returns an empty object, since neither token is declared in test env', () => {
    expect(resolveWaTypography()).toEqual({});
  });

  it('appends and removes the hidden probe element from the document body', () => {
    const before = document.body.childElementCount;
    resolveWaTypography();
    expect(document.body.childElementCount).toBe(before);
  });
});

describe('resolveWaTypography — with a mocked computed style', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockComputedStyle(opts: {
    sizeTokenDeclared?: boolean;
    fontSize?: string;
    familyTokenDeclared?: boolean;
    fontFamily?: string;
  }) {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      getPropertyValue: (prop: string) => {
        if (prop === '--wa-font-size-s') return opts.sizeTokenDeclared ? '14px' : '';
        if (prop === '--wa-font-family-code') {
          return opts.familyTokenDeclared ? '"Fira Code", monospace' : '';
        }
        return '';
      },
      fontSize: opts.fontSize ?? '',
      fontFamily: opts.fontFamily ?? '',
    } as unknown as CSSStyleDeclaration);
  }

  it('resolves fontSize when the token is declared and the longhand is a valid pixel value', () => {
    mockComputedStyle({ sizeTokenDeclared: true, fontSize: '14px' });
    expect(resolveWaTypography()).toEqual({ fontSize: 14 });
  });

  it('omits fontSize when the resolved longhand is not a finite number', () => {
    mockComputedStyle({ sizeTokenDeclared: true, fontSize: 'abc' });
    expect(resolveWaTypography()).toEqual({});
  });

  it('omits fontSize when the resolved longhand is zero', () => {
    mockComputedStyle({ sizeTokenDeclared: true, fontSize: '0px' });
    expect(resolveWaTypography()).toEqual({});
  });

  it('omits fontSize entirely when the token itself is not declared, even with a plausible longhand', () => {
    mockComputedStyle({ sizeTokenDeclared: false, fontSize: '16px' });
    expect(resolveWaTypography()).toEqual({});
  });

  it('resolves fontFamily when the token is declared and the longhand has no unresolved var()', () => {
    mockComputedStyle({ familyTokenDeclared: true, fontFamily: '"Fira Code", monospace' });
    expect(resolveWaTypography()).toEqual({ fontFamily: '"Fira Code", monospace' });
  });

  it('omits fontFamily when the longhand still contains an unresolved var() (happy-dom mismatch)', () => {
    mockComputedStyle({
      familyTokenDeclared: true,
      fontFamily: 'var(--wa-font-family-code)',
    });
    expect(resolveWaTypography()).toEqual({});
  });

  it('omits fontFamily entirely when the token itself is not declared, even with a plausible longhand', () => {
    mockComputedStyle({ familyTokenDeclared: false, fontFamily: 'Arial, sans-serif' });
    expect(resolveWaTypography()).toEqual({});
  });

  it('resolves both fontSize and fontFamily together when both tokens are declared and valid', () => {
    mockComputedStyle({
      sizeTokenDeclared: true,
      fontSize: '13px',
      familyTokenDeclared: true,
      fontFamily: 'Menlo, monospace',
    });
    expect(resolveWaTypography()).toEqual({ fontSize: 13, fontFamily: 'Menlo, monospace' });
  });
});
