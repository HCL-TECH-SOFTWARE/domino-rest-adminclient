# Migrate the four simple table screens

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the MUI table chrome in `AgentsTable`, `ColumnDetails`, `ViewsTable` and `FormsTable` with `<KeepDataTable>`, without changing behaviour.

**Architecture:** Each screen slots a plain semantic `<table>` into `<KeepDataTable>`. The element supplies the container, cell padding, borders and zebra striping; React keeps every cell's content and callbacks. None of these four paginate.

**Tech stack:** `KeepDataTable` from `src/components/keep-elements/KeepElements`, React 19, Linaria.

## The gate that makes this safe

Each screen has a characterization suite from PR 3, pinning what it renders and does:

| Screen | Suite | Tests |
|---|---|--:|
| `ColumnDetails` | `test/components/forms/ColumnDetails.test.tsx` | 10 |
| `ViewsTable` | `test/components/forms/ViewsTable.test.tsx` | 12 |
| `FormsTable` | `test/components/forms/FormsTable.test.tsx` | 11 |
| `AgentsTable` | `test/components/forms/AgentsTable.test.tsx` | 8 |

**Do not edit a characterization test.** They were written to survive exactly this change — every assertion targets semantic HTML, accessible names, visible text or callback arguments, and none targets a MUI class. A failing test means the migration changed behaviour.

If you become convinced a test is genuinely wrong rather than the code, **stop and report** — do not edit it to pass. That is the one move that would make the whole exercise worthless.

## Global constraints

- Copyright headers already exist; leave them, but bump the year range if the file's header already lists one (`2023, 2026` stays as is).
- **No `style=` attributes and no interpolated `style="${…}"`.** Production CSP sends `style-src-attr 'none'` and `test/csp-inline-styles.test.ts` holds the count at zero. Column widths keep using the HTML `width` attribute, which is not a style attribute.
- `css: false` in the suite means **no test can see layout**. Every screen must also be checked in a browser — see Task 5.
- All five gates before any commit: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run bundle:budget`, `npx vitest run`.
- One commit per file.

## The recipe

Identical for all four. Read it once; each task then names only its deviations.

**1. Import the wrapper**

```tsx
import { KeepDataTable } from '../keep-elements/KeepElements';
```

**2. Swap the chrome**

```tsx
// before
<StyledTableContainer>
  <Table aria-label="views and agents table">
    <TableHead><TableRow><StyledTableCell …>…</StyledTableCell></TableRow></TableHead>
    <TableBody>{rows.map((r) => (
      <StyledTableRow key={…}><StyledTableCell>…</StyledTableCell></StyledTableRow>
    ))}</TableBody>
  </Table>
</StyledTableContainer>

// after
<KeepDataTable zebra>
  <table aria-label="views and agents table">
    <thead><tr><th width="550px">…</th></tr></thead>
    <tbody>{rows.map((r) => (
      <tr key={…}><td>…</td></tr>
    ))}</tbody>
  </table>
