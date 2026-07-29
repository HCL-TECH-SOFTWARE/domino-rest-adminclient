/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { fireEvent, screen, within } from '@testing-library/react';
import { deepButton, deepQuery, deepQueryAll } from './shadow';

/**
 * Table-shaped reads for the #771 characterization suites.
 *
 * All of these stay correct after the migration, because the migration keeps the
 * `<table>` in the light DOM — `<keep-data-table>` slots it rather than rendering it. See
 * the element's docblock for why (cells are irreducibly bespoke React).
 */

/**
 * Synchronously flush any pending Lit update on the table elements.
 *
 * `keep-data-table` renders its pagination footer into a shadow root, and Lit's first
 * update is unconditionally async — it awaits inside `__enqueueUpdate()` before
 * `render()` ever runs. MUI's footer was synchronous React, so the characterization
 * assertions written in PR 3 read the DOM with no `await`.
 *
 * `performUpdate()` is public and synchronous, so the helpers can close that gap without
 * a single test changing. This is a harness accommodation for *when* the DOM appears,
 * not for *what* it contains — every assertion still checks exactly what it always did.
 *
 * Defensive (`?.`): pre-migration there is no `keep-data-table` on the page at all, so
 * this is a no-op and the MUI-synchronous path is unaffected.
 */
function flushTables(): void {
  for (const el of deepQueryAll('keep-data-table')) {
    (el as unknown as { performUpdate?: () => void }).performUpdate?.();
  }
}

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
  first: () => {
    flushTables();
    return deepButton('First Page');
  },
  prev: () => {
    flushTables();
    return deepButton('Previous Page');
  },
  next: () => {
    flushTables();
    return deepButton('Next Page');
  },
  last: () => {
    flushTables();
    return deepButton('Last Page');
  },
};

/**
 * MUI's "1–5 of 42" label, or `keep-data-table`'s `.range` after the migration.
 *
 * MUI renders it into `.MuiTablePagination-displayedRows`; the element renders it into
 * `.range` in its shadow root. Both are tried, so the call site does not move.
 */
export function rangeText(): string {
  flushTables();
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
  // The <select> lives in keep-data-table's shadow root, and the very first Lit update
  // that renders it is async (see flushTables()). A test may call this helper as its
  // first interaction with the page, with no prior nav.*()/rangeText() call to have
  // already flushed it — so flush before looking for the shape, not only after.
  flushTables();
  // Post-migration: a native <select> inside keep-data-table's shadow root.
  const native = deepQuery<HTMLSelectElement>('select');
  if (native) {
    native.value = String(value);
    // Dispatched via `fireEvent` (not a bare `.dispatchEvent()`) so the resulting
    // `rows-per-page-change` CustomEvent — and the consumer's `setRowsPerPage`/`setPage`
    // calls it triggers, synchronously, via a native (non-React) event listener — are
    // flushed through React's `act()` before this call returns, the same as any other
    // `fireEvent.*`. Without it, the state update is merely scheduled, and a following
    // read (e.g. `visibleNames()`) can still observe the pre-update page.
    fireEvent(native, new Event('change', { bubbles: true }));
    // The consumer's state update above lands back on `keep-data-table` as new
    // `rowsPerPage`/`page` props, which schedule their own (async) Lit update. Flush
    // that too so a follow-up shadow-DOM read sees the result immediately.
    flushTables();
    return;
  }
  // Pre-migration: MUI's fake select — a combobox that opens a popup listbox.
  const combobox = screen.getByRole('combobox', { name: /rows per page/i });
  fireEvent.mouseDown(combobox);
  const listbox = within(screen.getByRole('listbox'));
  fireEvent.click(listbox.getByRole('option', { name: value === -1 ? 'All' : String(value) }));
}
