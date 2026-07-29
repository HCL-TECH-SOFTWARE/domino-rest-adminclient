# Table Characterization Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pin the current behaviour of the eight MUI Table files in tests, so PRs 4 and 5 can replace their chrome with `<keep-data-table>` and prove nothing else moved.

**Architecture:** Pure test-only PR — **no `src/` file is edited**. Nine test files plus two shared query helpers. Every assertion targets what survives the migration (semantic HTML, accessible names, callback arguments, visible text); nothing targets MUI class names or MUI-specific DOM shape. The two helpers exist so the one genuinely unstable thing — pagination controls moving into a shadow root — is absorbed in a single place instead of being written into a hundred `it()` bodies.

**Tech Stack:** vitest 4.1.10 + jsdom, `@testing-library/react`, `@testing-library/jest-dom`, the repo's `renderWithProviders`.

## Global Constraints

- **Never edit `src/` in this PR.** If a test disagrees with the code, the test is wrong. See "The characterization loop" below — this is the rule the whole PR rests on.
- Every new file starts with the repo copyright header, year `2026`. `test/copyright-headers.test.ts` enforces it:
  ```
  /* ========================================================================== *
   * Copyright (C) 2026 HCL America Inc.                                        *
   * All rights reserved.                                                       *
   * Licensed under Apache 2 License.                                           *
   * ========================================================================== */
  ```
- Test files live at `test/` mirroring `src/` — `src/components/forms/X.tsx` → `test/components/forms/X.test.tsx`.
- Use `renderWithProviders` from `test/test-utils/renderWithProviders`. Do not hand-roll a store.
- The suite runs with `css: false`. **No test may assert on a computed style, a colour, or a layout property** — Linaria class names are not even resolved. Colour and layout are verified in a browser, in PR 4/5.
- Base branch: `new_code`. PR body must contain `closes #771`.
- Vitest config sets `clearMocks: true`; mock call history resets between tests automatically.
- **Every task must pass the CI gates before committing, not just vitest:**
  ```bash
  npm run lint        # oxlint src test — `no-unused-vars` is an error
  npm run typecheck   # tsc -b
  ```
  Vitest transforms with SWC, which neither type-checks nor lints, so a green suite is
  **not** evidence the file passes CI. An unused import is a lint *error* here, not a
  warning. (Task 2 shipped one and the reviewer caught it; both gate commands failed on a
  file whose 10 tests all passed.)

---

## Why this PR exists, and the one rule that makes it work

None of these eight files has a test today. PR 4 and PR 5 rewrite their chrome. Without a net, "the migration preserved behaviour" is an unverifiable claim.

But a net has a failure mode that is worse than having no net: **a test that breaks because of the migration even though behaviour was preserved.** That forces PR 5 to edit the safety net in the same commit that changes the code the net guards — at which point the net proves nothing. Every design decision below exists to avoid that.

### Selector discipline

| Allowed — survives the migration | Forbidden — dies with MUI |
|---|---|
| `<table>`, `<thead>`, `<tbody>`, `<th>`, `<td>` | `.MuiTableCell-root`, `tableCellClasses.*` |
| `getByRole('row' \| 'button' \| 'textbox')` | `.MuiTablePagination-*`, `.MuiIconButton-*` |
| `aria-label="Next Page"` and friends | Linaria-generated class names (`.xyz123`) |
| visible text, `placeholder`, `title` | MUI's `<div role="combobox">` select internals |
| `expect(callback).toHaveBeenCalledWith(...)` | element nesting depth / sibling order inside a cell |

The four nav-button names — `First Page`, `Previous Page`, `Next Page`, `Last Page` — are identical in MUI's `IconButton`s today and in `keep-data-table`'s shadow DOM nav (`src/components/keep-elements/keep-data-table.ts:188-191`). That is not luck; the element was built to match. It means a nav assertion can be written once and never touched again — **provided the query can reach into a shadow root**, which is what Task 1 delivers.

### The one place discipline is not enough

After PR 5 the rows-per-page control changes from MUI's fake `<div role="combobox">` + popup menu to a native `<select>` inside the shadow root. There is no query that drives both. That interaction is isolated in `setRowsPerPage()` in `test/test-utils/tables.ts`; **PR 5 is expected to rewrite that function's body and nothing else.** Every `it()` that changes page size calls the helper, so no test body moves. This is stated in the helper's docblock so the PR 5 author finds it.

### The characterization loop — this is NOT TDD

TDD writes a failing test for behaviour that does not exist yet. Characterization writes a test for behaviour that already exists. **A characterization test that passes on the very first run is the expected, successful outcome.** Do not "fix" the code to make a test fail first.

For every test in this plan:

1. Write the test asserting what you believe the current behaviour is.
2. Run it.
   - **Passes** → belief confirmed. Go to step 3.
   - **Fails** → *your belief was wrong, and the test just told you the truth about the code.* **Change the test to match what the code actually does.** Do not change `src/`. If what the code does looks like a bug, write the test that pins the buggy behaviour, add a `// BUG:` comment naming it, and move on — fixing it here would mean PR 4/5 could no longer tell "migration broke it" from "we fixed it".
3. **Negative control.** Temporarily break the thing under test (change an expected string, delete a prop, comment out a handler), re-run, confirm the test *fails*, then undo. A characterization test that cannot fail is decoration. Do this at least once per task — the step says which assertion to target.

### Fixtures must discriminate

A negative control proves a test can fail *at all*. It does not prove the test pins the
behaviour it claims to. The gap between those two is where this suite is most likely to
ship something worthless, so check every fixture against this question:

> **Would this assertion still pass if the component did the neighbouring wrong thing?**

The Task 4 review caught two live examples, both from fixtures too small to tell two
behaviours apart:

- `viewAlias: ['av']` with `expect(getByText('av'))`. `viewAlias[0]` and
  `viewAlias.join(', ')` are both `'av'` for a one-element array — so "renders the first
  alias" and "renders all aliases" are indistinguishable. **Two elements, and assert the
  second is absent.**
- "renders nothing when the alias list is empty", asserted as "the *other* row's alias
  string is not in this row". Always true, whatever the component does. **Assert on the
  cell's own content.**

The same shape recurs anywhere a count, an index, or a "first of" is pinned. Prefer
fixtures where every quantity is distinct and greater than one.

---

## File Structure

| File | Responsibility |
|---|---|
| `test/test-utils/shadow.ts` | **create** — generic shadow-piercing DOM queries |
| `test/test-utils/tables.ts` | **create** — table-shaped reads and pagination drivers, built on `shadow.ts` |
| `test/test-utils/shadow.test.ts` | **create** — proves the helpers pierce, and proves they fail loudly |
| `test/components/forms/ColumnDetails.test.tsx` | **create** |
| `test/components/forms/AgentsTable.test.tsx` | **create** |
| `test/components/forms/ViewsTable.test.tsx` | **create** |
| `test/components/forms/FormsTable.test.tsx` | **create** |
| `test/components/applications/AppItem.test.tsx` | **create** |
| `test/components/applications/AppsTable.test.tsx` | **create** |
| `test/components/applications/kanban/ConsentItem.test.tsx` | **create** |
| `test/components/applications/kanban/ConsentsTable.test.tsx` | **create** |

Row components are characterized before their tables (Task 6 before 7, Task 8 before 9) so that when a table test fails you already know whether the row renders correctly.

---

### Task 1: Shadow-piercing and table query helpers

