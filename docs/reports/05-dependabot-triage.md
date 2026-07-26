# 05 — Dependency Vulnerability Triage & Remediation

Generated 2026-07-24 · Remediation applied & verified 2026-07-25 on branch
`fix/dependabot-alerts` · Previously re-audited 2026-07-27 on `new_code` @ `7594672` ·
**Refreshed 2026-07-27 against `new_code` @ `e17010c`.**

> ## ⚠️ Read this first — there are **two** vulnerability views and they disagree
>
> | View | Computed on | Result |
> |---|---|---|
> | **GitHub Dependabot alerts** (the security tab) | default branch **`main`** | **9 open** — 2 critical, 4 high, 1 medium, 2 low |
> | **`npm audit`** | this branch, **`new_code` @ `e17010c`** | **10 high**, 0 critical, 0 moderate, 0 low — a *different* set |
>
> **`main` is 80 commits behind `new_code`.** (`git rev-list --count
> origin/main..origin/new_code` = **80**; the reverse count is **0** — `new_code`
> contains everything on `main`.) Dependabot only ever scans the **default branch**,
> confirmed `main` via `gh api repos/HCL-TECH-SOFTWARE/domino-rest-adminclient -q
> .default_branch`. The GitHub security tab therefore describes a lockfile that is
> **not the one this branch ships**.
>
> ### The two criticals do not exist in the code being shipped
>
> Alerts **109** and **110** are `happy-dom` **< 15.10.2** and **< 20.0.0**, matched
> against **`main`'s `happy-dom@10.8.0`** — read directly from `main`'s lockfile
> (`git show origin/main:package-lock.json`), which pins `node_modules/happy-dom` at
> `10.8.0`. `new_code` resolves a single
> **`happy-dom@20.11.1`**, which `npm audit` does **not** flag. Both criticals — and
> the accompanying high (**111**, `< 20.8.9`) — are **already fixed on the integration
> branch** and will close by themselves the moment `new_code` reaches `main`. No code
> change is required, and none should be attempted against `main` directly.
>
> Doubly non-urgent: `happy-dom` is not application code and is not even the test
> environment here. `npm ls happy-dom` shows it arriving via
> **`@wyw-in-js/vite` → `@wyw-in-js/transform`** (the Linaria build toolchain) and via
> `vitest@4.1.10` — but this project's Vitest `environment` is **jsdom**
> (`vitest.config.ts:31`), not happy-dom. It is a build-time dependency that never
> enters the browser bundle.
>
> **If you are reading the GitHub security tab: 2 criticals + 4 highs + 1 medium +
> 2 lows are stale branch skew, not shipped exposure. Merge `new_code` and they clear.**

> ## Status at a glance
>
> | | Then (2026-07-24) | Now (2026-07-27 @ `e17010c`) |
> |---|---|---|
> | Original 9 Dependabot alerts | 2 critical, 4 high, 1 moderate, 2 low | ✅ **all 9 fixed in `new_code`** — ⚠️ but **all 9 still show open on GitHub** (computed on `main`) |
> | `npm audit` on this branch | 9 | **10 high, 0 critical** — 10 flagged packages, **2** root advisories |
> | Browser-reachable | 1 (DOMPurify, low) | **1 advisory** (`react-router`, high — the affected mode is unused) |
> | Overrides block | 9 entries, all load-bearing | 9 entries: **4 live, 5 dead** — see §New-3 |
> | `npm run lint` / `build` / `test` | — | ✅ / ✅ / ✅ (see §Reproduce) |
>
> **Bottom line:** the original remediation held — every one of the 9 alerts is
> genuinely fixed in this branch's tree. It has simply never been merged to the
> default branch, which is why GitHub still shows them. The 10 findings `npm audit`
> reports today are *new* advisories against packages that were previously clean: a
> build-time `@wyw-in-js → minimatch → brace-expansion` chain (**8** of the 10 flagged
> packages, none reaching the browser) and a `react-router` advisory (**2** of the 10)
> that post-dates the 7.18.1 bump made in `6df3db5`.

---

## Part 1 — The original 9 alerts (fixed in `new_code`, still **open** on GitHub)

