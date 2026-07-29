# 06 — Wave execution plan

**The operational companion to reports 00–05.** Those six say *what* is wrong and *why*.
This one says *who picks up what, in which order, and how they know they are done*.

Measured against `new_code` @ `9f568a8`, 2026-07-29 (originally written at `7ec97b1` the same
day; twelve PRs landed between the two, so the tables below have been re-measured).

```
npm run lint          exit 0
npm run build         exit 0
npm run test          exit 0    101 files, 1211 tests
npm run bundle:budget exit 0    1769.9 kB raw / 437.9 kB gzip
npm audit                       0 vulnerabilities
```

---

## How to use this document

You have been handed **a wave and a lane** — for example "Wave 1, lane A". That is your
assignment. Everything you need is in this file; you should not have to reconstruct the
plan from the issue tracker.

1. **Read [House rules](#house-rules) first.** Branch naming, PR base, and the closing
   convention are not the defaults you would guess.
2. **Find your cell in [the wave table](#the-waves).** It lists issue numbers in the order
   they must be done.
3. **Read your issues' detail sections below.** Each gives the entry point, the gate, and
   the trap.
4. **Stay in your lane.** Lanes are defined so their file sets are disjoint — that is the
   entire purpose of the `track:*` labels. Two instances in different lanes will not
   conflict. Two instances in the *same* lane will, every time.
5. **Do not start a later wave because your lane looks idle.** An empty cell means the
   dependency is not satisfied yet. Take a `good-to-grab` item from
   [Unblocked anytime](#unblocked-anytime) instead.

### The lanes

| Lane | `track:*` | Owns |
|---|---|---|
| **A — store & data** | `store`, `test`+store | `src/store/**`, `src/utils/`, `test/store/**` |
| **B — design system** | `styles`, `elements` | `src/styles/**`, `src/components/keep-elements/**` |
| **C — infra & tests** | `build`, `test` | `package.json`, `vite.config.mts`, `vitest.config.ts`, `.github/workflows/`, `test/**` |
| **D — React removal** | `views`, `icons`, `shell` | `src/components/<feature>/**`, `App.tsx`, `AppShell.tsx`, `Views.tsx`, `index.tsx` |

⚠️ **`track:icons` is not a lane you can occupy on its own.** Icon call sites live inside
feature components, so an icon codemod and a component migration fight over the same
files. Reports 03 and 04 both say to convert icons *inside* the per-file pass. #718 is
labelled separately so the work stays visible, not so it can run concurrently.

---

## What changed since the previous wave table

Seven of that table's issues have closed, and eight issues have been filed that it does
not contain. It is superseded by this document.

**Closed** — Wave 0 emptied completely, and Wave 1 lost two of its five.

| Issue | Closed by |
|---|---|
| #740 warn before overwriting a secret | #791 |
| #694 typed `AppDispatch` | #789 — 90 `as any` casts removed |
| #747 standard decorators + `accessor` | #790 |
| #685 CSP | #788, #795 — violations now report to `/api/csp-violation-report` |
| #772 `app-icons.ts` dynamic import | #794 |
| #690 thunk tests | #796 — but see #801–#805 below |
| #716 `react-router-dom` | #797, #799 — replaced by an in-repo router |
| #708 tokenize the Linaria layer | #759–#764, #777 |
| #715 StoreController | #798 |
| #699 npm audit | #793 + #797 — `npm audit` now reports **0 vulnerabilities** |

**Filed since.** All but #806 and #807 have closed in the meantime:

| Issue | Why it exists |
|---|---|
| #800 | `apiRequestWithRetry` returns a null response typed `any`; 30 call sites read `.ok` off it unchecked |
| #792 | one failed request raises two toasts, from two different toast systems |
| #801–#805 | #690 covered only the *schemas* concern. 36 of `databases/action.ts`'s 40 thunks are still untested, split by the concerns #711 will carve out |
| **#806** | report 04's **P2 per-file pass** — the largest remaining block, which had no issue and lived only as a row in #719's phase table |
| **#807** | **`FormController`** — the second P0 primitive from report 04 §3. #798 shipped `StoreController` and not this one |

### Two closures that need explaining

**#715 closed with 176 `useSelector`/`useDispatch` sites still standing.** That is
correct. The issue's deliverable was the *primitives* — `src/store/store.ts` and
`src/store/StoreController.ts`, both shipped and tested in #798. Its own text hands the
conversion to the per-file pass: *"convert per file, inside the component migration pass —
not as a separate sweep."* That pass is now **#806**, which counts those sites — **157** of them
today, since tier A deliberately took the files with no store access at all.

**#708 closed with 84 `light-dark()` calls left in `dark-mode.css`.** Also correct. Every
one of them is inside a `.Mui*` selector, so they are gated on #709 — deleting them before
their components are replaced breaks what has not been converted yet.

---

## Current surface

| | Report 04 baseline | `7ec97b1` | **`9f568a8`** |
|---|--:|--:|--:|
| `.tsx` files | 130 | 119 | **106** |
| …importing React | 108 | 92 | **83** |
| `useSelector`/`useDispatch` sites | 323 across 76 files | 176 across 63 | **157 across 64** |
| files importing `@mui/*` | 82 | 69 | **68** |
| `@mui/icons-material` / `react-icons` | 45 / 18 | 37 / 18 | **37 / 18** |
| `@mui/x-*` packages | 3 | 0 ✅ | **0** ✅ |
| Formik files | 19 | 15 | **15** |
| `ThemeProvider` / `CssBaseline` mounts | 2 / 3 | 1 / 1 | **1 / 1** — both `AppShell.tsx` |
| `store/databases/action.ts` | 2,883 lines | 2,926 | **47** ✅ — a barrel since #711 |
| classic `switch` reducers / `createSlice` | 17 / 0 | 14 / 0 | **8 / 3** (of 11 — three dead slices deleted) |
| `createSelector` | 0 | 1 | **1** |
| `wa-stack` / `wa-cluster` / `wa-grid` usages | 0 | 0 | **0** |
| `dependencies` | 32 | 24 | **22** |
| `keep-*` elements | — | 27 | **37** |
| tests | 53 files / 509 | 87 files / 996 | **101 files / 1211** ✅ |
| `npm audit` | 10 high | 0 ✅ | **0** ✅ |

The `useSelector`/`useDispatch` count barely moved while 13 `.tsx` files disappeared, and that
is expected rather than disappointing: tier A was chosen to be the files with **no** store
access, so it could not reduce this number. The 157 remaining sites are #806 tiers B–D.

---

## Dependency graph

Only five edges actually constrain the order. Everything else is lane contention, not
dependency. **The whole lane-A chain has since resolved** — everything on the top row is
closed, leaving only the tail of #710:

```
#800 ✅ ──▶ #801 ✅ #802 ✅ #803 ✅ #804 ✅ #805 ✅ ──▶ #711 ✅ split action.ts
                                                              │
                                                              ▼
                                                        #710 databases slice  ← only lane-A work left

#807 FormController ─────────▶ #806 tier D ─┐
#806 tier A ✅ · tiers B–C ─────────────────┼──▶ #709 remove Material Design ──▶ #719 capstone
#771 keep-data-table ───────────────────────┘

#713 a11y ─── no dependency, but same files as #806 — interleave, do not parallelise
```

Read the graph as: **#806 is the spine.** One thing still feeds it (#807, for tier D — the
tier-A recipe now exists), and three things wait on it (#709, #719, and most of
#712/#717/#718 which are folded into it).

---

## The waves

Waves are **dependency depth**, not effort or headcount. Everything in a wave can start the
day the previous wave's blocking items land. Within one cell, do the issues **left to
right** — they share files.

| Wave | A — store & data | B — design system | C — infra & tests | D — React removal |
|---|---|---|---|---|
| **0** — no deps | ✅ #800 → #792 | **#807** · **#771** (in flight) · **#765** | ✅ #691 (dropped) | ✅ **#806 tier A** (PR #835) |
| **1** | ✅ #801 → #803 → #804 → #802 → #805 | — | — | **#806 tiers B–C** — 73 files · **#713** interleaved ← **next** |
| **2** | ✅ #711 · ✅ #697 · ✅ #710 | — | — | **#806 tier D** · closes **#717** **#718** **#712** |
| **3** — gates | — | **#709** | merge `new_code` → `main` (PR #786) | **#719** capstone → closes **#720** |

**Lane A is finished.** Every planned item in waves 0–2 is closed. All 11 reducers are
`createSlice`, `store/databases/action.ts` is a 47-line barrel over ten concern modules, and the
thunk coverage that made both safe is in place.

Two open issues carry the `track:store` label, and neither was planned work — both are defects
found while doing it and deliberately pinned rather than fixed, because each changes what a user
sees and wants its own review: **#818** (`fetchScopes` rethrows before its own error dialog, so a
failed scope fetch reports nothing) and **#848** (`updateScope`'s `resetForm` passes an object
where a form name is expected, so it has never removed a form). Both P2/S. An instance freed up
from another lane can take them; nothing in the programme waits on either.

**Lane D is the critical path now.** Tier A landed the recipe; tiers B–C are the 73-file bulk,
and tier D is still gated on **#807**, which has not started.

**Lane B is the other thing worth staffing.** #807 blocks tier D, #771 blocks #709, and both sit
in wave 0 unfinished — so lane B is no longer "empty until #709", it is holding two gates.

~~**Lane A is a single file for waves 1–2.**~~ Obsolete: #711 split `store/databases/action.ts`
into modules behind a barrel, and the file is now 47 lines. Lane-A items no longer serialise on
it.

---

## Wave 0

> **Status.** Lanes A, C and D are done: #800 and #792 closed, #691 dropped, and #806 tier A
> landed in PR #835. What remains in this wave is **lane B — #807 and #771** — and both are
> gates, so they are the highest-value work on the board. The sections below are kept as the
> record of what each item was.

### D · #806 tier A — **done** (PR #835)

Worth reading before tiers B–C, because the list was not what it looked like. The 22 files were
**11 conversions, 3 deletions and 8 deferrals**, and the deferrals are the interesting part:

- Three of the four "contexts" are `createContext({}) as any` factories with no JSX and cannot
  be elements at all. **Decision recorded: contexts become redux store slices read through
  `StoreController`**, not `@lit/context`.
- **`AppIcon` moved to tier D.** It passes the import filter but exposes
  `as?: React.ElementType`, which has no custom-element equivalent, and two of its three `as`
  call sites are tier D files. **Check a file's exported API for React types, not just its
  imports** — `ReactNode` maps to a slot, `ElementType` maps to nothing.
- Two planned prep commits were dead work: a transitive dependency reached only through a style
  module disappears with the conversion, because the styling moves into `static styles` anyway.

Three regressions got through a green suite and were caught in a browser — black-on-black text,
a 448×444 logo in a 56px bar, and a `box-sizing` mismatch. The cause in every case was assuming
a global rule would still apply inside a shadow root. **Only custom properties cross a shadow
boundary**; class selectors, bare element selectors and the document's `box-sizing` reset do
not.

The full recipe, and five more things execution taught, are in
`docs/superpowers/specs/2026-07-29-806-tier-a-lit-conversion-design.md`. Tiers B–C start there.

### A · #800 — `apiRequestWithRetry` returns a null response — ✅ done

**Do this before any thunk test.** #801 says so explicitly, and the reason is that the
tests you would otherwise write encode the broken contract.

`utils/api-retry.ts` does not rethrow. Both failure exits return `{ success: false,
response: null, … }`, and callers uniformly write `if (!response.ok)` — so a dropped
connection produces `TypeError: Cannot read properties of null (reading 'ok')` *inside the
try*, landing in a `catch` written for an API error. Observed results: a garbage alert, no
alert, or a spinner that never stops.

- **Entry point:** `src/utils/api-retry.ts`, then the 30 unguarded destructures. The worst
  concentration is `store/databases/action.ts` (28 destructures, 3 guarded).
- **Decide once:** rethrow, or return a discriminated union that TypeScript forces callers
  to narrow. The second is the reason the issue says "systemic and belongs in one place".
- **Gate:** no call site reads `.ok` off a possibly-null response, and `tsc` proves it.

### A · #792 — one failure, two toasts — ✅ done

`apiRequestWithRetry` calls `notify()` on both error paths *and* its callers dispatch
`toggleAlert` for the same failure. Two systems: `<keep-alert>` top-right for 5,000 ms, and
a MUI `<Snackbar>` top-centre for 3,000 ms. 19 of the 41 call sites raise both.

**Serialize behind #800** — same file, and #800 may change the shape #792 has to branch on.

Note the MUI `<Snackbar>` lives in `components/alerts/Notification.tsx:34`, mounted from
`AppShell.tsx:211` — one of the shell's last MUI dependencies. Whichever direction you
consolidate, prefer the one that does not deepen it.

### B · #807 — build `FormController` — **not started; gates tier D**

The last unbuilt foundation primitive, and the blocker for #806 tier D — 15 files,
~5,440 LOC, including the two largest components in the tree.

- **Read `components/login/LoginPage.tsx` first.** #776 already dropped Formik from it, so
  it is the only worked example of the target shape in the repo. #775 gave
  `keep-input-text`/`-password` the public `value` + validity API that made it possible.
- **Model it on `src/store/StoreController.ts`** — same reactive-controller shape, and
  `test/store/StoreController.test.ts` is the template for its suite.
- **Survey before designing.** Formik usage across the 15 files is not uniform. Build
  against what is used, not against Formik's API surface.
- **Gate:** its own green suite before a single tier-D file is touched.

### B · #771 — `keep-data-table` (in flight)

Already underway on `new_code`: the element (235 lines), its stylesheet, pagination, and
the `KeepDataTable` React wrapper have landed, with `test/components/keep-elements/keep-data-table.test.ts`.
What remains is migrating the six MUI `<Table>` screens.

| File | Lines | Pagination | Row click |
|---|--:|:--:|:--:|
| `applications/kanban/ConsentsTable.tsx` | 438 | ✅ | ✅ |
| `forms/FormsTable.tsx` | 370 | — | ✅ |
| `applications/AppsTable.tsx` | 352 | ✅ | ✅ |
| `forms/ViewsTable.tsx` | 197 | — | ✅ |
| `forms/AgentsTable.tsx` | 129 | — | — |
| `forms/ColumnDetails.tsx` | 104 | — | — |

**These six are on #709's critical path** — they are six of the 69 files still importing
MUI, and nothing retires `@mui/material` while they stand. **#806 must not touch them**;
they belong to #771.

No sorting and no selection anywhere in the six — zero `TableSortLabel`, zero `Checkbox`.
Do not build features nothing uses.

### B · #765 — `wa-stack` / `wa-cluster` / `wa-grid`

**Zero usages today.** The one box #708 left unticked, carved out because it is layout
adoption rather than tokenization. Pure additive work with no dependency.

⚠️ `keep-tooltip.ts` still reads Shoelace-era token names, which fail *silently* — the
fallback wins, so the code looks token-driven and is not. Fix those while you are in the
element layer.

### C · #691 — smoke tests for the React components — **decided: dropped**

Closed as option 1 below. #806's per-file gate requires a test for each new element, so the
coverage arrives with the conversion instead. Tier A demonstrated it in both directions: it
added 11 element suites and deleted one `@testing-library/react` file whose subject had become
an element.

The original three options, kept for the record:

1. **Drop it.** #806's per-file gate requires a test for each new element, so coverage
   arrives with the conversion. This is the default. ← **chosen**
2. **Retarget it** to the components #806 will convert *last* (tier D), where a regression
   net has months to pay off.
3. **Keep it as written** only if the wave plan slips far enough that React components are
   load-bearing for another release.

10 test files still use `@testing-library/react`, and `renderWithProviders()` exists. Note for
tiers B–D: when a converted component is `vi.mock`'d by another file's test, retarget the mock
onto the single `KeepElements` export with `importOriginal` rather than mocking the whole
module — otherwise every other `Keep*` wrapper in that test becomes a stub.

---

## Wave 1

### A · #801 → #803 → #804 → #802 → #805 — the thunk tests — ✅ done

`databases/action.ts` has **40 exported thunks**; #690 tested 4. These five issues cover
the other 36, grouped by the concerns #711 will split out — so each suite lands as
`test/store/databases/<concern>.test.ts` and **survives the split unchanged**.

| Issue | Concern | Thunks | Effort |
|---|---|--:|---|
| #801 | scopes | 4 | M |
| #803 | views | 5 | M |
| #804 | agents | 5 | M |
| #802 | forms & formulas | 12 | L |
| #805 | fields, folders, config, permissions — fit none of #711's six modules | 10 | L |

Ordered small-to-large so the pattern is established cheaply. Follow
`test/store/databases/schemas.test.ts` and `test/store/account/action.test.ts`.

**Per thunk: the happy path and every failure path** — non-`ok` response, non-JSON body,
request that never completes. Check the three defect classes #690 found rather than
assuming they are absent:

- **Stranded loading flag** — `setApiLoading(true)` on entry, `setApiLoading(false)` only
  on success. `state.dialog.loading` is read by eight screens, so a failure leaves them
  spinning until reload. The file has **16** `true` against **27** `false`.
- **Null response** — #800's contract; should already be fixed when you get here.
- **`JSON.parse` on a non-JSON body.**

### D · #806 tiers B–C — 73 files, ~13,500 LOC

The bulk, and the next thing to pick up. Tier B is one axis (MUI *or* store); tier C is both.

**The recipe tier A established is
`docs/superpowers/specs/2026-07-29-806-tier-a-lit-conversion-design.md`** — read §4 for the
per-file steps and §3a for the five traps that cost time. One commit per file, and hold the
gate:

```
grep -n "from 'react'\|react-redux\|formik\|@mui/" src/path/to/File.ts   # empty
```

Two things tier A did not have to face, and these files do:

- **This is where `StoreController` finally gets used.** No production element uses it yet; the
  157 remaining `useSelector`/`useDispatch` sites are here and in tier D. Do **not** put a
  `StoreController` in a leaf whose still-React parent owns its state — `@lit/react` re-applies
  every prop on every render with no dirty check, so the two fight. Read state in the React
  container and pass it down until a whole subtree is Lit.
- **Slot the children you cannot convert yet.** Tier A proved the pattern on four files: a
  converted parent does not force its children to convert, it slots them as light DOM.

**Convert the 13 Linaria style modules last within tier B** (`styles/*.tsx`, `*Styles.tsx`,
`CarViewstyles.tsx`). They are not components — they are `.tsx` only because Linaria's
`styled` carries JSX types, and they become plain `.ts` once their consumers stop being
React.

**Skip the six #771 tables.** Skip `KeepElements.tsx` and `router/react.tsx` — those are
P4 deletions, not conversions.

### D · #713 — accessibility, interleaved

Same files as #806, so it cannot run beside it. Fold each file's a11y fixes into that
file's conversion commit — the conversion is rewriting the markup anyway, which is the
cheapest possible moment to fix roles, labels and focus order.

⚠️ **#713 has an open `needs-decision`:** which a11y standard to hold to (WCAG 2.1 AA is
the usual answer). Settle that before the first file, because it determines whether the
work is "fix what is obviously broken" or "meet a bar".

