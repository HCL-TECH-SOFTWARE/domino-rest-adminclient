/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { fireEvent, screen, within } from '@testing-library/react';
import { deepButton, deepQuery } from './shadow';

/**
 * Table-shaped reads for the #771 characterization suites.
 *
 * All of these stay correct after the migration, because the migration keeps the
 * `<table>` in the light DOM — `<keep-data-table>` slots it rather than rendering it. See
 * the element's docblock for why (cells are irreducibly bespoke React).
 */

/**
 * The `<tbody>` rows. Excludes `<thead>` and `<tfoot>`, so the MUI pagination row does
 * not count as data today and the shadow-DOM footer does not count tomorrow.
 *
 * Note this counts *rows*, not records: `ConsentItem` renders two `<tr>` per consent (the
 * data row and the collapse row). That is real behaviour — the helper does not hide it,
 * and the ConsentsTable suite counts records a different way.
 */
export function bodyRows(): HTMLTableRowElement[] {
  return Array.from(document.querySelectorAll<HTMLTableRowElement>('tbody tr'));
}

/** Trimmed text of each `<thead>` cell, in order. Empty spacer cells come back as ''. */
export function headerLabels(): string[] {
  return Array.from(document.querySelectorAll('thead th, thead td')).map(
    (cell) => cell.textContent?.trim() ?? '',
  );
}

/** Trimmed text of each cell in `row`, in order. */
export function cellTexts(row: HTMLTableRowElement): string[] {
  return Array.from(row.querySelectorAll('th, td')).map((cell) => cell.textContent?.trim() ?? '');
}

/** The four pagination buttons, by accessible name. Identical before and after migration. */
export const nav = {
  first: () => deepButton('First Page'),
  prev: () => deepButton('Previous Page'),
  next: () => deepButton('Next Page'),
  last: () => deepButton('Last Page'),
};

/**
 * MUI's "1–5 of 42" label, or `keep-data-table`'s `.range` after the migration.
 *
 * MUI renders it into `.MuiTablePagination-displayedRows`; the element renders it into
 * `.range` in its shadow root. Both are tried, so the call site does not move.
 */
export function rangeText(): string {
  const el =
    deepQuery('.MuiTablePagination-displayedRows') ?? deepQuery('keep-data-table .range, .range');
  if (!el) throw new Error('No pagination range label found');
  return el.textContent?.trim() ?? '';
}

/**
 * Change the page size.
 *
 * Handles both pagination shapes, because the two paginated tables migrate to
 * `<keep-data-table>` in separate commits: for the stretch between them, one screen is
 * still MUI and the other already native, and every test in this suite must stay green at
 * both commits. `deepQuery('select')` finds the migrated shape first — a native `<select>`
 * in `keep-data-table`'s shadow root, driven by setting `.value` and dispatching `change`
 * (see the element's `onRowsPerPageChange`, which reads `event.target.value` and emits
 * `rows-per-page-change`). When no such `<select>` exists yet, it falls back to MUI's fake
 * select — a `<div role="combobox">` that opens a popup `<ul role="listbox">` — driven by
 * `mouseDown` on the combobox then a click on the option.
 *
 * Every test that changes page size calls this helper instead of touching the widget, so
 * when the widget changes, no `it()` body moves. Once no MUI table remains, delete the
 * MUI branch below and this collapses to the native-only body.
 */
export function setRowsPerPage(value: number): void {
  // Post-migration: a native <select> inside keep-data-table's shadow root.
  const native = deepQuery<HTMLSelectElement>('select');
  if (native) {
    native.value = String(value);
    native.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }
  // Pre-migration: MUI's fake select — a combobox that opens a popup listbox.
  const combobox = screen.getByRole('combobox', { name: /rows per page/i });
  fireEvent.mouseDown(combobox);
  const listbox = within(screen.getByRole('listbox'));
  fireEvent.click(listbox.getByRole('option', { name: value === -1 ? 'All' : String(value) }));
}
