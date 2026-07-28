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
 * by tag name reaches it normally, and no `slotchange` bookkeeping is needed.
 *
 * Adopted rather than injected as a `<style>` element: `adoptedStyleSheets` is not
 * governed by CSP's `style-src`, which production sets tightly (#685).
 *
 * Every selector must start with `keep-data-table` — this sheet is global, and a bare
 * `td` rule would restyle every table in the app. A test enforces that.
 *
 * The values are lifted from the five near-identical Linaria blocks this replaces
 * (`StyledTableCell`, `StyledTableRow`, `StatusHeader`), so the migration is 1:1. See
 * #771.
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
 * so a second document — a test, an iframe — is tracked independently.
 */
let adoptedDocs = new WeakSet<Document>();

/**
 * Adopt {@link TABLE_STYLE_TEXT} into `doc`, at most once per document.
 *
 * Called from the element's `connectedCallback`, so consumers get the styling simply by
 * using the element; there is nothing to import separately and no second source of truth.
 */
export function adoptTableStyles(doc: Document = document): void {
  if (adoptedDocs.has(doc)) return;
  if (typeof CSSStyleSheet === 'undefined') return;

  const sheet = new CSSStyleSheet();
  sheet.replaceSync(TABLE_STYLE_TEXT);
  // jsdom leaves `adoptedStyleSheets` undefined but permits the assignment, so read it
  // defensively — spreading it bare throws in every test.
  doc.adoptedStyleSheets = [...(doc.adoptedStyleSheets ?? []), sheet];
  adoptedDocs.add(doc);
}

/** Test-only: forget which documents have been seen. */
export function resetAdoptedTableStyles(): void {
  adoptedDocs = new WeakSet<Document>();
}
