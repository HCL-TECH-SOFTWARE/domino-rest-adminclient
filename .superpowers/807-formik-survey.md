# Formik Usage Survey — issue #807

Scope: the 15 files named in #807's table, under `src/`. Read-only survey; no design proposed.
Repo state: branch `feat/807-form-controller`, worktree `foamy-skipping-cherny`.

## 0. Dependency facts

- `formik: ^2.4.9` and `yup: ^1.7.1` are both direct `package.json` dependencies.
- `yup` is imported **only** in 4 of the 15 files — nowhere else in `src/`:
  `AddImportDialog.tsx`, `ScopeFormContainer.tsx`, `QuickConfigFormContainer.tsx`, `Kanban.tsx`.
  There is no other yup consumer to preserve compatibility with.

## 1. LOC / grep-count verification (issue table vs. actual)

| File | Issue table (refs/LOC) | Actual (refs/LOC) | Match |
|---|---|---|---|
| AppForm.tsx | 36/329 | 36/329 | exact |
| QuickConfigForm.tsx | 33/431 | 33/431 | exact |
| ScopeForm.tsx | 25/459 | 25/459 | exact |
| AddImportDialog.tsx | 21/428 | 21/427 | LOC off by 1 (no trailing newline) |
| TestForm.tsx | 19/280 | 19/280 | exact |
| TabsAccess.tsx | 9/1008 | 9/1007 | LOC off by 1 (no trailing newline) |
| ScopeFormContainer.tsx | 7/222 | 7/222 | exact |
| QuickConfigFormContainer.tsx | 5/159 | 5/159 | exact |
| Kanban.tsx | 5/227 | 5/227 | exact |
| FormDrawer.tsx | 5/60 | 5/60 | exact |
| AppItem.tsx | 4/374 | 4/374 | exact |
| AppsTable.tsx | 4/352 | 4/352 | exact |
| AppCard.tsx | 4/314 | 4/314 | exact |
| AppStack.tsx | 4/65 | 4/65 | exact |
| LoginPage.tsx | 5/732 | 5/731 | LOC off by 1; **all 5 hits are prose in comments**, zero executable formik code |

The table is essentially accurate — the only "stale" entry is LoginPage, and the issue itself already flagged that it's converted. The 1-line LOC diffs are just missing trailing newlines, not stale content.

## 2. Feature-usage matrix

Legend: ✅ used (with evidence) · — not used · **N/A** file doesn't touch forms directly (pure pass-through)

