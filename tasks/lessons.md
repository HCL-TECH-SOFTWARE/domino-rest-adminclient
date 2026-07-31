# Lessons

Patterns worth not relearning. Newest first.

## A closed issue is not evidence the work shipped

Refreshing `docs/reports/` found **#765 closed `COMPLETED`**, and report 06 recording its
deliverable as "in use ✅". Measured: **0** usages of `wa-stack` / `wa-cluster` / `wa-grid` in
`src`, and `git log -S'wa-cluster' -- src` returns nothing — the strings have never existed in
the tree. The issue had two halves; the token audit shipped and the layout adoption was
deliberately dropped in a closing comment, which the status table then flattened into "done".

The same shape, inverted, appeared four times in the same refresh: report 00's P1-1, P1-2, P1-3
and P2-10 were all marked open while the work had **already landed** under a different PR.

**Rule:** for any status claim, verify against the tree, not the tracker.
`git log -S'<token>' -- src` distinguishes "removed" from "never existed" — a plain grep
returning 0 cannot. And when an issue has two halves, read its closing comment before citing
it; `stateReason: COMPLETED` covers a partial delivery.

## A refresh must re-derive, not re-narrate

Two failures while rewriting the reports, both mine:

- Reported the dead-`--wa-color-danger-600` defect as still open because the previous revision
  said so. It measures **0** — fixed since. I had carried a *narrative* forward while
  re-measuring everything around it.
- Left the previous refresh's three narrative subsections in place below the new ones, so the
  document argued both states at once for ~65 lines.

**Rule:** when a document has a "what changed since X" section, the old one is *replaced*, not
appended to — and every ⚠️/🔴 claim gets re-measured even when only the number looks stale.
Check section headers after a large edit (`grep -n '^#'`) to catch orphaned blocks.

## A static inventory cannot tell you which CSS rule governs an element

During #718 a written inventory of "CSS at risk" was wrong **four times**, always the same
way: it named a source line, and the compiled selector said something else.

- a rule cited for a file, living in a component that file never renders
- a rule nested in a Linaria block, which compiles to a *descendant* selector and so
  reached 10 elements rather than the 14 claimed
- two rules described as live that an `!important` elsewhere on the same element had
  already beaten
- an entire block keyed on `.active`, which this repo's router never emits — it uses
  `aria-current`

**Rule:** before retargeting or deleting a rule, check the compiled selector in the built
stylesheet. Grep finds candidates; only the cascade decides. Each of these would have
shipped a silent size or colour change, and `css: false` means no test would have caught it.

## Verify the instrument before trusting the reading

Recurring across #765, #771 and #718. A harness missing `webawesome.css` reported that the
chrome had vanished. A `sed` using `\b` silently no-op'd on BSD. A token scan reported 24
failures including one already fixed. A subagent's "expected provenance string" for a
bundled asset was wrong, and would have produced a false PASS.

**Rule:** give every new check a negative control — break the thing on purpose and watch the
check fail — before believing a pass. Applied to every guard added in #718.

## `npm run build` is not the typecheck for tests

`npm run build` is `tsc -b tsconfig.app.json`: the **app project only**. A type error in
`test/` passes it and fails `npm run typecheck`. Introduced exactly this error in #718's
first commit and did not see it until four commits later.

**Rule:** after touching anything under `test/`, run `npm run typecheck`, not just the build.

## Third-party defaults are not neutral

`wa-icon`'s default canvas is `fixed` — a 1.25em × 1em box. The icon sets it replaced drew
1em × 1em. Adopting the default would have widened ~115 call sites by 25 %, invisibly.

**Rule:** when swapping a primitive wholesale, diff the *defaults*, not just the API. And
put the correction in the wrapper, where it is one decision, not at the call sites.

## Cascade layers lose to everything unlayered — but not to inheritance

WebAwesome ships its utilities in `@layer wa-utilities`; no app stylesheet declares a
layer. So **any** app rule outranks `.wa-size-*` regardless of specificity, and passing a
size prop alongside a call-site class is a rule that silently does nothing.

The converse trap: this does **not** apply to inherited values. A declaration on the
element — layered or not — always beats a value inherited from a parent. A subagent
conflated the two and was about to halve the sidenav rail.

## When a legacy library has been silently winning, removing it is a design change

MUI injects Emotion styles after the app's stylesheet. `.MuiSvgIcon-root` and an app class
are both specificity 0,1,0, so MUI won every tie and the app's own icon size classes had
been dead since the day they were written. Deleting MUI therefore *changes sizes whichever
way you go* — honouring the classes shrinks icons up to 42 %.

**Rule:** that is the user's call, not a codemod's. Detect it, quantify it, ask once.

## A shared integration branch can do your task while you are doing it

`new_code` advanced four times in about an hour, and one of those merges — #956, wave 7 —
independently completed the deletion that was in progress, file for file. The branch was
finished, green, and worthless. #957 had to be closed as obsolete before it was ever pushed.

Two mechanical traps came with it. `git reset --soft new_code` resolves the branch *live*,
so after it moves, `git add -A` stages a diff that reads as "delete everything the other PRs
added". And a report or issue written against a base captured an hour ago can cite files
that no longer exist by the time it is filed.

**Rule:** `git fetch` and compare before branching, before each verification run, and again
immediately before pushing. Read `git status` after any reset onto a branch name. When a
base move makes work redundant, bin it and say so — do not reshape it into a PR that
re-adds deleted files.

## Verify which version of a dependency actually implements the attribute you are using

`<wa-icon canvas="auto">` appeared at 56 call sites, with docblocks explaining the
semantics in detail. `canvas` did not exist in the pinned WebAwesome 3.10 — it arrived in
3.11 — so every one of them was inert and every icon rendered 1.25em wide, the exact layout
the docblocks said the attribute existed to prevent. `package.json` said `^3.10.0`, which
both versions satisfy, so only the lockfile was wrong.

The near-miss: the obvious reading of the failing test was "the call sites use a bad API,
migrate them to `auto-width`", and that was proposed and approved. It was backwards —
`auto-width` is the *deprecated* spelling and the call sites were right all along. Reading
the installed package's `custom-elements.json` for both versions is what settled it, in
about a minute, and turned a 33-file migration into a one-line bump.

**Rule:** when an attribute appears not to work, check the installed package's own metadata
before changing any call site. Confirm whether the API is missing, renamed, or deprecated —
and check the newest version too, because "this API does not exist" and "this API does not
exist *yet, here*" call for opposite fixes.
