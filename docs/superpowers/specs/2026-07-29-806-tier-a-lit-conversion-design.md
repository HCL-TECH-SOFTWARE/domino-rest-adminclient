# #806 tier A — the per-file conversion recipe

**Lane D (React removal), wave 0.** Measured against `new_code` @ `7ec97b1`.

Tier A's deliverable is not 22 converted files. It is **the recipe the other 88 files reuse**,
proven on the files that cannot go wrong. Everything below is chosen to make the recipe
correct rather than to maximise the file count.

Baseline before any change: `npm run lint` exit 0 · `npm run build` exit 0 ·
87 test files / 996 tests pass.

**Outcome**, rebased onto `new_code` @ `31b43c8`: 11 elements, 3 dead files deleted,
lint 0 · build 0 · **95 test files / 1129 tests**, no coverage threshold regression.
`.tsx` files 119 → 106; files importing React 93 → 83; Linaria consumers 69 → 60.

---

## 1. What the 22 files actually are

The tier A list in #806 was assembled by "imports React, imports nothing else". That is a
sound filter for *risk*, but it does not mean 22 conversions. Verified file by file:

| Disposition | Count |
|---|--:|
| Convert to a Lit element | **11** (12 planned; see §1.4) |
| Delete — dead code | **2** (+1 found outside the list) |
| Defer to tier B/C | **8** |

### 1.1 Convert (11 of the 12 planned)

In dependency order. `keep-*` names follow the existing element convention.

| # | Source | LOC | New element | Notes |
|--:|---|--:|---|---|
| 1 | `src/Footer.tsx` | 23 | `keep-footer` | Styles come from global `styles.css` |
| 2 | `components/loaders/PageLoading.tsx` | 99 | `keep-page-loading` | 70 lines of Linaria keyframes |
| 3 | `components/commons/ZeroResultsWrapper.tsx` | 47 | `keep-zero-results` | 8 consumers |
| 4 | `components/dialogs/FormDialogHeader.tsx` | 34 | `keep-form-dialog-header` | **18 consumers** — highest fan-in |
| ~~5~~ | ~~`components/commons/AppIcon.tsx`~~ | 89 | — | **Deferred during execution — see §1.4** |
| 6 | `components/dialogs/UnsavedChangesDialog.tsx` | 64 | `keep-unsaved-changes-dialog` | Needs #4; 1 test + 2 mocks to update |
| 7 | `components/wrapper/ErrorWrapper.tsx` | 75 | `keep-error-wrapper` | `children` → slot; drops the CommonStyles barrel |
| 8 | `components/header/MobileHeader.tsx` | 74 | `keep-mobile-header` | `--header-height` contract; 2 tests |
| 9 | `components/home/Homepage.tsx` | 22 | `keep-homepage` | Slots a redux child |
| 10 | `components/routers/PageRouters.tsx` | 33 | `keep-page-routers` | Slots an MUI+redux child |
| 11 | `…/displays/scopes/ScopesDefaultView.tsx` | 51 | `keep-scopes-default-view` | Absorbs ExtraFlex; drops ScopeStyles |
| 12 | `…/displays/scopes/ScopesCardsView.tsx` | 60 | `keep-scopes-cards-view` | Absorbs ExtraFlex; drops ScopeStyles |

Note `src/Footer.tsx`, not `src/components/Footer.tsx` — the path in #806 is wrong.

### 1.2 Delete (3)

Converting code nothing renders is wasted work carried forward.

- `components/database/settings/sections/FormSettings.tsx` — zero importers.
- `components/forms/ColumnBar.tsx` — zero importers. Line 66 reads
  `onClick={chooseColumn(column)}`, which *invokes* the handler during render. It has
  never been mounted.
- `components/database/settings/sections/Access.tsx` — zero importers. Not in the #806
  list; found while tracing `SettingContext`'s consumers.

`SettingContext` and its three providers become vestigial once these go (both of its
consumers are on this list). **Left standing deliberately** — removing them edits three
tier B/C files ahead of their conversion.

### 1.3 Defer (8)

**The four contexts.** `AccessContext`, `ApplicationContext` and `SettingContext` are
9-line `React.createContext({}) as any` factories with no JSX — they cannot be custom
elements at all. `NavigationGuardContext` (229 lines) renders `{children}` but exists to
publish a three-function API; converting it destroys the `useNavigationGuard()` channel
that `BreadcrumbRouter` and `AccessMode` consume.