| File | Entry point | Validation | Field wiring | State reads | Mutators | Nested/array paths |
|---|---|---|---|---|---|---|
| **AddImportDialog.tsx** | ✅ `useFormik` L87 (producer) | ✅ yup `validationSchema` L55-85: `.shape`,`.min`,`.max`,`.required`,`.test`×2,`.matches`; `validateOnChange:true`,`validateOnBlur:true` L111-112 (both = library defaults, redundant) | manual `value`/`onChange` off formik L334-395; **no** `<Field>` | `errors`, `touched` (read only, e.g. L334,L360,L374) | `resetForm` L135,209,255,261; `setValues` L153,186 (bulk); `submitForm` L251; **direct `formik.values.x = …` mutation** L240,248 (anti-pattern, bypasses React state) | none |
| **ScopeFormContainer.tsx** | ✅ `useFormik` L77 (producer) | ✅ yup `validationSchema` L31-49: `.shape`,`.min`,`.max`,`.required`,`.test` | N/A (producer only; passes `formik` down) | none read here | `resetForm` L158; `setValues` L167,179 (bulk, in a `useEffect` keyed on `[database, visible]` — manual reinit, not `enableReinitialize`); **direct mutation** `formik.values.schemaName = …` L144 | none |
| **QuickConfigFormContainer.tsx** | ✅ `useFormik` L77 (producer) | ✅ yup `validationSchema` L21-49: `.shape`,`.min`,`.max`,`.required`,`.test` | N/A (producer only) | none read here | `resetForm({})` L127 (called from a `useEffect` on drawer open, not just on unmount); **direct mutation** `formik.values.nsfPath = …` L133 | initialValues has nested object `additionalModes: {odata,dql}` (consumed as dotted path in QuickConfigForm.tsx) |
| **Kanban.tsx** | ✅ `useFormik` L106 (producer) | ✅ yup `validationSchema` L64-69 (flat, no `.test`/`.when`); **also** `validate: () => { dispatch(clearAppError()) }` L120-122 — a `validate` fn used purely as a side-effect hook, not for validation logic | N/A (producer only) | none read here | `resetForm` L161 | none |
| **TabsAccess.tsx** | ✅ `useFormik` L634 (producer) — **but only for the small "Test Formulas" sub-form**, not the page's main mode-editor state (see §7 surprise) | none (no `validationSchema`, no `validate`) | N/A here | none read via this formik in this file | none beyond default; direct value writes `formik.values.readFormulaText = …` etc. L746-760 (same anti-pattern) | none |
| **AppForm.tsx** | receives `formik: FormikProps<any>` prop (consumer) | N/A | manual `value`/`onChange`=`formik.handleChange` on MUI `TextField` L165-224,283-286; `checked`=formik value + `setFieldValue` on `KeepCheckbox` L266-270,304-309 | `values`,`errors`,`touched` read throughout | `handleSubmit` (form `onSubmit` L140); `setFieldValue` L268,306; `submitForm` (awaited) L135; **direct mutation** `formik.values.appScope = …` L109,117, `formik.values.appIcon = …` L130 | none |
| **QuickConfigForm.tsx** | receives `formik` prop (consumer) | N/A | manual wiring; custom `handleSchemaNameChange`/`handleScopeNameChange`/`handleDescriptionChange` wrap `formik.handleChange` L176-193 | `values`,`errors`,`touched` | `handleChange`,`handleSubmit`,`resetForm` L195; **`setFieldValue('additionalModes.odata', …)` / `('additionalModes.dql', …)`** L386,393,400,407 | **YES — dotted path `additionalModes.odata` / `additionalModes.dql`**, load-bearing |
| **ScopeForm.tsx** | receives `formik` prop (consumer) | N/A | manual wiring via `handleScopeNameChange`/`handleDescriptionChange`/`handleServerChange` wrapping `formik.handleChange` | `values`,`errors`,`touched` | `handleChange`,`handleSubmit`,`setFieldValue('isActive',…)` L207, `resetForm` L432, `submitForm` L153,161 | none |
| **TestForm.tsx** | receives `formik` prop (consumer) | N/A | `onChange={formik.handleChange}` on MUI `TextField`; `checked`=formik value + `setFieldValue` on 5 `KeepCheckbox` L114-151 | `values` only (no errors/touched read) | `handleSubmit`, `setFieldValue`×5, `submitForm` (as bare `onClick` handler, not called) L191 | none |
| **FormDrawer.tsx** | N/A — typed pass-through only | N/A | N/A | N/A | N/A | N/A |
| **AppsTable.tsx** | N/A — typed pass-through only | N/A | N/A | N/A | N/A | N/A |
| **AppItem.tsx** | receives `formik` prop (consumer) | N/A | N/A | N/A | `setValues(formData)` L208 — bulk-loads the edit form when "Edit" is clicked | none |
| **AppStack.tsx** | N/A — typed pass-through only, **and itself unreachable** (see §7) | N/A | N/A | N/A | N/A | N/A |
| **AppCard.tsx** | receives `formik` prop (consumer), **unreachable in practice** | N/A | N/A | N/A | `setValues(formData)` L101 | none |
| **LoginPage.tsx** | none — fully converted, see §5 | none (Formik gone) | none | none | none | none |

## 3. What Formik provides that **nothing** in these 15 files uses

Verified by grep across all 15 files for each symbol — zero hits except noted:

- `isSubmitting`, `isValid`, `dirty`, `status`, `submitCount` — **never read anywhere**
- `enableReinitialize` — **never used**. The two places that need "reload initial values when a prop changes" (`ScopeFormContainer`, `QuickConfigFormContainer`) do it by hand: a `useEffect` keyed on the changing prop that calls `formik.setValues(...)`. A replacement does not need built-in reinitialize semantics, just an imperative "set all values" method.
- `validateOnMount`, `isInitialValid` — never used
- `handleReset` — never used (call sites use `resetForm()` directly instead)
- `handleBlur` — **never wired to any input**. This matters: every place that reads `touched.field` for error display will only ever see `touched` become true via Formik's own "mark all touched on submit attempt" behavior, not per-field blur. Effectively `touched` here means "a submit was attempted," not "this field was blurred." A replacement must preserve *that* semantics, not real blur-tracking, or the error-display timing will change.
- `setErrors`, `setStatus`, `setFieldError` — never used
- `<Field>`, `<FastField>`, `<FieldArray>`, `getFieldProps` — never used; every file wires inputs manually via `value`/`checked` + `onChange`/`formik.handleChange` + `setFieldValue`
- `withFormik` HOC — never used
- Async `onSubmit` — **none of the 5 `onSubmit` functions return a Promise**; they all just `dispatch(...)` synchronously. Formik's automatic `isSubmitting` (which is driven by the returned promise) would be a no-op even if read, consistent with it never being read.
- Field-level validation (validate function per field) — never used, only whole-schema `validationSchema` or a whole-form `validate` used as a side-effect hook (Kanban).
- Yup async validation, `.oneOf`, `.when`, transforms — **none used**. Every yup schema in these files is: `.shape` + `.string()` + `.min`/`.max`/`.required`/`.matches` + occasional synchronous `.test`. No cross-field conditional validation (`.when`), no `.oneOf`, no transforms, no async tests.

