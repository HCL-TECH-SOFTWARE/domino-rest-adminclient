# 05 — Dependency Vulnerability Triage & Remediation

Generated 2026-07-24 · Remediation applied & verified 2026-07-25 on branch
`fix/dependabot-alerts` · **Re-audited 2026-07-27** on `new_code` @ `7594672`.

> ## Status at a glance
>
> | | Then (2026-07-24) | Now (2026-07-27) |
> |---|---|---|
> | Original 9 Dependabot alerts | 2 critical, 4 high, 1 moderate, 2 low | ✅ **all 9 resolved and still resolved** |
> | `npm audit` total | 9 | **10 high, 0 critical** — a *different* set |
> | Browser-reachable | 1 (DOMPurify, low) | **1** (`react-router`, high — but the affected mode is unused) |
> | Overrides block | 9 entries, all load-bearing | **3 entries are now dead config** — see §New-3 |
>
> **Bottom line:** the original remediation held. The 10 findings today are new
> advisories against packages that were previously clean: a build-time
> `@wyw-in-js → minimatch → brace-expansion` chain (9 of the 10, none reaching the
> browser) and a `react-router` advisory that post-dates the 7.18.1 bump made in
> `6df3db5`.

---

## Part 1 — The original 9 alerts (historical, ✅ resolved)

Triage of the **9 Dependabot alerts** open on `HCL-TECH-SOFTWARE/domino-rest-adminclient`
as of 2026-07-24, reported as **2 critical, 4 high, 1 moderate, 2 low**.

> Despite two "critical" labels, **none was remotely exploitable against the running
> application.** 8 of 9 lived entirely in **build/test tooling** and never reached the
> browser bundle; the only browser-runtime one was a **low**-severity DOMPurify issue via
> Monaco.

Method: alerts pulled via `gh api .../dependabot/alerts`; every package traced to its
resolved version, dev/prod flag, and dependency chain in `package-lock.json`; fixes
applied and verified against a real `npm install`.

### Triage table

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

**Why "critical" ≠ urgent here:** `happy-dom` is a server-side DOM emulator. Its RCE /
VM-escape CVEs require feeding attacker-controlled HTML/JS into its sandbox. The only
consumer was Linaria's build-time style evaluator, whose input is *your own source code*.
Exploiting it means already having malicious code in the build — a supply-chain concern,
not a runtime attack surface. It was never in the shipped bundle.

### Key findings (unchanged, still accurate)

1. **The two criticals + one high (109/110/111) all pointed at a single vulnerable copy:
   `happy-dom@10.8.0`, pulled only by `@linaria/babel-preset@5`.** The other `happy-dom`
   in the tree (`@wyw-in-js/transform`) was already patched.
2. **`@linaria/vite@5` and `@linaria/babel-preset@5` were vestigial.** The Vite build uses
   `@wyw-in-js/vite`; `@linaria/react` is v8 (the wyw-in-js–era runtime `styled`). The v5
   packages were the *old* toolchain, referenced nowhere but `package.json`. Removing them
   deleted `happy-dom@10.8.0` outright and pruned ~1,850 lines of transitive lockfile
   entries.
3. **Only one alert touched the browser runtime: DOMPurify (114, low)**, via
   `monaco-editor`. Fixed by bumping the existing override to `^3.4.12`.
4. **The js-yaml alerts (113/107) were jest-coverage-only** (`@istanbuljs/load-nyc-config`).
   Fixed with a scoped override, and predicted to *"disappear entirely with the Vitest
   migration"*. ✅ **That prediction came true** — see §New-3.
5. **Correction on existing `overrides`:** an earlier draft speculated that
   `jsdom: "^29.0.1"` and `glob: "^13.0.6"` pinned non-existent versions. **That was
   wrong** — both are real releases and resolve cleanly.

### ⚠️ Gotcha worth keeping — why `brace-expansion` used **two range-keyed** overrides

The obvious fix — a single `"brace-expansion": "^5.0.7"` — **broke the build**:

```
@wyw-in-js/vite/node_modules/minimatch/dist/esm/index.js
  import expand from 'brace-expansion';
  SyntaxError: The requested module 'brace-expansion' does not provide an export named 'default'
```

