/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanupLit } from '../../test-utils/lit';
import {
  TABLE_STYLE_TEXT,
  adoptTableStyles,
  resetAdoptedTableStyles,
} from '../../../src/components/keep-elements/keep-data-table.styles';
import '../../../src/components/keep-elements/keep-data-table';
import type DataTable from '../../../src/components/keep-elements/keep-data-table';

/** Mount the element with a real table slotted into it. */
async function mountTable(props: Partial<DataTable> = {}): Promise<DataTable> {
  const el = document.createElement('keep-data-table') as DataTable;
  Object.assign(el, props);
  el.innerHTML = `
    <table>
      <thead><tr><th>Name</th></tr></thead>
      <tbody><tr><td>alpha</td></tr><tr><td>bravo</td></tr></tbody>
    </table>`;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

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

describe('keep-data-table chrome', () => {
  afterEach(cleanupLit);

  it('renders a container with a slot', async () => {
    const el = await mountTable();
    expect(el.shadowRoot!.querySelector('.container')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('slot')).toBeTruthy();
  });

  it('keeps the slotted table in the light DOM', async () => {
    const el = await mountTable();
    expect(el.querySelector('table')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('table')).toBeNull();
  });

  it('adopts the document stylesheet on connect', async () => {
    document.adoptedStyleSheets = [];
    resetAdoptedTableStyles();
    await mountTable();
    expect(sheetCount()).toBe(1);
  });

  it('adopts the sheet once across several instances', async () => {
    document.adoptedStyleSheets = [];
    resetAdoptedTableStyles();
    await mountTable();
    await mountTable();
    expect(sheetCount()).toBe(1);
  });

  it('reflects zebra and header-band so the document sheet can target them', async () => {
    const el = await mountTable({ zebra: true, headerBand: true });
    expect(el.hasAttribute('zebra')).toBe(true);
    expect(el.hasAttribute('header-band')).toBe(true);
  });

  it('reflects neither by default', async () => {
    const el = await mountTable();
    expect(el.hasAttribute('zebra')).toBe(false);
    expect(el.hasAttribute('header-band')).toBe(false);
  });

  it('renders no pagination footer unless asked', async () => {
    const el = await mountTable();
    expect(el.shadowRoot!.querySelector('.pagination')).toBeNull();
  });
});
