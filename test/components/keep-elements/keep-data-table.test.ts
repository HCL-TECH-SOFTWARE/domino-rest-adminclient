/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  TABLE_STYLE_TEXT,
  adoptTableStyles,
  resetAdoptedTableStyles,
} from '../../../src/components/keep-elements/keep-data-table.styles';

const sheetCount = () => (document.adoptedStyleSheets ?? []).length;

describe('keep-data-table styles', () => {
  beforeEach(() => {
    document.adoptedStyleSheets = [];
    resetAdoptedTableStyles();
  });

  // The sheet is adopted into the document, so it is global: a selector that does not
  // start with the tag would restyle every table in the app. Grouped selectors are split
  // on the comma as well — checking only the first would let `keep-data-table th, td`
  // through, which is precisely the mistake worth catching.
  it('scopes every selector to the keep-data-table tag', () => {
    const selectors = TABLE_STYLE_TEXT.split('}')
      .map((block) => block.split('{')[0])
      .flatMap((group) => group.split(','))
      .map((selector) => selector.trim())
      .filter(Boolean);

    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      expect(selector, `unscoped selector: ${selector}`).toMatch(/^keep-data-table\b/);
    }
  });

  it('adopts the sheet into the document', () => {
    expect(sheetCount()).toBe(0);
    adoptTableStyles();
    expect(sheetCount()).toBe(1);
  });

  it('adopts only once no matter how many times it is called', () => {
    adoptTableStyles();
    adoptTableStyles();
    adoptTableStyles();
    expect(sheetCount()).toBe(1);
  });
});