Two incompatible majors coexisted: the older `minimatch` nested under Linaria/`@wyw-in-js`
uses a **default** import (needs `brace-expansion@2.x`), while the top-level `minimatch`
used a **named** import (needs `5.x`). Forcing everything to 5.x removed the default
export the 2.x consumers rely on. The fix was **version-range-keyed overrides**, which
patch each line *within its own major*.

### Verification evidence (2026-07-25)

| Check | Before | After |
|-------|--------|-------|
| `npm audit` (of these 9) | 2 critical, 4 high, 1 mod, 2 low | **0 remaining** |
| `happy-dom` in tree | `10.8.0` (vuln) + `20.10.6` | only `20.10.6` (patched) |
| `brace-expansion` | `2.1.1`, `5.0.5` (vuln) | `2.1.2` + `5.0.8` |
| `dompurify` | `3.4.11` | `3.4.12` |
| `npm run build` | — | ✅ |
| `npm test` | — | ✅ 4 suites / 34 tests |
| lockfile size | — | −1,849 / +102 lines |

**Still true on 2026-07-27:** `happy-dom` resolves to a single patched `20.11.1`;
`dompurify` is `3.4.12`; `jsdom` is `29.1.1`. None of the original 9 has returned.

---

## Part 2 — Re-audit 2026-07-27 (10 new high findings)

`npm audit` on `new_code` @ `7594672` (Node 26 / npm 11) after a clean `npm install`:

```
10 high severity vulnerabilities   (0 critical, 0 moderate, 0 low)
```

### New-1 · The `@wyw-in-js → minimatch → brace-expansion` cluster (9 of 10)

| Package | Direct? | Resolved | Via |
|---|:---:|---|---|
| `brace-expansion` | no | **2.1.2** | *(root cause)* DoS via unbounded expansion length → OOM crash |
| `minimatch` | no | 9.0.9 | `brace-expansion` |
| `@wyw-in-js/shared` | no | — | `minimatch` |
| `@wyw-in-js/processor-utils` | no | — | `@wyw-in-js/shared` |
| `@wyw-in-js/transform` | no | — | `@wyw-in-js/{shared,processor-utils}`, `minimatch` |
| `@wyw-in-js/vite` | **yes** | — | `@wyw-in-js/{shared,transform}` |
| `@linaria/core` | no | — | `@wyw-in-js/processor-utils` |
| `@linaria/react` | **yes** | — | `@linaria/core`, `@wyw-in-js/*`, `minimatch` |

**Exposure: build-time only. ❌ Does not reach the browser.** This is the same shape as
alerts 108/112 in Part 1: `minimatch` is used by Linaria/wyw's build-time file matching,
whose input is the project's own glob patterns and file tree — not attacker-controlled.
A DoS against your own build is a broken build, not a security incident.

Note the irony: the Part-1 remediation pinned `brace-expansion@^2.0.0 → ^2.1.2`, and
**2.1.2 is now itself in the vulnerable range** (`<=5.0.7`) under a *new* advisory. The
override is doing its job; the ceiling moved.

**Recommendation:** low urgency. Bump `@wyw-in-js/vite` (and therefore `@linaria/react`)
when upstream ships a `minimatch` that depends on a patched `brace-expansion`; until then,
raise the `brace-expansion@^2.0.0` override if a patched 2.x appears. Do **not** collapse
the range-keyed overrides into one — the default-vs-named import trap above still applies.
Track, don't chase.

### New-2 · `react-router` / `react-router-dom` 7.18.1 (1 of 10, browser-reachable)

```
react-router  7.12.0 - 8.2.0   severity: high
React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response
  https://github.com/advisories/GHSA-qwww-vcr4-c8h2
fix available via `npm audit fix --force`
Will install react-router-dom@7.11.0, which is a breaking change
```

