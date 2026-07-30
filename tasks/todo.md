# Refresh `docs/reports/` against `new_code` @ `0d5458c`

Supersedes the #718 plan that used to live here — #718 shipped in PR #913 and the icon axis
now measures 0/0. Its durable findings are in `tasks/lessons.md`.

Scope agreed with the user: **all seven reports plus the README**, **full re-measure** —
every metric re-measured on this commit, headers re-stamped, and a "what changed" table
per report.

## Drift being closed

| | Last stamp | Now |
|---|---|---|
| reports 00–05 | `fcab645`, 2026-07-28 | `0d5458c`, 2026-07-30 |
| 06-waves | `9f568a8`, 2026-07-29 | `0d5458c`, 2026-07-30 |
| commits | — | **321** since `fcab645` |
| merged PRs | — | **99** (#753 → #922) |

## Verified baseline on `5f0b913` (measured, not assumed)

```
npm run lint          exit 1    ⚠️ 1 error  — unused import, Section.tsx:15
npm run typecheck     exit 1    ⚠️ TS6133   — same line
npm run build         exit 1    ⚠️ TS6133   — same line, tsc -b runs before vite
npm test              exit 0    133 files / 1709 tests
npm run bundle:budget exit 0    887.5 kB raw / 243.7 kB gzip (budget 892.5 / 245.9)
                                ^ only measurable with the bad line deleted locally
npm audit                       0 vulnerabilities
coverage                        70.41 % stmt / 58.40 % branch / 72.80 % func / 70.12 % line
```

- `src`: 37,472 LOC over 162 `.ts` + 86 `.tsx`
- dependencies **18** (was 26; `immer` dropped in `e27102f`), devDependencies 17, `overrides` **4** (was 9)
- `react-router` / `react-router-dom` **gone** — in-repo router at `src/router/`
- 50 registered `keep-*` custom elements (stack lines still say 25)
- `@mui/material` 9.2.0 is the only MUI package left; 43 files import it
- icons: `@mui/icons-material` 0, `react-icons` 0 — both absent from `package.json`
- Formik: 12 real importers; `formik` + `yup` still installed
- store: 146 `useSelector`/`useDispatch` sites across 54 files
- `StoreController` 11 production users · `FormController` 2
- `getTheme` down to 6 readers
- type safety: 482 `: any`, 44 `as any`, 0 `@ts-ignore`, 12 `console.*`

## Per-file checklist

- [x] `README.md` — index, stamp, status block, snapshot table, go/no-go gates
- [x] `00-code-quality.md` — stack line, P-item statuses, type-safety + security numbers
- [x] `01-vitest-and-coverage.md` — suite size, thresholds, per-area coverage
- [x] `02-react-to-lit-webawesome.md` — component inventory, element count, MUI surface
- [x] `03-wa-page-and-design-tokens.md` — getTheme readers, token/hex claims, MUI theme layer
- [x] `04-remove-react.md` — P0–P4 phases, tsx/React counts, dependency list, bundle
- [x] `05-dependabot-triage.md` — npm audit (now 0), main-vs-new_code gap (479)
- [x] `06-waves.md` — lane/wave status, gates, per-issue state

## House rules for this refresh

1. **Measure, don't carry forward.** Every number re-derived on `5f0b913`.
2. **Don't count React shims over web components** as remaining work — they are deletions.
   34 files: 32 `keep-elements/react/*.ts` + the barrel + `commons/ZeroResultsWrapper.tsx`.
3. **Report gate status honestly**, whichever way it points — including retracting the
   red-gate finding once `0d5458c` fixed it, rather than leaving it in as filed.
4. Historical columns stay as they were reported; only the "now" column is re-derived.

## Review

**Done.** All eight files re-stamped to `0d5458c` and re-measured, plus a raw bundle-budget
widening (below).
Verified: every markdown table has consistent column counts (0 mismatches), `<details>` tags
balanced in every file, no `Refreshed 2026-07-28` left as a current stamp.

### What the re-measure actually found

Six items were **stale in a way that mattered**, not just numerically:

1. **Four of report 00's long-standing P1/P2 items had silently closed** — #694 (typed
   dispatch: 153 → 44 `as any`, 94 → 0 dispatch casts), #710 (17 `switch` reducers → 0),
   #711 (`databases/action.ts` 2,885 → 47 lines, 5.8 % → 84.4 % covered), #699 (`npm audit`
   10 high → 0). Three of them were the report's own "worst tech debt" for four revisions.
