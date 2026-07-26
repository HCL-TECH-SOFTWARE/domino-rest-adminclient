# Spec — Convert `.js` custom elements → LIT TypeScript (decorators) + vitest tests

_Date: 2026-07-26 · Branch base: `new_code` · Related: `docs/reports/01-vitest-and-coverage.md` (Phase 3), `docs/reports/02-react-to-lit-webawesome.md` (§6)_

## Goal

Convert every Web Component defined in a `.js` file to a TypeScript LIT component using
`lit` decorators, each covered by comprehensive vitest unit tests. Behaviour-preserving
(1:1) with a small set of internal, API-safe cleanups. Delivered as batched PRs into
`new_code`.

## Scope

- **25** already-LIT `.js` files in `src/components/lit-elements/` → convert to `.ts` with
  decorators.
- **1** vanilla `src/components/webcomponents/copyable-text.js` → **replaced** by WebAwesome
  `wa-copy-button` (delete the element; migrate its one consumer `AppItem.tsx`).

Out of scope (explicitly): button consolidation, event-contract-wide rewrites, design-token
extraction (reports 02 §6.2/§6.5 / 03) — tracked as follow-ups.

## Locked decisions

1. **1:1 + internal cleanups.** Preserve every public API: tag names (incl. `lit-source.js`
   → tag `lit-source-tree`, `lit-source-header.js` → tag `lit-source`), default exports,
   properties, events (`change`, `data-changed`, `alert-closed`), slots — so `LitElements.tsx`
   (`@lit/react` wrappers) and all 57 consumers stay untouched. Internal cleanups allowed:
   shared `KeepLitElement` base, drop redundant per-component `webawesome.css` imports (it is
   loaded globally in `index.tsx`), typed element boundary.
2. **`copyable-text` → `wa-copy-button`.**
3. **Shadow-DOM unit tests in jsdom.** Assert registration, property→render reflection in the
   component's own shadow root, emitted events, callback-prop invocation, slots, edge cases.
   Do **not** assert on `wa-*` internals.

## Foundation (established in PR #1)

- **SWC decorator transpilation** (the critical enabler — verified by spike): both
  `vitest.config.ts` and `vite.config.mts` pass
  `react({ tsDecorators: true, useAtYourOwnRisk_mutateSwcOptions(o => o.jsc.transform.useDefineForClassFields = false) })`.
  `useDefineForClassFields:false` is required so decorated class fields compile to constructor
  assignments and don't shadow Lit's reactive accessors (lit.dev/msg/class-field-shadowing).
- `tsconfig.json`: add explicit `"useDefineForClassFields": false` (no-op at ES2020 target, but
  documents the requirement).
- `src/components/lit-elements/keep-lit-element.ts`: `KeepLitElement extends LitElement` — a
  thin shared base with a typed `emit()` helper (composed/bubbling `CustomEvent`, standardises
  the event contract) and a single place for future theme/token wiring. Every converted
  component extends it.
- `src/test-utils/lit.ts`: `mountLit(tag, props)` helper (create → assign props → append →
  `await updateComplete`) + `cleanupLit()`.
- `src/setupTests.ts`: add `showPopover`/`hidePopover`/`togglePopover` no-op polyfills (jsdom
  lacks the top-layer API used by `lit-alert`).
- Typed boundary: each component adds `declare global { interface HTMLElementTagNameMap { … } }`;
  clean up the stale `src/custom-elements.d.ts` (remove `app-status`, `drawer-container`, and —
  in PR #2 — `copyable-text`).
- Coverage: converted `.ts` enter the coverage `include`; add a per-dir gate for
  `src/components/lit-elements/**` and keep the global ratchet monotonic.

## Conversion recipe (per component — characterization-first)

1. Write comprehensive `<name>.test.ts`. Run against the current `.js` (extensionless import) →
   **green baseline** (proves the tests capture real behaviour).
2. Rename `.js`→`.ts`; apply `@customElement/@property/@state/@query` + types; extend
   `KeepLitElement`; fix intra-component `.js` import specifiers → tests **stay green**.
3. Refactor (drop redundant `webawesome.css` import, tidy) → **stay green**. Delete old `.js`.

## Test recipe (jsdom shadow-DOM)

Per component: registration; each `@property`→render reflection in the component's own shadow
root; emitted events via `addEventListener`; callback-prop invocation; slot projection; edge
cases. Assert on our template + the host `wa-*` element's attributes/wiring, never on `wa-*`
shadow internals.

## Batches → PRs into `new_code` (leaves → composites)

1. **Foundation + Buttons** — `lit-button`, `lit-button-yes/no/neutral` _(pattern-setter)_
2. **copyable-text → wa-copy-button**
3. **Inputs** — `lit-input-text`, `lit-input-password`, `lit-checkbox`, `lit-switch`, `lit-dropdown`
4. **Dialogs** — `lit-dialog-header/content/actions`, `lit-api-error-dialog`
5. **Cards/status** — `lit-app-status`, `lit-schema-status`, `lit-default-card`, `lit-nsf-card`
6. **Overlays** — `lit-alert`, `lit-drawer`, `lit-tooltip`
7. **Forms** — `lit-autocomplete`, `lit-textform`, `lit-textform-array`
8. **Source** — `lit-source` (tree), `lit-source-header`

## Per-PR gate

`npx tsc -b` (typecheck) · `npx vitest run` (green + coverage thresholds) · `npx vite build`
(prod build sanity) · `npm run lint` on changed files. Branch off latest `origin/new_code`
each batch (consumer branches auto-delete on merge).

## Risks & mitigations

- **Decorator transpilation** — resolved via SWC config above (spiked and verified).
- **Regressions across 57 consumers** — exact API preservation + `tsc`/`vite build` each PR +
  characterization tests lock behaviour.
- **jsdom gaps** (popover, `wa-*` upgrade) — polyfills in setup; assert own shadow DOM only.
- **Coverage ratchet** — converted files raise coverage; keep thresholds monotonic.