The `jsx-a11y` tooling half of the issue is worth reconsidering: `oxlint` has a `jsx-a11y`
plugin, but every rule it offers is dead the moment a file stops being `.tsx`. Prefer
assertions in the element tests.

---

> **Lane A detail below is historical.** Waves 0–2 for lane A are complete; the per-issue
> sections are kept because they record *why* each thing was done and what was found. The two
> defects they surfaced — #818 and #848 — are the only open `track:store` work.

## Wave 2

### A · #711 → #710 → #697 — ✅ #711, ✅ #697, #710 in flight

**#711 — split `databases/action.ts` (2,926 lines, ~60 exports, 5.7 % → covered by wave 1).**
Six modules — `schemas`, `scopes`, `forms`, `views`, `agents`, `formulas` — plus a barrel
`index.ts` so no consumer import changes in the first pass. **Pure moves, no logic changes
in the same commit**; that keeps the diff reviewable and `git log --follow` useful. The
`@ts-ignore`, the store→component layering leak at line 74, and the silent catch at line
325 are fair game *in separate commits*.

**#710 — RTK `createSlice` for the 14 classic reducers.** Note what actually gates this:
all 14 reducers have tests at ≥95 %, so **the simple slices (`dbsettings`, `history`,
`interceptor`, `search`) are unblocked today** and could be pulled forward into wave 0 if
lane A is otherwise idle. Only the `databases` slice's async logic needs wave 1's thunk
tests. Convert a slice, run its existing tests **unchanged** — that is the parity net.

