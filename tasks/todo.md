# #806 — per-file leaf-component migration pass

Branch `worktree-fluttering-skipping-fairy`, based on `new_code` @ `0d5458c`.

Baseline at `0d5458c`: `npm run lint` **0** · `npm run typecheck` **0**.
The red gate #806 warns about — the unused `keepBlockDiagram` import in
`home/sections/Section.tsx:15` — was **already cleared** by `0d5458c` ("removed obsolte
entries"). Nothing to fix before taking the first file.

The worktree needed `npm ci` of its own: 39 test files failed with
`Denied ID …node_modules…?url` because Node resolved packages from the main checkout, one
level above Vite's root. Installing inside the worktree is the fix (guarded by
`test/node-modules-root.test.ts`).

## Agreed operating rules for this run

| Decision | Choice |
|---|---|
| Scope | leaf waves across tiers A+B+C, ~30 files; stops before tier D and the route roots |
| Gate cadence | one commit per file; full lint/typecheck/build/suite at each **wave boundary** |
| PRs | one PR per wave, against `new_code`, "contributes to #806" |
| Browser pass | Chrome DevTools over each wave's reachable screens, light **and** dark |
| Tests | converted with the file — assertions carried over, never dropped |

Concurrency: up to 12 agents in this one worktree. Agents run only their own vitest file plus
the grep gate; the orchestrator owns git and runs the real gate.

**Known risk to the browser pass:** the #718 run recorded that ~111 of its 115 icon sites
were unverifiable because they "sit behind a login this environment cannot pass". Reachability
is therefore tested at the wave 1 boundary rather than assumed, and whatever cannot be reached
is named per-screen in the PR instead of being quietly skipped.

## Re-derived tiers at `0d5458c` (mechanical, by axis)

Tier A 13 / 1,308 · B 42 / 7,562 · C 22 / 5,978 · D 12 / 4,063 — counted before excluding the
P4 shell (`App.tsx`, `AppShell.tsx`, `Views.tsx`, `index.tsx`, `router/react.tsx`), the store
modules, and the already-converted `keep-*.ts` elements that the axis filter also matches.

Route roots reached only through `Views.tsx`'s `import()` calls — `HomePage`, `SchemasLists`,
`FormsContainer`, `AccessMode`, `ScopeLists`, `Applications`, `ConsentsContainer`, and
`LoginPage` via `App.tsx` — look consumer-less to a static import graph but are **not** dead.
Deliberately out of this run: they are route roots and serialise badly.

---

## Wave 0 — dead code

