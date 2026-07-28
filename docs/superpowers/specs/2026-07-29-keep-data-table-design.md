# `keep-data-table` — design

Issue: #771. Decision it implements: #702 (a custom Lit component on `--wa-*` tokens, not a
third-party grid). Unblocks: #709 (retire `@mui/material`).

Date: 2026-07-29.

## What reading the screens changed

The issue was written from greps. Reading the files moved four things.

### 1. The scope is eight files, not six

`AppItem.tsx` (373 lines) and `ConsentItem.tsx` (180) render the rows for the two paginated
tables and import `TableCell`/`TableRow` from `@mui/material`. They are not in the issue's
table.

| File | Lines | Pagination | Expand | Sort | Search |
|---|--:|:--:|:--:|:--:|:--:|
| `applications/kanban/ConsentsTable.tsx` | 438 | yes | — | yes | yes |
| `applications/AppItem.tsx` | 373 | — | — | — | — |
| `forms/FormsTable.tsx` | 370 | — | — | — | — |
| `applications/AppsTable.tsx` | 352 | yes | — | yes | yes |
| `forms/ViewsTable.tsx` | 197 | — | — | — | — |
| `applications/kanban/ConsentItem.tsx` | 180 | — | yes | — | — |
| `forms/AgentsTable.tsx` | 129 | — | — | — | — |
| `forms/ColumnDetails.tsx` | 104 | — | — | — | — |
| | **2,143** | 2 | 1 | 2 | 2 |

