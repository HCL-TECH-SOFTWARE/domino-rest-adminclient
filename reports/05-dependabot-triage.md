# 05 — Dependabot Vulnerability Triage & Remediation

Generated 2026-07-24 · **Remediation applied & verified 2026-07-25** on branch
`fix/dependabot-alerts` (stacked on `post-1.8-ux`).

Triage of the **9 open Dependabot alerts** on `HCL-TECH-SOFTWARE/domino-rest-adminclient`,
reported at push time as **2 critical, 4 high, 1 moderate, 2 low**.

> **Bottom line:** despite two "critical" labels, **none of these were remotely
> exploitable against the running application.** 8 of 9 lived entirely in
> **build/test tooling** and never reached the browser bundle; the only
> browser-runtime one was a **low**-severity DOMPurify issue via Monaco. All 9
> are now fixed and the change is verified green (audit + build + tests).

> ✅ **Status: DONE.** `npm audit` clears all 9; `npm run build` and `npm test`
> pass. See [Remediation applied](#remediation-applied--verified). One **new,
> out-of-scope** finding surfaced during the refresh — a `react-router` cluster
> that was *not* in the original 9; see [that section](#new-finding-out-of-scope--react-router).

Method: alerts pulled via `gh api .../dependabot/alerts`; every package traced to
its resolved version, dev/prod flag, and dependency chain in `package-lock.json`;
fixes applied and verified against a real `npm install` (Node 26 / npm 11).

---

## Triage table

| # | GH sev | Package | Was | Patched to | Comes from | Ships to browser? | **Real exposure** |
|---|--------|---------|-----|-----------|------------|:---:|--------------------|
| 110 | 🔴 critical | happy-dom | 10.8.0 | **removed** | `@linaria/babel-preset` (build) | ❌ | Build-time DOM sandbox only |
| 109 | 🔴 critical | happy-dom | 10.8.0 | **removed** | `@linaria/babel-preset` (build) | ❌ | Build-time DOM sandbox only |
| 111 | 🟠 high | happy-dom | 10.8.0 | **removed** | `@linaria/babel-preset` (build) | ❌ | Build-time DOM sandbox only |
| 112 | 🟠 high | brace-expansion | 2.1.1 | 2.1.2 | `minimatch` ← Linaria/wyw (build) | ❌ | Build-time ReDoS |
| 108 | 🟠 high | brace-expansion | 5.0.5 | 5.0.8 | top-level `minimatch` (dev) | ❌ | Build/test ReDoS |
| 113 | 🟠 high | js-yaml | 3.14.2 | 3.15.0 | `@istanbuljs/load-nyc-config` (jest coverage) | ❌ | Test-time ReDoS |
| 107 | 🟡 moderate | js-yaml | 3.14.2 | 3.15.0 | `@istanbuljs/load-nyc-config` (jest coverage) | ❌ | Test-time ReDoS |
| 114 | ⚪ low | dompurify | 3.4.11 | 3.4.12 | **`monaco-editor`** (runtime) | ✅ | **Browser**, but low sev |
| 105 | ⚪ low | @babel/core | 7.29.0 | 7.29.7 | Babel toolchain (build) | ❌ | Build-time file read |

**Why "critical" ≠ urgent here:** `happy-dom` is a server-side DOM emulator. Its
RCE / VM-escape CVEs require feeding attacker-controlled HTML/JS into its sandbox.
The only consumer was Linaria's build-time style evaluator, whose input is *your
own source code*. Exploiting it means already having malicious code in the build —
a supply-chain concern, not a runtime attack surface. It was never in the shipped
bundle.

---

## Key findings

1. **The two criticals + one high (109/110/111) all pointed at a single vulnerable
   copy: `happy-dom@10.8.0`, pulled only by `@linaria/babel-preset@5`.** The other
   `happy-dom` in the tree (`@wyw-in-js/transform` → `20.10.6`) was already patched.
2. **`@linaria/vite@5` and `@linaria/babel-preset@5` were vestigial.** The Vite
   build uses `@wyw-in-js/vite` (see `vite.config.mts`); `@linaria/core` and
   `@linaria/react` are v8 (the wyw-in-js–era runtime `styled`). The v5 packages
   were the *old* toolchain, referenced nowhere but `package.json`. Removing them
   deleted `happy-dom@10.8.0` outright — and pruned ~1,850 lines of transitive
   lockfile entries.
3. **Only one alert touched the browser runtime: DOMPurify (114, low)**, via
   `monaco-editor` (Monaco uses it to sanitize hover/markdown HTML). No direct
   `dompurify` imports exist in `src/`. Fixed by bumping the existing override to
   `^3.4.12`.
4. **The js-yaml alerts (113/107) were jest-coverage-only** (`@istanbuljs/load-nyc-config`).
   Fixed here with a scoped override; they also disappear entirely with the
   **Vitest migration** in [`01-vitest-and-coverage.md`](./01-vitest-and-coverage.md)
   (which removes jest/istanbul).
5. **~~Caveat~~ Correction on existing `overrides`:** an earlier draft of this
   report (and report 01) speculated that `jsdom: "^29.0.1"` and `glob: "^13.0.6"`
   pinned non-existent versions. **That was wrong** — `jsdom@29.1.1` and
   `glob@13.0.6` are current, real releases and resolve cleanly. No action needed;
   this note supersedes those caveats.

---

## Remediation applied & verified

Applied to `package.json` (verified with `npm install` → `audit` → `build` → `test`):

```jsonc
// dependencies — removed
- "@linaria/babel-preset": "^5.0.4",
// devDependencies — removed
- "@linaria/vite": "^5.0.4",

// overrides — final block
"overrides": {
  "yaml": "^2.6.1",
  "dompurify": "^3.4.12",              // 114  (was ^3.3.2)
  "test-exclude": "^7.0.2",
  "jsdom": "^29.0.1",                  // unchanged — valid (jsdom@29.1.1 exists)
  "glob": "^13.0.6",                   // unchanged — valid (glob@13.0.6 exists)
  "@babel/core": "^7.29.6",            // 105
  "brace-expansion@^2.0.0": "^2.1.2",  // 112  (2.x line)
  "brace-expansion@^5.0.0": "^5.0.7",  // 108  (5.x line)
  "@istanbuljs/load-nyc-config": {     // 113, 107  (scoped to the vulnerable path)
    "js-yaml": "^3.15.0"
  }
}
```

### ⚠️ Gotcha worth recording — why `brace-expansion` uses **two range-keyed** overrides
The obvious fix — a single `"brace-expansion": "^5.0.7"` — **broke the build**:

```
@wyw-in-js/vite/node_modules/minimatch/dist/esm/index.js
  import expand from 'brace-expansion';
  SyntaxError: The requested module 'brace-expansion' does not provide an export named 'default'
```

Two incompatible majors coexist in the tree: the older `minimatch` nested under
Linaria/`@wyw-in-js` uses a **default** import (needs `brace-expansion@2.x`), while
the top-level `minimatch` uses a **named** import (needs `5.x`). Forcing everything
to 5.x removed the default export the 2.x consumers rely on. The fix is
**version-range-keyed overrides** (`brace-expansion@^2.0.0` → `^2.1.2`,
`brace-expansion@^5.0.0` → `^5.0.7`), which patch each line *within its own major*.
Likewise, the `js-yaml` override is **scoped** to `@istanbuljs/load-nyc-config` so
it doesn't drag the safe `js-yaml@4.x` copies (used by `cosmiconfig`) down to 3.x.

### Verification evidence

| Check | Before | After |
|-------|--------|-------|
| `npm audit` (of these 9) | 2 critical, 4 high, 1 mod, 2 low | **0 remaining** |
| `npm audit` (total) | 9 | 2 — both the out-of-scope react-router cluster |
| `happy-dom` in tree | `10.8.0` (vuln) + `20.10.6` | only `20.10.6` (patched); `10.8.0` gone |
| `brace-expansion` | `2.1.1`, `5.0.5` (vuln) | `2.1.2` (Linaria/wyw) + `5.0.8` (top) |
| `dompurify` | `3.4.11` | `3.4.12` |
| `@babel/core` | `7.29.0` | `7.29.7` |
| `npm run build` | — | ✅ built in ~2.7s, 195 kB CSS emitted (Linaria intact) |
| `npm test` | — | ✅ 4 suites / **34 tests** pass, coverage runs |
| lockfile size | — | −1,849 / +102 lines (vestigial subtree pruned) |

### Reproduce
```bash
npm install
npm audit          # only react-router (out of scope) remains
npm run build      # wyw-in-js/vite still extracts Linaria styles
npm test           # 34 tests pass
```

---

## New finding (out of scope) — react-router

Refreshing the lockfile surfaced a **`react-router` / `react-router-dom` cluster**
(1 high + 1 moderate; 4 CVEs — open redirect, XSS, constructor injection, DoS) that
was **not among the original 9 Dependabot alerts** (those advisories post-date the
repo's last Dependabot scan). It is **pre-existing** — `react-router-dom@^7.17.0`
was already a dependency; this change did not introduce it.

**Deliberately excluded from this PR** because:
- It is a **runtime routing** bump — needs real app/route testing, not just build+unit.
- Report [`04-remove-react.md`](./04-remove-react.md) plans to **remove
  `react-router-dom` entirely**, so a version bump here is largely throwaway.

**Recommendation:** handle it separately — either `npm audit fix` (a semver-compatible
`react-router` patch is available) in its own PR with route smoke-testing, or fold it
into the report-04 routing replacement. Track it so it isn't lost.

---

## Process recommendations (tie-in with report 00)

- **Wire dependency scanning into CI.** Report 00 found the `lint` script is dead
  and CI runs only `build` + `test`. Add `npm audit --audit-level=high` (or
  Dependabot **grouped** security PRs) so transitive drift is caught automatically —
  it would have surfaced the react-router cluster.
- **Distinguish runtime vs. build exposure in the security process.** Dependabot's
  "runtime/development" scope is derived from the manifest tree and mislabels
  build-only transitive deps (these `happy-dom`/`brace-expansion` alerts showed as
  runtime). Triage on *"does it reach the browser bundle?"*, not the label.
- **The migration program shrinks this surface structurally.** Vitest (01) removes
  the jest/istanbul chain; removing React/MUI/Formik/react-router (02–04) and
  consolidating on one Linaria/wyw toolchain removes large transitive subtrees.
  Fewer build deps → fewer alerts.
