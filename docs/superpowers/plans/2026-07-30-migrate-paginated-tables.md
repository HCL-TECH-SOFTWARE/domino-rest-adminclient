# Migrate the paginated table pair

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Goal:** Replace the MUI table chrome **and pagination** in `AppsTable`/`AppItem` and `ConsentsTable`/`ConsentItem` with `<KeepDataTable>`. PR 5 of 5 for #771 — the last MUI `Table*` consumers in the tree.

**Architecture:** Each table slots a plain `<table>` into `<KeepDataTable paginated>`. The element renders the pagination footer and emits `page-change` / `rows-per-page-change`; React keeps owning `page` and `rowsPerPage` state, which it already does.

## The gate

| File | Suite | Tests |
|---|---|--:|
| `AppItem` | `test/components/applications/AppItem.test.tsx` | 16 |
| `AppsTable` | `test/components/applications/AppsTable.test.tsx` | 16 |
| `ConsentItem` | `test/components/applications/kanban/ConsentItem.test.tsx` | 18 |
| `ConsentsTable` | `test/components/applications/kanban/ConsentsTable.test.tsx` | 18 |

**No characterization test file may be edited.** They were written to survive this. A failure means the migration changed behaviour — fix the component, or stop and report BLOCKED.

**The one sanctioned exception** is `setRowsPerPage()` in `test/test-utils/tables.ts`. Its docblock has said since PR 3 that PR 5 rewrites its body and nothing else. That is Task 1. No `it()` body moves.

## Global constraints

- **No `style=` attributes**, no interpolated `style="${…}"`. Production CSP sends `style-src-attr 'none'`; `test/csp-inline-styles.test.ts` holds the count at zero.
- `css: false` — **no test sees layout.** Browser check is Task 6. Green is not done.
- All five gates before each commit: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run bundle:budget`, `npx vitest run`.
- One commit per file.

## The recipe

Same chrome swap as PR 4, plus two things PR 4 did not have.

**Preserve Linaria blocks by retargeting them, not deleting them.** These files put *content* rules inside `styled(TableRow)` / `styled(TableContainer)` / `styled(TableHead)`. Those rules must survive:

| Before | After | Why |
|---|---|---|
| `styled(TableRow)` | `styled.tr` | keeps `.exp-row`, `.text`, `.revoke`, `.delete-icon` … |
| `styled(TableHead)` | `styled.thead` | keeps `.text`, `.search-bar` |
| `styled(TableBody)` | `styled.tbody` | keeps its font rules |
| `styled(TableContainer)` | `styled.div` **wrapper around** `<KeepDataTable>` | keeps the column-width rules (`.launch`, `.user`, `.expirations` …) and `.can-sort` |

From the `styled.div` wrapper, **delete only the chrome**: `border`, `border-radius`, `background`, `padding: 0`. The element owns those. Keep every descendant rule.

**Pagination.** Replace the whole `<TableFooter><TableRow><TablePagination …/></TableRow></TableFooter>` block — including its custom `ActionsComponent` — with props on the element:

```tsx
<KeepDataTable
  paginated
  count={filteredApps.length}
  page={page}
  rowsPerPage={rowsPerPage}
  onPageChange={(e) => handleChangePage(null, e.detail.page)}
  onRowsPerPageChange={(e) => { setRowsPerPage(e.detail.rowsPerPage); setPage(0); }}
