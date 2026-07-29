# Lane D — the card-view subtree

**Issues:** #806 (tiers A leftovers, B, C) · #713 (a11y, interleaved) · contributes to #718, #712
**Base:** `new_code` @ `0327bd7`
**Recipe:** `docs/superpowers/specs/2026-07-29-806-tier-a-lit-conversion-design.md` §4

## Why this slice, and why now

Lane B is converting the four simple tables (#771) and lane C is shrinking the eager import
closure (#813). Both are in flight in other worktrees. This slice was chosen to intersect
neither:

- **Route-lazy throughout.** `Views.tsx` reaches `SchemasLists` and `ScopeLists` only through
  `import()` (lines 97 and 115), so nothing here is in the eager closure lane C is working on.
  No eager module changes, and the bundle budget does not move.
- **None of the six #771 tables, and no file lane B's plan names.**
- The only shared file is `keep-elements/KeepElements.tsx`, where every conversion adds one
  re-export line. Lane C restructured that file in #854; conflicts there are one line each.

It is also the subtree tier A left half-finished: `ScopesCardsView` and `ScopesDefaultView` are
already Lit, and their four siblings are not.

## What the dependency trace found

The tier tables in #806 sort files by *what they import*. That is the wrong order for this
subtree, because the four schemas views and both remaining scopes views all render the **same
two tier-C children**. Converting a view before its children means slotting React children out
of a loop, which is worse than waiting.

Measured importer counts, precisely (`from '…/X'`, not a bare name grep):

| Child | importers | inside this slice |
|---|--:|--:|
| `dialogs/DeleteDialog` | 6 | 5 |
| `database/views/SlimDatabaseCard` | 2 | 2 |
| `components/flex` (`ExtraFlex`) | 4 | **4 — all of them** |

So `flex/index.tsx` dies entirely with this slice, and `SlimDatabaseCard` has no consumer
outside it. `DeleteDialog`'s sixth importer is `ScopeFormContainer.tsx` (tier D), which picks up
the React wrapper and is otherwise untouched.

### `AppIcon` is not a blocker, and tier A's note was wrong about why

Tier A deferred `commons/AppIcon.tsx` to tier D because it exposes `as?: React.ElementType`,
which has no custom-element equivalent. That reasoning does not extend to its *consumers*.

`as` exists so a caller can pass a Linaria-styled `img` (`DBImage`, `SchemaDBImage`) and keep
its styling. A converted consumer styles `img` in its own `static styles`, so it has no use for
`as` — this is tier A's "a transitive dependency reached only through a style module disappears
with the conversion", one level further out.

More concretely, the in-element icon pattern already exists and is proven by `keep-nsf-card`:
`loadAppIcons()` → `appIconUri()` → `<wa-icon src>`, with `appIconSkeleton()` from
`keep-elements/app-icon-skeleton.ts` covering the window where the #772 payload chunk is still in
flight. `keep-slim-database-card` uses that and never imports `AppIcon`.

**`AppIcon` therefore dies when its last React consumer converts. It does not need to convert
first, and it is eager (lane C's territory), so it should not.**

## Order

Leaves first. One commit per file; each must clear the gate before the next starts.

### PR 1 — the shared leaves

1. **`dialogs/NetworkErrorDialog.tsx`** (52) → `keep-network-error-dialog`
2. **delete** `commons/cardviews/CarViewstyles.tsx`, `…/displays/schemas/v2/CardV2Styles.tsx`,
   `…/displays/scopes/v2/CardV2Styles.tsx` (146 LOC, zero importers repo-wide)
3. **`dialogs/DeleteDialog.tsx`** (80) → `keep-delete-dialog`
4. **`database/views/SlimDatabaseCard.tsx`** (205) → `keep-slim-database-card`

### PR 2 — the scopes views

`ScopesAlphabeticalView` · `ScopesStacksView` · `ScopesMultiView` · `ScopeStyles`. Done: the
scopes subtree is entirely Lit and `displays/scopes/` is gone. Split out from the schemas half
to keep each PR the size of PR 1 — the two families share no files, only the two leaves above.

### PR 3 — the schemas views

`SchemasCardsView` · `SchemasDefaultView` · `SchemasStacksView` · `SchemasAlphabeticalView` ·
`SchemasMultiView` · `CardViewOptions`, and with them `SchemaStyles`, `schemas/SchemaStyles`
and `flex/index.tsx` — the last of `ExtraFlex`'s four importers is in this set.

Done in two parts: the three `ExtraFlex` views first (which killed `SchemaStyles` and
`components/flex`), then `SchemasAlphabeticalView` and `SchemasMultiView`, which emptied
`commons/cardviews/displays/` entirely.

**No `RouterController` was needed after all.** The three-view pass parked navigation in the
still-React `SchemasMultiView`; when that file converted too, the `schema-open` event simply
travelled one boundary further to `SchemasLists`, which is React until #719. The controller is
only wanted when the *route components* convert.

### Left over

`CardViewOptions` (75 lines, MUI + store, shared by both list pages). It is the last file under
`commons/cardviews/`.

`ScopeLists.tsx` and `SchemasLists.tsx` are the boundary. They stay React: they are what the
router's `import()` resolves to, and the router binding is a P4 deletion (#719). They keep their
`useSelector` and pass data down as props.

## `StoreController` — where it is legitimate, and where it is not

`NetworkErrorDialog` is the first production use, and it is the pilot for that reason: it takes
**no props at all**, reads `state.dialog` itself, and all three parents render it bare. The
`@lit/react` hazard — every prop re-applied on every render with no dirty check — cannot fire on
a component with no props.

The rest of the slice must **not** use it. `ScopeLists`/`SchemasLists` own the store reads and
pass the results down; a `StoreController` in a child would fight the props its React parent
keeps re-applying. This corrects `06-waves.md`: tiers B–C are *not* where the 157 remaining
`useSelector` sites move to `StoreController`. Most of them belong to route components, which
cannot convert until the router does.

## Per-file gate

```
grep -n "from 'react'\|react-redux\|formik\|@mui/" src/path/to/File.ts   # empty
```

Then `npm run lint`, `npm run build`, `npm run test`, `npm run bundle:budget`.

**The gate reads comments too.** Tier A shipped a file that failed it because a comment named
a package literally. Describe packages in prose.

**Two files per element now.** #854 split the barrel: the element goes in
`keep-elements/keep-x.ts`, its `createComponent` wrapper in `keep-elements/react/KeepX.ts`, and
`KeepElements.tsx` re-exports it. Only eager modules import `./react/KeepX` directly; nothing
here is eager, so consumers keep importing from the barrel.

## Accessibility — WCAG 2.1 AA

Settled for #713 (decided 2026-07-30). Folded into each conversion commit, not a later pass:
roles, accessible names, focus order, 4.5:1 contrast, keyboard operability. Two already known:

- `NetworkErrorDialog` has the Escape desync `keep-unsaved-changes-dialog` had — Escape closes
  the native dialog without dispatching, so `errorDialogOpen` stays true and it cannot reopen.
- `SlimDatabaseCard`'s row opens on click with `onContextMenu` for its menu; a keyboard path and
  an accessible name are required.

## Verification

The suite runs with `css: false` and cannot see styling. Tier A found three regressions this way
*after* a green suite. Before the PR: click through `/schemas` and `/scopes` in both colour modes
in all four view modes, and trigger the error dialog by failing a scope operation offline
(`store/databases/scopes.ts:153` dispatches it).

**Only custom properties cross a shadow boundary.** `NetworkErrorDialog`'s `<dialog>` carries no
class, so today it gets the UA box plus the bare `dialog` rule in `dark-mode.css` — an element
selector that will not reach into the new shadow root. The element takes the same token trio the
other converted dialogs use, which is a deliberate and visible convergence onto the shared
dialog look, and it needs eyes on it.
