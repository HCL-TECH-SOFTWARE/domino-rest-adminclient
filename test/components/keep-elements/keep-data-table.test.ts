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
import { KeepDataTable } from '../../../src/components/keep-elements/KeepElements';

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

  // A row-header cell (`<th scope="row">`) lives in tbody — ViewsTable and FormsTable both
  // use one for their edit column. An unqualified `th` selector styles it as a header:
  // bold, 30px of top padding, and a bottom border the row should not have. MUI's
  // tableCellClasses.head/.body split used to prevent that; this sheet has to do it by
  // scoping. Found in a browser during #771 PR 4 — `css: false` means no test here can see
  // a computed style, so pin the selector instead.
  it('scopes the header rules to thead, so a tbody row-header stays a body cell', () => {
    const headerRuleSelectors = TABLE_STYLE_TEXT.split('}')
      .map((block) => block.split('{'))
      .filter(([, declarations]) => declarations && /font-weight:\s*bold|padding-top:/.test(declarations))
      .flatMap(([selector]) => selector.split(',').map((s) => s.trim()).filter(Boolean));

    expect(headerRuleSelectors.length).toBeGreaterThan(0);
    for (const selector of headerRuleSelectors) {
      expect(selector, `header rule not scoped to thead: ${selector}`).toMatch(/\bthead\b/);
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

const footer = (el: DataTable) => el.shadowRoot!.querySelector('.pagination')!;
const rangeText = (el: DataTable) => el.shadowRoot!.querySelector('.range')!.textContent!.trim();
const select = (el: DataTable) => el.shadowRoot!.querySelector('select') as HTMLSelectElement;

describe('keep-data-table pagination footer', () => {
  afterEach(cleanupLit);

  it('renders the footer when paginated', async () => {
    const el = await mountTable({ paginated: true, count: 42 });
    expect(footer(el)).toBeTruthy();
  });

  it('shows the current range', async () => {
    const el = await mountTable({ paginated: true, count: 42, page: 0, rowsPerPage: 5 });
    expect(rangeText(el)).toBe('1–5 of 42');
  });

  it('shows the range for a later page', async () => {
    const el = await mountTable({ paginated: true, count: 42, page: 2, rowsPerPage: 5 });
    expect(rangeText(el)).toBe('11–15 of 42');
  });

  it('clamps the range end to the count on the last page', async () => {
    const el = await mountTable({ paginated: true, count: 42, page: 8, rowsPerPage: 5 });
    expect(rangeText(el)).toBe('41–42 of 42');
  });

  it('shows the whole set when rowsPerPage is -1 (All)', async () => {
    const el = await mountTable({ paginated: true, count: 42, page: 0, rowsPerPage: -1 });
    expect(rangeText(el)).toBe('1–42 of 42');
  });

  it('reads 0 of 0 when there are no rows', async () => {
    const el = await mountTable({ paginated: true, count: 0, rowsPerPage: 5 });
    expect(rangeText(el)).toBe('0 of 0');
  });

  it('renders an option per rowsPerPageOptions entry, labelling -1 as All', async () => {
    const el = await mountTable({ paginated: true, count: 42 });
    const labels = Array.from(select(el).options).map((o) => o.textContent!.trim());
    expect(labels).toEqual(['5', '10', '25', 'All']);
  });

  it('emits rows-per-page-change on selection', async () => {
    const el = await mountTable({ paginated: true, count: 42, rowsPerPage: 5 });
    let detail: { rowsPerPage: number } | undefined;
    el.addEventListener('rows-per-page-change', (e) => {
      detail = (e as CustomEvent<{ rowsPerPage: number }>).detail;
    });
    const control = select(el);
    control.value = '25';
    control.dispatchEvent(new Event('change', { bubbles: true }));
    expect(detail).toEqual({ rowsPerPage: 25 });
  });

  it('does not mutate rowsPerPage itself', async () => {
    const el = await mountTable({ paginated: true, count: 42, rowsPerPage: 5 });
    const control = select(el);
    control.value = '25';
    control.dispatchEvent(new Event('change', { bubbles: true }));
    await el.updateComplete;
    expect(el.rowsPerPage).toBe(5);
  });
});

const navButton = (el: DataTable, label: string) =>
  el.shadowRoot!.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;

const NAV_LABELS = ['First Page', 'Previous Page', 'Next Page', 'Last Page'];

/** Click a nav button and return the page it asked for, if any. */
const pageFrom = (el: DataTable, label: string): number | undefined => {
  let detail: { page: number } | undefined;
  el.addEventListener('page-change', (e) => {
    detail = (e as CustomEvent<{ page: number }>).detail;
  });
  navButton(el, label).click();
  return detail?.page;
};

describe('keep-data-table pagination navigation', () => {
  afterEach(cleanupLit);

  it('renders all four navigation buttons', async () => {
    const el = await mountTable({ paginated: true, count: 42 });
    for (const label of NAV_LABELS) {
      expect(navButton(el, label), label).toBeTruthy();
    }
  });

  it('disables first and previous on page 0', async () => {
    const el = await mountTable({ paginated: true, count: 42, page: 0, rowsPerPage: 5 });
    expect(navButton(el, 'First Page').disabled).toBe(true);
    expect(navButton(el, 'Previous Page').disabled).toBe(true);
    expect(navButton(el, 'Next Page').disabled).toBe(false);
  });

  it('disables next and last on the final page', async () => {
    const el = await mountTable({ paginated: true, count: 42, page: 8, rowsPerPage: 5 });
    expect(navButton(el, 'Next Page').disabled).toBe(true);
    expect(navButton(el, 'Last Page').disabled).toBe(true);
    expect(navButton(el, 'Previous Page').disabled).toBe(false);
  });

  it('disables everything when all rows fit on one page', async () => {
    const el = await mountTable({ paginated: true, count: 42, page: 0, rowsPerPage: -1 });
    for (const label of NAV_LABELS) {
      expect(navButton(el, label).disabled, label).toBe(true);
    }
  });

  it('emits the next page', async () => {
    const el = await mountTable({ paginated: true, count: 42, page: 2, rowsPerPage: 5 });
    expect(pageFrom(el, 'Next Page')).toBe(3);
  });

  it('emits the previous page', async () => {
    const el = await mountTable({ paginated: true, count: 42, page: 2, rowsPerPage: 5 });
    expect(pageFrom(el, 'Previous Page')).toBe(1);
  });

  it('emits page 0 for first', async () => {
    const el = await mountTable({ paginated: true, count: 42, page: 5, rowsPerPage: 5 });
    expect(pageFrom(el, 'First Page')).toBe(0);
  });

  it('emits the last page for last', async () => {
    const el = await mountTable({ paginated: true, count: 42, page: 0, rowsPerPage: 5 });
    expect(pageFrom(el, 'Last Page')).toBe(8);
  });

  it('does not mutate page itself', async () => {
    const el = await mountTable({ paginated: true, count: 42, page: 2, rowsPerPage: 5 });
    navButton(el, 'Next Page').click();
    await el.updateComplete;
    expect(el.page).toBe(2);
  });
});

describe('KeepDataTable React wrapper', () => {
  it('is exported and wraps the keep-data-table tag', () => {
    expect(KeepDataTable).toBeTruthy();
    expect(customElements.get('keep-data-table')).toBeTruthy();
  });
});
