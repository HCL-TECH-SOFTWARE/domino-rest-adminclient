# keep-data-table Element Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `keep-data-table` Lit element — table chrome plus optional controlled pagination — so the six MUI Table screens have something to migrate onto.

**Architecture:** The element renders chrome in shadow DOM (container, optional header band, `<slot>`, optional pagination footer) and the consumer slots a plain semantic `<table>`. Because `::slotted()` reaches only directly-assigned nodes and never their descendants, row and cell styling cannot live in `static styles`; it ships as a `CSSStyleSheet` adopted into the document once, scoped by the `keep-data-table` tag name. Pagination is strictly controlled: the element emits and never writes to `page` or `rowsPerPage`.

**Tech Stack:** Lit 3.3.3 with standard (TC39) decorators and `accessor` (#747), TypeScript 7, vitest + jsdom, `@lit/react` for the React wrapper, `--wa-*` design tokens.

**Scope:** This plan covers **PR 2** of the five staged in the spec. Characterization tests (PR 3) and the migrations (PRs 4–5) get their own plans.

**Spec:** `docs/superpowers/specs/2026-07-29-keep-data-table-design.md`

## Global Constraints

- Every reactive field MUST use `accessor` — standard decorators; a plain field throws `Unsupported decorator location: field` at module load (#747).
- Every new file starts with the repo copyright header (`test/copyright-headers.test.ts` enforces it).
- **No `style=` attributes and no interpolated `style="${…}"`.** Production CSP sends `style-src-attr 'none'`; `test/csp-inline-styles.test.ts` holds the count at zero. Use classes and `static styles`.
- Assert on the element's own shadow DOM, never on `wa-*` internals — jsdom does not render them.
- `document.adoptedStyleSheets` is **`undefined` in jsdom**. Always read it as `doc.adoptedStyleSheets ?? []`, never spread it bare.
- The element is **strictly controlled**: it must never assign to `this.page` or `this.rowsPerPage`. `@lit/react` re-applies props every render with no dirty check, so a self-mutating element fights React.
- Coverage gate for `src/components/keep-elements/**` is lines 80 / statements 80 / functions 72 / branches 62.
- Tag name: `keep-data-table`. Default export class name: `DataTable`.

## File Structure

| File | Responsibility |
|---|---|
| `src/components/keep-elements/keep-data-table.styles.ts` | The document-level sheet for slotted table internals, plus the one-time adoption helper. No Lit imports. |
| `src/components/keep-elements/keep-data-table.ts` | The element: chrome, header band, pagination footer, events. |
| `src/components/keep-elements/KeepElements.tsx` | `KeepDataTable` React wrapper with typed events. |
| `src/styles/keep-theme.css` | Adds `--keep-surface-header` (light + dark). |
| `test/components/keep-elements/keep-data-table.test.ts` | Element tests. |

### Deviation from the spec

The spec lists six properties. This plan adds a seventh, **`headerBand`**, because `ConsentsTable` puts a background on its `<thead>` (`light-dark(#F0F4F7, #252535)`) and the other five do not. Without an opt-in flag the migration could not stay visually 1:1. Update the spec's API table when this lands.

---

### Task 1: The document stylesheet and its adoption helper

**Files:**
- Create: `src/components/keep-elements/keep-data-table.styles.ts`
- Test: `test/components/keep-elements/keep-data-table.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `TABLE_STYLE_TEXT: string`, `adoptTableStyles(doc?: Document): void`, `resetAdoptedTableStyles(): void` (test-only reset of the per-document guard).

- [ ] **Step 1: Write the failing test**

Create `test/components/keep-elements/keep-data-table.test.ts`:

```ts
/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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

  it('scopes every rule to the keep-data-table tag', () => {
    const selectors = TABLE_STYLE_TEXT.split('}')
      .map((block) => block.split('{')[0].trim())
      .filter(Boolean);
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      expect(selector.startsWith('keep-data-table')).toBe(true);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/components/keep-elements/keep-data-table.test.ts`
Expected: FAIL — cannot resolve `keep-data-table.styles`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/keep-elements/keep-data-table.styles.ts`:

```ts
/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * Row and cell styling for the table slotted into `<keep-data-table>`.
 *
 * This cannot live in the element's `static styles`. `::slotted()` matches only
 * directly-assigned nodes, never their descendants — the whole `<table>` is slotted, so
 * its `<tr>`/`<td>` are unreachable from the shadow root and `::slotted(table) td` can
 * never match. Slotted content stays in the light DOM, so a document-level sheet scoped
 * by tag name reaches it normally.
 *
 * Adopted rather than injected as a `<style>` element: `adoptedStyleSheets` is not
 * governed by CSP's `style-src`, which production sets tightly (#685).
 *
 * Every selector must start with `keep-data-table` — this sheet is global, and a bare
 * `td` rule would restyle every table in the app. A test enforces that.
 */
export const TABLE_STYLE_TEXT = `
keep-data-table table {
  border-collapse: collapse;
  width: 100%;
}
keep-data-table th,
keep-data-table td {
  padding: 20px 30px;
  text-align: left;
}
keep-data-table th {
  font-weight: bold;
  padding-top: 30px;
  border-bottom: 1px solid var(--wa-color-surface-border);
}
keep-data-table td {
  font-size: var(--wa-font-size-m);
  border-bottom: none;
}
keep-data-table[zebra] tbody tr:nth-of-type(odd) {
  background-color: var(--keep-surface-accent);
}
keep-data-table[header-band] thead {
  background-color: var(--keep-surface-header);
}
keep-data-table tbody tr:last-child th,
keep-data-table tbody tr:last-child td {
  border-bottom: 0;
}
`;

/**
 * Documents that already have the sheet. A `WeakSet` rather than a module-level boolean
 * so a test (or a second document) is tracked independently.
 */
let adoptedDocs = new WeakSet<Document>();

/** Adopt {@link TABLE_STYLE_TEXT} into `doc`, at most once per document. */
export function adoptTableStyles(doc: Document = document): void {
  if (adoptedDocs.has(doc)) return;
  if (typeof CSSStyleSheet === 'undefined') return;

  const sheet = new CSSStyleSheet();
  sheet.replaceSync(TABLE_STYLE_TEXT);
  // jsdom leaves `adoptedStyleSheets` undefined but allows the assignment, so read
  // defensively — spreading it bare throws in every test.
  doc.adoptedStyleSheets = [...(doc.adoptedStyleSheets ?? []), sheet];
  adoptedDocs.add(doc);
}

/** Test-only: forget which documents have been seen. */
export function resetAdoptedTableStyles(): void {
  adoptedDocs = new WeakSet<Document>();
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/components/keep-elements/keep-data-table.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/keep-elements/keep-data-table.styles.ts test/components/keep-elements/keep-data-table.test.ts
git commit -m "Add the keep-data-table document stylesheet and its adoption helper"
```

---

### Task 2: Element chrome and the slot

**Files:**
- Create: `src/components/keep-elements/keep-data-table.ts`
- Modify: `src/styles/keep-theme.css` (add `--keep-surface-header` in both blocks)
- Test: `test/components/keep-elements/keep-data-table.test.ts`

**Interfaces:**
- Consumes: `adoptTableStyles` from Task 1; `KeepElement` from `./keep-element`.
- Produces: default export `class DataTable extends KeepElement`, tag `keep-data-table`, properties `zebra: boolean`, `headerBand: boolean` (attribute `header-band`).

- [ ] **Step 1: Write the failing test**

Add the three `import` lines to the **top** of the test file, beside the existing imports;
everything from `async function mountTable` onward goes at the end.

```ts
import { cleanupLit } from '../../test-utils/lit';
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/components/keep-elements/keep-data-table.test.ts`
Expected: FAIL — cannot resolve `keep-data-table`.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/keep-elements/keep-data-table.ts`:

```ts
/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import { adoptTableStyles } from './keep-data-table.styles';

/**
 * Chrome for a data table. Tag: `keep-data-table`.
 *
 * Slot a plain semantic `<table>`; the element supplies the container, the optional
 * header band and the optional pagination footer. It never sees the row data — cells
 * stay whatever the consumer renders, which is what lets the six MUI screens migrate
 * without rewriting their `<TextField>`, `<ActivateSwitch>` and tooltip cells (#771).
 *
 * Row and cell styling lives in `keep-data-table.styles.ts`, not here — see that file
 * for why `static styles` cannot reach slotted descendants.
 */
@customElement('keep-data-table')
export default class DataTable extends KeepElement {
  static styles = css`
    :host {
      color-scheme: inherit;
      color: var(--wa-color-text-normal);
      display: block;
    }

    .container {
      background: var(--wa-color-surface-raised);
      border: 1px solid var(--wa-color-surface-border);
      border-radius: var(--wa-border-radius-l);
      box-sizing: border-box;
      overflow-x: auto;
    }
  `;

  /** Stripe odd body rows with `--keep-surface-accent`. Reflected: the document sheet targets the attribute. */
  @property({ type: Boolean, reflect: true }) accessor zebra = false;

  /** Tint the `<thead>` with `--keep-surface-header`. Reflected, as above. */
  @property({ type: Boolean, reflect: true, attribute: 'header-band' }) accessor headerBand = false;

  connectedCallback(): void {
    super.connectedCallback();
    adoptTableStyles(this.ownerDocument);
  }

  render() {
    return html`
      <div class="container">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-data-table': DataTable;
  }
}
```

- [ ] **Step 4: Add the `--keep-surface-header` token**

`keep-theme.css` appears to say the opposite — it lists `#f0f4f7` among single-use tints
"left as literals". It is outranked here. `test/components/keep-elements/theme-selectors.test.ts`
enforces the #708 rule for `src/components/keep-elements/**`: chrome colours are tokens,
never `light-dark()` literals, the exception being three enumerated editor-palette files.
A literal in the sheet fails that test, and the reason it exists is exactly this case — a
`light-dark()` pair looks theme-aware, so a new one reads as correct in review.

In the **light** block, beside `--keep-surface-accent: #f8fbff;`:

```css
    --keep-surface-header: #f0f4f7;
```

In the **dark** block, beside `--keep-surface-accent: #1e1e2e;`:

```css
    --keep-surface-header: #252535;
```

Both halves come from `ConsentsTable`'s current `light-dark(#F0F4F7, #252535)`, so the
migration stays 1:1. Also update the light block's comment: move `header` into the list of
tokenised tints and drop `#f0f4f7` from the single-use-literal list, or the file keeps
contradicting the test.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/components/keep-elements/keep-data-table.test.ts`
Expected: PASS, 10 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/keep-elements/keep-data-table.ts src/styles/keep-theme.css test/components/keep-elements/keep-data-table.test.ts
git commit -m "Add the keep-data-table element chrome and the header-band token"
```

---

### Task 3: Pagination footer — range label and rows-per-page

**Files:**
- Modify: `src/components/keep-elements/keep-data-table.ts`
- Test: `test/components/keep-elements/keep-data-table.test.ts`

**Interfaces:**
- Consumes: `DataTable` from Task 2.
- Produces: properties `paginated: boolean`, `count: number`, `page: number`, `rowsPerPage: number`, `rowsPerPageOptions: number[]`; event `rows-per-page-change` with `detail: { rowsPerPage: number }`; exported `interface KeepDataTableRowsPerPageChangeDetail`.

- [ ] **Step 1: Write the failing test**

Append to the test file:

```ts
const footer = (el: DataTable) => el.shadowRoot!.querySelector('.pagination')!;
const rangeText = (el: DataTable) =>
  el.shadowRoot!.querySelector('.range')!.textContent!.trim();
const select = (el: DataTable) =>
  el.shadowRoot!.querySelector('select') as HTMLSelectElement;

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/components/keep-elements/keep-data-table.test.ts`
Expected: FAIL — `.pagination` is null.

- [ ] **Step 3: Write minimal implementation**

In `keep-data-table.ts`, add the detail interface above the class:

```ts
/** `event.detail` of the `rows-per-page-change` event. */
export interface KeepDataTableRowsPerPageChangeDetail {
  rowsPerPage: number;
}
```

Add to `static styles`, inside the template literal:

```css
    .pagination {
      align-items: center;
      border-top: 1px solid var(--wa-color-surface-border);
      display: flex;
      gap: 16px;
      justify-content: flex-end;
      padding: 8px 16px;
    }

    .range {
      font-size: var(--wa-font-size-s);
    }

    select {
      background: var(--wa-color-surface-default);
      border: 1px solid var(--wa-color-surface-border);
      border-radius: var(--wa-border-radius-m);
      color: var(--wa-color-text-normal);
      padding: 4px 8px;
    }
```

Add the properties after `headerBand`:

```ts
  /** Render the pagination footer. */
  @property({ type: Boolean }) accessor paginated = false;

  /** Total number of rows, across all pages. */
  @property({ type: Number }) accessor count = 0;

  /** Zero-based current page. Controlled — the element only ever emits `page-change`. */
  @property({ type: Number }) accessor page = 0;

  /** Rows per page; `-1` means "All". Controlled, as above. */
  @property({ type: Number }) accessor rowsPerPage = 5;

  /** Choices offered by the footer's select. `-1` renders as "All". */
  @property({ type: Array }) accessor rowsPerPageOptions: number[] = [5, 10, 25, -1];
```

Add the helpers and the footer renderer:

```ts
  /** `true` when every row is on one page. */
  private get showsAllRows(): boolean {
    return this.rowsPerPage <= 0;
  }

  /** Human range for the footer, matching MUI's "1–5 of 42". */
  private get rangeLabel(): string {
    if (this.count <= 0) return '0 of 0';
    const start = this.showsAllRows ? 1 : this.page * this.rowsPerPage + 1;
    const end = this.showsAllRows
      ? this.count
      : Math.min(this.count, start + this.rowsPerPage - 1);
    return `${start}–${end} of ${this.count}`;
  }

  private onRowsPerPageChange(event: Event): void {
    const value = Number.parseInt((event.target as HTMLSelectElement).value, 10);
    // Deliberately does NOT assign to this.rowsPerPage — see the class docblock.
    this.emit<KeepDataTableRowsPerPageChangeDetail>('rows-per-page-change', {
      rowsPerPage: value,
    });
  }

  private renderPagination() {
    return html`
      <div class="pagination">
        <label>
          Rows per page:
          <select .value=${String(this.rowsPerPage)} @change=${this.onRowsPerPageChange}>
            ${this.rowsPerPageOptions.map(
              (option) => html`<option value=${option}>${option === -1 ? 'All' : option}</option>`,
            )}
          </select>
        </label>
        <span class="range">${this.rangeLabel}</span>
      </div>
    `;
  }
```

Update `render()`:

```ts
  render() {
    return html`
      <div class="container">
        <slot></slot>
        ${this.paginated ? this.renderPagination() : nothing}
      </div>
    `;
  }
```

Add `nothing` to the Lit import: `import { css, html, nothing } from 'lit';`

Extend the class docblock with:

```
 * Pagination is **controlled**. The element emits `page-change` and
 * `rows-per-page-change` and never assigns to `page` or `rowsPerPage`. `@lit/react`
 * re-applies every prop on every render with no dirty check — the same behaviour that
 * makes passing `value` to a `Keep*` input clobber what the user typed — so an element
 * that also wrote those props would fight React on each render.
 *
 * @fires page-change - `CustomEvent<KeepDataTablePageChangeDetail>`
 * @fires rows-per-page-change - `CustomEvent<KeepDataTableRowsPerPageChangeDetail>`
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/components/keep-elements/keep-data-table.test.ts`
Expected: PASS, 19 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/keep-elements/keep-data-table.ts test/components/keep-elements/keep-data-table.test.ts
git commit -m "Add the keep-data-table pagination footer and rows-per-page control"
```

---

### Task 4: Pagination navigation

**Files:**
- Modify: `src/components/keep-elements/keep-data-table.ts`
- Test: `test/components/keep-elements/keep-data-table.test.ts`

**Interfaces:**
- Consumes: everything from Task 3.
- Produces: event `page-change` with `detail: { page: number }`; exported `interface KeepDataTablePageChangeDetail`.

- [ ] **Step 1: Write the failing test**

Append to the test file:

```ts
const navButton = (el: DataTable, label: string) =>
  el.shadowRoot!.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;

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
    for (const label of ['First Page', 'Previous Page', 'Next Page', 'Last Page']) {
      expect(navButton(el, label)).toBeTruthy();
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
    for (const label of ['First Page', 'Previous Page', 'Next Page', 'Last Page']) {
      expect(navButton(el, label).disabled).toBe(true);
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/components/keep-elements/keep-data-table.test.ts`
Expected: FAIL — `navButton(...)` is null.

- [ ] **Step 3: Write minimal implementation**

Add the detail interface beside the other one:

```ts
/** `event.detail` of the `page-change` event. */
export interface KeepDataTablePageChangeDetail {
  page: number;
}
```

Add to `static styles`:

```css
    .nav {
      display: flex;
      gap: 4px;
    }

    .nav button {
      align-items: center;
      background: none;
      border: none;
      border-radius: var(--wa-border-radius-m);
      color: var(--wa-color-text-normal);
      cursor: pointer;
      display: flex;
      justify-content: center;
      padding: 4px;
    }

    .nav button:disabled {
      cursor: default;
      opacity: 0.4;
    }
```

Add the helpers:

```ts
  /** Index of the final page. Zero when every row fits on one page. */
  private get lastPage(): number {
    if (this.showsAllRows) return 0;
    return Math.max(0, Math.ceil(this.count / this.rowsPerPage) - 1);
  }

  private goToPage(page: number): void {
    const target = Math.min(Math.max(0, page), this.lastPage);
    if (target === this.page) return;
    // Deliberately does NOT assign to this.page — see the class docblock.
    this.emit<KeepDataTablePageChangeDetail>('page-change', { page: target });
  }

  private renderNav() {
    const atStart = this.page <= 0;
    const atEnd = this.page >= this.lastPage;
    const button = (label: string, disabled: boolean, page: number, path: string) => html`
      <button
        aria-label=${label}
        ?disabled=${disabled}
        @click=${() => this.goToPage(page)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path d=${path} fill="currentColor"></path>
        </svg>
      </button>
    `;

    return html`
      <div class="nav">
        ${button('First Page', atStart, 0, 'M18.41 16.59 13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z')}
        ${button('Previous Page', atStart, this.page - 1, 'M15.41 16.59 10.83 12l4.58-4.59L14 6l-6 6 6 6z')}
        ${button('Next Page', atEnd, this.page + 1, 'M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z')}
        ${button('Last Page', atEnd, this.lastPage, 'M5.59 7.41 10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z')}
      </div>
    `;
  }
```

Add `${this.renderNav()}` inside `.pagination`, after the `.range` span:

```ts
        <span class="range">${this.rangeLabel}</span>
        ${this.renderNav()}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/components/keep-elements/keep-data-table.test.ts`
Expected: PASS, 28 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/keep-elements/keep-data-table.ts test/components/keep-elements/keep-data-table.test.ts
git commit -m "Add keep-data-table pagination navigation with controlled page events"
```

---

### Task 5: React wrapper

**Files:**
- Modify: `src/components/keep-elements/KeepElements.tsx`
- Test: `test/components/keep-elements/keep-data-table.test.ts`

**Interfaces:**
- Consumes: `DataTable`, `KeepDataTablePageChangeDetail`, `KeepDataTableRowsPerPageChangeDetail`.
- Produces: `KeepDataTable` React component with `onPageChange` and `onRowsPerPageChange`.

- [ ] **Step 1: Write the failing test**

The `import` goes at the **top** of the test file; the `describe` block at the end.

```ts
import { KeepDataTable } from '../../../src/components/keep-elements/KeepElements';

describe('KeepDataTable React wrapper', () => {
  it('is exported and wraps the keep-data-table tag', () => {
    expect(KeepDataTable).toBeTruthy();
    expect(customElements.get('keep-data-table')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/components/keep-elements/keep-data-table.test.ts`
Expected: FAIL — `KeepDataTable` is not exported.

- [ ] **Step 3: Write minimal implementation**

In `src/components/keep-elements/KeepElements.tsx`, add the import beside the other element imports:

```tsx
import DataTable from './keep-data-table';
import type {
  KeepDataTablePageChangeDetail,
  KeepDataTableRowsPerPageChangeDetail,
} from './keep-data-table';
```

Add the wrapper beside the others, following the `KeepTree` pattern:

```tsx
export const KeepDataTable = createComponent({
  tagName: 'keep-data-table',
  elementClass: DataTable,
  react: React,
  events: {
    onPageChange: 'page-change' as EventName<CustomEvent<KeepDataTablePageChangeDetail>>,
    onRowsPerPageChange: 'rows-per-page-change' as EventName<
      CustomEvent<KeepDataTableRowsPerPageChangeDetail>
    >
  }
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/components/keep-elements/keep-data-table.test.ts`
Expected: PASS, 29 tests.

- [ ] **Step 5: Verify the whole suite and the build**

```bash
npx vitest run --coverage
npx tsc -b tsconfig.app.json --force && npx tsc -b tsconfig.test.json --force
npm run lint
npm run build
```

Expected: all green; the `src/components/keep-elements/**` coverage gate (80/80/72/62) still met.

- [ ] **Step 6: Commit**

```bash
git add src/components/keep-elements/KeepElements.tsx test/components/keep-elements/keep-data-table.test.ts
git commit -m "Add the KeepDataTable React wrapper with typed pagination events"
```

---

### Task 6: Browser verification

**Files:** none — this is a manual gate the spec requires and the suite cannot cover.

- [ ] **Step 1: Build a scratch harness**

The suite runs with `css: false`, so it cannot see layout. Create a temporary page that mounts `keep-data-table` with a slotted table of ~12 rows, `paginated`, `zebra` and `header-band` all on, and serve it with `npm run dev`.

- [ ] **Step 2: Check both themes**

Confirm at the 1366px breakpoint the card views use, in light **and** dark mode:
- container border, radius and raised background match the current screens
- odd rows are tinted and the last row has no bottom border
- the `<thead>` band appears only with `header-band`
- the footer aligns right and the nav buttons dim when disabled

- [ ] **Step 3: Check the CSP console**

With `npm run dev`, confirm no new `style-src-attr` violations are reported. Lit's dev build injects `<style>` elements, so `style-src-elem` reports are expected and are dev-only; anything mentioning `style-src-attr` is real and must be fixed.

- [ ] **Step 4: Delete the harness and confirm the tree is clean**

```bash
git status --short   # nothing but intended changes
```

---

## Follow-on

Not in this plan; each gets its own:

- **PR 3** — characterization tests for all eight files, landing before any migration so the safety net exists first.
- **PR 4** — migrate `AgentsTable`, `ColumnDetails`, `ViewsTable`, `FormsTable`.
- **PR 5** — migrate `AppsTable` + `AppItem`, `ConsentsTable` + `ConsentItem`.
- Update the spec's API table to include `headerBand`.
