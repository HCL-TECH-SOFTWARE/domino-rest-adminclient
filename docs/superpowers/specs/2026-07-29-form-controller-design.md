# `FormController` — design

Issue: #807. Blocks: #806 tier D, #717, #719 P2/P3.
Model: `src/store/StoreController.ts` (#798, 87 lines).

Date: 2026-07-29. Measured against `new_code` @ `550d509`.

## The shape, decided up front

**Small. Roughly the size of `StoreController`.** The precedent is `LoginPage.tsx`: it
dropped Formik (#776) for plain state, a small error map and one `validate()` function —
about 30 lines — and that was enough for the only form in the tree that has actually been
converted.

An earlier draft of this spec had the controller sweep the host's `renderRoot` for
form-associated elements, suppress `hasInteracted` to keep errors hidden until submit, and
push schema failures onto elements via `setCustomValidity`. All of that is cut. It is
machinery the worked example did not need, and it rested on an unverified assumption about
WebAwesome's internals that would have needed a spike to justify.

### What Formik actually got wrong here

The issue frames it as the parallel error map. That is not it. `LoginPage`'s comment names
the real defect:

> "The values never came from Formik — the inputs are custom elements it cannot read — so
> `onSubmit` received whatever had just been assigned to them."

**Formik could not read the values.** A controller that owns values explicitly, mutated only
through `setValue`, fixes that completely. The error map was never the problem, and
`LoginPage` keeps one today without trouble.

## What the survey changed

Surveying the 15 files moved four things; two invalidate the issue's own design section.

### 1. The elements the issue says to build on no longer exist

`keep-input-text.ts` and `keep-input-password.ts` were **deleted**; only `keep-input-date.ts`
remains, and every other reference in the tree is a comment or dead code. `LoginPage` retired
them because their shadow root put "the value and validity of the real control one boundary
further down". It renders `wa-input` directly now.

So the issue's instruction — "read validity from the `keep-*` elements" — has no subject.
Components read `controller.errors.x` instead, exactly as `LoginPage` reads its own
`errors.username`, and set `aria-invalid` / `hint` themselves. The `:state(user-invalid)`
styling from #744/#783 is untouched: it keeps working for native constraints, independently.

### 2. `touched` does not mean touched

Eight files gate display on `errors.x && touched.x`, but **`handleBlur` is wired nowhere**.
Today `touched` means *"a submit was attempted"*. Preserving that is now free: the controller
simply does not validate until `submit()` is called. There is no `hasInteracted` to fight,
because the controller never touches element validity.

### 3. Nested paths are almost a non-issue

One file, one level, two keys: `QuickConfigForm.tsx`'s `setValue('additionalModes.odata', …)`
and `…'.dql'`. **No field arrays anywhere, no bracket paths.** The most expensive thing a
Formik replacement usually has to build is not needed.

### 4. Two of the fifteen files are dead

`applications/AppStack.tsx` (65 LOC) and `applications/kanban/AppCard.tsx` (314 LOC) are
imported only by each other. ~380 LOC of tier D to delete rather than convert — #806's call,
recorded here so it is not converted by accident.

## What must be supported

| Capability | Files | Notes |
|---|--:|---|
| Instance passed down as a plain prop | 9 | producer→consumer |
| `values.x` read, `setValue` | 8 | |
| Errors gated on submit-attempted | 8 | see §2 |
| `reset()` | 6 | always a full clear |
| `submit()` called imperatively | 5 | |
| `setValues(whole)` bulk replace | 5 | edit-mode loading |
| yup schema | 4 | string-only: `.required .min .max .matches .test` |
| one-level dot paths | 1 | two keys, one file |

### Not built

`<Field>`, `<FastField>`, `<FieldArray>`, `withFormik`, `getFieldProps`, `setFieldError`,
`status`, `submitCount`, `validateOnBlur`/`validateOnChange`, `enableReinitialize`,
field-level validate, async validation, bracket paths, arrays. Nothing uses them.

## API

```ts
export interface FormControllerOptions<T extends object> {
  initialValues: T;
  /** yup object schema. Omit for a form with no rules beyond required-ness. */
  schema?: ObjectSchema<any>;
  onSubmit: (values: T) => void | Promise<void>;
}

export class FormController<T extends object> implements ReactiveController {
  constructor(host: ReactiveControllerHost, options: FormControllerOptions<T>);

  /** Readonly — the only mutators are setValue/setValues/reset. */
  readonly values: Readonly<T>;
  /** Field messages. Empty until submit() has been called at least once. */
  readonly errors: Readonly<Partial<Record<string, string>>>;
  /** True once submit() has run. Components gate error display on this. */
  readonly submitted: boolean;
  /** True while onSubmit's promise is in flight. */
  readonly submitting: boolean;

  setValue(path: string, value: unknown): void;  // one level of dot-path
  setValues(next: Partial<T>): void;
  reset(): void;
  submit(): Promise<void>;
}
```

Every mutator calls `host.requestUpdate()`. That is the whole of the reactivity, same as
`StoreController`.

### Values are readonly

Five files (`AppForm`, `AddImportDialog`, `ScopeFormContainer`, `QuickConfigFormContainer`,
`TabsAccess`) currently assign `formik.values.x = y` directly. That never notified anything —
it appeared to work only when an unrelated render happened to follow. `Readonly<T>` turns a
timing-dependent bug into a compile error, and those five sites get fixed during conversion.

### Validation timing

`submit()` validates, sets `errors`, and calls `onSubmit` only if `errors` is empty. Before
the first `submit()`, `errors` is empty and nothing displays — today's behaviour exactly.
After a failed submit, `setValue` clears that field's error so it disappears as the user
fixes it, matching `LoginPage`.

## Testing

`test/store/FormController.test.ts`, modelled on `test/store/StoreController.test.ts` (205
lines): a real `LitElement` host, real update cycles, no mocks.

- values start at `initialValues`; `setValue` updates one key and requests a host update
- one-level dot paths set the nested key, not a literal `"a.b"` key
- `setValues` bulk-replaces; `reset()` restores values **and** clears errors/submitted/submitting
- **`errors` is empty before the first `submit()`**, even with an invalid value present
- `submit()` populates `errors` from the yup schema and does **not** call `onSubmit`
- `submit()` calls `onSubmit` with the values when valid
- `setValue` clears that field's error after a failed submit, and leaves other fields' alone
- `submitting` is true while `onSubmit` is pending, false after it resolves **and** after it rejects
- a rejected `onSubmit` does not leave the form stuck submitting
- `values` is readonly — rejected by `tsc`
- no schema: `submit()` always calls `onSubmit`

## Acceptance

```bash
npm run lint  &&  npm run typecheck  &&  npm run build  &&  npm run test
```

Plus the issue's gate: **green before a single tier-D file is touched.** No file conversion
in this PR.

## Explicitly not in scope

Converting any of the 15 files (#806 tier D, per-file). Field arrays. Async validation.
`enableReinitialize`. Deleting the two dead files (report to #806). Removing `formik` from
`package.json` — it stays until the last consumer is converted.