**The issue's verify command is a false negative.** `grep -rl "@mui/material/Table" src`
matches only the path form; both row components use named imports from `@mui/material`, so
the check reports `0` while two files still depend on MUI Table. The correct check is in
[Acceptance](#acceptance).

### 2. There is sorting, and there is filtering

The issue says "no sorting and no selection anywhere — zero `TableSortLabel`, zero
`Checkbox`". The grep is accurate; the conclusion is not. `AppsTable` and `ConsentsTable`
both hand-roll sorting with `<button onClick={handleSortAppNames}><FaSort /></button>`, and
both put `<input placeholder="Search User">` *inside* header cells.

This does not change the element's API — sorting and filtering stay in React, see
[Division of responsibility](#division-of-responsibility) — but it does mean the header row
is not a list of strings, which rules out a `columns` array.

### 3. `ConsentItem` has expand/collapse detail rows

A second `<TableRow>` with `<TableCell colSpan={5}>` wrapping a `<Collapse>` that holds the
redirect URL and the scope chips. Not in the issue's feature list.

### 4. Cells are irreducibly bespoke React

This is what rules out the `columns`/`rows` API the issue proposes:

- `ColumnDetails` — `<TextField>` per row with `onChange`, `error`, `helperText`
- `ViewsTable`, `AgentsTable` — `<ActivateSwitch>` with async `toggleActive`/`toggleInactive`
- `FormsTable` — `<ActivateMenu>`, plus an edit button that dispatches and navigates
- `ConsentItem` — SVG status dots whose `fill` is computed from timestamp deltas, inside tooltips
- `AppsTable`, `ConsentsTable` — header cells containing live search inputs and sort buttons

None of that survives serialisation into row data. `keep-tree` (#704/#723) is data-driven
because a tree node is `{id, label, icon?, value?, children?}`; a cell here is a React
subtree with callbacks into Redux. The precedent does not transfer, and forcing it would
mean a cell-renderer hook whose return value is a Lit `TemplateResult` — making React
consumers author Lit templates, a worse boundary than the one being removed.

**What is genuinely duplicated is the chrome.** `StyledTableContainer` is copy-pasted
near-identically in five files; `StyledTableCell`, `StyledTableRow` and `StatusHeader`
likewise. That is what this element consolidates.

## Architecture

`keep-data-table` owns the chrome. The consumer slots a plain semantic `<table>`.

```
<keep-data-table paginated .count=${n} .page=${p} .rowsPerPage=${r}
                 @page-change=${…} @rows-per-page-change=${…}>
  <table>
    <thead>…</thead>   <!-- React renders these, unchanged -->
    <tbody>…</tbody>
  </table>
</keep-data-table>
```

### The constraint that shapes it

**`::slotted()` matches only directly-assigned nodes, never their descendants.** With the
whole `<table>` slotted, its `<tr>`/`<td>` are unreachable from the shadow root:
`::slotted(table) td` cannot match. So row and cell styling cannot live in `static styles`.

Two render roots, therefore, with a clear split:

| Layer | Where | What it styles |
|---|---|---|
| Chrome | shadow DOM, `static styles` | container border/radius/background, header band, pagination footer, `::slotted(table)` itself |
| Internals | a `CSSStyleSheet` adopted into `document.adoptedStyleSheets` | `th`/`td` padding and borders, zebra rows, header weight — scoped under the class the element applies to its slotted table |

The element adopts that sheet **once**, guarded by a module-level flag, on first
`connectedCallback`. Consumers get it by using the element; there is nothing to import
separately and no second source of truth.

`adoptedStyleSheets` is not governed by `style-src`, so this stays CSP-clean. Production Lit
already uses the same mechanism.

### Files

| File | Purpose |
|---|---|
| `src/components/keep-elements/keep-data-table.ts` | the element: chrome, pagination, sheet adoption |
| `src/components/keep-elements/keep-data-table.styles.ts` | the document-level sheet for slotted internals |
| `src/components/keep-elements/KeepElements.tsx` | `KeepDataTable` wrapper, typed events |
| `test/components/keep-elements/keep-data-table.test.ts` | element tests |

## API

Deliberately smaller than `DataGrid`'s, and smaller than the issue's list — no `columns`, no
`rows`, because the element never sees the data.

### Properties

| Property | Type | Default | Notes |
|---|---|---|---|
| `paginated` | `boolean` | `false` | renders the footer |
| `count` | `number` | `0` | total rows, for "1–5 of 42" |
| `page` | `number` | `0` | zero-based, **controlled** |
| `rowsPerPage` | `number` | `5` | **controlled** |
| `rowsPerPageOptions` | `number[]` | `[5, 10, 25, -1]` | `-1` is "All", matching MUI |
| `zebra` | `boolean` | `false` | odd-row `--keep-surface-accent`; on for Forms/Views/Agents, off for Apps/Consents |

### Events

| Event | `detail` |
|---|---|
| `page-change` | `{ page: number }` |
| `rows-per-page-change` | `{ rowsPerPage: number }` |

### Pagination is fully controlled

The element **never writes to `page` or `rowsPerPage`**. It emits; React owns the state and
passes the new value back down.

This is not a stylistic choice. `@lit/react` re-applies every prop on every render with no
dirty check — the same behaviour that makes passing `value` to a `Keep*` input clobber what
the user typed. An element that also wrote to `page` would fight React on each render. Being
strictly controlled removes the failure mode by construction.

`AppsTable` dispatches `fetchMyApps()` on page change; that dispatch stays in the React
handler, not in the element.

## Division of responsibility

**Element:** container chrome, header band, zebra striping, cell padding and borders, dark
mode via `--wa-*` tokens, pagination controls and their events.

**React, unchanged:** every cell's content and callbacks; sorting and filtering, including
the header-embedded sort buttons and search inputs; Redux dispatch and navigation; the
expand/collapse detail row in `ConsentItem`; and the empty and loading states.

`ZeroResultsWrapper` and `APILoadingProgress` replace the table wholesale in the current
code (`consentsLoading ? <APILoadingProgress/> : <table>`), so the element simply is not
rendered on those branches. It needs no empty or loading slot. If that changes later, add it
deliberately.

Note `APILoadingProgress` imports MUI's `CircularProgress`. That is a separate MUI
dependency, out of scope here, and does not block #709's Table work.

## Styling

Sourced from the existing duplicated blocks, so the migration is visually 1:1.

- Container: `border-radius: var(--wa-border-radius-l)`, `1px solid var(--wa-color-surface-border)`, `background: var(--wa-color-surface-raised)`
- Cells: `padding: 20px 30px`; header `font-weight: bold`, `padding-top: 30px`, bottom border `var(--wa-color-surface-border)`
- Zebra: odd rows `var(--keep-surface-accent)` (already defined in `keep-theme.css`, light and dark)
- Header band: `ConsentsTable` uses `light-dark(#F0F4F7, #252535)`. **Keep it a literal.** An earlier draft of this spec called for a `--keep-surface-header` token; `keep-theme.css:174` already records the opposite decision and names this exact colour — single-use tints stay literals because "a token would add indirection without removing drift". It is still single-use after the move, so `keep-theme.css` is not touched. Revisit if a second screen wants the band.
- `FormsTable` hardcodes `border-bottom: 1px solid #b8b8b8` where the others use `var(--wa-color-surface-border)`. Treat as a bug; use the token.

**No `style=` attributes and no interpolated `style="${…}"`.** Production CSP sends
`style-src-attr 'none'`, so they land in the DOM and do nothing; `test/csp-inline-styles.test.ts`
holds the count at zero. Column widths keep using the HTML `width` attribute (which is not a
style attribute) or classes.

## Testing

**None of the eight files has a single test today.** Migrating them is behaviour
preservation with no safety net, so:

1. **Characterization first.** For each screen, write tests against the *current* MUI
   rendering and get them green before changing anything — the same recipe the `.js`→TS
   element conversion used. Assert on what the screen renders and does: header labels, row
   counts, that clicking edit navigates, that the switch toggles, that pagination slices.
2. **Element tests.** Chrome renders; the slot accepts a table; the document sheet is
   adopted exactly once across multiple instances; `zebra` toggles the class; pagination
   emits `page-change`/`rows-per-page-change` with correct detail; first/prev/next/last
   disabled states at the boundaries; **the element does not mutate `page`/`rowsPerPage`**.
3. **Migration.** Swap the chrome, keep the characterization tests green.

Assert on the element's own shadow DOM, never on `wa-*` internals — jsdom does not render
them. Coverage gate for `src/components/keep-elements/**` (80/80/72/62) must still pass.

Note the suite runs with `css: false`, so it cannot see layout regressions. Check the
migrated screens in a real browser at the 1366px breakpoint the card views use, and in dark
mode, as #771 asks.

## Acceptance

```bash
# Both forms — the issue's version alone misses the named imports in AppItem/ConsentItem
grep -rl "@mui/material/Table" src | wc -l                              # 0
grep -rlE "Table(Container|Head|Body|Row|Cell|Footer|Pagination)" src \
  --include="*.tsx" --include="*.ts" | wc -l                            # 0
```

Plus: full suite green, coverage thresholds met, `tsc -b` clean, lint clean,
`npm run build` clean, and the six screens verified in a browser in both themes.

## Staging

| PR | Contents |
|---|---|
| 1 | This spec |
| 2 | `keep-data-table` + styles + wrapper + element tests |
| 3 | Characterization tests for all eight files |
| 4 | Migrate the four simple screens — `AgentsTable`, `ColumnDetails`, `ViewsTable`, `FormsTable` |
| 5 | Migrate the paginated pair — `AppsTable` + `AppItem`, `ConsentsTable` + `ConsentItem` |

PR 3 is separate and lands before any migration so the safety net exists first, and so the
characterization tests can be reviewed against current behaviour without a diff that also
changes it.

## Explicitly not in scope

Sorting, filtering, selection, inline editing, virtualisation, column resize, sticky
headers. If sorting is wanted as an element feature later, add it deliberately — the two
screens that sort do it in React today and will keep doing so.