Triage of the **9 Dependabot alerts** open on `HCL-TECH-SOFTWARE/domino-rest-adminclient`
as of 2026-07-24, reported as **2 critical, 4 high, 1 moderate, 2 low**. (The API now
labels that one alert — 107 — `medium`; this report's 🟡 *moderate* is the same alert.)

**They are still the same 9, and they are still open.** Re-pulled 2026-07-27 via
`gh api .../dependabot/alerts`: alerts **105, 107, 108, 109, 110, 111, 112, 113, 114**,
all `state: open`. Nothing new has been raised, and nothing has been closed — because
Dependabot evaluates `main`, and the remediation lives 80 commits ahead of it.

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

### Reconciliation — GitHub's vulnerable ranges vs. what `new_code` actually resolves

Verified 2026-07-27 against the installed tree at `e17010c` (`npm ls <pkg>`,
`find node_modules -type d -name <pkg>`):

| # | Package | Vulnerable range (GH advisory) | `new_code` resolves | Verdict |
|---|---------|-------------------------------|---------------------|:---:|
| 110 | happy-dom | `< 20.0.0` | **20.11.1** (single copy) | ✅ |
| 109 | happy-dom | `< 15.10.2` | **20.11.1** (single copy) | ✅ |
| 111 | happy-dom | `< 20.8.9` | **20.11.1** (single copy) | ✅ |
| 112 | brace-expansion | `>= 2.0.0, < 2.1.2` | **2.1.2** | ✅ |
| 108 | brace-expansion | `>= 3.0.0, < 5.0.7` | *no 3.x/5.x copy in tree* | ✅ ➖ |
| 113 | js-yaml | `>= 3.0.0, < 3.15.0` | **4.3.0** only | ✅ |
| 107 | js-yaml | `< 3.15.0` | **4.3.0** only | ✅ |
| 114 | dompurify | `<= 3.4.11` | **3.4.12** | ✅ |
| 105 | @babel/core | `<= 7.29.0` | *absent from tree entirely* | ✅ ➖ |

➖ = the vulnerable package line no longer exists in the tree at all, so the alert is
moot rather than patched. Note this makes the *original* fix targets (`brace-expansion@5.0.8`,
`@babel/core@7.29.7`) obsolete — those lines were pruned rather than upgraded.

### Key findings (unchanged, still accurate)

1. **The two criticals + one high (109/110/111) all pointed at a single vulnerable copy:
   `happy-dom@10.8.0`, pulled only by `@linaria/babel-preset@5`.** The other `happy-dom`
   in the tree (`@wyw-in-js/transform`) was already patched. Today only one copy remains
   (**20.11.1**), shared by `@wyw-in-js/transform` and `vitest@4.1.10`.
2. **`@linaria/vite@5` and `@linaria/babel-preset@5` were vestigial.** The Vite build uses
   `@wyw-in-js/vite`; `@linaria/react` is v8 (the wyw-in-js–era runtime `styled`). The v5
   packages were the *old* toolchain, referenced nowhere but `package.json`. Removing them
   deleted `happy-dom@10.8.0` outright and pruned ~1,850 lines of transitive lockfile
   entries. ✅ Still true: `package.json` carries only `@linaria/react ^8.1.1`
   (dependency) and `@wyw-in-js/vite ^2.3.0` (devDependency).
3. **Only one alert touched the browser runtime: DOMPurify (114, low)**, via
   `monaco-editor`. Fixed by bumping the existing override to `^3.4.12`.
4. **The js-yaml alerts (113/107) were jest-coverage-only** (`@istanbuljs/load-nyc-config`).
   Fixed with a scoped override, and predicted to *"disappear entirely with the Vitest
   migration"*. ✅ **That prediction came true** — see §New-3.
5. **Correction on existing `overrides`:** an earlier draft speculated that
   `jsdom: "^29.0.1"` and `glob: "^13.0.6"` pinned non-existent versions. **That was
   wrong** — both are real releases; `jsdom` resolves cleanly to 29.1.1. (`glob` has since
   fallen out of the tree entirely — see §New-3.)

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
patch each line *within its own major*. The trap still applies today — see §New-1.

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

**Still true on 2026-07-27 @ `e17010c`:** `happy-dom` resolves to a single patched
**20.11.1**; `dompurify` is **3.4.12**; `jsdom` is **29.1.1**; `js-yaml` is **4.3.0**;
`@babel/core` is gone. None of the original 9 has returned to this branch. The suite has
since grown to **63 test files / 636 tests**, all green.

---

## Part 2 — Re-audit 2026-07-27 (10 high findings)

`npm audit` on `new_code` @ `e17010c` after a clean `npm install`:

```
10 high severity vulnerabilities   (0 critical, 0 moderate, 0 low)
```

Those 10 are **10 flagged packages tracing back to just 2 root advisories**: one
`brace-expansion` DoS (8 packages) and one `react-router` RSC CSRF bypass (2 packages).

### New-1 · The `@wyw-in-js → minimatch → brace-expansion` cluster (8 of 10)

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
**2.1.2 is now itself in the vulnerable range** (`<= 5.0.7`) under a *new* advisory. The
override is doing its job; the ceiling moved.

**And the ceiling cannot be raised.** `npm view brace-expansion versions` shows **2.1.2
is the newest release on the 2.x line** — there is no patched 2.x to bump to. The only
non-vulnerable release is **5.0.8**, which the 2.x consumers cannot take because of the
default-vs-named import trap documented above.

**Recommendation:** low urgency, and currently **no action is available**. Bump
`@wyw-in-js/vite` (and therefore `@linaria/react`) when upstream ships a `minimatch` that
depends on `brace-expansion@>= 5.0.8`; that is the only path out. Do **not** collapse the
range-keyed overrides into one. Track, don't chase.

### New-2 · `react-router` / `react-router-dom` 7.18.1 (2 of 10, browser-reachable)

```
react-router  7.12.0 - 8.2.0   severity: high
React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response
  https://github.com/advisories/GHSA-qwww-vcr4-c8h2
fix available via `npm audit fix --force`
Will install react-router-dom@7.11.0, which is a breaking change
```

`react-router-dom@7.18.1` is flagged only as the direct parent that "depends on vulnerable
versions of react-router" — one advisory, two flagged packages.

**History:** the previous revision of this report flagged a `react-router` cluster as
out-of-scope and recommended handling it separately. That happened — `6df3db5`
("fix(deps): bump react-router-dom to 7.18.1 (security)", PR #648) cleared it. This is a
**new advisory published against the bumped version**, not a regression.

**Exposure assessment:** the advisory concerns **RSC (React Server Components) mode** —
server-side action execution before a 400 response. This app is a **pure client-side SPA**:
`src/App.tsx:9` imports `BrowserRouter as Router`, and there is **no** `createBrowserRouter`,
`RouterProvider`, or `@react-router/rsc` anywhere in `src`. **The affected code path is not
used.**

**Recommendation:**

1. **Do not run `npm audit fix --force`.** It downgrades to `react-router-dom@7.11.0` — a
   breaking change that trades a non-applicable advisory for real regression risk across
   the **31** files that import `react-router-dom`.
2. **Correction to the previous revision:** "watch for a forward fix in the 7.x line" is
   not a viable plan. `7.18.1` is the **newest published 7.x**, and the vulnerable range
   (`7.12.0 - 8.2.0`) covers all of it — as well as `8.0.0`–`8.2.0`. The first
   non-vulnerable release is **`react-router@8.3.0`** — and
   `react-router-dom` has **no 8.x at all** (latest published: `7.18.1`). Taking the fix
   therefore means moving all 31 files off the `react-router-dom` package onto
   `react-router@8`, i.e. a router migration, not a version bump.
3. Given (2), **report [`04-remove-react.md`](./04-remove-react.md) removes
   `react-router-dom` entirely** (§10) and resolves this permanently. Since *any* real fix
   is now a 31-file migration anyway, folding it into that work is strictly better than
   doing it twice.

### New-3 · Overrides audit — five entries are now dead config

The Vitest migration ([`01-vitest-and-coverage.md`](./01-vitest-and-coverage.md)) removed
the jest/istanbul chain exactly as predicted. Verified against the installed tree at
`e17010c`; the block below is the current `package.json` verbatim, with verdicts:

```jsonc
"overrides": {
  "yaml": "^2.6.1",                    // ✅ LIVE — resolves 2.9.0 (see below)
  "dompurify": "^3.4.12",              // ✅ LIVE — monaco-editor, resolves 3.4.12
  "test-exclude": "^7.0.2",            // ❌ DEAD — package absent from the tree
  "jsdom": "^29.1.1",                  // ✅ LIVE — vitest environment, resolves 29.1.1
  "glob": "^13.0.6",                   // ❌ DEAD — package absent from the tree
  "@babel/core": "^7.29.6",            // ❌ DEAD — package absent from the tree
  "brace-expansion@^2.0.0": "^2.1.2",  // ✅ LIVE — the only copy in the tree (New-1)
  "brace-expansion@^5.0.0": "^5.0.7",  // ❌ DEAD — no 5.x copy remains
  "@istanbuljs/load-nyc-config": {     // ❌ DEAD — @istanbuljs absent (jest/istanbul gone)
    "js-yaml": "^3.15.0"
  }
}
```

**4 live, 5 dead** of 9 entries. Confirmed by `npm ls <pkg>`: `@istanbuljs/load-nyc-config`,
`test-exclude`, `glob` and `@babel/core` all report `(empty)`; `brace-expansion` and
`minimatch` have exactly one copy each (2.1.2 / 9.0.9); `js-yaml` resolves only to a safe
4.3.0.

**Two verdicts resolved since the last revision** (both were marked "⚠️ verify"):

- **`yaml` → ✅ LIVE.** It is genuinely load-bearing. `vite@8.1.5` declares it as an
  *optional* peer at `^2.4.2`, and `babel-plugin-macros → cosmiconfig@7.1.0` asks for
  `^1.10.0` — the override is what drags that second consumer forward onto the single
  shared **2.9.0**. Remove it and the 1.x line reappears.
- **`@babel/core` → ❌ DEAD.** `babel.config.js` was deleted and nothing replaced it:
  `npm ls @babel/core` returns `(empty)` and `node_modules/@babel/core` does not exist.
  The pin applies to nothing. (This also makes alert **105** moot rather than patched.)

**Recommendation (S, zero risk):** delete the five dead entries. Dead overrides are worse
than clutter — they create false confidence that a class of problem is pinned when the pin
no longer applies to anything, and `@babel/core` in particular reads as "alert 105 is
handled" when in fact the package is simply gone.

### Reproduce

```bash
npm install
npm audit                 # 10 high: 8 build-time wyw/minimatch, 2 react-router
npm run lint              # ✅ clean (oxlint, no findings)
npm run build             # ✅ exit 0 — entry chunk 6,322.51 kB / 1,703.85 kB gzip
npm run test              # ✅ exit 0 — 63 test files / 636 tests
gh api repos/HCL-TECH-SOFTWARE/domino-rest-adminclient/dependabot/alerts \
  --paginate -q '.[] | select(.state=="open")'   # 9 open — but computed on `main`
```

---

## Process recommendations

- 🔴 **Fix the branch skew first — it is the highest-leverage item in this report.**
  Every open Dependabot alert on this repository, including both criticals, is an artifact
  of `main` trailing `new_code` by 80 commits. Until `new_code` lands, the security tab
  reports on code nobody ships, and any real new alert will be buried in nine stale ones.
  **There is no config workaround:** alerts are derived from the dependency graph, which
  GitHub builds from the **default branch**, so merging is the fix. What *can* be tuned is
  the update side — `.github/dependabot.yml` declares `npm`, `maven` and `github-actions`
  on a `weekly` schedule with **no** `target-branch` (update PRs land on `main`, not on the
  integration branch) and **no** `groups` (each bump arrives as its own PR).
- ✅ **CI dependency gating is still only half-solved.** `pr_check` now runs
  **`npm ci` → `lint` → `build` → `test` → publish coverage summary** on Node **24.x**
  (`.github/workflows/pr_check.yml:23`). **Still missing:** an `npm audit --audit-level=high`
  step, or Dependabot **grouped** security PRs. Add it — it is what would have surfaced the
  New-1 cluster without a manual re-audit.
  - Caveat if you add it: `npm audit --audit-level=high` would **fail today** on New-1,
    which is build-time-only *and currently unfixable* (no patched 2.x exists). Either gate
    on `--omit=dev` (production dependency tree only) or allow-list the known build-time
    cluster, so the gate signals real exposure rather than crying wolf.
- **Keep triaging on *"does it reach the browser bundle?"*, not on the label.** Dependabot
  derives "runtime/development" scope from the manifest tree and mislabels build-only
  transitive deps. Both re-audit clusters confirm the heuristic: 8 of 10 findings are
  build-time, and the one runtime advisory affects a mode this app does not use. The two
  GitHub "criticals" are build-time *and* branch-stale — the label carried no signal at all.
- **Prune dead overrides when the toolchain changes** (New-3). Each toolchain removal —
  Jest, CRA/webpack, Babel, `@mui/lab` — should end with an overrides sweep. Five of nine
  entries are now inert.
- **The migration program keeps shrinking this surface structurally.** Vitest removed the
  jest/istanbul chain (proven above). Removing React/MUI/Formik/react-router (reports
  02–04) removes large transitive subtrees and resolves New-2 outright. Fewer build deps →
  fewer alerts.
- **Watch item, updated:** `keep-monaco-editor.ts` promoted `monaco-editor` to a *direct*
  dependency (**0.55.1**), and `prettier` (**3.9.6**) has since **moved from
  `devDependencies` to `dependencies`** and is now **lazily** loaded via dynamic
  `import('prettier/standalone' | '/plugins/babel' | '/plugins/estree')`
  (`keep-monaco-editor.ts:33–35`, PR #673) — which is why the entry chunk dropped from
  6.94 MB to 6.32 MB. Both packages are browser-reachable code, so their advisories matter
  more than the build-time noise above. Monaco was already the source of the only
  browser-reachable finding in Part 1 (DOMPurify). Neither is flagged today.
- **Prune dead dependencies too:** `@monaco-editor/loader ^1.7.0` and
  `@monaco-editor/react ^4.8.0-rc.3` remain in `dependencies` with **zero imports in
  `src`**. Unused production dependencies are pure alert surface — every advisory against
  them will be triaged for nothing.