</KeepDataTable>
```

- `<TableHead>` → `<thead>`, `<TableBody>` → `<tbody>`, `<TableRow>`/`<StyledTableRow>` → `<tr>`
- `<StyledTableCell>` → `<th>` inside `<thead>`, `<td>` inside `<tbody>`
- `component="th" scope="row"` on a body cell → a literal `<th scope="row">`. Keep it: `cellTexts()` reads `th, td`, and it is the correct markup for a row header.
- `width="550px"` and friends stay as HTML attributes.
- `className` on a cell stays.

**3. Delete what the element now owns**

`StyledTableCell`, `StyledTableRow`, `StyledTableContainer`, `StyledTableHead`, `StyledTableBody`, and the MUI `Table*` imports plus `tableCellClasses`.

**Keep** every styled component that dresses cell *contents* — `StatusHeader`, `AgentNameHeader`, `AgentNameDisplay`, `EditIcon`, `ViewNameDisplay`, `AliasContainer`, `ActivateDialogContainer`. Those are React's half and do not migrate.

**4. Run that screen's suite.** It must pass **unedited**.

---

### Task 1: `AgentsTable` — the smallest, establishes the recipe

**Files:** `src/components/forms/AgentsTable.tsx` (129 lines)

- Zebra: **yes** (`StyledTableRow` stripes odd rows with `--keep-surface-accent`).
- Delete `StyledTableCell`, `StyledTableRow`, `StyledTableContainer`.
- Keep `StatusHeader`, `AgentNameHeader`, `AgentNameDisplay`.
- Two columns: Agent Name (`width="550px"`), Status.

- [ ] Apply the recipe.
- [ ] `npx vitest run test/components/forms/AgentsTable.test.tsx` — 8 passing, file unedited.
- [ ] All five gates.
- [ ] Commit: `Migrate AgentsTable to keep-data-table (#771)`

### Task 2: `ColumnDetails` — the one with a bespoke container

**Files:** `src/components/forms/ColumnDetails.tsx` (104 lines)

- Zebra: **no** — it has no `StyledTableRow`, so rows are unstriped today. Do not add `zebra`.
- `ColumnDetailsContainer` mixes **layout** with **chrome**. Split it:
  - **Keep** on the wrapper: `box-sizing`, `width: 75%`, `height: 100%`, `left: 23%`, `margin-right: 2%`, `padding: 0`, and the `.delete-icon` rule.
  - **Delete** from it: `background`, `border`, `border-radius`, `overflow-y` — `keep-data-table` provides all four.
- Structure: `<ColumnDetailsContainer><KeepDataTable><table …>`. The `.delete-icon` descendant rule still applies — slotted content stays in the light DOM.
- Three columns; the first header cell is a literal space — leave it exactly as is, the suite pins `['', 'Column Name', 'External Name']`.

- [ ] Apply the recipe with the split above.
- [ ] `npx vitest run test/components/forms/ColumnDetails.test.tsx` — 10 passing, unedited.
- [ ] All five gates.
- [ ] Commit: `Migrate ColumnDetails to keep-data-table (#771)`

### Task 3: `ViewsTable`

**Files:** `src/components/forms/ViewsTable.tsx` (197 lines)

- Zebra: **yes**.
- Also delete `StyledTableHead` and `StyledTableBody` — this file has both, and their rules (`font-weight`, `padding-top`, `border-bottom`, `font-size`) are what the element's sheet already applies to `th`/`td`.
- Keep `StatusHeader`, `EditIcon`, `ViewNameDisplay`, `AliasContainer`.
- The edit cell is `component="th" scope="row" width="50px"` → `<th scope="row" width="50px">`.
- Four columns, first header cell empty (`<StyledTableCell width="50px" />` → `<th width="50px" />`).

- [ ] Apply the recipe.
- [ ] `npx vitest run test/components/forms/ViewsTable.test.tsx` — 12 passing, unedited.
- [ ] All five gates.
- [ ] Commit: `Migrate ViewsTable to keep-data-table (#771)`

### Task 4: `FormsTable` — largest, and fixes a hardcoded colour

**Files:** `src/components/forms/FormsTable.tsx` (370 lines)

- Zebra: **yes**.
- **`StyledTableCell`'s head border is hardcoded `#b8b8b8`** where every sibling screen uses `var(--wa-color-surface-border)`. The design spec calls this a bug. Deleting the styled component fixes it — the element's sheet uses the token. **Expect a visual difference in the browser check, and say so; it is the intended fix, not a regression.**
- Keep `StatusHeader`, `EditIcon`, `ViewNameDisplay`, `ActivateDialogContainer` — the dialog is outside the table and does not migrate.
- Five columns; the first header cell is empty.
- The `<ActivateDialogContainer>` sits after `</KeepDataTable>` inside the existing fragment. Leave it there.

- [ ] Apply the recipe.
- [ ] `npx vitest run test/components/forms/FormsTable.test.tsx` — 11 passing, unedited.
- [ ] All five gates.
- [ ] Commit: `Migrate FormsTable to keep-data-table (#771)`

### Task 5: Verify in a browser, then open the PR

The suite runs with `css: false` and jsdom has no layout, so **nothing so far is evidence these look right.**

- [ ] `npm run dev`, then check all four screens at the 1366px breakpoint, in **both** colour modes:
  - container border, radius and background match the previous look
  - zebra striping on Agents/Views/Forms; **none** on ColumnDetails
  - cell padding and the header's heavier weight
  - the last row has no bottom border
  - `ColumnDetails` still sits at 75% width in its panel
- [ ] Confirm no CSP violations and no console errors.
- [ ] Confirm zero `style=` attributes: `document.querySelectorAll('[style]').length` is 0 on each screen.
- [ ] Full suite, all five gates.
- [ ] Confirm the four characterization suites are **untouched**: `git diff --name-only origin/new_code...HEAD` lists no file under `test/`.
- [ ] Open the PR against `new_code` with `closes #771` (it does not close it — PR 5 follows).