**Files:**
- Create: `test/test-utils/shadow.ts`
- Create: `test/test-utils/tables.ts`
- Test: `test/test-utils/shadow.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces — every later task imports from these:
  - `deepQueryAll<E extends Element>(selector: string): E[]`
  - `deepQuery<E extends Element>(selector: string): E | null`
  - `deepButton(accessibleName: string): HTMLButtonElement` — throws if absent
  - `bodyRows(): HTMLTableRowElement[]`
  - `headerLabels(): string[]`
  - `cellTexts(row: HTMLTableRowElement): string[]`
  - `nav: { first(): HTMLButtonElement; prev(): HTMLButtonElement; next(): HTMLButtonElement; last(): HTMLButtonElement }`
  - `setRowsPerPage(value: number): void`
  - `rangeText(): string`

- [ ] **Step 1: Write `test/test-utils/shadow.ts`**

```ts
/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * DOM queries that pierce open shadow roots.
 *
 * Testing Library's `screen` queries stop at the shadow boundary. The table
 * characterization tests (#771) must keep passing after PRs 4 and 5, where the pagination
 * chrome moves from MUI's light-DOM `<tfoot>` into `<keep-data-table>`'s shadow root. A
 * safety net that has to be edited by the very change it guards is not a safety net, so
 * these helpers look in the light DOM *and* in every open shadow root, and the same call
 * site holds before and after.
 *
 * Deliberately dumb: no caching, no MutationObserver, no closed-root handling. Every root
 * in this app is open (Lit's default), and the suites are small enough that walking the
 * tree per query costs nothing worth optimising.
 */

/** The document, then every open shadow root beneath it, depth-first. */
export function allRoots(root: Document | ShadowRoot = document): Array<Document | ShadowRoot> {
  const roots: Array<Document | ShadowRoot> = [root];
  for (const el of Array.from(root.querySelectorAll('*'))) {
    if (el.shadowRoot) roots.push(...allRoots(el.shadowRoot));
  }
  return roots;
}

/** Every match for `selector`, across all roots, in document order per root. */
export function deepQueryAll<E extends Element = Element>(selector: string): E[] {
  return allRoots().flatMap((root) => Array.from(root.querySelectorAll<E>(selector)));
}

/** The first match for `selector`, or `null`. */
export function deepQuery<E extends Element = Element>(selector: string): E | null {
  return deepQueryAll<E>(selector)[0] ?? null;
}

/**
 * A `<button>` by its `aria-label`, wherever it lives.
 *
 * Throws rather than returning null: a missing pagination button is always a test failure,
 * and `deepButton('Next Page').click()` on null reports a useless `TypeError`.
 *
 * MUI's `IconButton` and `keep-data-table`'s nav both label these buttons `First Page`,
 * `Previous Page`, `Next Page`, `Last Page` — so this is the one query that spans the
 * migration unchanged.
 */
export function deepButton(accessibleName: string): HTMLButtonElement {
  const found = deepQuery<HTMLButtonElement>(`button[aria-label="${accessibleName}"]`);
  if (!found) {
    const available = deepQueryAll<HTMLButtonElement>('button[aria-label]')
      .map((b) => b.getAttribute('aria-label'))
      .join(', ');
    throw new Error(`No button labelled "${accessibleName}". Available: [${available}]`);
  }
  return found;
}
```

- [ ] **Step 2: Write `test/test-utils/tables.ts`**

```ts
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
 * ⚠️ **PR 5 will need to rewrite this function body, and only this function body.**
 *
 * This is the one interaction with no query that spans the migration. Today MUI renders a
 * fake select — a `<div role="combobox">` that opens a popup `<ul role="listbox">` — and
 * driving it means `mouseDown` on the combobox then clicking the option. After the
 * migration `keep-data-table` renders a native `<select>` in its shadow root, driven by
 * setting `.value` and dispatching `change`.
 *
 * Every test that changes page size calls this helper instead of touching the widget, so
 * when the widget changes, no `it()` body moves. Replacement body for PR 5:
 *
 * ```ts
 * const select = deepQuery<HTMLSelectElement>('select')!;
 * select.value = String(value);
 * select.dispatchEvent(new Event('change', { bubbles: true }));
 * ```
 */
export function setRowsPerPage(value: number): void {
  const combobox = screen.getByRole('combobox', { name: /rows per page/i });
  fireEvent.mouseDown(combobox);
  const listbox = within(screen.getByRole('listbox'));
  fireEvent.click(listbox.getByRole('option', { name: value === -1 ? 'All' : String(value) }));
}
```

- [ ] **Step 3: Write the helper test**

Two things must be proven: that the queries actually cross a shadow boundary (a plain
`document.querySelector` would pass the light-DOM half of these tests and silently fail the
shadow half after migration), and that `deepButton` fails loudly.

```tsx
/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import { deepButton, deepQuery, deepQueryAll } from './shadow';

/** A host whose shadow root holds a labelled button — stands in for keep-data-table's nav. */
class ShadowHost extends HTMLElement {
  connectedCallback() {
    if (this.shadowRoot) return;
    this.attachShadow({ mode: 'open' }).innerHTML =
      '<button aria-label="Next Page">next</button><span class="range">1–5 of 42</span>';
  }
}
customElements.define('test-shadow-host', ShadowHost);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('shadow-piercing queries', () => {
  it('finds a light-DOM element', () => {
    document.body.innerHTML = '<button aria-label="Next Page">next</button>';
    expect(deepButton('Next Page').textContent).toBe('next');
  });

  it('finds an element inside a shadow root', () => {
    document.body.innerHTML = '<test-shadow-host></test-shadow-host>';
    expect(deepButton('Next Page').textContent).toBe('next');
  });

  // The point of the helper: a plain document query cannot see this, which is exactly the
  // failure mode PRs 4/5 would otherwise hit.
  it('sees what document.querySelector cannot', () => {
    document.body.innerHTML = '<test-shadow-host></test-shadow-host>';
    expect(document.querySelector('.range')).toBeNull();
    expect(deepQuery('.range')?.textContent).toBe('1–5 of 42');
  });

  it('returns matches from both the light DOM and shadow roots', () => {
    document.body.innerHTML =
      '<span class="range">light</span><test-shadow-host></test-shadow-host>';
    expect(deepQueryAll('.range').map((el) => el.textContent)).toEqual(['light', '1–5 of 42']);
  });

  it('returns null rather than throwing when nothing matches', () => {
    expect(deepQuery('.nothing-here')).toBeNull();
  });

  it('throws a listing of available labels when a button is missing', () => {
    document.body.innerHTML = '<button aria-label="First Page">first</button>';
    expect(() => deepButton('Last Page')).toThrow(/Available: \[First Page\]/);
  });
});
```

- [ ] **Step 4: Run the helper test**

```bash
npx vitest run test/test-utils/shadow.test.ts
```
Expected: 6 passed. If `sees what document.querySelector cannot` fails, the helper is not
actually piercing — fix `allRoots` before going further; every later task depends on it.

- [ ] **Step 5: Negative control**

Temporarily change `allRoots` to `return [root];` (no shadow recursion). Re-run.
Expected: the three shadow tests fail. Restore the recursion and re-run: 6 passed.

- [ ] **Step 6: Commit**

```bash
git add test/test-utils/shadow.ts test/test-utils/tables.ts test/test-utils/shadow.test.ts
git commit -m "Add shadow-piercing query helpers for the table characterization suite

The #771 migration moves the pagination chrome into keep-data-table's shadow
root, where Testing Library's queries cannot reach. These helpers look in the
light DOM and in every open shadow root, so the characterization assertions
written next survive PRs 4 and 5 without being edited by them."
```

---

### Task 2: `ColumnDetails`

**Files:**
- Test: `test/components/forms/ColumnDetails.test.tsx`
- Reads (do not edit): `src/components/forms/ColumnDetails.tsx`

**Interfaces:**
- Consumes: `bodyRows`, `headerLabels`, `cellTexts` from `test/test-utils/tables`.
- Produces: nothing for later tasks.

**Pinned:** header labels; one row per chosen column, in order; the column name as text; the
external-name field's placeholder; `handleEditColumn(column, value)` on typing;
`setRemoveColumn(name)` on the delete icon; the duplicate-error helper text.

**Not pinned:** the 75 % width, the `overflow-y`, anything Linaria (`css: false`).

The component takes six props but destructures only three — `viewName`, `column` and
`setEditColumn` are dead. Pass them anyway so the test compiles against the real prop type;
do not delete them from `src/`.

- [ ] **Step 1: Write the test file**

```tsx
/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { bodyRows, cellTexts, headerLabels } from '../../test-utils/tables';
import ColumnDetails from '../../../src/components/forms/ColumnDetails';

const columns = [
  { name: 'FirstName', externalName: 'first_name' },
  { name: 'LastName', externalName: 'last_name' },
];

function renderColumnDetails(chosenColumns: any[] = columns) {
  const handleEditColumn = vi.fn();
  const setRemoveColumn = vi.fn();
  const setEditColumn = vi.fn();
  renderWithProviders(
    <ColumnDetails
      viewName="TestView"
      column={null}
      chosenColumns={chosenColumns}
      handleEditColumn={handleEditColumn}
      setEditColumn={setEditColumn}
      setRemoveColumn={setRemoveColumn}
    />,
  );
  return { handleEditColumn, setRemoveColumn };
}

describe('ColumnDetails — structure', () => {
  it('labels the columns', () => {
    renderColumnDetails();
    expect(headerLabels()).toEqual(['', 'Column Name', 'External Name']);
  });

  it('names the table for assistive tech', () => {
    renderColumnDetails();
    expect(screen.getByRole('table', { name: 'edit columns table' })).toBeInTheDocument();
  });

  it('renders one row per chosen column, in order', () => {
    renderColumnDetails();
    const rows = bodyRows();
    expect(rows).toHaveLength(2);
    expect(cellTexts(rows[0])[1]).toBe('FirstName');
    expect(cellTexts(rows[1])[1]).toBe('LastName');
  });

  it('renders no body rows when nothing is chosen', () => {
    renderColumnDetails([]);
    expect(bodyRows()).toHaveLength(0);
  });

  it('shows the current external name as the field placeholder', () => {
    renderColumnDetails();
    expect(screen.getByPlaceholderText('first_name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('last_name')).toBeInTheDocument();
  });
});

describe('ColumnDetails — interaction', () => {
  it('reports an edited external name with its column', () => {
    const { handleEditColumn } = renderColumnDetails();
    fireEvent.change(screen.getByPlaceholderText('first_name'), { target: { value: 'given' } });
    expect(handleEditColumn).toHaveBeenCalledWith(columns[0], 'given');
  });

  it('asks to remove the column whose delete icon was clicked', () => {
    const { setRemoveColumn } = renderColumnDetails();
    const icon = bodyRows()[1].querySelector('.delete-icon');
    expect(icon).toBeTruthy();
    fireEvent.click(icon!);
    expect(setRemoveColumn).toHaveBeenCalledWith('LastName');
  });
});

describe('ColumnDetails — validation', () => {
  it('explains a duplicate external name', () => {
    renderColumnDetails([{ name: 'FirstName', externalName: 'dup', error: 'duplicate' }]);
    expect(screen.getByText('Cannot have duplicate external names!')).toBeInTheDocument();
  });

  it('shows no message for an unrecognised error code', () => {
    renderColumnDetails([{ name: 'FirstName', externalName: 'x', error: 'something-else' }]);
    expect(screen.queryByText('Cannot have duplicate external names!')).not.toBeInTheDocument();
  });

  it('shows no message when the column is clean', () => {
    renderColumnDetails();
    expect(screen.queryByText(/duplicate/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it**

```bash
npx vitest run test/components/forms/ColumnDetails.test.tsx
```
Expected: **all pass on the first run.** That is success, not a mistake — see "The
characterization loop". If a test fails, read what the DOM actually contains
(`screen.debug()`) and correct the *test*.

Two known risks, both test-side fixes:
- `headerLabels()` may return `[' ', 'Column Name', 'External Name']` — the first header
  cell contains a literal space (`<StyledTableCell width="150px"> </StyledTableCell>`).
  `.trim()` should handle it; if it does not, match what you observe.
- MUI's `TextField` may render `helperText` in a `<p>` — `getByText` finds it either way.

- [ ] **Step 3: Negative control**

Change the expected header list to `['', 'Column Name', 'Ext Name']`. Re-run — that one
test must fail. Restore it and re-run: all pass.

- [ ] **Step 4: Commit**

```bash
git add test/components/forms/ColumnDetails.test.tsx
git commit -m "Characterize ColumnDetails before the keep-data-table migration (#771)"
```

---

### Task 3: `AgentsTable`

**Files:**
- Test: `test/components/forms/AgentsTable.test.tsx`
- Reads: `src/components/forms/AgentsTable.tsx`, `src/components/forms/ActivateSwitch.tsx`

**Interfaces:**
- Consumes: `bodyRows`, `headerLabels`, `cellTexts`.
- Produces: nothing.

**Pinned:** header labels; one row per agent; the agent name; the switch's Active/Inactive
label; that toggling an inactive agent calls `toggleActive(agent)` and an active one calls
`toggleInactive(agent)`.

**Why the toggle branches are reachable with the default store:** `ActivateSwitch` reads
`state.dialog.loading` and `state.databases.{updateViewError,updateAgentError}`. With
`renderWithProviders`' defaults all three are `undefined` (falsy), so for an inactive agent
`!toggle && (!updateViewError || !updateAgentError)` is true → `toggleActive`; for an active
agent the chain falls through `type === 'view'` to `!updateAgentError && type === 'agent'`
→ `toggleInactive`. Both are the real production paths.

- [ ] **Step 1: Write the test file**

```tsx
/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { bodyRows, cellTexts, headerLabels } from '../../test-utils/tables';
import AgentsTable from '../../../src/components/forms/AgentsTable';

const agents = [
  { agentActive: false, agentAlias: [], agentName: 'NightlyClean', agentUnid: 'u1' },
  { agentActive: true, agentAlias: ['ac'], agentName: 'SendDigest', agentUnid: 'u2' },
];

function renderAgentsTable(list = agents) {
  const toggleActive = vi.fn().mockResolvedValue(undefined);
  const toggleInactive = vi.fn().mockResolvedValue(undefined);
  renderWithProviders(
    <AgentsTable agents={list} toggleActive={toggleActive} toggleInactive={toggleInactive} />,
  );
  return { toggleActive, toggleInactive };
}

/** The switch is a click target, not a <button> — scope to the row and take its container. */
const toggleIn = (row: HTMLTableRowElement) => row.querySelector('.toggle-container')!;

describe('AgentsTable — structure', () => {
  it('labels the columns', () => {
    renderAgentsTable();
    expect(headerLabels()).toEqual(['Agent Name', 'Status']);
  });

  it('explains what Status means', () => {
    renderAgentsTable();
    expect(
      screen.getByText(/Activate the Agents that should be accessible/),
    ).toBeInTheDocument();
  });

  it('renders one row per agent, in order', () => {
    renderAgentsTable();
    const rows = bodyRows();
    expect(rows).toHaveLength(2);
    expect(cellTexts(rows[0])[0]).toBe('NightlyClean');
    expect(cellTexts(rows[1])[0]).toBe('SendDigest');
  });

  it('renders no rows for an empty agent list', () => {
    renderAgentsTable([]);
    expect(bodyRows()).toHaveLength(0);
  });
});

describe('AgentsTable — activation', () => {
  it('shows Inactive for an inactive agent and Active for an active one', () => {
    renderAgentsTable();
    const [inactive, active] = bodyRows();
    // Both labels are always in the DOM (the switch renders each side); the *first*
    // button is the highlighted one, so assert on that.
    expect(within(inactive).getAllByRole('button')[0]).toHaveTextContent('Inactive');
    expect(within(active).getAllByRole('button')[0]).toHaveTextContent('Active');
  });

  it('activates an inactive agent', () => {
    const { toggleActive, toggleInactive } = renderAgentsTable();
    fireEvent.click(toggleIn(bodyRows()[0]));
    expect(toggleActive).toHaveBeenCalledWith(agents[0]);
    expect(toggleInactive).not.toHaveBeenCalled();
  });

  it('deactivates an active agent', () => {
    const { toggleActive, toggleInactive } = renderAgentsTable();
    fireEvent.click(toggleIn(bodyRows()[1]));
    expect(toggleInactive).toHaveBeenCalledWith(agents[1]);
    expect(toggleActive).not.toHaveBeenCalled();
  });

  it('refuses to toggle while a save is in flight', () => {
    const toggleActive = vi.fn();
    const toggleInactive = vi.fn();
    renderWithProviders(
      <AgentsTable agents={agents} toggleActive={toggleActive} toggleInactive={toggleInactive} />,
      { preloadedState: { dialog: { loading: true } } },
    );
    fireEvent.click(toggleIn(bodyRows()[0]));
    expect(toggleActive).not.toHaveBeenCalled();
    expect(toggleInactive).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it**

```bash
npx vitest run test/components/forms/AgentsTable.test.tsx
```
Expected: all pass. Likely correction: the Status header copy lives in `KeepTooltip`'s
`content`, which is not a text node, so `getByText` cannot find it. Assert on the trigger,
`expect(screen.getByText(/^Status/)).toBeInTheDocument()`, and pin the tooltip copy via the
**property** — `keep-tooltip.ts` declares `content` without `reflect: true`, so
`getAttribute('content')` is always `null` and `@lit/react` sets the live `.content` JS
property instead:

```ts
const tip = deepQuery('keep-tooltip') as unknown as { content?: string } | null;
expect(tip?.content).toContain('Activate the Agents');
```

- [ ] **Step 3: Negative control**

Change `expect(toggleActive).toHaveBeenCalledWith(agents[0])` to `agents[1]`. Re-run —
must fail. Restore.

- [ ] **Step 4: Commit**

```bash
git add test/components/forms/AgentsTable.test.tsx
git commit -m "Characterize AgentsTable before the keep-data-table migration (#771)"
```

---

### Task 4: `ViewsTable`

**Files:**
- Test: `test/components/forms/ViewsTable.test.tsx`
- Reads: `src/components/forms/ViewsTable.tsx`

**Interfaces:**
- Consumes: `bodyRows`, `headerLabels`, `cellTexts`.
- Produces: nothing.

**Pinned:** header labels; one row per view; the edit button opening an *active* view;
refusing to open an *inactive* one (and alerting instead); the folder marker driven by
`state.databases.folders`; the bold name for an updated active view; the alias column;
the edit button disabled while `state.dialog.loading`.

- [ ] **Step 1: Write the test file**

```tsx
/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { bodyRows, headerLabels } from '../../test-utils/tables';
import ViewsTable from '../../../src/components/forms/ViewsTable';
import { toggleAlert } from '../../../src/store/alerts/action';

vi.mock('../../../src/store/alerts/action', () => ({
  toggleAlert: vi.fn(() => ({ type: 'TOGGLE_ALERT' })),
}));

const views = [
  { viewName: 'ActiveView', viewAlias: ['av'], viewActive: true, viewUpdated: false },
  { viewName: 'InactiveView', viewAlias: [], viewActive: false, viewUpdated: false },
];

function renderViewsTable(
  list: any[] = views,
  preloadedState: Record<string, unknown> = {},
) {
  const toggleActive = vi.fn();
  const toggleInactive = vi.fn();
  const setViewOpen = vi.fn();
  const setOpenViewName = vi.fn();
  renderWithProviders(
    <ViewsTable
      views={list}
      toggleActive={toggleActive}
      toggleInactive={toggleInactive}
      dbName="testdb"
      nsfPath="test.nsf"
      setViewOpen={setViewOpen}
      setOpenViewName={setOpenViewName}
    />,
    { preloadedState },
  );
  return { setViewOpen, setOpenViewName };
}

beforeEach(() => {
  vi.mocked(toggleAlert).mockClear();
});

describe('ViewsTable — structure', () => {
  it('labels the columns, with a blank cell above the edit buttons', () => {
    renderViewsTable();
    expect(headerLabels()).toEqual(['', 'View Name', 'Alias', 'Status']);
  });

  it('renders one row per view', () => {
    renderViewsTable();
    expect(bodyRows()).toHaveLength(2);
  });

  it('shows the view name', () => {
    renderViewsTable();
    expect(within(bodyRows()[0]).getByText('ActiveView')).toBeInTheDocument();
  });

  it('shows the first alias only', () => {
    renderViewsTable();
    expect(within(bodyRows()[0]).getByText('av')).toBeInTheDocument();
  });

  it('shows no alias for a view without one', () => {
    renderViewsTable();
    expect(within(bodyRows()[1]).queryByText('av')).not.toBeInTheDocument();
  });

  it('bolds the name of a view that changed while active', () => {
    renderViewsTable([{ ...views[0], viewUpdated: true }]);
    expect(bodyRows()[0].querySelector('b')).toHaveTextContent('ActiveView');
  });

  it('does not bold a view that changed while inactive', () => {
    renderViewsTable([{ ...views[1], viewUpdated: true }]);
    expect(bodyRows()[0].querySelector('b')).toBeNull();
  });
});

describe('ViewsTable — opening a view', () => {
  it('opens an active view by name', () => {
    const { setViewOpen, setOpenViewName } = renderViewsTable();
    fireEvent.click(screen.getByTitle('ActiveView'));
    expect(setOpenViewName).toHaveBeenCalledWith('ActiveView');
    expect(setViewOpen).toHaveBeenCalledWith(true);
    expect(toggleAlert).not.toHaveBeenCalled();
  });

  it('refuses to open an inactive view and says why', () => {
    const { setViewOpen, setOpenViewName } = renderViewsTable();
    fireEvent.click(screen.getByTitle('InactiveView'));
    expect(setOpenViewName).not.toHaveBeenCalled();
    expect(setViewOpen).toHaveBeenCalledWith(false);
    expect(toggleAlert).toHaveBeenCalledWith('Please activate this view before editing it!');
  });

  it('disables the edit buttons while a save is in flight', () => {
    renderViewsTable(views, { dialog: { loading: true } });
    expect(screen.getByTitle('ActiveView')).toBeDisabled();
  });
});

describe('ViewsTable — folders', () => {
  it('marks a view that is really a folder', () => {
    renderViewsTable(views, { databases: { folders: [{ viewName: 'ActiveView' }], scopes: [] } });
    // The marker is a KeepTooltip whose copy names the view.
    expect(screen.getByText(/ActiveView is a folder/)).toBeInTheDocument();
  });

  it('leaves an ordinary view unmarked', () => {
    renderViewsTable();
    expect(screen.queryByText(/is a folder/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it**

```bash
npx vitest run test/components/forms/ViewsTable.test.tsx
```
Expected: all pass. Known risk, same as Task 3: the folder marker's copy is `KeepTooltip`'s
`content`, which `getByText` cannot see because it is not a text node.

**Task 3 established what it actually is, and it is not an attribute.** `keep-tooltip.ts`
declares `content` **without `reflect: true`**, so `getAttribute('content')` is always
`null`; `@lit/react` sets it as the live `.content` JS *property*. Read the property:

```ts
const tips = deepQueryAll('keep-tooltip').map((t) => (t as unknown as { content?: string }).content);
expect(tips).toContain('ActiveView is a folder.');
```
and for the negative case `expect(tips.join(' ')).not.toContain('is a folder')`.

- [ ] **Step 3: Negative control**

Change the alert copy assertion to `'Please activate this view!'`. Re-run — must fail.
Restore.

- [ ] **Step 4: Commit**

```bash
git add test/components/forms/ViewsTable.test.tsx
git commit -m "Characterize ViewsTable before the keep-data-table migration (#771)"
```

---

### Task 5: `FormsTable`

**Files:**
- Test: `test/components/forms/FormsTable.test.tsx`
- Reads: `src/components/forms/FormsTable.tsx`

**Interfaces:**
- Consumes: `bodyRows`, `headerLabels`.
- Produces: nothing.

**Pinned:** header labels; one row per form; the form name, alias and mode count; the
`custom form` marker for forms absent from `formList`; navigating to the access route for a
configured form; opening the activate dialog for an unconfigured one; confirming that dialog
dispatching `handleDatabaseForms`.

`ActivateMenu` is mocked. It is a menu with its own dialogs and Redux calls, it is not part
of the table chrome, and it does not migrate — including it for real would make this suite
fail for reasons unrelated to #771.

- [ ] **Step 1: Write the test file**

```tsx
/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { bodyRows, headerLabels } from '../../test-utils/tables';
import FormsTable from '../../../src/components/forms/FormsTable';
import { addForm, handleDatabaseForms } from '../../../src/store/databases/action';

const navigate = vi.fn();
vi.mock('../../../src/router/react', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useNavigate: () => navigate,
}));

vi.mock('../../../src/store/databases/action', () => ({
  addForm: vi.fn(() => ({ type: 'ADD_FORM' })),
  handleDatabaseForms: vi.fn(() => ({ type: 'HANDLE_DATABASE_FORMS' })),
  deleteForm: vi.fn(() => ({ type: 'DELETE_FORM' })),
}));

vi.mock('../../../src/components/forms/ActivateMenu', () => ({
  default: () => <span data-testid="activate-menu" />,
}));

// Contact carries *two* modes on purpose. With one, `getByText('1')` cannot tell
// `formModes.length` apart from a hardcoded 1 — the same vacuous-fixture trap the Task 4
// review caught in the alias column, where a one-element array could not distinguish
// "renders the first" from "renders all".
const forms = [
  { formName: 'Contact', alias: 'ct', formModes: [{ modeName: 'default' }, { modeName: 'edit' }] },
  { formName: 'Invoice', alias: '', formModes: [] },
];

const schemaData = { forms: [] } as any;

function renderFormsTable(list = forms, formList = ['Contact', 'Invoice']) {
  const setSchemaData = vi.fn();
  renderWithProviders(
    <FormsTable
      forms={list}
      dbName="testdb"
      nsfPath="test.nsf"
      schemaData={schemaData}
      setSchemaData={setSchemaData}
      formList={formList}
    />,
  );
  return { setSchemaData };
}

describe('FormsTable — structure', () => {
  it('labels the columns', () => {
    renderFormsTable();
    expect(headerLabels()).toEqual(['', 'Form Name', 'Form Aliases', 'Modes Available', 'Status']);
  });

  it('renders one row per form', () => {
    renderFormsTable();
    expect(bodyRows()).toHaveLength(2);
  });

  it('shows the form name, alias and mode count', () => {
    renderFormsTable();
    const row = within(bodyRows()[0]);
    expect(row.getByText('Contact')).toBeInTheDocument();
    expect(row.getByText('ct')).toBeInTheDocument();
    expect(row.getByText('2')).toBeInTheDocument();
  });

  it('counts each form’s own modes', () => {
    renderFormsTable();
    expect(within(bodyRows()[1]).getByText('0')).toBeInTheDocument();
  });

  it('renders the activate menu per row', () => {
    renderFormsTable();
    expect(screen.getAllByTestId('activate-menu')).toHaveLength(2);
  });
});

describe('FormsTable — custom forms', () => {
  it('marks a form that is not in the database form list', () => {
    renderFormsTable(forms, ['Contact']);
    expect(within(bodyRows()[1]).getByText('custom form')).toBeInTheDocument();
    expect(within(bodyRows()[0]).queryByText('custom form')).not.toBeInTheDocument();
  });

  it('marks nothing when every form is known', () => {
    renderFormsTable();
    expect(screen.queryByText('custom form')).not.toBeInTheDocument();
  });
});

describe('FormsTable — opening a form', () => {
  it('navigates straight to a configured form', () => {
    renderFormsTable();
    fireEvent.click(screen.getByTitle('Contact'));
    expect(addForm).toHaveBeenCalledWith(false);
    expect(navigate).toHaveBeenCalledWith('/schema/test.nsf/testdb/Contact/access');
  });

  it('offers to activate an unconfigured form instead of navigating', () => {
    renderFormsTable();
    fireEvent.click(screen.getByTitle('Invoice'));
    expect(navigate).not.toHaveBeenCalled();
    // jsdom has no modal top layer; setupTests stubs showModal, so assert on the stub.
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it('activates the form when the offer is confirmed', () => {
    renderFormsTable();
    fireEvent.click(screen.getByTitle('Invoice'));
    fireEvent.click(screen.getByText('OK'));
    expect(handleDatabaseForms).toHaveBeenCalled();
  });

  it('leaves the form alone when the offer is cancelled', () => {
    renderFormsTable();
    fireEvent.click(screen.getByTitle('Invoice'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(handleDatabaseForms).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it**

```bash
npx vitest run test/components/forms/FormsTable.test.tsx
```
Expected: all pass. Three known risks, all test-side:
- `showModal` is only a `vi.fn()` if jsdom did **not** provide one (`setupTests.ts:75` guards
  with `if (!...)`). If the assertion reports "not a spy", replace it with a local
  `vi.spyOn(HTMLDialogElement.prototype, 'showModal')` installed in `beforeEach`.
- `OK`/`Cancel` are `<keep-button>` children, so their text is a slotted text node —
  `getByText` finds it, but if the click does not reach the handler, click the host:
  `fireEvent.click(screen.getByText('OK').closest('keep-button')!)`.
- The mode-count cell renders `1`; if `getByText('1')` matches more than one node, scope it
  with `{ selector: 'span' }`.

- [ ] **Step 3: Negative control**

Change the expected route to `/schema/test.nsf/testdb/Contact/fields`. Re-run — must fail.
Restore.

- [ ] **Step 4: Commit**

```bash
git add test/components/forms/FormsTable.test.tsx
git commit -m "Characterize FormsTable before the keep-data-table migration (#771)"
```

---

### Task 6: `AppItem`

**Files:**
- Test: `test/components/applications/AppItem.test.tsx`
- Reads: `src/components/applications/AppItem.tsx`

**Interfaces:**
- Consumes: nothing from `tables.ts` (this is a row, not a table).
- Produces: nothing. Task 7 mocks `AppItem` away and builds its own 12-app fixture, so
  `makeApp` here is local to this file. Do not export it.

**Pinned:** the five cells; the launch button for an active app and its absence when
disabled; App ID display and copy-to-clipboard; the PKCE branch; the three app-secret
branches (`Click to Generate Secret` / masked with refresh / generated); the edit button
loading formik and opening the drawer; the delete button.

`AppIcon` is mocked — it resolves icons through `useAppIcons` and has its own suite
(`test/components/commons/AppIcon.test.tsx`).

A row component must be rendered inside a `<table><tbody>` or React warns and jsdom nests it
oddly; `renderWithProviders` accepts a `container`, so mount into a real tbody.

- [ ] **Step 1: Write the test file**

```tsx
/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import AppItem from '../../../src/components/applications/AppItem';
import { generateSecret } from '../../../src/store/applications/action';
import { toggleApplicationDrawer } from '../../../src/store/drawer/action';

vi.mock('../../../src/store/applications/action', () => ({
  generateSecret: vi.fn(() => ({ type: 'GENERATE_SECRET' })),
}));
vi.mock('../../../src/store/drawer/action', () => ({
  toggleApplicationDrawer: vi.fn(() => ({ type: 'TOGGLE_APP_DRAWER' })),
}));
vi.mock('../../../src/components/commons/AppIcon', () => ({
  AppIcon: () => <span data-testid="app-icon" />,
  default: () => <span data-testid="app-icon" />,
}));

function makeApp(overrides: Record<string, unknown> = {}) {
  return {
    appName: 'Timesheets',
    appDescription: 'Track hours',
    appCallbackUrls: [],
    appContacts: [],
    appIcon: 'beach',
    appId: 'app-123',
    appScope: 'read',
    appHasSecret: false,
    appSecret: '',
    appStartPage: 'https://example.test/start',
    appStatus: 'isActive',
    usePkce: false,
    ...overrides,
  } as any;
}

/** AppItem renders <tr>s, so it needs a real table ancestor to nest correctly. */
function renderAppItem(app = makeApp()) {
  const deleteApplication = vi.fn();
  const formik = { setValues: vi.fn() } as any;
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  document.body.appendChild(table);
  renderWithProviders(
    <AppItem app={app} deleteApplication={deleteApplication} formik={formik} />,
    { container: tbody },
  );
  return { deleteApplication, formik };
}

describe('AppItem — layout', () => {
  it('renders five cells in the data row', () => {
    renderAppItem();
    const row = document.querySelector('tbody tr') as HTMLTableRowElement;
    expect(row.querySelectorAll('td')).toHaveLength(5);
  });

  it('shows the app name and description', () => {
    renderAppItem();
    expect(screen.getByText('Timesheets')).toBeInTheDocument();
    expect(screen.getByText('Track hours')).toBeInTheDocument();
  });

  it('shows the app id', () => {
    renderAppItem();
    expect(screen.getByText('app-123')).toBeInTheDocument();
  });
});

describe('AppItem — launching', () => {
  it('opens the start page for an active app', () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderAppItem();
    fireEvent.click(screen.getByRole('button', { name: /Launch Timesheets/i }));
    expect(open).toHaveBeenCalledWith('https://example.test/start');
    open.mockRestore();
  });

  it('offers no launch button for a disabled app', () => {
    renderAppItem(makeApp({ appStatus: 'disabled' }));
    expect(screen.queryByRole('button', { name: /Launch/i })).not.toBeInTheDocument();
  });
});

describe('AppItem — secrets', () => {
  it('offers to generate a secret when the app has none', () => {
    renderAppItem();
    expect(screen.getByText('Click to Generate Secret')).toBeInTheDocument();
  });

  it('generates the secret when asked', () => {
    renderAppItem();
    fireEvent.click(screen.getByText('Click to Generate Secret'));
    expect(generateSecret).toHaveBeenCalled();
  });

  it('masks an existing secret rather than showing it', () => {
    renderAppItem(makeApp({ appHasSecret: true }));
    expect(screen.getByText('********************')).toBeInTheDocument();
    expect(screen.queryByText('Click to Generate Secret')).not.toBeInTheDocument();
  });

  it('shows PKCE instead of a secret when the app uses it', () => {
    renderAppItem(makeApp({ usePkce: true }));
    expect(screen.getByText('PKCE')).toBeInTheDocument();
    expect(screen.queryByText(/App Secret/)).not.toBeInTheDocument();
  });
});

describe('AppItem — actions', () => {
  it('loads the app into the form and opens the drawer on edit', () => {
    const { formik } = renderAppItem();
    fireEvent.click(screen.getByRole('button', { name: /Edit Application/i }));
    expect(formik.setValues).toHaveBeenCalledWith(
      expect.objectContaining({ appId: 'app-123', appName: 'Timesheets', appStatus: true }),
    );
    expect(toggleApplicationDrawer).toHaveBeenCalled();
  });

  it('reports the app status as a boolean derived from isActive', () => {
    const { formik } = renderAppItem(makeApp({ appStatus: 'disabled' }));
    fireEvent.click(screen.getByRole('button', { name: /Edit Application/i }));
    expect(formik.setValues).toHaveBeenCalledWith(expect.objectContaining({ appStatus: false }));
  });

  it('deletes by app id', () => {
    const { deleteApplication } = renderAppItem();
    fireEvent.click(screen.getByRole('button', { name: /Delete Application/i }));
    expect(deleteApplication).toHaveBeenCalledWith('app-123');
  });
});
```

- [ ] **Step 2: Run it**

```bash
npx vitest run test/components/applications/AppItem.test.tsx
```
Expected: all pass. The one likely correction: the buttons are wrapped by `KeepTooltip`,
whose `content` is an **attribute**, not an accessible name — so
`getByRole('button', { name: /Launch Timesheets/i })` may find nothing. If so, select by
position within the cell and say so in a comment, e.g.
```ts
const launch = document.querySelector('td.expand button') as HTMLButtonElement;
```
and for edit/delete, `document.querySelectorAll('td:last-child button')[0]` / `[1]`.
Prefer the role query if it works; fall back only where it does not.

- [ ] **Step 3: Negative control**

Change `expect(deleteApplication).toHaveBeenCalledWith('app-123')` to `'app-999'`. Re-run —
must fail. Restore.

- [ ] **Step 4: Commit**

```bash
git add test/components/applications/AppItem.test.tsx
git commit -m "Characterize AppItem before the keep-data-table migration (#771)"
```

---

### Task 7: `AppsTable`

**Files:**
- Test: `test/components/applications/AppsTable.test.tsx`
- Reads: `src/components/applications/AppsTable.tsx`

**Interfaces:**
- Consumes: `bodyRows`, `headerLabels`, `nav`, `rangeText`, `setRowsPerPage`.
- Produces: nothing.

**Pinned — this is the important one:** the page-slicing arithmetic, the nav buttons'
disabled states at both boundaries, the empty state, the App Name search filter, and the
sort toggle. These are exactly what PR 5 must not change.

`AppItem` is mocked to a single-cell row: this suite is about *which* rows appear, not what
is in them — Task 6 owns that. A real `AppItem` would also drag `AppIcon` and the clipboard
into a pagination test.

- [ ] **Step 1: Write the test file**

```tsx
/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import { headerLabels, nav, rangeText, setRowsPerPage } from '../../test-utils/tables';
import AppsTable from '../../../src/components/applications/AppsTable';

vi.mock('../../../src/components/applications/AppItem', () => ({
  default: ({ app }: any) => (
    <tr data-testid="app-row">
      <td>{app.appName}</td>
    </tr>
  ),
}));
vi.mock('../../../src/components/applications/AppFilterContainer', () => ({
  default: () => <div data-testid="app-filters" />,
}));
vi.mock('../../../src/store/applications/action', () => ({
  fetchMyApps: vi.fn(() => ({ type: 'FETCH_MY_APPS' })),
}));

/** 12 apps named App01…App12 — enough for three pages at the default size of 5. */
const apps = Array.from({ length: 12 }, (_, i) => ({
  appName: `App${String(i + 1).padStart(2, '0')}`,
  appId: `id-${i}`,
  appStatus: i % 2 === 0 ? 'isActive' : 'disabled',
  appSecret: null,
  usePkce: false,
}));

function renderAppsTable(list: any[] = apps) {
  const deleteApplication = vi.fn();
  renderWithProviders(
    <AppsTable
      filtersOn={false}
      setFiltersOn={vi.fn()}
      reset={false}
      setReset={vi.fn()}
      deleteApplication={deleteApplication}
      formik={{ setValues: vi.fn() } as any}
    />,
    { preloadedState: { apps: { apps: list } } },
  );
}

const visibleNames = () =>
  screen.queryAllByTestId('app-row').map((row) => row.textContent?.trim() ?? '');

describe('AppsTable — structure', () => {
  it('labels the columns', () => {
    renderAppsTable();
    expect(headerLabels()).toEqual(
      expect.arrayContaining(['App IDApp Secret', 'Description']),
    );
  });

  it('offers a search box for app names', () => {
    renderAppsTable();
    expect(screen.getByPlaceholderText('Search App Name')).toBeInTheDocument();
  });

  it('replaces the whole table with a prompt when there are no apps', () => {
    renderAppsTable([]);
    expect(screen.getByText('There are currently no apps to display.')).toBeInTheDocument();
    expect(document.querySelector('table')).toBeNull();
  });
});

describe('AppsTable — pagination', () => {
  it('shows the first five apps by default', () => {
    renderAppsTable();
    expect(visibleNames()).toEqual(['App01', 'App02', 'App03', 'App04', 'App05']);
  });

  it('reports the visible range', () => {
    renderAppsTable();
    expect(rangeText()).toBe('1–5 of 12');
  });

  it('advances a page', () => {
    renderAppsTable();
    fireEvent.click(nav.next());
    expect(visibleNames()).toEqual(['App06', 'App07', 'App08', 'App09', 'App10']);
  });

  it('shows a short final page', () => {
    renderAppsTable();
    fireEvent.click(nav.last());
    expect(visibleNames()).toEqual(['App11', 'App12']);
  });

  it('goes back to the start', () => {
    renderAppsTable();
    fireEvent.click(nav.last());
    fireEvent.click(nav.first());
    expect(visibleNames()).toEqual(['App01', 'App02', 'App03', 'App04', 'App05']);
  });

  it('steps back one page', () => {
    renderAppsTable();
    fireEvent.click(nav.next());
    fireEvent.click(nav.prev());
    expect(visibleNames()[0]).toBe('App01');
  });

  it('disables first and previous on page one', () => {
    renderAppsTable();
    expect(nav.first()).toBeDisabled();
    expect(nav.prev()).toBeDisabled();
    expect(nav.next()).toBeEnabled();
  });

  it('disables next and last on the final page', () => {
    renderAppsTable();
    fireEvent.click(nav.last());
    expect(nav.next()).toBeDisabled();
    expect(nav.last()).toBeDisabled();
    expect(nav.prev()).toBeEnabled();
  });

  it('shows every app when the page size is All', () => {
    renderAppsTable();
    setRowsPerPage(-1);
    expect(visibleNames()).toHaveLength(12);
  });

  it('returns to page one when the page size changes', () => {
    renderAppsTable();
    fireEvent.click(nav.next());
    setRowsPerPage(10);
    expect(visibleNames()[0]).toBe('App01');
  });
});

describe('AppsTable — filtering and sorting', () => {
  it('filters by app name, case-insensitively', () => {
    renderAppsTable();
    fireEvent.change(screen.getByPlaceholderText('Search App Name'), {
      target: { value: 'app1' },
    });
    expect(visibleNames()).toEqual(['App10', 'App11', 'App12']);
  });

  it('shows no rows when nothing matches', () => {
    renderAppsTable();
    fireEvent.change(screen.getByPlaceholderText('Search App Name'), {
      target: { value: 'nope' },
    });
    expect(visibleNames()).toEqual([]);
  });

  it('reverses the name order when sorting twice', () => {
    renderAppsTable();
    const sort = screen.getByPlaceholderText('Search App Name')
      .closest('th, td')!
      .querySelector('button')!;
    fireEvent.click(sort);
    const ascending = visibleNames();
    fireEvent.click(sort);
    expect(visibleNames()).not.toEqual(ascending);
    expect(visibleNames()[0]).toBe('App12');
  });
});
```

- [ ] **Step 2: Run it**

```bash
npx vitest run test/components/applications/AppsTable.test.tsx
```
Expected: mostly pass; **expect corrections here, and take the code's answer.** Likely ones:
- The `headerLabels()` assertion concatenates `App ID` and `App Secret` because they sit in
  one cell. Run once, print the array, and pin exactly what you see.
- `rangeText()` — MUI writes `1–5 of 12` with an en dash (U+2013). Copy the real character
  from the failure output rather than typing a hyphen.
- "filters by app name" depends on `App1` matching `App10/11/12` but not `App01`. Confirm
  against `appName.toLowerCase().indexOf('app1')` — `App01` does not contain `app1`, so the
  expectation holds; if the output disagrees, the fixture names need re-checking, not the
  component.
- The sort button is the only `<button>` in the App Name header cell. If `closest('th, td')`
  returns null because MUI renders `<td>` inside `<thead>`, widen to
  `screen.getByPlaceholderText('Search App Name').closest('div')!.querySelector('button')!`.

- [ ] **Step 3: Negative control**

Change "advances a page" to expect `['App05', …]`. Re-run — must fail. Restore.
Then delete the `slice(...)` call mentally: confirm that "shows the first five apps by
default" is the test that would catch a broken page window.

- [ ] **Step 4: Commit**

```bash
git add test/components/applications/AppsTable.test.tsx
git commit -m "Characterize AppsTable pagination, filtering and sorting (#771)"
```

---

### Task 8: `ConsentItem`

**Files:**
- Test: `test/components/applications/kanban/ConsentItem.test.tsx`
- Reads: `src/components/applications/kanban/ConsentItem.tsx`

**Interfaces:**
- Consumes: nothing from `tables.ts` (this is a row, not a table).
- Produces: nothing. Task 9 mocks `ConsentItem` away and builds its own 12-consent fixture,
  so `makeConsent` here is local to this file. Do not export it.

**Pinned:** the two rows per consent; the username resolved from `state.users` with fallback;
the app name resolved from `state.apps` with `-` fallback; expand/collapse; the `expand` prop
driving it; the redirect URL and scope chips; Revoke dispatching `toggleDeleteConsent`; and
the **status-dot colours**, which are computed from timestamp deltas and are the one piece
of visual state that is real logic rather than styling.

Dates are relative to "now", so the fixtures compute offsets from `Date.now()` at render
time. Do not freeze the clock — the component calls `new Date()` directly and a frozen clock
would pin a behaviour the component does not have.

- [ ] **Step 1: Write the test file**

```tsx
/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import ConsentItem from '../../../../src/components/applications/kanban/ConsentItem';
import { toggleDeleteConsent } from '../../../../src/store/consents/action';

vi.mock('../../../../src/store/consents/action', () => ({
  toggleDeleteConsent: vi.fn(() => ({ type: 'TOGGLE_DELETE_CONSENT' })),
}));

const DAY = 86_400_000;
const at = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

function makeConsent(overrides: Record<string, unknown> = {}) {
  return {
    username: 'CN=Ann Lee/O=Acme',
    scope: 'read,write',
    client_id: 'app-123',
    unid: 'unid-1',
    redirect_uri: 'https://example.test/cb',
    code_expires_at: at(7 * DAY),
    refresh_token_expires_at: at(30 * DAY),
    scope_claim: '',
    scope_description: '',
    scope_logo_url: '',
    ...overrides,
  } as any;
}

const apps = [{ appId: 'app-123', appName: 'Timesheets' }];

function renderConsentItem(
  consent = makeConsent(),
  { expand = false, users = [] as any[] } = {},
) {
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');
  table.appendChild(tbody);
  document.body.appendChild(table);
  return renderWithProviders(<ConsentItem consent={consent} expand={expand} />, {
    container: tbody,
    preloadedState: { apps: { apps }, users: { users } },
  });
}

/** The `fill` of each status dot, in render order: code expiry, then token expiry. */
const dotColours = () =>
  Array.from(document.querySelectorAll('circle')).map((c) => c.getAttribute('fill'));

describe('ConsentItem — identity', () => {
  it('renders a data row and a details row', () => {
    renderConsentItem();
    expect(document.querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('falls back to the raw username when no directory match exists', () => {
    renderConsentItem();
    expect(screen.getByText('CN=Ann Lee/O=Acme')).toBeInTheDocument();
  });

  it('prefers the internet address from the directory', () => {
    renderConsentItem(makeConsent(), {
      users: [{ ann: { FullName: ['CN=Ann Lee/O=Acme'], InternetAddress: ['ann@acme.test'] } }],
    });
    expect(screen.getByText('ann@acme.test')).toBeInTheDocument();
  });

  it('names the granting app', () => {
    renderConsentItem();
    expect(screen.getByText('Timesheets')).toBeInTheDocument();
  });

  it('shows a dash when the app is unknown', () => {
    renderConsentItem(makeConsent({ client_id: 'gone' }));
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});

describe('ConsentItem — expiry dots', () => {
  it('is green when both expiries are far off', () => {
    renderConsentItem();
    expect(dotColours()).toEqual(['#0FA068', '#0FA068']);
  });

  it('warns amber within a day of expiry', () => {
    renderConsentItem(makeConsent({ code_expires_at: at(DAY / 2) }));
    expect(dotColours()[0]).toBe('#FFCD41');
  });

  it('goes red once expired', () => {
    renderConsentItem(makeConsent({ code_expires_at: at(-DAY) }));
    expect(dotColours()[0]).toBe('#C3335F');
  });

  it('tracks the token expiry independently', () => {
    renderConsentItem(makeConsent({ refresh_token_expires_at: at(-DAY) }));
    expect(dotColours()).toEqual(['#0FA068', '#C3335F']);
  });

  it('shows a dash for an unparseable expiry', () => {
    renderConsentItem(makeConsent({ code_expires_at: 'not-a-date' }));
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
  });
});

describe('ConsentItem — details', () => {
  it('starts collapsed', () => {
    renderConsentItem();
    expect(screen.queryByText('https://example.test/cb')).not.toBeInTheDocument();
  });

  it('reveals the redirect url and scopes when expanded', () => {
    renderConsentItem();
    fireEvent.click(document.querySelector('td.expand button')!);
    expect(screen.getByText('https://example.test/cb')).toBeInTheDocument();
    expect(screen.getByText('read')).toBeInTheDocument();
    expect(screen.getByText('write')).toBeInTheDocument();
  });

  it('collapses again', () => {
    renderConsentItem();
    const cell = document.querySelector('td.expand')!;
    fireEvent.click(cell.querySelector('button')!);
    fireEvent.click(cell.querySelector('button')!);
    expect(screen.queryByText('https://example.test/cb')).not.toBeInTheDocument();
  });

  it('starts expanded when the table asks it to', () => {
    renderConsentItem(makeConsent(), { expand: true });
    expect(screen.getByText('https://example.test/cb')).toBeInTheDocument();
  });

  it('opens the redirect url in a new tab', () => {
    renderConsentItem(makeConsent(), { expand: true });
    const link = screen.getByText('https://example.test/cb') as HTMLAnchorElement;
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
  });
});

describe('ConsentItem — revoking', () => {
  it('asks to delete the consent with its app, user and scope', () => {
    renderConsentItem();
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(toggleDeleteConsent).toHaveBeenCalledWith(
      'unid-1',
      'Timesheets',
      'CN=Ann Lee/O=Acme',
      'read,write',
    );
  });

  it('passes an empty app name when the app is unknown', () => {
    renderConsentItem(makeConsent({ client_id: 'gone' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }));
    expect(toggleDeleteConsent).toHaveBeenCalledWith(
      'unid-1',
      '',
      'CN=Ann Lee/O=Acme',
      'read,write',
    );
  });
});
```

- [ ] **Step 2: Run it**

```bash
npx vitest run test/components/applications/kanban/ConsentItem.test.tsx
```
Expected: all pass. Known risks:
- MUI's `Collapse` uses `unmountOnExit`, so the collapsed assertions should hold — but if
  the content is present-but-hidden instead, switch to `not.toBeVisible()`.
- The directory-match branch reads `InternetAddress` as an **array** in the ternary's
  consequent (`…InternetAddress` — no `[0]`), unlike the filter above it. React renders a
  one-element array as its single string, so `getByText('ann@acme.test')` still passes.
  If it does not, pin what you observe and add a `// BUG:` note — do not touch `src/`.

- [ ] **Step 3: Negative control**

Change the amber threshold expectation to `'#0FA068'`. Re-run — must fail. Restore.

- [ ] **Step 4: Commit**

```bash
git add test/components/applications/kanban/ConsentItem.test.tsx
git commit -m "Characterize ConsentItem expiry dots, expansion and revoke (#771)"
```

---

### Task 9: `ConsentsTable`

**Files:**
- Test: `test/components/applications/kanban/ConsentsTable.test.tsx`
- Reads: `src/components/applications/kanban/ConsentsTable.tsx`

**Interfaces:**
- Consumes: `headerLabels`, `nav`, `rangeText`, `setRowsPerPage`.
- Produces: nothing.

**Pinned:** the loading state replacing the table; header labels; page slicing; nav disabled
states; the User and App Name search filters; both sort toggles.

Records are counted by their Revoke buttons, not by `bodyRows()`: `ConsentItem` renders two
`<tr>` per consent, so a row count would be 2× the record count and would silently change
meaning if the collapse row ever moved.

- [ ] **Step 1: Write the test file**

```tsx
/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../../test-utils/renderWithProviders';
import { headerLabels, nav, rangeText, setRowsPerPage } from '../../../test-utils/tables';
import ConsentsTable from '../../../../src/components/applications/kanban/ConsentsTable';

vi.mock('../../../../src/components/applications/kanban/ConsentItem', () => ({
  default: ({ consent }: any) => (
    <tr data-testid="consent-row">
      <td>{consent.username}</td>
      <td>
        <button>Revoke</button>
      </td>
    </tr>
  ),
}));
vi.mock('../../../../src/components/consents/ConsentFilterContainer', () => ({
  default: () => <div data-testid="consent-filters" />,
}));

const DAY = 86_400_000;

/** 12 consents, User01…User12, each tied to a distinct app so sorting is observable. */
const consents = Array.from({ length: 12 }, (_, i) => ({
  username: `User${String(i + 1).padStart(2, '0')}`,
  scope: 'read',
  client_id: `app-${i}`,
  unid: `unid-${i}`,
  redirect_uri: 'https://example.test/cb',
  code_expires_at: new Date(Date.now() + 7 * DAY).toISOString(),
  refresh_token_expires_at: new Date(Date.now() + 30 * DAY).toISOString(),
}));

const apps = consents.map((c, i) => ({
  appId: c.client_id,
  appName: `App${String(12 - i).padStart(2, '0')}`,
}));

function renderConsentsTable(preloadedState: Record<string, unknown> = {}) {
  renderWithProviders(
    <ConsentsTable
      expand={false}
      filtersOn={false}
      setFiltersOn={vi.fn()}
      reset={false}
      setReset={vi.fn()}
    />,
    {
      preloadedState: {
        consents: { consents },
        apps: { apps },
        users: { users: [] },
        loading: { consentsLoading: false, usersLoading: false },
        ...preloadedState,
      },
    },
  );
}

const visibleUsers = () =>
  screen.queryAllByTestId('consent-row').map((r) => r.querySelector('td')!.textContent);

describe('ConsentsTable — loading', () => {
  it('replaces the table while consents load', () => {
    renderConsentsTable({ loading: { consentsLoading: true, usersLoading: false } });
    expect(document.querySelector('table')).toBeNull();
    expect(screen.getByText(/Users and Consents are loading/)).toBeInTheDocument();
  });

  it('replaces the table while users load', () => {
    renderConsentsTable({ loading: { consentsLoading: false, usersLoading: true } });
    expect(document.querySelector('table')).toBeNull();
  });

  it('shows the table once both have loaded', () => {
    renderConsentsTable();
    expect(document.querySelector('table')).toBeTruthy();
  });
});

describe('ConsentsTable — structure', () => {
  it('labels the columns', () => {
    renderConsentsTable();
    expect(headerLabels().join('|')).toContain('Expirations');
    expect(headerLabels().join('|')).toContain('Action');
  });

  it('offers search boxes for user and app name', () => {
    renderConsentsTable();
    expect(screen.getByPlaceholderText('Search User')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search App Name')).toBeInTheDocument();
  });
});

describe('ConsentsTable — pagination', () => {
  it('shows the first five consents by default', () => {
    renderConsentsTable();
    expect(visibleUsers()).toEqual(['User01', 'User02', 'User03', 'User04', 'User05']);
  });

  it('reports the visible range', () => {
    renderConsentsTable();
    expect(rangeText()).toBe('1–5 of 12');
  });

  it('advances a page', () => {
    renderConsentsTable();
    fireEvent.click(nav.next());
    expect(visibleUsers()[0]).toBe('User06');
  });

  it('shows a short final page', () => {
    renderConsentsTable();
    fireEvent.click(nav.last());
    expect(visibleUsers()).toEqual(['User11', 'User12']);
  });

  it('disables first and previous on page one', () => {
    renderConsentsTable();
    expect(nav.first()).toBeDisabled();
    expect(nav.prev()).toBeDisabled();
  });

  it('disables next and last on the final page', () => {
    renderConsentsTable();
    fireEvent.click(nav.last());
    expect(nav.next()).toBeDisabled();
    expect(nav.last()).toBeDisabled();
  });

  it('shows every consent when the page size is All', () => {
    renderConsentsTable();
    setRowsPerPage(-1);
    expect(visibleUsers()).toHaveLength(12);
  });
});

describe('ConsentsTable — filtering and sorting', () => {
  it('filters by username', () => {
    renderConsentsTable();
    fireEvent.change(screen.getByPlaceholderText('Search User'), {
      target: { value: 'user1' },
    });
    expect(visibleUsers()).toEqual(['User10', 'User11', 'User12']);
  });

  it('filters by app name', () => {
    renderConsentsTable();
    fireEvent.change(screen.getByPlaceholderText('Search App Name'), {
      target: { value: 'App01' },
    });
    expect(visibleUsers()).toEqual(['User12']);
  });

  it('reverses the user order when sorted twice', () => {
    renderConsentsTable();
    const sort = screen.getByPlaceholderText('Search User')
      .closest('td, th')!
      .querySelector('button')!;
    fireEvent.click(sort);
    fireEvent.click(sort);
    expect(visibleUsers()[0]).toBe('User12');
  });
});
```

- [ ] **Step 2: Run it**

```bash
npx vitest run test/components/applications/kanban/ConsentsTable.test.tsx
```
Expected: mostly pass. **This is the file most likely to disagree with the plan**, because
its filter effect is large and its sort handlers mutate `consents` in place
(`consents.sort(...)` — not a copy, unlike `AppsTable`). Take the code's answer every time.
Specifically:
- The sort tests may see an already-mutated fixture from a previous test, since
  `consents.sort()` mutates the module-level array. If a sort test is order-dependent, build
  the fixture inside `renderConsentsTable` (`consents.map((c) => ({ ...c }))` and a fresh
  array) so each test starts clean, and add a comment naming the in-place sort as the reason.
- `setFiltersOn` is called during the effect; it is a `vi.fn()`, so nothing loops.
- The trailing `setPage(0)` in the filter effect means changing a search box always returns
  to page one. If you can assert that cheaply, add a test for it — it is real behaviour.

- [ ] **Step 3: Negative control**

Change "shows a short final page" to expect three names. Re-run — must fail. Restore.

- [ ] **Step 4: Commit**

```bash
git add test/components/applications/kanban/ConsentsTable.test.tsx
git commit -m "Characterize ConsentsTable pagination, filtering and sorting (#771)"
```

---

### Task 10: Verify the net and open the PR

**Files:**
- Modify (only if measurement demands it): `vitest.config.ts` coverage thresholds

**Interfaces:**
- Consumes: every preceding task.
- Produces: the PR.

Nine new suites over ~2,100 lines of previously untested `src/` will move global coverage
up. The gate is a *ratchet*: floors sit a few points below measurement so a refactor does not
fail CI, but a floor far below reality protects nothing. Raising the global floors is the
right move here — and it is the only `src/`-adjacent edit this PR is allowed to make, because
it is config, not behaviour.

- [ ] **Step 1: Run the whole suite**

```bash
npm test
```
Expected: every suite green, including the 87 files / 996 tests that existed before.
If a *pre-existing* suite broke, a mock in a new file leaked — `vi.mock` is hoisted per
file, so this should not happen; if it does, the cause is a global (`window.open`,
`HTMLDialogElement.prototype`) left stubbed. Restore it in an `afterEach`.

- [ ] **Step 2: Measure coverage**

```bash
npx vitest run --coverage 2>&1 | tail -40
```
Record the new global `lines / statements / functions / branches`.

- [ ] **Step 3: Raise the global floors**

Set each global threshold in `vitest.config.ts` to roughly 2 points below the number you
just measured, and update the "Measured on `new_code`" comment block above `thresholds` with
the new figures and `(#771)`. Leave every per-path floor untouched — this PR adds no
`keep-elements`, `services`, `store` or `utils` coverage.

- [ ] **Step 4: Re-run with coverage to confirm the gate passes**

```bash
npx vitest run --coverage
```
Expected: no threshold failure. If a floor now fails, you set it above the measurement —
lower it.

- [ ] **Step 5: Typecheck, lint and build**

```bash
npx tsc -b && npm run lint && npm run build
```
Expected: all clean. `npm run build` matters even though this is a test-only PR — the
`vitest` suite passing is not evidence the bundle builds (that is exactly how the wyw
`accessor` breakage in #747 got through a green suite).

- [ ] **Step 6: Commit the gate change**

```bash
git add vitest.config.ts
git commit -m "Raise the global coverage floors after the table characterization suites (#771)"
```

- [ ] **Step 7: Open the PR against `new_code`**

```bash
git push -u origin test/771-table-characterization
gh pr create --base new_code --title "Characterize the eight MUI table screens before migration" --body "$(cat <<'EOF'
PR 3 of #771. Test-only — no `src/` file changes.

None of the eight files being migrated had a single test. This adds nine suites so
PRs 4 and 5 can replace the table chrome with `<keep-data-table>` and prove nothing
else moved.

## Written to survive the migration

Every assertion targets semantic HTML, accessible names, visible text or callback
arguments — never a MUI class name or MUI-specific DOM shape. A characterization
test that breaks *because of* the migration would force PR 5 to edit its own safety
net, which would prove nothing.

Two helpers absorb the parts that would otherwise break:

- `test/test-utils/shadow.ts` — queries that pierce open shadow roots, because the
  pagination chrome moves into `keep-data-table`'s shadow DOM where Testing Library
  cannot reach. The four nav buttons keep the same accessible names either side of
  the migration, so those call sites never move.
- `test/test-utils/tables.ts` — table-shaped reads plus `setRowsPerPage()`, the one
  interaction with no query that spans both widgets. PR 5 rewrites that function
  body and nothing else; the replacement is written out in its docblock.

## Coverage

Global floors raised to sit just under the new measurement, per the ratchet comment
in `vitest.config.ts`. Per-path floors untouched.

closes #771
EOF
)"
```

- [ ] **Step 8: Close the issue manually if this is the last PR of #771**

It is not — PRs 4 and 5 follow. Leave #771 open. (`closes #771` does not auto-close
while PRs target `new_code`.)

---

## Self-Review

**Spec coverage.** The design spec's Testing section item 1 says: *"For each screen, write
tests against the current MUI rendering and get them green before changing anything — assert
on what the screen renders and does: header labels, row counts, that clicking edit navigates,
that the switch toggles, that pagination slices."* All five named behaviours have tasks:
header labels (every task), row counts (2, 3, 4, 5, 7, 8, 9), edit navigates (Task 5), the
switch toggles (Task 3), pagination slices (Tasks 7 and 9). All eight files from the spec's
scope table have a task.

**Placeholders.** None: every step carries either a complete file or an exact command with an
expected result. The "known risks" notes are not TODOs — they are pre-identified corrections
with the fix written out, because the characterization loop expects some beliefs to be wrong.

**Type consistency.** `deepQuery`/`deepQueryAll`/`deepButton` are defined in Task 1 and used
under those names in Tasks 3, 4, 6, 7, 9. `bodyRows`/`headerLabels`/`cellTexts`/`nav`/
`rangeText`/`setRowsPerPage` likewise. `makeApp` and `makeConsent` are declared
copy-not-import, so no cross-file import exists to drift.

**One deliberate gap.** This plan does not characterize colour, spacing or dark mode. The
suite runs with `css: false` and cannot see them; the spec puts that verification in a real
browser at 1366px during PRs 4 and 5. Saying so here is better than writing assertions that
would pass vacuously.