This is a large bounding fact: the yup usage is uniformly simple synchronous string validation. A replacement's validation layer can be far smaller than yup's surface.

## 4. What a replacement must support, ordered by file count needing it

**Load-bearing (used by multiple files, not trivially avoidable):**

1. **Producer/consumer split via a plain object prop** (8 of 15 files pass or receive a form-instance-shaped prop: `AppForm`, `QuickConfigForm`, `ScopeForm`, `TestForm`, `AppItem`, `AppsTable`, `AppCard`, `AppStack`, plus `FormDrawer` as pure pass-through — really 9). Any replacement's public "handle" must be a value that can cross a component boundary as an ordinary prop, the way `FormikProps<any>` does today.
2. **`values` + `errors` + `touched` reads, `handleChange`/manual `onChange`, `setFieldValue`** — used in all 8 real "form" files (AppForm, QuickConfigForm, ScopeForm, TestForm, AddImportDialog, and the 3 container producers indirectly through the same object). This triple (`values.x`, `errors.x && touched.x`, `setFieldValue`) is the single most-repeated pattern in the codebase.
3. **`resetForm()`** — used in 6 files (AddImportDialog, ScopeFormContainer, QuickConfigFormContainer, Kanban, ScopeForm, QuickConfigForm) — always as a full-form clear, never with arguments except one no-op `resetForm({})`.
4. **`submitForm()` (imperative, not always via native submit)** — used in 5 files (AppForm awaited, AddImportDialog, QuickConfigForm, ScopeForm, TestForm-as-handler). Several call sites also do their own pre-submit gating (duplicate-name checks) before calling it, so it must be safely callable outside of a `<form onSubmit>` context.
5. **`setValues(wholeObject)` bulk replace** — used in 5 files (AddImportDialog ×2, ScopeFormContainer ×2, AppItem, AppCard) — always "replace everything to load an existing record for editing," not partial merges.
6. **`validationSchema` (yup, string-only rules)** — used in 4 producer files. Only `.required`, `.min`, `.max`, `.matches`, `.test` (sync) are exercised — see §3.
7. **Manual `onChange` wrapper functions that call `formik.handleChange` then do extra work** (sanitize input, clear a local error, flip a "dirty" flag) — pattern repeated in QuickConfigForm, ScopeForm, AddImportDialog. A replacement's `handleChange`-equivalent must remain easy to wrap this way (i.e., not swallow the event or hide the setter).
8. **Nested dotted path via `setFieldValue`** — see §6, load-bearing only inside `QuickConfigForm`/`QuickConfigFormContainer`, but it is real and must be handled, not hand-waved.

**Used once (or in one file-pair) and trivially avoidable / already worked around by the app itself:**

- `validate` as a side-effect hook (Kanban only) — this is not real validation; a replacement doesn't need a "validate function" slot for this, just an onChange side-effect, which the app already does elsewhere without formik (see LoginPage).
- Direct `formik.values.x = someValue` mutation (AppForm, AddImportDialog, ScopeFormContainer, QuickConfigFormContainer, TabsAccess) — this is already an anti-pattern *against* Formik's own model (mutating a supposedly-immutable values object rather than calling `setFieldValue`). It happens to "work" today only because the mutated value is read again before the next React re-render (e.g., immediately followed by `submitForm()`). A replacement does not need to support this pattern; if anything, fixing it is in scope.
- `submitForm` used as a bare event handler without being called (`onClick={formik.submitForm}` in TestForm) vs. called imperatively elsewhere — both call shapes need to work, but this is one file.
- `resetForm({})` no-arg-shaped call (QuickConfigFormContainer) — same as plain `resetForm()`.

