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
 * The header rules are scoped to `thead th`, never bare `th`. A row-header cell
 * (`<th scope="row">`) lives in `tbody`, and both `ViewsTable` and `FormsTable` use one
 * for their edit column. An unqualified `th` selector gave those cells bold text, 30px of
 * top padding and a stray bottom border — exactly what MUI's `tableCellClasses.head` /
 * `.body` split used to prevent. Found in a browser during #771 PR 4; the suite runs with
 * `css: false`, so a test pins the *selector* rather than the computed style.
 *
 * Keep prose out of this template string: the scoping test splits selectors on commas,
 * so a CSS comment containing one would break it.
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
keep-data-table thead th {
  font-weight: bold;
  padding-top: 30px;
  border-bottom: 1px solid var(--wa-color-surface-border);
}
keep-data-table td,
keep-data-table tbody th {
  font-size: var(--wa-font-size-m);
  border-bottom: none;
}
keep-data-table tbody th {
  font-weight: normal;
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
/*
 * Named for assistive tech, never shown (#713).
 *
 * Five of the seven tables have a column of controls — open, edit, delete, expand — whose
 * header cell was empty, so a screen reader moving across the header row announced nothing
 * for it and a cell in that column had no column name to be associated with. The cells now
 * carry a hidden name, and this is where the rule lives because it is the one sheet all
 * seven already share; restating it in five shadow roots would be five chances to drift.
 */
keep-data-table .visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
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
