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

Each cluster is a file plus its consumers, chosen so no two clusters touch the same file.

- [ ] A1 `home/sections/Tip.tsx` + `Section.tsx` + `HomePage.tsx` (whole home subtree)
- [ ] A2 `commons/Wrappers.tsx` (→ consumers `SchemasLists`, `ScopeLists`)
- [ ] A3 `mail/Mail.tsx`
- [ ] B1 `forms/ColumnDetails.tsx` (→ `EditView`)
- [ ] B2 `access/AddModeDialog.tsx` (→ `TabsAccess`)
- [ ] B3 `login/CallbackPage.tsx` (→ `App.tsx`, import line only)
- [ ] B4 `loading/APILoadingProgress.tsx` + `loading/GenericLoading.tsx` (5 + 1 consumers)
- [ ] B5 `applications/DeleteApplicationDialog.tsx` (→ `TabsAccess`, `Kanban`)
- [ ] B6 `forms/FormSearch.tsx` + `ViewSearch.tsx` + `AgentSearch.tsx` (near-identical trio)
- [ ] B7 `sidenav/OptionList.tsx` (→ `ProfileMenu`, `ProfileMenuDialog`)
- [ ] B8 `database/SchemaContentsTree.tsx` (→ `ScopeForm`)
- [ ] C1 `commons/cardviews/CardViewOptions.tsx` (→ `SchemasLists`, `ScopeLists`)
- [ ] C2 `alerts/Notification.tsx` (→ `AppShell`)

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

## Review

_(filled in as waves land)_