## 5. What Formik provides that nothing here uses — see §3 (kept together with the matrix above per file, this is the cross-cutting summary requested)

## 6. Nested paths / field arrays — the expensive question

**Yes, dotted paths are used, in exactly one place:** `components/database/QuickConfigForm.tsx` lines 386, 393, 400, 407:

```
formik.setFieldValue('additionalModes.odata', (e.target as any).checked)
formik.setFieldValue('additionalModes.dql', (e.target as any).checked)
```

(Lines 386/399 and 393/407 are literally duplicated pairs — two checkboxes in the source both write to `additionalModes.odata` and two both write to `additionalModes.dql`; that looks like a copy-paste bug in the current code, not an intentional 4-state field, but it does mean the nested-path feature is exercised twice over.)

The corresponding `initialValues` shape lives in the producer, `QuickConfigFormContainer.tsx` lines 86-89:
```
additionalModes: { odata: false, dql: false }
```
and is read back via `formik.values.additionalModes.odata` / `.dql` in `QuickConfigForm.tsx` lines 385, 392, 399, 406.

**No bracket/array index paths anywhere** (`a[0].b` style) — grepped for `values.` followed by `[` or `values[` across all 15 files, zero hits.
**No `<FieldArray>` anywhere.** `FieldDNDContainer` in `TabsAccess.tsx` (L979) is an unrelated custom drag-and-drop component, not Formik's `FieldArray`.

So: nested-path support is needed for exactly one shallow, one-level-deep object (`additionalModes.{odata,dql}`), and it would be equally valid — and far simpler — to model `additionalModes` as its own nested state slot (`values.additionalModes.odata`) resolved by the *consumer* rather than by the form primitive doing generic dot-path parsing. This is the single most expensive Formik feature to reimplement in general, but the actual usage here is trivial: one flat two-key sub-object, no arrays, no arbitrary depth. A generic `lodash.set`-style path resolver is almost certainly overkill for what's actually here.

## 7. Producer → consumer graph for formik instances

```
AddImportDialog.tsx          [useFormik] ── (no prop drilling; self-contained dialog)

ScopeFormContainer.tsx       [useFormik] ──formik prop──▶ ScopeForm.tsx (consumer)

QuickConfigFormContainer.tsx [useFormik] ──formik prop──▶ QuickConfigForm.tsx (consumer)

Kanban.tsx                   [useFormik] ──formik prop──▶ AppsTable.tsx (pure pass-through)
                                                              └──formik prop──▶ AppItem.tsx (consumer: setValues)
                                          ──formik prop──▶ FormDrawer.tsx (pure pass-through, formName='AppForm')
                                                              └──formik prop──▶ AppForm.tsx (consumer)

TabsAccess.tsx                [useFormik] ──formik prop──▶ FormDrawer.tsx (SAME component as above,
                                                              formName='TestForm' branch)
                                                              └──formik prop──▶ TestForm.tsx (consumer)

(unreachable / dead branch, not wired into Kanban or anywhere else)
AppStack.tsx (never imported/rendered by anything) ──formik prop──▶ AppCard.tsx (consumer: setValues)
```

Notable structural facts:
- `FormDrawer.tsx` is a **single shared component reused by two independent producers** (`Kanban`'s app-edit formik and `TabsAccess`'s test-formula formik), switched at runtime by a `formName` string prop, and both gate visibility off the *same* Redux flag (`state.drawer.applicationDrawer`). They are never open at the same time, but the drawer component itself has no idea which producer it's currently borrowed from — it's just handed whatever `formik` prop its caller passes this render. A replacement's "handle" needs to survive this kind of dynamic re-parenting cleanly.
- `AppsTable.tsx` and `AppStack.tsx` genuinely only touch the type, exactly as the issue predicted, confirmed by grep for `.values`/`.errors`/`.setFieldValue` etc. in both files (zero hits beyond the prop type itself).
- **`AppStack.tsx` (and therefore `kanban/AppCard.tsx`) is dead code.** Grepped the entire `src/` tree: `AppStack` is not imported anywhere except inside its own file. `Kanban.tsx` renders `AppsTable`/`AppItem` (the table view), never `AppStack`/`AppCard` (a kanban-card view that appears to have been superseded). Confirm before designing around it — there is a real chance 2 of the 15 files can simply be deleted rather than migrated.
- `TabsAccess.tsx`'s 9 formik references are **all** for one small modal sub-form (5 checkboxes + 2 text fields for testing access formulas). The page's actual primary form state — the mode editor with its scripts/required/validationRules/fields, the whole "unsaved changes" dirty-tracking system — is **not Formik at all**. It's hand-rolled with `useState`/`useRef`/`useEffect` doing JSON-snapshot comparisons (see `initialSnapshotRef`, `isFieldsDirty`, the dirty-tracking `useEffect`s at TabsAccess.tsx lines 195-220, 554-629). This is a second, independent, already-built "form-like state + dirty tracking" system living right next to the Formik one, in the same file, solving the same category of problem without Formik. It's worth looking at directly as a second worked example of "what dirty-tracking without Formik looks like in this codebase," alongside LoginPage's conversion.

