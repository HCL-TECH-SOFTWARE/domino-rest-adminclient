# Proving `FormController` before tier D

**Issues:** #807 (the primitive) · #717 (Formik removal) · #806 tier D
**Measured on:** `new_code` @ `8902421`

## Why this is not a conversion PR

The plan said to prove `FormController` on the two smallest Formik files,
`applications/FormDrawer.tsx` (60) and `AppStack.tsx` (65). **Both are the wrong files, and the
reason generalises.**

Neither uses Formik. They take `formik: FormikProps<any>` and hand it to a child:

```tsx
const FormDrawer = ({ formName, formik }) => …  <AppForm formik={formik} />
const AppStack   = ({ list, formik, … }) => …   <AppCard formik={formik} … />
```

Converting one would prove nothing about the primitive, and it would mean passing an opaque React
Formik object into a Lit element as a property — keeping the coupling alive through the *type*
after removing it from the imports. Picking them was the same mistake tier A recorded and this
repeats it one level out: **classify a file by what it does with an import, not by having it.**

### Owners and couriers

Of the 15 files matching `formik`, **five own a form** and nine forward one.

| Owns a form (`useFormik` / `<Formik>`) | lines | shape |
|---|--:|---|
| `database/QuickConfigFormContainer` | 160 | container + leaf (`QuickConfigForm`, 429) |
| `database/ScopeFormContainer` | 219 | container + leaf (`ScopeForm`, 459) |
| `applications/kanban/Kanban` | 223 | container + leaves (`AppCard`, `AppStack`) |
| `database/AddImportDialog` | 427 | **self-contained** |
| `access/TabsAccess` | 1,007 | container + leaves (`TestForm`, `Fields`, …) |

Couriers: `ScopeForm` · `QuickConfigForm` · `TestForm` · `AppItem` · `AppForm` · `AppsTable` ·
`AppStack` · `FormDrawer` · `kanban/AppCard`.

**A container and its leaf must convert in the same PR.** The leaf's whole API is `FormikProps`;
there is no intermediate state where one is Lit and the other is not.

## What this PR does instead

Characterisation tests: `test/store/FormController.form-shapes.test.ts`, 12 of them, measuring the
primitive against what the five real forms demand. This is the order #771 used — PR #846
characterised the tables before migrating them — and it is cheap next to rewriting a 400-line
component around an unproven class.

### Confirmed capabilities

- one level of dot-path write (`dqlFormula.formula`), and `setValue` **replaces** the nested
  object rather than mutating the one shared with `initialValues`
- partial `setValues` merge — what the `.json` import path in `AddImportDialog` needs
- a yup schema whose `.test()` closes over data **outside** the form (the "unique schema name"
  rule reads the databases slice *and* another field), re-evaluated per submit
- errors keyed by field, all failures at once, `onSubmit` skipped when any fail
- a field's error clears as soon as that field is edited
- `reset()` clears values, errors and `submitted` together
- every mutation asks the host to re-render

### Gaps, confirmed by test rather than suspected

| Gap | Consequence for the conversion |
|---|---|
| **no `touched`** | Formik's `!!errors.x && touched.x` collapses to `errors.x`, but errors now appear only **after the first submit** where Formik showed them on blur. That is a visible behaviour change in every converted form and needs a decision, not a silent adoption. |
| **no `handleChange`** | each field wires its own `@input` → `setValue('name', …)`. More lines, but the `name`-string indirection goes. |
| **`submit()` is not guarded against re-entry** | two concurrent `submit()` calls both reach `onSubmit` — measured, peak concurrency 2. **All five** owners dispatch a mutating thunk from `onSubmit`, so a double-clicked save is two writes; for `addSchema` and `addApplication` that is two creates. Filed as #887. |

The third is the only one that looks like a defect rather than a design choice, and is filed as **#887** with the one-line fix and the recommendation to invert the characterisation test in the same commit.

## Recommended order

1. **Decide the `touched` question** — either accept submit-time errors as the new behaviour
   across all five forms, or add blur-time validation to the primitive. It changes every
   conversion, so it is cheaper to settle than to revisit.
2. **Guard `submit()`** against re-entry — #887. One line, and no existing caller can break because there are none.
3. **Convert `QuickConfigFormContainer` + `QuickConfigForm`** (589 lines together) as the first
   real user. It is the smallest container/leaf pair, and `ScopeFormContainer`/`ScopeForm` (678)
   repeats its shape almost exactly — so whatever is learned there applies immediately.
4. `AddImportDialog` after that, **not** before, despite being self-contained. Its 427 lines carry
   more than a form:
   - `IconDropdown` (78 lines, MUI `Menu`) is rendered inside it, so it converts too or moves out
   - `nsfPath` is read at save time by reaching through `keep-autocomplete`'s shadow root
     (`ref.current.shadowRoot.querySelector('input').value`) — the anti-pattern #743 named. The
     element **emits `change`**, so the fix exists.
   - `schemaName` lives in React state *and* in `formik.values`, kept in sync by
     `formik.values.schemaName = …` — one of the direct mutations `FormController.values`
     rejects at compile time, which is the primitive doing its job.
   - three MUI `TextField`s, one MUI `Autocomplete` whose value is hardcoded `"Domino"` over a
     one-item option list, and `<text>` elements (an SVG tag in an HTML document)
5. `Kanban`, then `TabsAccess` last.

## Gate

Unchanged: per file, `grep -n "from 'react'\|react-redux\|formik\|@mui/"` empty, then `npm run
lint`, `build`, `test`, `bundle:budget`. Coverage floors moved with #880 —
`keep-elements` is 85/85/84/68 now.
