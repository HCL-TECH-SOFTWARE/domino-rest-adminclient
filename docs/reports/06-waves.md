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

⚠️ **Rules 4 and 5 have largely expired.** Lanes A, B and C are closed
([below](#where-the-programme-stands)); everything open is lane D or gated on it. Two instances
now contend by default, so the thing to agree on is a **file set**, not a lane — pick disjoint
subtrees under `src/components/<feature>/` and say which in the PR.

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

## Where the programme stands

**Measured on `new_code` @ `db214a5`, 2026-07-30.**

Nine tracked issues closed in a day: #691, #697, #710, #711, #715, #765, #771, #807, #813.
**Lanes A, B and C are empty of open work.** Every open issue is either lane D or gated on it:

| Open | What it really is |
|---|---|
| **#806** | the per-file pass — the spine |
| #713 · #712 · #717 · #718 | lane D work under other labels; they close *inside* #806 |
| #825 | the styling half of the same pass, minus the 22 MUI-free files |
| **#709** | wave-3 gate — waits for `@mui/*` to leave 55 files |
| **#719** | wave-3 capstone — waits for React to leave 71 files |
| #786 | the `new_code` → `main` merge |
| #720 | the backlog index; mirrors this table |

So the four-lane structure has served its purpose and the programme is now **single-lane**. That
changes two things: contention is the default rather than the exception, and there is no longer a
"take something from another lane" answer when you are blocked — the answer is to take a
different **subtree** of #806.

### What the closures moved

- **#771 finished, and it handed work back.** `AppsTable.tsx` lost its MUI table but keeps
  Formik and the store, so it is **tier D** now rather than done. `AgentsTable.tsx` came out the
  other side as a tier-A leftover (91 lines, Linaria only).
- **#813 finished at 869.6 kB eager**, down 30.9 %, and re-baselined the budget to 2 % headroom.
  Eager source modules: 172 → **98**. Only one file in tier D is still eager (`Views.tsx`, P4),
  so bundle contention has stopped being a scheduling input.
- **#807 finished but is unproven.** `FormController` shipped with unit tests and has **zero
  production users**. `StoreController` now has seven, all from #806's card-view slice.

---

## What changed since the first wave table

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

**#708 closed with 84 `light-dark()` calls left in `dark-mode.css`.** Also correct, but not
for the reason first given here. An earlier revision said every one of them sits inside a
`.Mui*` selector and so is gated on #709. Measured, they do not:

| | `light-dark()` | goes with |
|---|--:|---|
| inside a `.Mui*` selector | **62** | #709 |
| everywhere else | **22** | **#806**, per file |

Of the sheet's 75 selectors, **53 contain `.Mui`** and **none contain `wa-`** — see
[dark-mode.css is not a WebAwesome concern](#dark-modecss-is-not-a-webawesome-concern)
below. So the file is not one blocker waiting on #709; it is two, and the smaller half
retires as the components convert.

---

## Current surface

| | Report 04 baseline | `7ec97b1` | `9f568a8` | **`db214a5`** |
|---|--:|--:|--:|--:|
| `.tsx` files | 130 | 119 | 106 | **90** |
| …importing React | 108 | 92 | 83 | **71** |
| `useSelector`/`useDispatch` sites | 323 across 76 files | 176 across 63 | 157 across 64 | **155 across 57** |
| files importing `@mui/*` | 82 | 69 | 68 | **55** |
| `@mui/icons-material` / `react-icons` | 45 / 18 | 37 / 18 | 37 / 18 | **31 / 18** |
| `@mui/x-*` packages | 3 | 0 ✅ | 0 ✅ | **0** ✅ |
| Formik files | 19 | 15 | 15 | **15** |
| `ThemeProvider` / `CssBaseline` mounts | 2 / 3 | 1 / 1 | 1 / 1 | **1 / 1** — both `AppShell.tsx` |
| `store/databases/action.ts` | 2,883 lines | 2,926 | 47 | **47** ✅ — a barrel since #711 |
| classic `switch` reducers / `createSlice` | 17 / 0 | 14 / 0 | 8 / 3 | **0 / 11** ✅ — #710 |
| `createSelector` | 0 | 1 | 1 | **1** |
| `wa-stack` / `wa-cluster` / `wa-grid` usages | 0 | 0 | 0 | **in use** ✅ — #765 |
| `dependencies` | 32 | 24 | 22 | **22** |
| `keep-*` elements | — | 27 | 37 | **49** |
| tests | 53 files / 509 | 87 files / 996 | 101 / 1211 | **115 / 1521** ✅ |
| `npm audit` | 10 high | 0 ✅ | 0 ✅ | **0** ✅ |

Two rows are worth reading together. `.tsx` files fell 16 in a day while
`useSelector`/`useDispatch` fell **two** — and both numbers are honest. The card-view slice
replaced seven of those sites with `StoreController` and *deleted* six more outright (a prop that
mirrored store state), but the remaining 155 sit overwhelmingly in **route components**, which
cannot convert until the router does (#719). Expect this row to stay flat and then collapse at
the end, not to track the file count.

Three Linaria-carrying modules were deleted with no replacement (`components/flex`,
`SchemaStyles`, `ScopeStyles`) and three more turned out to have no importers at all, which is
why `@linaria/react` fell 69 → **51** without a CSS-Modules sweep (#825).

---

## Dependency graph

Every edge that fed #806 has closed. What remains is a chain, not a graph:

```
#806 tier A ✅  ─▶  tiers B–C (in progress)  ─▶  tier D  ─▶  #709 remove Material Design
                                                                     │
                                                                     ▼
                                                              #719 capstone  ─▶  #786 merge to main

#713 a11y  ─── same files as #806. Interleave per file; never parallelise.
#825       ─── same files. Its 22 MUI-free targets need re-measuring; eleven are already gone.
```

Read it as: **#806 is now the only thing on the critical path.** Nothing feeds it, and
everything else waits on it. That is why the lane structure above has stopped paying for
itself — there is one lane, and the useful unit of assignment is a subtree.

---

## The waves

Waves are **dependency depth**, not effort or headcount. Everything in a wave can start the
day the previous wave's blocking items land. Within one cell, do the issues **left to
right** — they share files.

| Wave | A — store & data | B — design system | C — infra & tests | D — React removal |
|---|---|---|---|---|
| **0** — no deps | ✅ #800 → #792 | ✅ #807 · ✅ #771 · ✅ #765 | ✅ #691 (dropped) | ✅ **#806 tier A** (PR #835) |
| **1** | ✅ #801 → #803 → #804 → #802 → #805 | ✅ | ✅ #813 | **#806 tiers B–C** — 74 files left · **#713** interleaved ← **here** |
| **2** | ✅ #711 · ✅ #697 · ✅ #710 | ✅ | ✅ | **#806 tier D** — 16 files, unblocked · closes **#717** **#718** **#712** |
| **3** — gates | — | **#709** | merge `new_code` → `main` (PR #786) | **#719** capstone → closes **#720** |

**Lane A is finished.** Every planned item in waves 0–2 is closed. All 11 reducers are
`createSlice`, `store/databases/action.ts` is a 47-line barrel over ten concern modules, and the
thunk coverage that made both safe is in place.

Two defects found while doing that work were pinned rather than folded in, because each changed
what a user sees: **#818** (`fetchScopes` rethrew before its own error dialog, so a failed scope
fetch reported nothing) and **#848** (`updateScope`'s `resetForm` passed an object where a form
name was expected, so it had never removed a form). Both are now closed, by #850 and #851.

**Read the table as one column.** Lanes A, B and C hold no open work; the only cells that are
not ✅ are lane D's and the two wave-3 gates that wait on it. The per-wave sections below are kept
as the record of what each item was.

**Lanes B and C are finished too.** #771 and #765 closed, so lane B holds only #709 — which
cannot start until #806 empties `@mui/*` out of the components. #813 closed at 869.6 kB eager,
down 30.9 %, with the budget re-baselined to 2 % headroom.

~~**Lane A is a single file for waves 1–2.**~~ Obsolete: #711 split `store/databases/action.ts`
into modules behind a barrel, and the file is now 47 lines.

~~**Pick route-lazy files while lane C is running.**~~ Obsolete with #813: eager contention is
gone (172 → **98** eager source modules, one eager file left in tier D). The rule it was standing
in for still holds, though — **the eager bundle only grows when you convert an eager file.** Tier
A went 23.4 kB over converting shell files; the whole card-view slice, being route-lazy, moved it
by −0.3 kB.

### #806, by what is left

| Tier | files | LOC | eager | shape |
|---|--:|--:|--:|---|
| **A leftovers** | 16 | 1,403 | 6 | the 4 contexts, `AppIcon`, 4 Linaria style modules, 2 P4 files |
| **B** one axis | 33 | 5,446 | 8 | MUI *or* store |
| **C** both | 25 | 5,774 | 5 | the bulk |
| **D** Formik | 16 | 5,667 | 1 | only `Views.tsx` (P4) is eager |

Done: tier A (11 conversions, 3 deletions) plus the card-view subtree — both
`commons/cardviews/displays/` families, their two shared children, and six Linaria style modules.

### The three subtrees left, and why to take them whole

Converting by subtree rather than by tier is what the card-view slice established: a view's
children are usually one tier *up* from it, so **importer order beats tier order inside a
feature**.

| Subtree | ~LOC | Root | Notes |
|---|--:|---|---|
| **`applications/`** | ~3,000 | `AppItem`, `Kanban` | Formik-heavy; where **#717** mostly closes |
| **`access/`** | ~4,000 | `TabsAccess.tsx` (1,008) | the deepest; holds `ModeCompare` (652), `Fields`, `AccessMode` |
| **`forms/`** | ~3,500 | `FormsContainer.tsx` (805) | holds `DetailsSection` (696), `EditView` (626), the three tab views |

Between them they hold most of the 55 files that gate #709.

**Take `FormController` off the critical path first.** It shipped in #807 with unit tests and has
**zero production users**. Prove it on `applications/FormDrawer.tsx` (61 lines) and `AppStack.tsx`
(66) before anything reaches `TabsAccess.tsx` at 1,008 — the same argument that put the first
`StoreController` in a 52-line dialog rather than in `EditView`.

---

## Wave 0

> **Status: wave 0 is closed in every lane.** #800, #792, #807, #771 and #765 are done, #691 was
> dropped, and #806 tier A landed in PR #835. The sections below are kept as the record of what
> each item was.

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

### B · #807 — build `FormController` — ✅ done, **and still unproven in production**

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

### B · #771 — `keep-data-table` — ✅ done

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

### B · #765 — `wa-stack` / `wa-cluster` / `wa-grid` — ✅ done

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

### D · #806 tiers B–C — 74 files left, ~12,600 LOC

The bulk, and the next thing to pick up. Tier B is one axis (MUI *or* store); tier C is both.

**The recipe tier A established is
`docs/superpowers/specs/2026-07-29-806-tier-a-lit-conversion-design.md`** — read §4 for the
per-file steps and §3a for the five traps that cost time. One commit per file, and hold the
gate:

```
grep -n "from 'react'\|react-redux\|formik\|@mui/" src/path/to/File.ts   # empty
```

Two things tier A did not have to face, and these files do:

- **`StoreController` is only legitimate where a prop does not already carry the same state.**
  The rule is narrower than "tiers B–C is where it gets used". `@lit/react` re-applies every
  prop on every parent render with no dirty check, so an element that reads state its parent
  also passes down fights itself. Two shapes are safe: an element with **no props at all**
  (`keep-network-error-dialog`, the first production user), and one whose controller selects
  something **no caller passes** (`keep-slim-database-card` reading `databases.permissions`). A
  prop that mirrors store state is the thing to delete — `keep-delete-dialog` took
  `open={deleteDialog}` at all six call sites and now reads the flag itself. Route components
  own most of the remaining 157 sites and cannot convert until the router does, so expect that
  count to fall more slowly than the file count.
- **Slot the children you cannot convert yet.** Tier A proved the pattern on four files: a
  converted parent does not force its children to convert, it slots them as light DOM.

**Convert the 13 Linaria style modules last within tier B** (`styles/*.tsx`, `*Styles.tsx`,
`CarViewstyles.tsx`). They are not components — they are `.tsx` only because Linaria's
`styled` carries JSX types, and they become plain `.ts` once their consumers stop being
React.

**Skip the six #771 tables.** Skip `KeepElements.tsx` and `router/react.tsx` — those are
P4 deletions, not conversions.

**An element is two files now.** #854 split the barrel: the element goes in
`keep-elements/keep-x.ts`, its `createComponent` wrapper in `keep-elements/react/KeepX.ts`, and
`KeepElements.tsx` re-exports it. Only modules on the eager path import `./react/KeepX`
directly.

**In flight: the card-view subtree.** Plan in
`docs/superpowers/plans/2026-07-30-lane-d-cardviews.md`. Two findings there generalise:

- **Importer order beats tier order inside a subtree.** The four schemas views and both
  remaining scopes views render the same two tier-C children, so converting a view first would
  mean slotting React children out of a loop. Convert the shared children first.
- **`AppIcon` is not the blocker tier A implied.** Its element-override prop exists to pass a
  Linaria-styled `img`, which a converted consumer has no use for, and `keep-nsf-card` already
  proves the in-element icon pattern (`loadAppIcons` → `appIconUri` → `wa-icon`, with the shared
  skeleton). `AppIcon` dies when its last React consumer converts; it does not need to convert
  first, and it is eager, so it should not.

### D · #713 — accessibility, interleaved

Same files as #806, so it cannot run beside it. Fold each file's a11y fixes into that
file's conversion commit — the conversion is rewriting the markup anyway, which is the
cheapest possible moment to fix roles, labels and focus order.

✅ **Settled 2026-07-30: WCAG 2.1 AA.** Per file that means roles, accessible names, focus
order, 4.5:1 text contrast and keyboard operability, plus 4.1.3 for anything that appears
without a focus change. 2.2 AA was considered and not taken — its dragging-alternatives
criterion would add real work in `FieldDndContainer`.

What the first four conversions found, as a checklist of what to look for: dangling IDREFs
(`aria-describedby` or an `id` pointing at nothing), icon-only controls with no accessible name,
positive `tabIndex`, `div` click handlers that answer Enter but not Space, spinners with no
`role="status"`, placeholder `alt` text on decorative images, and colour literals with no
dark-mode override.

The `jsx-a11y` tooling half of the issue is worth reconsidering: `oxlint` has a `jsx-a11y`
plugin, but every rule it offers is dead the moment a file stops being `.tsx`. Prefer
assertions in the element tests.

---

> **Lane A detail below is historical.** Waves 0–2 for lane A are complete; the per-issue
> sections are kept because they record *why* each thing was done and what was found. The two
> defects they surfaced — #818 and #848 — are the only open `track:store` work.

## Wave 2

### A · #711 → #710 → #697 — ✅ all three

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

### D · #806 tier D — 16 Formik files, ~5,670 LOC

Unblocked: #807 shipped `src/store/FormController.ts` with unit tests in PR #852. Includes
`access/TabsAccess.tsx` (1,008 lines) and the four `applications/` forms.

**Sixteen files, not fifteen.** `applications/AppsTable.tsx` joined this tier when #771 closed:
that pass took the MUI table out of it, but its Formik and store halves are untouched.

The eager-collision warning here has expired — #813 left exactly one eager file in this tier,
`Views.tsx`, which is a P4 shell file anyway. What has *not* expired is the other half: these
files need `StoreController` as well as `FormController`, and `FormController` still has no
production user. Prove it on the two smallest first (`FormDrawer` 61, `AppStack` 66).

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

- Delete the `ThemeProvider` and `CssBaseline` — a single mount, `AppShell.tsx:138–139`.
  `App.tsx` also matches a grep for both names, but only in comments explaining why #743
  removed its pair.
- Delete `theme.ts` and the `.Mui*` half of `dark-mode.css`: **53 of its 75 selectors**,
  carrying **62 of its 84 `light-dark()` calls**. The other 22 selectors are not #709's to
  remove — see below.
- Drop `@mui/material`, `@mui/icons-material` and `@emotion/*`. Emotion has **0** direct
  imports; it is retained only as an MUI peer, so it goes when MUI goes.
- `@mui/x-data-grid` is already **gone** (#774) — that budget line is spent. A grep for
  `@mui/x-` still returns one hit, in a `keep-input-date.ts` comment recording what it
  replaced.

**Sequencing warning that has not expired:** delete each component's `.Mui*` override only
when that component is replaced. Deleting the sheet early breaks everything not yet
converted.

#### theme.ts is 7 live overrides and 5 dead ones

`useTheme()` has **zero callers**. Nothing in the app reads the theme in code, so
`theme.ts`'s entire effect is its `palette` plus twelve `components.styleOverrides` — and
five of those twelve now override a component nothing imports:

| override | files still importing it | |
|---|--:|---|
| `MuiButton` | 16 | text-variant colour, `capitalize`, 16px |
| `MuiCircularProgress` | 5 | the brand spinner colour |
| `MuiPaper` | 4 | `currentTheme.secondary` background |
| `MuiTab` | 2 | tab styling |
| `MuiBreadcrumbs` · `MuiListItemIcon` · `MuiSwitch` | 1 each | colours |
| `MuiBadge` · `MuiDialogTitle` · `MuiFormLabel` · `MuiInputBase` · `MuiTooltip` | **0** | **already inert** |

**Those five can be deleted now**, independently of the mount and of #709's position in the
wave order — an override for a component nothing imports cannot change anything. More
usefully, this is a *per-component* progress signal: when #806 takes the last importer of a
type to zero, that type's override becomes deletable the same day, and `theme.ts` shrinks
ahead of the gate instead of all at once behind it.

#### what actually happens if you drop the mount early

Measured, not guessed — the mount was removed on a throwaway branch and the gates run:

```
npm run typecheck   exit 0
npm run lint        exit 0
npm run build       exit 0
npm run test        2 failed | 1485 passed
eager bundle        869.6 -> 852.8 kB raw  (-16.8 kB)
```

Both failures are the two bookkeeping guards in `test/components/login/LoginPage.layout.test.tsx`
that assert `['src/AppShell.tsx']` for the last `CssBaseline` mount and the last `theme.ts`
importer. They are *designed* to fail here; flipping them to `[]` is part of #709.

**So it compiles, passes 1,485 tests, saves 17 kB — and visibly breaks dark mode.** Those
seven live overrides read `currentTheme = getTheme(themeMode)`, and they are the only thing
giving the remaining MUI surface its dark colours. Without the provider, ~30 Buttons, Papers
and Tabs render stock-MUI light on a dark page: the same white-on-dark failure class as the
overview tiles, and **nothing in CI reports it**, because the suite runs `css: false`.

`CssBaseline` is the safe half. #743 established that WebAwesome's `native.css` already sets
the same `box-sizing`/`margin` baseline, so removing it drops only MUI's typography and
background, which the WA tokens supply anyway.

That is the concrete reason this issue sits behind #806 and #771 rather than being a
half-hour deletion: the mount is trivial to remove and is load-bearing until the last themed
MUI component is gone.

#### dark-mode.css is not a WebAwesome concern

**No selector in that file targets `wa-*`.** WebAwesome components take their dark mode
from the token layer — `:root.wa-dark`, set by `applyTheme` in `services/theme-service.ts`
— which is why a converted element is already correct in dark mode before anyone touches
this sheet. Do not reach for `dark-mode.css` when a `keep-*` element looks wrong in dark;
the answer is in `keep-theme.css` or the element's own `static styles`.

That leaves 22 selectors, and **none of them is #709's job**. They split three ways:

| | count | when it goes |
|---|--:|---|
| inline-style matchers | **3** | already dead — any time |
| document-level chrome | **5** | survives the whole programme |
| component light-DOM classes | **14** | **#806**, per file |

**The 3 inline-style matchers** — `[style*="color: black"]`, `[style*="color:black"]`,
`[style*="background: white"]` and `button[style*="border: none"]` — match nothing.
Searching the tree for those strings returns only the selectors themselves; no markup in
`src/` sets those attributes. Dead independently of MUI. (The production CSP's
`style-src-attr 'none'` would have neutralised them regardless — see `keep-element.ts`.)

**The 5 document-level rules** — `body[data-theme="dark"]`, `body[data-theme="dark"] a`,
the two `::-webkit-scrollbar-*` rules and `dialog::backdrop` — style the document itself,
not any component. They outlive both #709 and #806 and are the part of this file worth
keeping.

**The 14 component rules** are the ones to watch: `.text`, `.setting`, `.name`,
`.computed`, `.search-container`, `.toggle-container`, `.unchecked`, `.option-container
img`, `dialog .button-cancel`, `dialog textarea` and the rest. Light-DOM CSS **cannot
cross a shadow boundary**, so each stops applying the moment its component becomes a Lit
element — silently, with the rule still sitting here looking alive. The converted element
has to carry those colours itself, in its own `static styles`; `keep-zero-results.ts`
documents that trap from the other side, having been caught by it. They retire with #806,
per file, and `test/styles/dead-selectors.test.ts` is what notices when one is orphaned.

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

**This section is empty, and that is the news.** Every item it used to hold has closed: #765,
#710's small slices, and the two 20-minute decisions (#691 dropped, #713 settled on WCAG 2.1 AA).

There is no longer a "your lane is idle, take this instead" answer. If two instances are running,
they both work on #806 and the only thing that keeps them apart is **agreeing on disjoint
subtrees** — see [the three subtrees left](#the-three-subtrees-left-and-why-to-take-them-whole).
Say which subtree you have taken in the PR title.

Two things sit outside #806 and can be taken by anyone:

- **#878** — the stack view's phantom horizontal scrollbar. Cosmetic, P2/S, and the two obvious
  causes are already ruled out in the issue.
- **#877** — replace `BreadcrumbRouter` with `wa-breadcrumb`. One eager file, no dependency.

**#825 needs re-measuring before anyone starts it.** Its list of 22 MUI-free Linaria files
predates #806 tier A and the card-view slice, which between them deleted eleven of them outright
(`PageRouters`, `Homepage`, `MobileHeader`, `ErrorWrapper`, `ZeroResultsWrapper`, `PageLoading`,
`ColumnBar`, `FormSettings`, `CarViewstyles`, both `v2/CardV2Styles`) plus `components/flex`,
`SchemaStyles` and `ScopeStyles`. `@linaria/react` is down to 51 files from 69 without a single
CSS-Modules conversion.

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

**The bundle budget is a hard gate, and it is back to 2 % headroom.** #813 took the eager
closure down 30.9 % and re-baselined it, so the 20 % tier A needed is gone. That is survivable
for the rest of lane D for one reason worth knowing: **the growth only happens when you convert
an eager file.** The card-view slice is entirely route-lazy and measured 1222.2 kB against a
1222.5 kB baseline — no movement at all. Tier A's 23.4 kB came from converting shell files. The
mechanism, which still applies to any eager conversion: Linaria
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
| `dialog::backdrop`, from `body[data-theme="dark"] dialog::backdrop` | no |

That last row cost every converted dialog its dark-mode backdrop — the modal kept the top layer
and the page behind it stopped being dimmed, in seven elements, unnoticed since the first one
converted. jsdom implements neither the top layer nor `::backdrop`, so no test could have seen
it. `keep-elements/modal-backdrop.ts` now carries the rule for anything calling `showModal()`.

The way to check a boundary crossing is to measure it rather than reason about it: mount the
same construct in the light DOM, read `getComputedStyle` on both, and compare.

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