Every consumer of all four is a still-React MUI/redux file in tier B/C/D. Converting a
channel before its consumers buys nothing and edits those files twice.

**Decision recorded for tiers B–D:** React contexts become **redux store slices**, read
through `StoreController`. Not `@lit/context` — report 04 §3 rejects it for this app (one
global store; a singleton avoids re-plumbing every consumer with a provider), and it is
not a dependency today. The three `[state, setState]` contexts are all shared mutable page
state, which is what a slice is.

**Two style carriers.** `commons/Wrappers.tsx` (`WrapperContainer`) and `flex/index.tsx`
(`ExtraFlex`) are bare `styled.div`. Report 02 already marks both "→ css". Their 9
consumers are all still-React tier B/C files. They dissolve as consumers convert: items 11
and 12 absorb `ExtraFlex`'s rules into their own `static styles`, which §3 makes mandatory
anyway. No shared stylesheet is needed and no unconverted file is touched.

**Two fragment dispatchers.** `SchemasMultiView.tsx` and `ScopesMultiView.tsx` are
`view === 'x' && <X/>` chains returning a bare fragment with no DOM of their own. Their
branch children include `ScopesAlphabeticalView`, `ScopesStacksView`,
`SchemasCardsView` … which are **not** in tier A. A Lit template cannot render a React
child, so these convert only after their branches do. Their sole parents
(`ScopeLists`, `SchemasLists`) are tier B/C as well.

### 1.4 Deferred during execution: `AppIcon` (11 conversions, not 12)

Found while converting, not during the survey, and it is the more interesting result of the
two: **a file can pass the tier A import filter and still have a React-only API.**

`AppIcon`'s own imports are clean — React, Linaria, and a service. But its props include two
escape hatches typed against React:

```ts
as?: React.ElementType;   // element/component used for the loaded icon
fallback?: React.ReactNode;
```

`fallback` converts fine; it becomes a named slot, and the React parent slots its MUI icon in
as light DOM. **`as` does not convert at all.** Three call sites pass `as={DBImage}` /
`as={AppImage}` — Linaria-styled `img`s that *replace the element type* of the icon. A custom
element cannot be told to render its internal `<img>` as some other component, and once that
`<img>` is inside a shadow root no external styled-component can reach it either. The
replacement would be `::part(icon)` plus a CSS rule at each call site.

Two of those three call sites are `applications/AppItem.tsx` and
`applications/kanban/AppCard.tsx` — **tier D files, blocked on #807**. So converting `AppIcon`
now means redesigning its API inside files this pass is not allowed to touch yet.

It converts in tier D, alongside the consumers that force the API change. The payoff is still
there when it happens: `keep-elements/app-icon-skeleton.ts` exists only because the React
`AppIconSkeleton` "cannot reach inside these roots", and the two collapse into one.

**Generalisable rule for tiers B–D — the second one this pass produced:** before scheduling a
file, check its *exported API* for React types, not just its imports. `React.ElementType`,
`React.ReactNode` and `React.ComponentType` in a props type mean the file's consumers are
holding it in a React-specific way. `ReactNode` usually maps to a slot; `ElementType` maps to
nothing.

---

## 2. Where converted elements live

`src/components/keep-elements/keep-<name>.ts`, flat, with a wrapper re-exported from
`KeepElements.tsx`. This is report 04 §8's stated plan and it costs **no build-config
change**, which matters more than directory aesthetics:

- `vite.config.mts` and `vitest.config.ts` both exclude exactly
  `'**/components/keep-elements/*.ts'` from wyw. That glob is flat — direct children only.
  wyw's oxc type-stripper mis-desugars `accessor`, so an element outside that directory
  breaks, and `tsDecorators` misconfiguration fails **silently**: decorated fields shadow
  Lit's reactive accessors and elements stop reacting without an error.
- `test/decorator-config.test.ts` scans only that directory for the `accessor` rule, and
  asserts both configs contain that exact glob string. An element elsewhere is unguarded.

The cost is accepted knowingly: the directory falls under an 80/80/72/62 coverage gate, so
**every element needs a real test**. Revisit the flat layout at tier B, when the recipe is
proven and the guard tests can be extended against a working baseline.

---

## 3a. What execution added to the recipe

Five things that were not in the plan and cost time. Tiers B–D should read these first.

