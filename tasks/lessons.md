# Lessons

Patterns worth not relearning. Newest first.

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