The issue says it plainly and it is worth repeating: **nothing else in the programme is
blocked on #710.** It is debt paydown. It waits behind work that unblocks other work.

**#697 — memoized selectors — reconsider before starting.** `createSelector` is used once
across 176 `useSelector` sites. But #806 rewrites those sites into `StoreController`, and
the issue's own sequencing note says *"if a component is due to move to `StoreController`
soon, its selectors will be rewritten anyway."* By wave 2 that is every component. Either
defer it until after #806 and re-measure, or drop it. **Do not do it blind** — the issue
requires profiling a heavy screen before and after, and some of these will make no
measurable difference.

### D · #806 tier D — 15 Formik files, ~5,440 LOC

Unblocked by #807. Includes `access/TabsAccess.tsx` (1,008 lines) and the four
`applications/` forms.

`LoginPage.tsx` is listed in tier D but is really tier C — #776 already dropped Formik
from it, and its remaining matches are comments.

**#717, #718 and #712 close here**, not by separate work:

- **#717** (Formik → native + yup) *is* tier D.
- **#718** (four icon systems → `wa-icon`) happens in every tier's per-file recipe. 37
  files import `@mui/icons-material`, 18 import `react-icons`, `app-icons.ts` is behind a
  dynamic import since #794.
- **#712** (oversized components) — extraction happens **as part of** each conversion, not
  before it. The issue says so: extracting sub-components from a `.tsx` scheduled to become
  a Lit element is work thrown away twice.