Zero importers anywhere in `src`, `test` or `scripts`. Precedent is the tier A spec §1.2,
which deleted three zero-importer files on the same reasoning ("converting code nothing
renders is wasted work carried forward").

- [ ] `src/components/applications/AppSearch.tsx` (36) — #806 lists this tier A "ready";
      deleting rather than converting is a deliberate deviation, called out in the PR
- [ ] `src/components/dialogs/DropdownFormulaEngine.tsx` (39)
- [ ] `src/components/schemas/SchemaStyles.tsx` (118) — referenced only by prose, in two
      `keep-schemas-*.ts` doc comments

`src/components/mail/Mail.tsx` is **not** in this list. It is referenced only inside a JSX
comment in `Views.tsx` (parked pending LABS-1214, #698), but #806 tier A asks for it to be
converted, so it converts in wave 1.

## Wave 1 — leaves, 12 agents

Each cluster is a file plus the consumers it must edit, cut so that **no two clusters touch
the same file**. Consumers are updated, never converted, in this wave.

| # | Files converted | Consumers edited |
|---|---|---|
| 01 | `commons/Wrappers.tsx` · `commons/cardviews/CardViewOptions.tsx` · `database/DatabaseSearch.tsx` | `SchemasLists`, `ScopeLists` |
| 02 | `mail/Mail.tsx` | — (no live consumer) |
| 03 | `forms/ColumnDetails.tsx` | `EditView` |
| 04 | `access/AddModeDialog.tsx` · `applications/DeleteApplicationDialog.tsx` | `TabsAccess`, `Kanban` |
| 05 | `loading/GenericLoading.tsx` | `AccessMode` |
| 06 | `forms/FormSearch.tsx` | `TabForms` |
| 07 | `forms/ViewSearch.tsx` · `forms/AgentSearch.tsx` | `TabViews`, `TabAgents` |
| 08 | `sidenav/OptionList.tsx` | `ProfileMenu`, `ProfileMenuDialog` |
| 09 | `database/SchemaContentsTree.tsx` | `ScopeForm` |
| 10 | `alerts/Notification.tsx` · `sidenav/SideNav.tsx` | `AppShell` |
| 11 | `forms/ActivateMenu.tsx` | `FormsTable` |
| 12 | `forms/ActivateSwitch.tsx` | `AgentsTable`, `ViewsTable` |

`KeepElements.tsx` is the one file every agent may touch; it is append-only and each agent
re-reads before editing.

### Dropped from wave 1, with reasons

**The home subtree — `Tip.tsx`, `Section.tsx`, `HomePage.tsx` — is blocked on a missing
primitive.** There is no Lit router controller: the router is handed out through React
context with no module-level instance, so an element cannot reach it (stated in
`keep-schemas-cards-view.ts` and `keep-schemas-default-view.ts`). `Tip.tsx` is already a thin
React shim over the existing `keep-tip` element, and what remains of it is a Linaria-styled
`Link` that the element's own doc comment says **must** stay in document scope, because
`::slotted(a)::after` matches nothing. `Section.tsx` renders `Tip` in three loops, and a Lit
template cannot render a React child — so `Section` cannot convert while `Tip` needs `Link`.
`HomePage.tsx` is a 3-line composition and a route root. This subtree wants the router
controller first; that is the same shape of gap `FormController` (#807) was for tier D.

**`login/CallbackPage.tsx`** calls `navigate('/')` after the OAuth callback and its only
parent is `App.tsx`. Converting it pushes navigation into the P4 shell, which belongs to #719.

**`loading/APILoadingProgress.tsx`** has five consumers (`ConsentsTable`,
`SchemaContentsTree`, `EditView`, `SchemasLists`, `ScopeLists`) that overlap four separate
clusters. It gets a wave of its own rather than a four-way write conflict.

**`access/SingleFieldContainer.tsx`** needs `AccessContext` turned into a store slice first
(decision 1), and that edits `AccessMode`, which cluster 05 already owns.

## Wave 2 — mid clusters

- [ ] `forms/ActivateSwitch.tsx` + `AgentsTable.tsx` + `ViewsTable.tsx` (shared dependency)
- [ ] `forms/ActivateMenu.tsx` (→ `FormsTable`)
- [ ] `applications/kanban/ConsentItem.tsx` + `consents/ConsentFilterContainer.tsx`
      (both feed `ConsentsTable`)
- [ ] `access/FieldContainer.tsx` + `access/ScriptEditor.tsx` (both feed `FieldDndContainer`)
- [ ] `sidenav/SideNav.tsx` (leaf, → `AppShell`)
- [ ] `sidenav/ProfileMenu.tsx` + `ProfileMenuDialog.tsx` (need `OptionList` from wave 1)
- [ ] `applications/AppFilterContainer.tsx` (→ `AppsTable`)
- [ ] `database/DatabaseSearch.tsx` (→ `SchemasLists`, `ScopeLists`)
- [ ] `access/SingleFieldContainer.tsx` (→ `Fields`; depends on `AccessContext`)
- [ ] `navigation/NavigationGuardContext.tsx` + `routers/BreadcrumbRouter.tsx`
      (context → store slice, per decision 1)

## Wave 3 — large single-consumer files

- [ ] `access/ModeCompare.tsx` (651) · `forms/EditView.tsx` (623) ·
      `applications/kanban/ConsentsTable.tsx` (380) · `access/FieldDndContainer.tsx` (370) ·
      `access/Fields.tsx` (447) · `forms/DetailsSection.tsx` (725) ·
      `forms/FormsTable.tsx` (335) · `forms/TabForms/TabViews/TabAgents`

---

## Review — wave 1

**Landed.** 11 commits on `worktree-fluttering-skipping-fairy`. 18 React files deleted,
14 elements created, 13 wrappers added and 1 deleted.

| Gate | Before (`0d5458c`) | After |
|---|---|---|
| `npm run lint` | 0 | **0** |
| `npm run typecheck` | 0 | **0** |
| `npm run build` | 0 | **0** |
| `npm test` | 133 files / 1709 tests | **146 files / 1951 tests** |
| `npm run bundle:budget` | 887.5 kB / 243.7 kB | **891.7 kB / 241.2 kB** |

⚠️ **Raw bundle headroom is down to 0.7 kB** (from 4.9 kB). Gzip improved by 2.5 kB. The next
wave will breach the raw budget unless something comes out — worth deciding whether to raise
the budget or land a deletion first.

### What the parallel run actually cost and returned

12 agents, 11 clean. One (`SideNav` + `Notification`) stalled at its own verification step
with the work complete; its 47 tests passed unchanged, so it needed no rework.

The predicted collision happened exactly once and was handled correctly: two agents converted
the same search-component family and produced two elements. Neither edited the other's files,
both reported it, and the second deliberately matched the first's event name, detail shape and
wrapper prop so the collapse cost one import line. Reconciled onto the generic element,
grafting the duplicate's search landmark and host-level focus ring.

**Deleting beat converting three times.** `GenericLoading` folded into `keep-page-loading`
behind one boolean; the three search components became one element; and wave 0 deleted three
files outright. Told to check for reuse, agents twice correctly *declined* it
(`keep-file-contents-tree`, `keep-switch`) with reasons that hold up.

### Defects found, none of them things this wave broke

- **39 declarations in `dark-mode.css` are invalid CSS and have never applied.**
  `light-dark(inherit, …)` — `inherit` is not a valid component value inside the function, so
  the declaration is dropped at parse and the `!important` on it is moot. 33 `color`
  (mostly masked by the body rule) and 6 `background-color` (not masked — those dark surfaces
  have never rendered). The file's own header documents this as the mechanism.
- **Dropdown menus wired `@click` per item are dead for keyboard users**, and a click listener
  on a *disabled* item still fires. Found independently by two agents. `keep-source`,
  `keep-quick-config-form` and `keep-dropdown` already ship that pattern.
- Bugs fixed while converting: a stale add-mode field that made Save contradict the visible
  text; an activate-menu status dot that never updated and read the wrong colour in dark mode;
  two Escape handlers whose flags stayed set, one of which made a view undeactivatable for the
  life of the page; and the mail glyph at 1.2:1.
- Dead code removed: `FORMS_ERROR`/`updateFormError` (no reducer case, never written), six
  orphaned CSS rules, a dead MUI theme override, and several never-read props.
- Pre-existing and **not** actioned: `apps.deleteDialogOpen` duplicates `dialog.deleteDialog`;
  `--text-color-secondary` is now read by no rule but two elements cite it as a warning.

### Browser pass

The app itself is unreachable — the dev server proxies `/api` to a remote Keep server and
there are no credentials here, the same wall the #718 run hit. Verified the elements in
isolation instead, against the app's real stylesheets and theme mechanism, in both modes.

Confirmed: the nested `keep-data-table` chrome survives re-adoption into another shadow root;
the mail glyph is 11.73:1 where it was 1.2:1; the add-mode label and hint render as intended;
search fields, pickers, switches and dialogs are correct in both modes.

**A limitation worth stating: an element whose background is painted by an ancestor reads as
1:1 contrast in isolation.** `keep-side-nav` did exactly that. It is not a defect — the rail's
gradient comes from `wa-page::part(menu)`, which depends on nothing `SideNav` carried, and
re-testing on that gradient renders correctly. But it is a false positive the harness will
produce again.

Still needing real eyes, per-screen lists are in the PR. The largest single risk is `SideNav`,
which is on every authenticated screen in both modes.

## Wave 2 — not started

Carried forward: `APILoadingProgress` folds into `keep-page-loading` the same way
`GenericLoading` did (four consumers plus a mock). Then the wave-2 clusters listed above.
