# `FormController` — design

Issue: #807. Blocks: #806 tier D (15 files, ~5,440 LOC), #717, #719 P2/P3.
Model: `src/store/StoreController.ts` (#798, 87 lines).

Date: 2026-07-29. Measured against `new_code` @ `550d509`.

## What the survey changed

The issue was written from greps. Surveying the 15 files moved four things, and two of
them invalidate the issue's own design section.

### 1. The elements the issue tells us to build on no longer exist

> "#775 gave `keep-input-text`/`-password` the public `value` + validity API that made it
> possible … the controller should read validity from the elements"

`keep-input-text.ts` and `keep-input-password.ts` were **deleted**. Only `keep-input-date.ts`
remains in `keep-elements/`; every other reference in the tree is a comment or dead code.

`LoginPage.tsx` retired them on purpose, and its comment says why: their shadow root put
"the value and validity of the real control one boundary further down", so the page had been
reaching through `?.shadowRoot.querySelector('wa-input')`. It now renders `wa-input` directly.

**This makes the issue's instruction easier, not harder.** `wa-input` extends
`WebAwesomeFormAssociatedElement`, which exposes the whole standard surface with no wrapper
in the way:

| Member | Use here |
|---|---|
| `validity: ValidityState` | read constraint state |
| `checkValidity()` / `reportValidity()` | test, and test-and-display |
| `setCustomValidity(message)` | push a schema error onto the field |
| `customError: string \| null` | same, as a property |
| `hasInteracted: boolean` | **writable** — gates `:state(user-invalid)` |
| `name`, `value`, `valueHasChanged` | identity and content |

### 2. `touched` does not mean touched

Eight files gate error display on `errors.x && touched.x`. **`handleBlur` is wired nowhere.**
So today `touched` means *"a submit was attempted"*, and errors never appear on blur.

Implementing honest blur-tracking would make errors appear earlier on every converted form —
a UX change wearing a refactor's clothes. Decided: **preserve today's behaviour.**

### 3. Nested paths are almost a non-issue

One file, one level, two keys: `QuickConfigForm.tsx` calls
`setFieldValue('additionalModes.odata', …)` and `…'.dql'`. **No field arrays anywhere, no
`<FieldArray>`, no bracket paths.** The most expensive thing a Formik replacement normally
has to build is not needed. One level of dot-path is enough, and it is ~10 lines.

### 4. Two of the fifteen files are dead

`applications/AppStack.tsx` (65 LOC) and `applications/kanban/AppCard.tsx` (314 LOC) are
imported only by each other — unreachable from the app. `LoginPage.tsx`'s five Formik hits
are 100 % comments. **Roughly 380 LOC of tier D should be deleted rather than converted.**
That is #806's call, not this issue's; recorded here so it is not silently converted.

## What must be supported

Ordered by how many of the 15 files need it. Everything below is load-bearing.

| Capability | Files | Notes |
|---|--:|---|
| A form handle passed down as a plain prop | 9 | producer→consumer; the controller instance must be passable |
| `values.x` read, `setValue`, manual `onChange` | 8 | |
| Error display gated on submit-attempted | 8 | see §2 |
| `reset()` | 6 | always a full clear — no partial-reset caller |
| `submit()` called imperatively | 5 | not only via a native submit event |
| `setValues(whole)` bulk replace | 5 | edit-mode loading |
| yup schema | 4 | string-only: `.required .min .max .matches .test` |
| one-level dot paths | 1 | two keys, one file |

### What Formik provides that nothing here uses

`<Field>`, `<FastField>`, `<FieldArray>`, `withFormik`, `getFieldProps`, `setFieldError`,
`setStatus`/`status`, `submitCount`, `validateOnBlur`/`validateOnChange` config,
`enableReinitialize`, field-level `validate`, async validation, bracket paths, arrays.

**None of it gets built.** That is the point of surveying first.

## Architecture

A Lit reactive controller, same shape as `StoreController`: constructed with the host,
registered via `host.addController(this)`, lifecycle in `hostConnected`/`hostDisconnected`.

### Division of responsibility

**The element owns display. The controller owns values and rules.**

```
                 rules                       display
  yup schema ──▶ FormController ──▶ setCustomValidity ──▶ wa-input ──▶ :state(user-invalid)
                      │                                       │           aria-invalid
                      │ values (readonly)                     │
                      └───────────── setValue ◀───────────────┘
```

This is the hybrid the issue asks for, made possible by §1. Native constraints (`required`,
`minlength`, `pattern`) stay on the element and are read back through `checkValidity()`.
Rules no constraint can express — yup's `.test`, cross-field checks — are pushed **onto the
element** with `setCustomValidity`, so there is exactly one place a component reads an error
from, and the existing `:state(user-invalid)` / `aria-invalid` styling from #744/#783 keeps
working untouched.

The controller therefore **never holds an error map**. That was the explicit ask.

### How today's submit-gated errors are preserved — and what it costs

Verified in the WebAwesome source (`chunks/chunk.KBXNFZQL.js`):

```js
this.customStates.set('user-invalid', !isValid && hasInteracted);   // :209
```

so `hasInteracted` is the gate, and it is a writable property. But:

```js
this.assumeInteractionOn = ['input'];                                // :43
// …
if (emittedEvents.length === this.assumeInteractionOn?.length) {
  this.hasInteracted = true;                                         // :59-61
}
```

**`hasInteracted` flips as soon as the user types — not on blur.** `reportValidity()` also
sets it (`:181`), and `formResetCallback()` clears it (`:228`).

So out of the box the divergence from today is narrow but real:

| Case | Today | `wa-input` untouched |
|---|---|---|
| Required field never typed in, blurred | no error | no error ✅ |
| Field typed into, now invalid | no error until submit | **error live while typing** ❌ |

Preserving today's behaviour therefore is *not* free. The mechanism: while `submitted` is
false, the controller resets `hasInteracted = false` on every swept field. It rides the
existing `hostUpdated` sweep rather than adding listeners — typing calls `setValue`, which
requests a host update, which re-sweeps.

**This is the design's one unproven assumption, so it is spiked before anything is built**
(Task 1 of the plan). Two things need observing rather than reasoning about: whether
assigning `hasInteracted = false` actually recomputes the custom states, and whether the
reset races the element's own update. If the spike says no, the fallback is to leave native
constraint attributes off the elements and express every rule in the schema, applying it
only at submit — behaviour identical, native validation unused.

Switching to blur-revealed errors later stays a one-line change: stop suppressing.

### Values are readonly

`values` is typed `Readonly<T>` and returned frozen in dev. The only mutators are
`setValue()` and `setValues()`.

Five files (`AppForm`, `AddImportDialog`, `ScopeFormContainer`, `QuickConfigFormContainer`,
`TabsAccess`) currently assign `formik.values.x = y` directly. That never notified anything;
it appeared to work only when an unrelated render happened to follow. Making `values`
readonly converts a timing-dependent bug into a compile error, and those five sites get
fixed as part of their conversion.

## API

```ts
export interface FormControllerOptions<T extends object> {
  initialValues: T;
  /** yup object schema. Omit for a form whose only rules are native constraints. */
  schema?: ObjectSchema<Partial<T>>;
  onSubmit: (values: T) => void | Promise<void>;
}

export class FormController<T extends object> implements ReactiveController {
  constructor(host: ReactiveControllerHost & { renderRoot: ... }, options: FormControllerOptions<T>);

  readonly values: Readonly<T>;
  /** True once submit() has been called at least once. Gates error display. */
  readonly submitted: boolean;
  /** True while onSubmit's promise is in flight. */
  readonly submitting: boolean;

  setValue(path: string, value: unknown): void;   // one level of dot-path
  setValues(next: Partial<T>): void;
  reset(): void;                                   // values, submitted, submitting, validity
  submit(): Promise<void>;

  /** Validate without submitting. Returns whether the form is valid. */
  validate(): Promise<boolean>;
}
```

### Field discovery

The controller finds form-associated elements by walking `host.renderRoot` for `[name]`,
refreshed on each `hostUpdated`. No registration call, no decorator — a component adds a
field by rendering it with a `name`, which is what it already does.

Elements not present (a field behind a collapsed panel) are simply absent from the sweep;
their schema errors surface on the next submit after they render.

## Testing

`test/store/FormController.test.ts`, modelled on `test/store/StoreController.test.ts`
(205 lines): real `LitElement` hosts, real `wa-input` children, lifecycle coverage — not mocks.

Must cover, at minimum:

- values start at `initialValues`; `setValue` updates one key and requests an update
- one-level dot paths (`additionalModes.odata`) set the nested key, not a literal `"a.b"` key
- `setValues` bulk-replaces; `reset()` restores initial values **and** clears validity and `submitted`
- **nothing displays before the first submit** — `hasInteracted` stays false even when a
  required field is empty and has been blurred
- after `submit()`, a failing field is `user-invalid` and carries the schema message
- a yup `.test` failure reaches the element via `setCustomValidity`, readable as `validationMessage`
- fixing a field after a failed submit clears its custom error
- `onSubmit` is not called when validation fails, and is called with the values when it passes
- `submitting` is true while `onSubmit`'s promise is pending and false after it rejects
- `values` is readonly: direct assignment throws in strict mode / is rejected by `tsc`
- a controller constructed but never connected holds no listeners

Note `test/setupTests.ts` installs `attachInternals` unconditionally because jsdom 29's
`ElementInternals` lacks `setValidity`; that stub is deliberately faithful, so validity is
genuinely assertable here.

## Acceptance

```bash
npm run lint        # clean
npm run typecheck   # clean
npm run build       # clean
npm run test        # FormController suite green
```

Plus the issue's own gate: **`FormController` is green before a single tier-D file is
touched.** No file conversion happens in this PR.

`src/components/keep-elements/**` and `src/store/**` coverage floors must still pass.

## Explicitly not in scope

Converting any of the 15 files — that is #806 tier D, per-file, with its own gate. Field
arrays. Async validation. `enableReinitialize`. Deleting the two dead files (report to #806).
Removing `formik` from `package.json` — it stays until the last consumer is converted.