**Check the selector *kind*, not just the rule.** A converted element has to reproduce the
styling it used to inherit, and what survives the shadow boundary is narrower than it looks:

| How the style reached the element | Crosses a shadow boundary? |
|---|---|
| `--custom-property` | **yes** — inherits normally |
| a class selector (`.color-text-primary`) | no |
| a bare element selector (`img { … }`) | no |
| the document's `box-sizing` reset | no |

The last two are the ones that bite. `keep-overrides.css` sizes every image through a bare
`img` selector, so the mobile header's logo rendered at its natural 448×444 in a 56px bar; and
restating that rule was still not enough, because the reset that makes everything `border-box`
also stops at the boundary, so the padding landed outside the height. Custom properties are the
only free ride — `--dialog-header-color` and `--text-color-primary` both work untouched.

**Grep the whole stylesheet, not the file whose name matches.** The dark-mode override for
`.color-text-primary` lives in `styles.css`, not `dark-mode.css`. Copying the light-mode literal
produced 1.1:1 contrast in dark mode across five headings, and a green suite.

**No backticks inside a `css` tagged template.** Not even in a comment — a backtick terminates
the template, and the error surfaces as `Property 'x' does not exist on type 'CSSResult'`
somewhere below. This cost five separate fixes. `npm run lint` catches it immediately; run it
before the suite.

**The per-file gate is a grep, so prose defeats it.** A doc comment explaining why a slotted
child still needs Material UI made a converted file match the gate's own pattern. Same shape as
`dead-selectors.test.ts`: these checks match raw text, so naming the thing you removed keeps it
looking present. Describe such packages in words, not as literals.

**A props-less React child cannot take a `slot` attribute.** `<ProfileMenuDialog slot="profile" />`
silently drops the attribute, because the component forwards no props, and the content is never
assigned. Use a default slot, or wrap the child in a plain element that can carry the attribute.

---

## 3. The risk that actually matters

`FormDialogHeader` and `Footer` are styled **entirely by global classes in
`src/styles/styles.css`** (`dialog-title`, `dialog-header`, `dialog-header-title`,
`dialog-header-close`, `footer-copyright-text`, `flex-1`). Global CSS does not cross a
shadow boundary. Linaria `styled` components do not either.

So every conversion must relocate its styling into the element's `static styles`.

And `vitest.config.ts` sets `css: false`. **The suite is structurally incapable of
detecting a style that failed to make the crossing.** A green suite is not evidence that
this work is correct. #777 already found a grey login page this way, after the suite went
green.

Consequence: a browser pass in **both colour modes** is part of the definition of done, not
a nicety. Screens that cannot be reached will be named in the PR, not assumed fine.

---

## 4. Per-file recipe — one commit per file

1. Create `src/components/keep-elements/keep-<name>.ts`:
   - the exact copyright banner (74 `=`, byte-for-byte — `test/copyright-headers.test.ts`);
   - `extends KeepElement` (not `LitElement`) for the shared `emit()` contract;
   - `@customElement('keep-<name>')` self-registration;
   - `accessor` on **every** `@property`/`@state`/`@query` field;
   - `declare global { interface HTMLElementTagNameMap { … } }` at the bottom;
   - exported `detail` interfaces for every event it emits.
2. **Relocate all styling into `static styles`** — Linaria `styled`, global classes from
   `styles.css`, or both. No `style=` attribute and no `styleMap`; both are forbidden by
   the production CSP and by `test/csp-inline-styles.test.ts`.
3. Icons → `<wa-icon>`. This is #718's contribution; there is no separate icon sweep.
4. Fold in the file's accessibility fixes — roles, labels, focus order — and assert them in
   the element test. This is #713's contribution. The conversion rewrites the markup
   anyway, which is the cheapest moment to fix it.
5. Add a wrapper to `KeepElements.tsx` following the `KeepDataTable` shape, with a **typed**
   events map: `onX: 'x' as EventName<CustomEvent<XDetail>>`.
6. Update every consumer: import the wrapper, callbacks become custom events, `children`
   becomes a slot.
7. Delete the old `.tsx`.
8. Add `test/components/keep-elements/keep-<name>.test.ts` using `mountLit`/`cleanupLit`
   from `test/test-utils/lit.ts`.
9. Gate, non-negotiable, before moving on:
   ```
   grep -n "from 'react'\|react-redux\|formik\|@mui/" <the new .ts>   # must be empty
   ```
   then lint, build, and the full suite green.

### Props, not state