## 8. LoginPage.tsx's converted shape (the one worked example) — concrete enough to copy

PR #776 (per the code's own comments) removed Formik entirely. The current shape:

- **State**: plain `useState` per field — `const [username, setUsername] = useState('')`, `const [password, setPassword] = useState('')` (LoginPage.tsx L290-291) — no form-object wrapper at all, just ordinary component state.
- **Errors**: one `errors` state of a small explicit type:
  ```ts
  type FieldErrors = { username?: string; password?: string };  // L67
  const [errors, setErrors] = useState<FieldErrors>({});          // L292
  ```
  Absence of a key means "field is fine" (no separate `touched` map at all).
- **Required-message table**, not schema validation:
  ```ts
  const REQUIRED = { username: 'Enter your username', password: 'Enter your password' };  // L69-72
  ```
- **Validation function**, called imperatively at submit/mode-switch time, not on every keystroke:
  ```ts
  const validate = (fields: Array<keyof FieldErrors>): boolean => {   // L309-317
    const values = { username, password };
    const found: FieldErrors = {};
    for (const field of fields) {
      if (!values[field]) found[field] = REQUIRED[field];
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  };
  ```
  Callers pass just the subset of fields relevant to the current auth mode (`validate(['username','password'])` for password login, `validate(['username'])` for passkey) — i.e. per-mode conditional required-ness, done by the call site choosing which keys to check, not by a schema's conditional rules.
- **Change handler factory**, replacing both `handleChange` and the old `validate: () => dispatch(setLoginError(false))` side-effect in one place:
  ```ts
  const handleFieldInput = (set: (value: string) => void) => (event: React.FormEvent) => {  // L376-380
    set((event.target as HTMLInputElement).value);
    setErrors({});
    dispatch(setLoginError(false));
  };
  ```
  Used as `onInput={handleFieldInput(setUsername)}` / `onInput={handleFieldInput(setPassword)}` on WebAwesome's own React-bound `<WaInput>` (not a Keep* `@lit/react` wrapper — see note below).
- **Submit**: a plain async function, no wrapper object at all:
  ```ts
  const logInWithPassword = async () => {
    dispatch(set401Error(false));
    await dispatch(login({ username, password }, () => { navigate('/'); ... }) as any);
  };
  ```
  called from `handleClickLogIn` after `validate([...])` passes.
