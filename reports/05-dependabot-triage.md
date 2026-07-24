# 05 — Dependabot Vulnerability Triage

Generated 2026-07-24. Triage of the **9 open Dependabot alerts** on the default
branch (`main`) of `HCL-TECH-SOFTWARE/domino-rest-adminclient`, reported at push
time as **2 critical, 4 high, 1 moderate, 2 low**.

> **Bottom line:** despite two "critical" labels, **none of these are remotely
> exploitable against the running application.** 8 of 9 live entirely in
> **build/test tooling** and never reach the browser bundle; the only
> browser-runtime one is a **low**-severity DOMPurify issue via Monaco. The two
> criticals are a build-time DOM sandbox (Linaria style extraction) and are fully
> removed by deleting two **unused legacy dependencies**. This is dependency
> hygiene, not an incident.

Method: alerts pulled via `gh api .../dependabot/alerts`; every package traced to
its resolved version, dev/prod flag, and dependency chain in `package-lock.json`
(`node_modules` was not installed in the worktree, so all provenance is from the
committed lockfile).

---

## Triage table

| # | GH sev | Package | Resolved | Patched | Comes from | Ships to browser? | **Real exposure** |
|---|--------|---------|----------|---------|------------|:---:|--------------------|
| 110 | 🔴 critical | happy-dom | **10.8.0** | 20.0.0 | `@linaria/babel-preset` (build) | ❌ | Build-time DOM sandbox only |
| 109 | 🔴 critical | happy-dom | **10.8.0** | 15.10.2 | `@linaria/babel-preset` (build) | ❌ | Build-time DOM sandbox only |
| 111 | 🟠 high | happy-dom | **10.8.0** | 20.8.9 | `@linaria/babel-preset` (build) | ❌ | Build-time DOM sandbox only |
| 112 | 🟠 high | brace-expansion | 2.1.1 | 2.1.2 | `minimatch` ← Linaria/wyw (build) | ❌ | Build-time ReDoS |
| 108 | 🟠 high | brace-expansion | 5.0.5 | 5.0.7 | top-level `minimatch` (dev) | ❌ | Build/test ReDoS |
| 113 | 🟠 high | js-yaml | 3.14.2 | 3.15.0 | `@istanbuljs/load-nyc-config` (jest coverage) | ❌ | Test-time ReDoS |
| 107 | 🟡 moderate | js-yaml | 3.14.2 | 3.15.0 | `@istanbuljs/load-nyc-config` (jest coverage) | ❌ | Test-time ReDoS |
| 114 | ⚪ low | dompurify | 3.4.11 | 3.4.12 | **`monaco-editor`** (runtime) | ✅ | **Browser**, but low sev |
| 105 | ⚪ low | @babel/core | 7.29.0 | 7.29.6 | Babel toolchain (build) | ❌ | Build-time file read |

**Why "critical" ≠ urgent here:** `happy-dom` is a server-side DOM emulator. Its
RCE / VM-escape CVEs require feeding attacker-controlled HTML/JS into its sandbox.
The only consumer here is Linaria's build-time style evaluator, whose input is
*your own source code*. Exploiting it means already having malicious code in the
build — a supply-chain concern, not a runtime attack surface. It is not in the
shipped bundle.

---

## Key findings

1. **The two criticals + one high (alerts 109/110/111) all point at a single
   vulnerable copy: `happy-dom@10.8.0`, pulled only by `@linaria/babel-preset@5`.**
   The other `happy-dom` in the tree (`@wyw-in-js/transform` → `20.10.6`) is
   already patched.
2. **`@linaria/vite@^5.0.4` and `@linaria/babel-preset@^5.0.4` are vestigial.**
   The Vite build uses `@wyw-in-js/vite` (see `vite.config.mts`); `@linaria/core`
   and `@linaria/react` are v8 (the wyw-in-js–era runtime `styled`). The v5
   `@linaria/vite`/`@linaria/babel-preset` are the *old* toolchain and are
   referenced nowhere but `package.json`. Removing them deletes `happy-dom@10.8.0`
   entirely.
3. **Only one alert touches the browser runtime: DOMPurify (114, low)**, via
   `monaco-editor` (Monaco uses it to sanitize hover/markdown HTML). There are
   **no direct `dompurify` imports in `src/`**. Already pinned in `overrides`
   (`^3.3.2` → resolves to 3.4.11); just bump to `^3.4.12`.
4. **The js-yaml alerts (113/107) are jest-coverage-only** (`@istanbuljs/load-nyc-config`).
   They disappear with the **Vitest migration** in
   [`01-vitest-and-coverage.md`](./01-vitest-and-coverage.md), which removes
   jest/istanbul.