The still-React parent keeps its `useSelector`/`useAppDispatch` and passes state **down as
properties**, taking changes back through events. Do **not** put a `StoreController` in a
leaf whose parent still owns its state: `@lit/react` re-applies every prop on every render
with **no dirty check**, so the two would fight. This matches report 02 §2.3, which is
still the rule until a whole subtree is Lit.

---

## 5. Prep commits — none needed

Three of the twelve reach `@mui/material` transitively through a shared style module:
items 11 and 12 import `SchemasMainContainer` from `…/scopes/ScopeStyles.tsx`, which
imports MUI's `Card` for a *different* export; item 7 imports `{ ErrorContainer, Title }`
from the `styles/CommonStyles` barrel, three of whose six re-exports import MUI.

The obvious prep — split the leaf symbols out, or deep-import them — **is unnecessary
work**. Each of the three files imports exactly one symbol from its style module, and §3
already requires that styling move into the element's `static styles`. The import
disappears with the conversion; there is nothing to untangle first.

The MUI edge does survive for the *other* consumers of those modules
(`SchemasCardsView`, `SchemasStacksView`, `SchemasDefaultView`, `ScopesStacksView`, and the
rest of the `CommonStyles` barrel's users). All are tier B/C. Splitting the modules for
their benefit now would edit files ahead of their own conversion — the thing §1.3 declines
to do everywhere else. Leave it; it resolves the same way when they convert.

**Generalisable rule for tiers B–D:** a transitive dependency reached only through a style
module is not a blocker for converting the file that reaches it. Check whether the import
survives the conversion before spending a commit on it.

---

## 6. Traps, verified against the tree

- `test/shell-dead-code.test.ts:71` asserts `MobileHeader.tsx` **exists**. Renaming the
  file fails that test; update it in the same commit. `test/app-shell.test.ts:34` also
  asserts on the element, and MobileHeader's 56 px height / `--header-height` contract with
  `wa-page` is load-bearing and documented in the file itself.
- `UnsavedChangesDialog` is `vi.mock`'d in `test/components/forms/EditView.test.tsx:85` and
  `test/components/access/TabsAccess.test.tsx:114`. Both mocks break on conversion.
- `app-icon-skeleton.ts` documents itself as "the shadow-DOM twin of `AppIconSkeleton`
  (`components/commons/AppIcon.tsx`), which cannot reach inside these roots". Converting
  item 5 collapses that duplication.
- `keep-elements/**` is gated at 80/80/72/62 and currently measures 86.71 / 86.12 / 86.09 /
  70.89. Branches have only **~8.9 points of headroom** — the tightest of the four. Watch
  branch coverage specifically.
- The global gate (40/40/38/35) has 6–7 points of headroom, and a converted file counts at
  0 % both before and after the rename, so the rename itself is coverage-neutral.
- Items 7–10 each render a still-React child (`FormsContainer`'s 126 lines of children,
  `ProfileMenuDialog`, `Section`, `BreadcrumbRouter`). These arrive through a slot from the
  React parent; they are not converted here.
- Running the suite from a worktree needs `npm ci` **inside the worktree**. Without it 18
  files fail with `Denied ID …node_modules…?url`: Node resolves packages from the main
  checkout one level up, but that path is outside Vite's root, so every `?url` asset import is
  refused. Widening `server.fs.allow` also silences it, but installing is the real fix and is
  what `test/node-modules-root.test.ts` now guards.

---

## 7. Definition of done

- 11 elements exist, each with a test; the dead code is deleted.
- Every new element clears the grep gate in §4.9.
- `npm run lint` exit 0 · `npm run build` exit 0 · full suite green with no coverage
  threshold error.
- A browser pass in light **and** dark mode over every reachable converted screen, with any
  unreachable screen named explicitly in the PR.
- The recipe in §4 is what tier B starts from.

## 8. Out of scope

Tiers B–D (#806 continues), `FormController` (#807, lane B, still open and the hard blocker
for tier D), the six #771 tables, `KeepElements.tsx` and `router/react.tsx` (P4 deletions),
and the shell files `App.tsx` / `AppShell.tsx` / `Views.tsx` / `index.tsx` (#719,
`track:shell`).

Deciding #691 is lane C's call. Items 5 and 6 delete two of its 11
`@testing-library/react` files by converting their subjects, which is option 1 of that
issue applied to two files; it will be noted on the issue rather than decided here.