>
```

- `rowsPerPageOptions` defaults to `[5, 10, 25, -1]`, which is what both tables pass. **Omit it.**
- The element is **controlled** — it never writes `page`/`rowsPerPage`. React already owns both in `useState`, so this is a direct mapping.
- The four `IconButton`s disappear. The element renders its own nav with the same accessible names (`First Page`, `Previous Page`, `Next Page`, `Last Page`), which is why the tests survive.
- **`AppsTable.handleChangePage` also dispatches `fetchMyApps()`** — that dispatch stays in the React handler. `ConsentsTable`'s does not.

---

### Task 1: Rewrite the `setRowsPerPage` seam

**File:** `test/test-utils/tables.ts` — **this file only.** No `*.test.tsx` may change.

Today it drives MUI's popup Select. After migration the control is a native `<select>` in the element's shadow root. Because the two tables migrate in separate commits, the helper must handle **both** shapes so the suite is green at every commit in between.

- [ ] Replace the body with a shape-detecting version:

```ts
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
```

Update the docblock: it currently says PR 5 will rewrite this. It has. Say instead that it handles both shapes and that the MUI branch can be deleted once no MUI table remains.

- [ ] `npx vitest run test/components/applications/` — all 68 still pass (nothing has migrated yet, so the MUI branch is exercised).
- [ ] Five gates. Commit: `Teach setRowsPerPage both pagination shapes (#771)`

### Task 2: `AppItem`

- `styled(TableRow)` → `styled.tr`; `<TableCell>` → `<td>`.
- Keep every descendant rule and every content component.
- The `<dialog>` after the row stays exactly where it is.
- [ ] 16 tests pass unedited. Five gates. Commit: `Migrate AppItem to keep-data-table (#771)`

### Task 3: `AppsTable`

- **Zebra: no** — it has no `StyledTableRow`, so rows are unstriped today.
- **Header band: no.**
- `StyledTableHead` → `styled.thead`, `StyledTableBody` → `styled.tbody`, `StyledTableContainer` → `styled.div` wrapper (chrome removed, column widths kept).
- Apply the pagination mapping above. `handleChangePage` keeps its `fetchMyApps()` dispatch.
- The empty state (`apps.length === 0` → `ZeroResultsWrapper`) is untouched — the element is simply not rendered on that branch.
- [ ] 16 tests pass unedited. Five gates. Commit: `Migrate AppsTable to keep-data-table (#771)`

### Task 4: `ConsentItem`

- `styled(TableRow)` → `styled.tr`; `<TableCell>` → `<td>`.
- **Two `<tr>` per consent** — the data row and the `colSpan={5}` collapse row. Keep both.
- `<Collapse>` is content, not chrome. Keep it, and keep `unmountOnExit`.
- [ ] 18 tests pass unedited. Five gates. Commit: `Migrate ConsentItem to keep-data-table (#771)`

### Task 5: `ConsentsTable`

- **Zebra: no.**
- **Header band: YES.** `StyledTableHead` carries `background-color: light-dark(#F0F4F7, #252535)`. Drop that declaration and pass `header-band` on the element instead — it applies `--keep-surface-header`, which carries both halves. This removes a `light-dark()` literal, which is the direction #708 set.
- Same `styled.thead` / `styled.tbody` / `styled.div` retargeting; keep the column-width rules.
- Apply the pagination mapping. `handleChangePage` here only calls `setPage`.
- The loading branch (`consentsLoading || usersLoading` → `APILoadingProgress`) is untouched.
- [ ] 18 tests pass unedited. Five gates. Commit: `Migrate ConsentsTable to keep-data-table (#771)`

### Task 6: Verify in a browser, then open the PR

`css: false` means nothing above is evidence these *look* right. PR 4 found two real bugs this way that no test could see.

- [ ] Mount all four in a scratch harness at 1366px, both colour modes.
  **Load the styles in `src/index.tsx`'s exact order** — `index.css`, `styles.css`, `dark-mode.css`, `webawesome.css`, `keep-theme.css`, `keep-overrides.css`. Getting it wrong leaves `--wa-*` undefined, and `var()` on an undefined property drops the whole declaration, so the chrome vanishes and the harness lies. That happened in PR 4.
- [ ] Measure computed styles **against the pre-migration commit with the same harness** — an A/B, not absolute assertions.
- [ ] Confirm: column widths still applied; header band on Consents only; pagination footer renders and its four buttons work; no zebra on either.
- [ ] Confirm zero new inline `style` attributes and no new console errors.
- [ ] Acceptance greps are finally zero:
  ```bash
  grep -rl "@mui/material/Table" src | wc -l                                  # 0
  grep -rlE "Table(Container|Head|Body|Row|Cell|Footer|Pagination)" src \
    --include="*.tsx" | wc -l                                                 # 0
  ```
- [ ] Delete the harness. Five gates. Confirm no `*.test.tsx` changed.
- [ ] Open the PR against `new_code` with `closes #771` — **this one really does close it.**