---

## Wave 3 — the gates

### B · #709 — remove Material Design

Only startable when #806 and #771 have emptied `@mui/*` out of the components.

- Delete the `ThemeProvider` and `CssBaseline` (both in `AppShell.tsx`, lines 137–138),
  `theme.ts`, and the `.Mui*` override sheet — **84 `light-dark()` calls in
  `dark-mode.css`**, which is what #708 deliberately left standing.
- Drop `@mui/material`, `@mui/icons-material` and `@emotion/*`. Emotion has **0** direct
  imports; it is retained only as an MUI peer, so it goes when MUI goes.
- `@mui/x-data-grid` is already **gone** (#774) — that budget line is spent.

**Sequencing warning that has not expired:** delete each component's `.Mui*` override only
when that component is replaced. Deleting the sheet early breaks everything not yet
converted.

### C · merge `new_code` → `main` (PR #786)

Not a code change, and the highest-leverage remaining item outside the migration. `main` is
**226 commits** behind. Dependabot scans the default branch, so the security tab shows
**16 open alerts** — including two criticals from a `happy-dom` version this branch has not
resolved to in months — while `npm audit` on `new_code` reports **0**. Every one of the 16
clears on merge.

### D · #719 — the capstone

P4 (shell, `wa-page`, `App.tsx` → `<app-root>`, delete `KeepElements.tsx`, drop
`@lit/react`) and P5 (purge). Definition of done:

```
grep -rn "from 'react'" src        # empty
grep -rn "react-dom" src           # empty
```

and `package.json` contains no `react`, `@mui/*`, `react-*`, `@emotion/*`, `formik`,
`@lit/react`, `@monaco-editor/*`.

⚠️ **The P5 trap — read before touching the build config.**
`@vitejs/plugin-react-swc` **cannot simply be deleted.** It is what applies
`tsDecorators: true` + `useDefineForClassFields: false` to *all* TypeScript, including
every Lit element. Remove it without replacing that configuration and decorated class
fields shadow Lit's reactive accessors, so **elements silently stop reacting**. It does not
fail loudly. Configured in **both** `vite.config.mts` and `vitest.config.ts` — a required
pairing, guarded by `test/decorator-config.test.ts`.

The element test suites are the detector. Keep them green; they are the only thing between
this change and a whole-layer silent breakage.

**#720**, the backlog index, closes when #719 does.

---

## Unblocked anytime

If your lane is waiting, these have no dependencies and no lane contention worth worrying
about:

- **#765** — `wa-stack`/`wa-cluster`/`wa-grid`, plus the `keep-tooltip.ts` Shoelace token names.
- **#710's four small slices** — `dbsettings`, `history`, `interceptor`, `search`. Their
  reducer tests already exist.
- **Decide #691** and **decide #713's a11y standard.** Both are 20-minute decisions that
  block nothing and unblock a wave each.

---

## House rules

**Branch and PR:**

- Branch from **`new_code`**, not `main`. PR back into **`new_code`**.
- `origin/new_code` is sometimes behind the user's local `new_code` — check both before
  branching, and verify branch *content* (`git show origin/new_code:<file>`) rather than
  trusting a stack.
- Put **`closes #<issue>`** in every PR body. It will **not** auto-close while the PR
  targets `new_code` — GitHub only honours the keyword against the default branch — so
  **close the issue by hand** after the merge.
- Branches are auto-deleted on merge and PRs are squashed quickly, so a stacked PR's base
  can vanish mid-task. Re-base onto `new_code` when that happens.

**Before you claim done:**

```
npm run lint          # oxlint, gates CI at error
npm run build         # tsc -b tsconfig.app.json && vite build — this is the typecheck
npm run test          # vitest run --coverage
npm run bundle:budget # eager-closure size against bundle-budget.json (#813 / PR #834)
```

All four run in `pr_check.yml` on Node 24, followed by a SonarQube Cloud scan and quality
gate. Note `npm run build` *is* the typecheck — there is no separate `tsc` step in CI, so a
type error surfaces as a build failure.

**The bundle budget is a hard gate, and it currently sits at 20 % headroom rather than 2 %.**
Tier A put the eager bundle 23.4 kB over the original budget, and the gate was widened
deliberately, to be revisited. The reason matters for tiers B–D, because it will recur: Linaria
`styled` CSS is **extracted at build time** into the stylesheet, whereas Lit `static styles` is
a template literal that ships **inside the JS chunk**. Every conversion therefore moves bytes
out of `.css` and into the eager `.js`. The signature is raw growing several times faster than
gzip, since CSS text compresses far better than code. Two things to know:

- `--update` refuses to *raise* the budget. A justified increase is a hand edit of
  `bundle-budget.json`, so a reviewer sees it.
- Comments inside a `css` template are string content, so minifiers do not strip them and they
  ship. Roughly 6 kB of tier A's growth is prose. Hoisting long rationales into the class
  docblock, above `static styles`, is the cheap win when raw needs to come down.

**Coverage is enforced, not advisory.** `vitest.config.ts` sets a global floor plus
per-directory gates: `src/store/**/reducer.ts` at 95 %, `utils/**`, `components/keep-elements/**`,
`services` at 90. A PR that drops a gated directory fails.

---

## Traps

**The suite cannot see styling.** `vitest.config.ts` runs with `css: false` and jsdom has
no canvas backend, so every guard on the token layer is a *source-scanning* test that pins
structure, not appearance. **A green suite is not evidence that a visual change looks
right.** Anything touching layout or tokens needs a human click-through in both colour
modes — and most screens sit behind login. #777 found a grey login page this way, after the
suite went green, and #806 tier A found three more the same way.

**Only custom properties cross a shadow boundary.** The single most productive trap in tier A,
and unavoidable in tiers B–D, because converting a component means reproducing the styling it
used to inherit from document CSS:

| How the style reached the element | Crosses? |
|---|---|
| `var(--custom-property)` | **yes** — inherits normally |
| a class selector (`.color-text-primary`) | no |
| a **bare element selector** (`img { … }`) | no |
| the document's `box-sizing: border-box` reset | no |

The bottom two are the ones that bite, because nothing in the component's source hints they were
involved. `keep-overrides.css` sizes every image through a bare `img` selector, so a converted
header logo rendered at its natural 448×444 inside a 56px bar — and restating that rule was
still not enough, because the reset that makes everything `border-box` also stops at the
boundary, so the padding landed outside the height. Two corollaries:

- **Grep the whole stylesheet, not the file whose name matches.** The dark-mode override for
  `.color-text-primary` lives in `styles.css`, not `dark-mode.css`. Copying the light-mode
  literal gave 1.1:1 contrast in dark mode across five headings.
- **No backticks inside a `css` tagged template**, comments included — a backtick terminates the
  template and the error surfaces as `Property 'x' does not exist on type 'CSSResult'` somewhere
  below. `npm run lint` catches it immediately; run lint before the suite.

**The per-file gate is a grep, so prose defeats it.** A doc comment explaining why a slotted
child still needs Material UI made a converted file match the gate's own pattern. Same shape as
`test/styles/dead-selectors.test.ts`: these checks match raw text, so naming the thing you
removed keeps it looking present. Describe such packages in words, not as literals.

**A props-less React child cannot take a `slot` attribute.** `<Foo slot="bar" />` silently drops
it when `Foo` forwards no props, and the content is never assigned. Use a default slot, or wrap
the child in a plain element that can carry the attribute.

**Vitest fails in a worktree that was never `npm ci`-ed — run `npm ci`.** Exactly 18 files
die with `Denied ID /…/node_modules/@fortawesome/…/arrows-rotate.svg?url`. It is not your
diff: Node's resolver walks *up* the filesystem and Vite's `server.fs` check does not, so a
worktree under `.claude/worktrees/<name>` resolves every package from the main checkout,
one level above the Vite root. Bare JS imports survive that; the 17 `?url` SVG imports in
`src/services/icon-library.ts` do not, which is why it is always those 18.

> ⚠️ **Do not widen `server.fs.allow` to the parent.** An earlier version of this section
> recommended exactly that, and it is wrong. It silences the error while resolving every
> dependency from whatever branch the main checkout has out, against a different
> `package-lock.json` than the branch under test — so the suite goes green while saying
> nothing about the code it just ran on. A loud failure replaced by a silent one.
> `test/node-modules-root.test.ts` (#811, PR #812) now fails with the instruction instead.

**`@lit/react` re-applies props on every render with no dirty check.** Never pass `value`
to a `Keep*` input as a controlled prop — it clobbers what the user has typed. Live risk
for every tier-C and tier-D file while it is still `.tsx`.

**Shoelace-era token names fail silently.** `--wa-color-neutral-700`, `--wa-font-size-small`
and friends do not exist in WebAwesome 3.10. *Reading* one is worse than setting one: the
fallback wins, so the code looks token-driven and is not. Three separate rounds of these
have been found so far.

**Web Awesome colour steps are `05…95` only.** A `var()` on an undefined custom property
with no fallback is invalid at computed-value time, so the **whole declaration is
dropped**. That is how the red invalid-input border went unrendered for months. Always
supply a fallback.

**`src/index.ts` is taken.** #707 created it for the appearance boot code, so report 04's
"`index.tsx` → `index.ts`" entry-point swap needs a different name.

**No inline scripts in `index.html`.** The CSP forbids them and `test/csp-inline-styles.test.ts`
enforces it. Boot code goes in a separate module.
