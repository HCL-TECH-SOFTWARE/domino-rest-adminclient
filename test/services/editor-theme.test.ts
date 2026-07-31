/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect } from 'vitest';
import {
  EDITOR_THEME_ID,
  EDITOR_COLOR_TOKENS,
  EDITOR_TOKENS,
  buildEditorTheme,
} from '../../src/services/editor-theme';

describe('EDITOR_THEME_ID', () => {
  it('is the fixed Monaco theme id', () => {
    expect(EDITOR_THEME_ID).toBe('cca-editor');
  });
});

describe('EDITOR_TOKENS', () => {
  it('deduplicates tokens shared by more than one color id', () => {
    const allValues = Object.values(EDITOR_COLOR_TOKENS);
    // Several color ids intentionally reuse the same token (e.g. editor.background and
    // editorGutter.background both use --wa-color-surface-default), so the deduped set
    // must be strictly smaller than the raw list of values.
    expect(EDITOR_TOKENS.length).toBeLessThan(allValues.length);
    expect(EDITOR_TOKENS.length).toBe(new Set(EDITOR_TOKENS).size);
  });

  it('contains every distinct token referenced by EDITOR_COLOR_TOKENS, and nothing else', () => {
    const expected = new Set(Object.values(EDITOR_COLOR_TOKENS));
    expect(new Set(EDITOR_TOKENS)).toEqual(expected);
  });
});

describe('buildEditorTheme', () => {
  it('builds the dark theme shape from an empty resolved map', () => {
    const theme = buildEditorTheme('dark', {});
    expect(theme.base).toBe('vs-dark');
    expect(theme.inherit).toBe(true);
    expect(theme.rules).toEqual([]);
    expect(Object.keys(theme.colors ?? {}).sort()).toEqual(
      Object.keys(EDITOR_COLOR_TOKENS).sort(),
    );
  });

  it('builds the light theme shape from an empty resolved map', () => {
    const theme = buildEditorTheme('light', {});
    expect(theme.base).toBe('vs');
    expect(theme.inherit).toBe(true);
    expect(theme.rules).toEqual([]);
  });

  it('falls back to the dark palette for a non-translucent color when unresolved', () => {
    const theme = buildEditorTheme('dark', {});
    expect(theme.colors?.['editor.background']).toBe('#0f1729');
  });

  it('falls back to the light palette for a non-translucent color when unresolved', () => {
    const theme = buildEditorTheme('light', {});
    expect(theme.colors?.['editor.background']).toBe('#ffffff');
  });

  it('applies the translucent alpha suffix to a fallback diff color', () => {
    const theme = buildEditorTheme('dark', {});
    // Fallback is the opaque '#3fb950'; applyAlpha replaces/appends the alpha byte.
    expect(theme.colors?.['diffEditor.insertedLineBackground']).toBe('#3fb95066');
  });

  it('prefers a resolved token over the fallback, for every color id that shares it', () => {
    const theme = buildEditorTheme('dark', {
      '--wa-color-surface-default': '#111111',
    });
    // Both editor.background and editorGutter.background map to this one token.
    expect(theme.colors?.['editor.background']).toBe('#111111');
    expect(theme.colors?.['editorGutter.background']).toBe('#111111');
    // Unrelated colors still fall back.
    expect(theme.colors?.['editor.foreground']).toBe('#e2e8f0');
  });

  it('applies the translucent alpha to a resolved opaque color', () => {
    const theme = buildEditorTheme('dark', {
      '--wa-color-success-fill-normal': '#abcdef',
    });
    expect(theme.colors?.['diffEditor.insertedLineBackground']).toBe('#abcdef66');
  });

  it('replaces rather than appends when the resolved color already carries an alpha byte', () => {
    const theme = buildEditorTheme('dark', {
      '--wa-color-success-fill-normal': '#abcdef99',
    });
    expect(theme.colors?.['diffEditor.insertedLineBackground']).toBe('#abcdef66');
  });

  it('leaves a resolved non-translucent color unmodified', () => {
    const theme = buildEditorTheme('dark', {
      '--wa-color-text-normal': '#123456',
    });
    expect(theme.colors?.['editor.foreground']).toBe('#123456');
  });
});