2. **#685 landed**, so the CSP compensating control that #684's security decision rested on
   is now real. Both SPA document routes send `script-src 'self'`.
3. **All 16 Dependabot alerts are now stale skew** — the two previously-live ones cleared by
   opposite routes: `brace-expansion` got a published fix (5.0.8), and `react-router` was
   cleared by #716 **deleting** the package rather than bumping it.
4. **The icon axis is empty** — 0 references, both packages uninstalled (#718/#913). Report
   03 §6.4 and report 04 §6 were both describing work that is done.
5. **The DataGrid blocker resolved against its own recommendation.** Report 02 recommended a
   third-party grid (AG Grid/RevoGrid); what shipped was a purpose-built `keep-data-table`
   (#771), because the real usages were far smaller than a general-purpose grid.
6. 🐛 **Report 06 claimed `wa-stack`/`wa-cluster`/`wa-grid` were "in use ✅" — they never
   have been.** #765 is closed `COMPLETED` but only its *token audit* half shipped; the
   layout half was deliberately dropped, and `git log -S'wa-cluster' -- src` returns nothing.
   Corrected in reports 03 and 06 and in the README's snapshot and gates.

### Corrections I had to make to my own first pass

- Wrote `default-src 'self' data'` (typo) in the CSP block, and initially reported the
  Shoelace-era dead-token defect as still open when it measures **0** — both fixed before the
  file was finished. The lesson is the one already in `lessons.md`: measure, do not infer from
  a token name.
- My first big edit to report 00 left the *previous* refresh's three narrative subsections in
  place below the new ones, duplicating ~65 lines. Deleted after checking the boundaries.
- Used 89.1 % and 89.4 % interchangeably for `keep-elements` — they are the directory-only and
  `/**`-glob figures respectively. Now labelled per use.
- Broke two table rows in report 03 by dropping a column; caught by the table validator.

### The rebase, and what it cost

Between measuring and committing, `origin/new_code` moved two commits — caught by the house
rule "check `origin/new_code` before branching", which is the only reason it was not published
wrong. Both commits invalidated findings:

- **`0d5458c` removed the unused `Section.tsx:15` import**, so the red-gate finding that
  opened all eight documents was **false by the time it would have been read**. Retracted
  everywhere and withdrawn as report 00's P0-11, kept only as a one-paragraph note on *why*
  the shape matters (CI runs `lint → typecheck → build` before `test`).
- **`e27102f` dropped `immer` and four dead `overrides` entries** — both of which this refresh
  had just *recommended*. Rewritten from recommendation to done; `redux` is still open.
  Also `jsdom` 29.1.1 → 30.0.1, which shifted coverage by ~0.06 points.

**Lesson:** a measurement is only valid for the commit it was taken on, and a long
documentation task can outlive its own baseline. Re-measure after any rebase, and never
publish a "current state" section without re-checking `origin` first.

## Second task — raw bundle headroom 2 % → 3 %

Requested explicitly, as a temporary migration accommodation.

- `scripts/bundle-budget.mjs`: `HEADROOM` is now per-metric, `{ raw: 0.03, gzip: 0.02 }`.
- `bundle-budget.json`: raw budget 892,471 → **901,221**; gzip unchanged; `headroom` field
  becomes an object.
- Effect: room over the current measurement goes **4.9 kB → 13.7 kB raw** (~2.8×, because the
  stored `measured` baseline is deliberately older than the tree).
- gzip deliberately left at 2 %, because raw is the metric #806 pushes on for reasons that are
  not regressions — Linaria CSS is extracted at build time, Lit `static styles` ships inside
  the JS chunk, and CSS compresses better than code. #718 landed at +19.5 kB raw / +4.9 kB
  gzip. **So gzip is now the sensitive half of the gate.**
- The `--update` ratchet still refuses to raise — verified it rejects the current larger
  measurement and leaves the JSON untouched.
- ⚠️ **Put raw back to `0.02` when #806 closes**, and re-baseline with `--update`. Recorded at
  the constant, in the JSON shape, and in reports 00/01/04/06 + README.

### Left undone, deliberately
- **Deep prose sections were re-scored, not rewritten.** Where a section's *analysis* still
  holds and only its numbers had drifted, I updated the numbers and added a status line rather
  than re-arguing the section. Historic option analyses (report 02 §5.1, report 05 Part 2) are
  retained with an explicit note about which option actually won.
- **No browser verification.** Every layout/colour claim carried forward from a previous
  refresh is still browser-unverified, and `css: false` means the suite cannot check it.