5. **Caveat on existing `overrides`:** the current block pins `jsdom: "^29.0.1"`
   and `glob: "^13.0.6"` — versions that do not appear to exist on npm (jsdom
   tops out ~25, glob ~11). Validate these resolve when you refresh the lockfile;
   they may be silently ignored (also flagged in reports 00 and 01).

---

## Remediation plan

Ordered by value ÷ effort. **All changes need a lockfile refresh + build/test
verification** (`npm install` → `npm run build` → `npm test` → `npm audit`);
they were **not applied** here because this worktree can't install/verify.

### Fix 1 — Remove vestigial Linaria v5 toolchain  ✅ clears 109, 110, 111 (both criticals) · effort **S**
Delete from `package.json`:
```jsonc
// dependencies
- "@linaria/babel-preset": "^5.0.4",
// devDependencies
- "@linaria/vite": "^5.0.4",
```
Keep `@linaria/core@^8` and `@linaria/react@^8` (runtime `styled`, still used).
Verify `npm run build` + `npm run dev` still compile styles via `@wyw-in-js/vite`.
This removes `happy-dom@10.8.0` and prunes duplicate `brace-expansion@2.1.1` /
`js-yaml@4` copies under `@linaria/babel-preset`.

### Fix 2 — Bump the one runtime dep (DOMPurify)  ✅ clears 114 · effort **S**
```jsonc
"overrides": {
  "dompurify": "^3.4.12",   // was ^3.3.2
  ...
}
```
Monaco is compatible with DOMPurify 3.4.x. This is the only browser-facing fix.

### Fix 3 — Refresh build/test transitive deps via overrides  ✅ clears 112, 108, 105 · effort **S**
```jsonc
"overrides": {
  ...
  "@babel/core": "^7.29.6",       // 105
  "brace-expansion": "^5.0.7"     // 112, 108 — API is stable across majors; verify build
}
```
`brace-expansion` has a tiny, stable API, so forcing 5.0.7 across the (2.x + 5.x)
minimatch consumers is normally safe — confirm the build after.

### Fix 4 — js-yaml (113, 107): prefer the Vitest migration  ✅ clears 113, 107 · effort **M** (or S stopgap)
The vulnerable `js-yaml@3.14.2` is only reachable through jest coverage
(`@istanbuljs/load-nyc-config`). The durable fix is
[report 01](./01-vitest-and-coverage.md) (drops jest + istanbul). If you need it
gone sooner, add a **scoped** override — but first confirm `js-yaml@3.15.0` is
actually published (the 3.x line historically ended at 3.14.1):
```jsonc
"@istanbuljs/load-nyc-config": { "js-yaml": "^3.15.0" }
```

### Proposed final `overrides` block (Fixes 2–3)
```jsonc
"overrides": {
  "yaml": "^2.6.1",
  "dompurify": "^3.4.12",
  "test-exclude": "^7.0.2",
  "jsdom": "^29.0.1",        // ⚠️ validate — may not exist on npm
  "glob": "^13.0.6",         // ⚠️ validate — may not exist on npm
  "@babel/core": "^7.29.6",
  "brace-expansion": "^5.0.7"
}
```

### Verification checklist
```bash
rm -rf node_modules package-lock.json && npm install   # regenerate lockfile
npm run build        # wyw-in-js/vite must still extract Linaria styles
npm test             # (or the Vitest suite once report 01 lands)
npm audit            # expect 0 of these 9 remaining
```

---

## Coverage after each fix

| Fix | Alerts cleared | Browser-runtime risk removed? |
|-----|----------------|:---:|
| 1 — drop Linaria v5 | 109, 110, 111 | n/a (build-time) |
| 2 — dompurify bump | 114 | ✅ (the only one) |
| 3 — babel/brace-expansion overrides | 112, 108, 105 | n/a (build-time) |
| 4 — Vitest migration (report 01) | 113, 107 | n/a (test-time) |
| **Total** | **all 9** | |

---

## Process recommendations (tie-in with report 00)

- **Wire dependency scanning into CI.** Report 00 found the `lint` script is dead
  and CI runs only `build` + `test`. Add `npm audit --audit-level=high` (or
  Dependabot **grouped** security PRs) so transitive drift is caught automatically.
- **Distinguish runtime vs. build exposure in the security process.** Dependabot's
  "runtime/development" scope is derived from the manifest tree and mislabels
  build-only transitive deps (e.g. these `happy-dom`/`brace-expansion` alerts show
  as runtime). Triage on *"does it reach the browser bundle?"*, not the label.
- **The migration program shrinks this surface structurally.** Vitest (01) removes
  the jest/istanbul chain; removing React/MUI/Formik (02–04) and consolidating on
  one Linaria/wyw toolchain removes large transitive subtrees. Fewer build deps →
  fewer alerts.

> **Nothing here blocks the current docs PR.** These are dependency changes that
> should land as their own PR with a green `npm install` + build + audit, not be
> bundled with analysis docs.