- **Field display**: `<WaInput value={username} onInput={...} aria-invalid={errors.username ? 'true' : undefined} hint={errors.username} />` — controlled value comes straight from React state, not from any form object. Note this is `@awesome.me/webawesome/dist/react/input` (WebAwesome's own official React binding), explicitly **not** one of this repo's custom `KeepInputText`/`KeepInputPassword` `@lit/react` wrappers — the file's own comment (L30-40) explains those two were deleted as pointless wrappers around `wa-input` in the same change. So LoginPage does pass a live state value as a controlled `value` into a web-component React wrapper, but it's the vendor's own binding, not the app's `createComponent`-based `KeepElements`, so the "no dirty-check" gotcha attributed to the custom wrappers may or may not apply — that would need checking against WebAwesome's own binding implementation, out of scope here.

In short: no schema library, no generic form object, no per-field touched map — just `useState` + a hand-written `validate()` that the caller invokes with exactly the fields it cares about, plus one shared change-handler factory. This is a plausible template for the other 8 real "form" files, though those are all markedly more complex (yup schemas with `.test`, bulk `setValues` for edit-mode, nested paths) so the replacement will need more than LoginPage's shape alone provides.

## 9. Controlled-value-into-Keep*-wrapper check (the known `@lit/react` clobber trap)

Grepped all 15 files for `value={formik...}` and `checked={formik...}`:

- **No file passes a formik value as `value=` into any `Keep*` component.** Every `value={formik.values.x}` binding is on a plain MUI `<TextField>` (or, once, MUI's `<Autocomplete>` in AddImportDialog L395) — i.e. real React controlled components, not `@lit/react` wrappers. The known trap (`@lit/react` re-applying `value` every render with no dirty check, clobbering in-progress typing) **does not currently exist anywhere in these 15 files** for text input.
- It **does** exist in the structurally similar form for booleans: `checked={formik.values.x}` is bound on `KeepCheckbox` (a `@lit/react`/`createComponent` wrapper, confirmed in `components/keep-elements/KeepElements.tsx` L168 and `keep-checkbox.ts`) in 4 files: `AppForm.tsx` (L267,305), `QuickConfigForm.tsx` (L373,385,392,399,406 — 5 checkboxes, 2 of them literal duplicates of the other 2, see §6), `ScopeForm.tsx` (L422), `TestForm.tsx` (L114,123,132,141,150 — 5 checkboxes). Booleans don't have the same "clobbers what the user is typing" failure mode as text (a checkbox can't be mid-keystroke), and `keep-checkbox.ts`'s own Lit `@property accessor checked` does an equality check before propagating to its inner `wa-checkbox`, so this is lower-risk than the text case — but it's the same class of "React wrapper re-sets a Lit property every render" mechanism, worth keeping in mind if the replacement's primitive intends to hand a live value straight to `KeepCheckbox.checked` the way Formik's `values.x` does today.
- One near-miss: `AddImportDialog.tsx` L336 passes `initialOption={formik.values.nsfPath}` into `KeepAutocomplete`. `initialOption` is a genuine reactive `@property accessor` on the underlying Lit element (`keep-autocomplete.ts` L183), read as a fallback in `render()` when `selectedOption` is empty. Because it's a string and Lit's default `hasChanged` does `!==`, re-setting the same string every render is a no-op — but the *name* `initialOption` suggests "seed once" semantics that the `@lit/react` reapply-every-render behavior does not actually honor. Not currently a bug (the value doesn't change after the dialog opens), but a landmine if a future change makes `nsfPath` change reactively while the user is interacting with the autocomplete.

## 10. Other surprises vs. the issue's framing

- The issue's table treats all 15 files as equally "using Formik," but **7 of them (`FormDrawer`, `AppsTable`, `AppItem`, `AppCard`, `AppStack`, and effectively `LoginPage`) never call a single Formik API** — they only carry the `FormikProps<any>` *type* through props, or (LoginPage) only mention it in comments. Only 8 files have executable Formik calls: `AppForm`, `QuickConfigForm`, `ScopeForm`, `TestForm`, `AddImportDialog`, `TabsAccess`, `ScopeFormContainer`, `QuickConfigFormContainer`, `Kanban` (that's 9, plus the four pure-type files, plus 2 dead files, plus LoginPage = 15).
- `AppStack.tsx` + `kanban/AppCard.tsx` are dead code (§7) — worth confirming with the team before spending migration effort on them; deleting is a legitimate option issue #807 doesn't consider.
- `TabsAccess.tsx`'s "9 formik refs" are all for a minor sub-form; the page's real state-management complexity (dirty-tracking, snapshot diffing) already lives entirely outside Formik, in hand-rolled React state. That existing code is a second, independently useful example of "how this codebase already tracks form dirtiness without Formik" beyond LoginPage.
- Several files mutate `formik.values.x = y` directly instead of calling `setFieldValue` (`AppForm`, `AddImportDialog`, `ScopeFormContainer`, `QuickConfigFormContainer`, `TabsAccess`) — an existing anti-pattern that happens to work today only by accident of render timing. A replacement's design doesn't need to accommodate direct mutation; if anything, this is a bug to fix during the migration, not a requirement to preserve.
- `formik.touched` is read in most forms for error display, but `handleBlur` is never wired anywhere — so "touched" today functionally means "a submit was attempted" rather than "the user left this field." Any replacement that implements real per-field blur tracking would *change existing UX behavior* (errors would start appearing earlier, on blur, rather than only after a submit attempt) unless that's deliberately intended.
- `validateOnChange: true, validateOnBlur: true` in `AddImportDialog` (L111-112) are Formik's own defaults — setting them is a no-op, mildly misleading as "configuration."
- Kanban's `validate: () => { dispatch(clearAppError()) }` is not validation at all — it's (ab)using Formik's validate-function slot as a change-side-effect hook, exactly the pattern LoginPage's own comments (L371-374) call out as having been removed for the same reason on that page.