**History:** the previous revision of this report flagged a `react-router` cluster as
out-of-scope and recommended handling it separately. That happened — `6df3db5`
("fix(deps): bump react-router-dom to 7.18.1 (security)", PR #648) cleared it. This is a
**new advisory published against the bumped version**, not a regression.

**Exposure assessment:** the advisory concerns **RSC (React Server Components) mode** —
server-side action execution before a 400 response. This app is a **pure client-side SPA**
(`<BrowserRouter basename="/admin/ui">`, no server rendering, no React Router actions/
loaders in RSC mode). **The affected code path is not used.**

**Recommendation:**
1. **Do not run `npm audit fix --force`.** It downgrades to `react-router-dom@7.11.0` — a
   breaking change that trades a non-applicable advisory for real regression risk across
   31 importing files.
2. Watch for a forward fix in the 7.x line and take it when available.
3. **Report [`04-remove-react.md`](./04-remove-react.md) removes `react-router-dom`
   entirely** (§10), which resolves this permanently. If the router replacement is near,
   a version bump is throwaway work.

### New-3 · Overrides audit — three entries are now dead config

The Vitest migration ([`01-vitest-and-coverage.md`](./01-vitest-and-coverage.md)) removed
the jest/istanbul chain exactly as predicted. Verified against the installed tree:

```jsonc
"overrides": {
  "yaml": "^2.6.1",                    // ⚠️  verify — check for remaining consumers
  "dompurify": "^3.4.12",              // ✅ LIVE — monaco-editor, resolves 3.4.12
  "test-exclude": "^7.0.2",            // ❌ DEAD — package absent from the tree
  "jsdom": "^29.1.1",                  // ✅ LIVE — vitest environment, resolves 29.1.1
  "glob": "^13.0.6",                   // ❌ DEAD — package absent from the tree
  "@babel/core": "^7.29.6",            // ⚠️  verify — babel.config.js was deleted
  "brace-expansion@^2.0.0": "^2.1.2",  // ✅ LIVE — the only copy in the tree (New-1)
  "brace-expansion@^5.0.0": "^5.0.7",  // ❌ DEAD — no 5.x copy remains
  "@istanbuljs/load-nyc-config": {     // ❌ DEAD — @istanbuljs absent (jest/istanbul gone)
    "js-yaml": "^3.15.0"
  }
}
```

Confirmed by `find node_modules -type d -name <pkg>`: `@istanbuljs`, `test-exclude` and
`glob` have **zero** directories; `brace-expansion` and `minimatch` have exactly one copy
each (2.1.2 / 9.0.9); `js-yaml` resolves only to a safe 4.3.0.

**Recommendation (S, zero risk):** delete the three dead entries and re-verify `yaml` and
`@babel/core` have remaining consumers. Dead overrides are worse than clutter — they
create false confidence that a class of problem is pinned when the pin no longer applies
to anything.

### Reproduce

```bash
npm install
npm audit                 # 10 high: 9 build-time wyw/minimatch, 1 react-router
npm run lint              # clean
npm run build             # ✅ builds (entry chunk 6.94 MB / 1.88 MB gzip)
npm run test              # 🔴 currently RED — see reports/00 P0-7 and reports/01 §0
```

---

## Process recommendations

- ✅ **CI dependency gating is now half-solved.** The previous revision recommended wiring
  scanning into CI because `lint` was dead and CI ran only `build` + `test`. `pr_check`
  now runs **`lint` → `build` → `test`** on Node 24 (report 00 P0-3). **Still missing:**
  an `npm audit --audit-level=high` step, or Dependabot **grouped** security PRs. Add it —
  it is what would have surfaced the New-1 cluster without a manual re-audit.
  - Caveat if you add it: `npm audit --audit-level=high` would **fail today** on New-1,
    which is build-time-only. Either gate on `--omit=dev` (production dependency tree
    only) or allow-list the known build-time cluster, so the gate signals real exposure
    rather than crying wolf.
- **Keep triaging on *"does it reach the browser bundle?"*, not on the label.** Dependabot
  derives "runtime/development" scope from the manifest tree and mislabels build-only
  transitive deps. Both re-audit clusters confirm the heuristic: 9 of 10 findings are
  build-time, and the one runtime finding affects a mode this app does not use.
- **Prune dead overrides when the toolchain changes** (New-3). Each toolchain removal —
  Jest, CRA/webpack, `@mui/lab` — should end with an overrides sweep.
- **The migration program keeps shrinking this surface structurally.** Vitest removed the
  jest/istanbul chain (proven above). Removing React/MUI/Formik/react-router (reports
  02–04) removes large transitive subtrees and resolves New-2 outright. Fewer build deps →
  fewer alerts.
- **New watch item:** `keep-monaco-editor.ts` promoted `monaco-editor` to a *direct*
  dependency and added a runtime `prettier` import (declared as a devDependency — report
  00 P0-10). Both are now browser-reachable code, so their advisories matter more than
  the build-time noise above. Monaco was already the source of the only browser-reachable
  finding in Part 1 (DOMPurify).
