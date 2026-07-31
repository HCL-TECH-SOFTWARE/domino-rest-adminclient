# 05 — Dependency Vulnerability Triage & Remediation

Generated 2026-07-24 · Remediation applied & verified 2026-07-25 on branch
`fix/dependabot-alerts` · Re-audited 2026-07-27 on `7594672` and `e17010c` · Refreshed
2026-07-28 on `fcab645` · **Refreshed 2026-07-30 against `new_code` @ `0d5458c`.**

> ## ✅ `npm audit` is clean — and **all 16** Dependabot alerts are now branch skew
>
> | View | Computed on | Result |
> |---|---|---|
> | **GitHub Dependabot alerts** (the security tab) | default branch **`main`** | **16 open** — 2 critical, 8 high, 4 medium, 2 low |
> | **`npm audit`** | this branch, **`new_code` @ `0d5458c`** | ✅ **0 vulnerabilities** |
>
> **The gap has widened again: `main` is now 479 commits behind `new_code`** (was 160, and
> 80 before that). `git rev-list --count origin/main..origin/new_code` = **479**; the
> reverse count is **0** — `new_code` contains everything on `main`. Dependabot only ever
> scans the **default branch**. The GitHub security tab therefore describes a lockfile that
> is **not the one this branch ships**, and it is describing it more wrongly every week.
>
> ### The last two live advisories cleared this refresh
>
> The previous refresh found 14 of 16 alerts stale and **2 genuinely live** (121
> `brace-expansion`, 120 `react-router`). Both are now resolved, by opposite routes:
>
> - **121 — `brace-expansion` `<=5.0.7`.** The previous refresh called this "a wait, not a
>   task", because no fix was published. The fix landed: `brace-expansion@5.0.8` is
>   installed, and the `minimatch@^10.2.6` override carries it.
> - **120 — `react-router` RSC-mode CSRF bypass.** Cleared by **deletion, not a bump**.
>   #716 removed `react-router` and `react-router-dom` entirely and replaced them with a
>   2-file in-repo router at `src/router/` (97.8 % covered). The package is not installed at
>   any depth. That is the more durable fix — no future react-router advisory can apply to
>   this app.
>
> ### Every alert, resolved against the installed tree on this commit
>
> | Alert(s) | Package | Vulnerable range | `main` has | `new_code` resolves | Live here? |
> |---|---|---|---|---|:---:|
> | 109, 110, 111 | happy-dom | `<15.10.2`, `<20.0.0`, `<20.8.9` | **10.8.0** | **20.11.1** | ❌ |
> | 115, 116, 117, 118, **120** | react-router | `<7.18.0` (×4), `>=7.12.0 <8.3.0` | **7.17.0** | ➖ **not installed** (#716) | ❌ |
> | 119 | postcss | `<=8.5.17` | **8.5.15** | **8.5.23** | ❌ |
> | 108, **121** | brace-expansion | `>=3.0.0 <5.0.7`, `<=5.0.7` | 2.1.1 / 5.0.5 | **5.0.8** | ❌ |
> | 112 | brace-expansion | `>=2.0.0 <2.1.2` | 2.1.1 | *(no 2.x copy)* | ❌ |
> | 107, 113 | js-yaml | `<3.15.0` | 3.14.2 | **4.3.0** (+ a `^3.15.0` override under `@istanbuljs/load-nyc-config`) | ❌ |
> | 114 | dompurify | `<=3.4.11` | 3.4.11 | **3.4.12** | ❌ |
> | 105 | @babel/core | `<=7.29.0` | 7.29.0 | ➖ **not installed** (overridden `^7.29.6`) | ❌ |
>
> **0 of 16 are live.** This is the first refresh at which the two views agree in substance:
> `npm audit` reports nothing because there is nothing to report.
>
> ### The two criticals never existed in the code being shipped
>
> Alerts **109**/**110** are `happy-dom` matched against **`main`'s `happy-dom@10.8.0`**.
> `new_code` resolves **20.11.1**. Doubly non-urgent: `happy-dom` is not application code and
> is not even the test environment here — Vitest runs on **jsdom** (`vitest.config.ts`). It
> arrives via `@wyw-in-js/vite` and `vitest`, and never enters the browser bundle.
>
> **If you are reading the GitHub security tab: all 16 alerts are stale branch skew. Merge
> `new_code` and every one of them clears.** That is now the entire remediation.

> ## Status at a glance
>
> | | 2026-07-24 | `e17010c` | `fcab645` | **`0d5458c`** |
> |---|---|---|---|---|
> | GitHub Dependabot alerts (on `main`) | 9 | 9 | 16 | **16** — unchanged; **all now fixed here** |
> | of those, live on this branch | — | 2 | 2 | ✅ **0** |
> | `main` behind `new_code` | — | 80 commits | 160 | **479 commits** |
> | `npm audit` on this branch | 9 | 10 high | 10 high, 0 critical | ✅ **0 vulnerabilities** |
> | Root advisories behind that count | — | 2 | 2 | ✅ **0** |
> | Browser-reachable | 1 (DOMPurify, low) | 1 | 0 | ✅ **0** |
> | Overrides block | 9 entries, all load-bearing | 9: 4 live, 5 dead | 9 | ✅ **4 entries** — the dead ones deleted in `e27102f` |
> | `npm run lint` / `build` / `test` | — | ✅ / ✅ / ✅ | ✅ / ✅ / ✅ | ✅ / ✅ / ✅ |
>
> **Bottom line: the dependency-security work is done.** Two things closed it — a patch
> finally shipping for `brace-expansion`, and #716 deleting `react-router` rather than
> chasing its advisories. ✅ **The overrides audit is done too**: `e27102f` deleted the four
> dead entries this report had recommended removing for three refreshes, leaving `yaml`,
> `dompurify`, `jsdom` and `minimatch` — all four verified live.
>
> **The only thing left is not a security task at all: merge `new_code` so the security tab
> stops describing a lockfile nobody ships.**
>
> Tracked as **#699** — which can be closed.

---

## Part 1 — The original 9 alerts (fixed in `new_code`, still **open** on GitHub)

Triage of the **9 Dependabot alerts** open on `HCL-TECH-SOFTWARE/domino-rest-adminclient`
as of 2026-07-24, reported as **2 critical, 4 high, 1 moderate, 2 low**. (The API now
labels that one alert — 107 — `medium`; this report's 🟡 *moderate* is the same alert.)

**All 9 are still open, and 7 more have joined them.** Re-pulled 2026-07-28 via
`gh api .../dependabot/alerts`: the original **105, 107, 108, 109, 110, 111, 112, 113,
114** all remain `state: open`, plus **115–121** (five `react-router`, one `postcss`, one
`brace-expansion`). **Nothing has ever been closed** — because Dependabot evaluates
`main`, and the remediation lives 160 commits ahead of it. Of the 7 new alerts, six are
already fixed on `new_code` and one (**121**) is genuinely live; see the table at the top.

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

**Still true on 2026-07-30 @ `0d5458c`:** `happy-dom` resolves to a single patched
**20.11.1**; `dompurify` is **3.4.12**; `jsdom` is **29.1.1**; `js-yaml` is **4.3.0**;
`brace-expansion` is **5.0.8**; `minimatch` is **10.2.6**; `postcss` is **8.5.23**;
`@babel/core` is gone; and **`react-router` is gone entirely** (#716). None of the original 9
has returned to this branch. The suite has since grown to **133 test files / 1709 tests**,
all green.

---

## Part 2 — Re-audit 2026-07-30 (✅ clean)

`npm audit` on `new_code` @ `0d5458c` after a clean `npm ci`:

```
found 0 vulnerabilities
```

**Both root advisories behind the previous "10 high" have cleared**, and the sections below
are kept as the record of how — because the two routes were different and only one of them
was the one this report predicted.

| Root advisory | Previous status | Now | How |
|---|---|---|---|
| `brace-expansion` DoS (8 flagged packages) | 🟡 "a wait, not a task" — no 2.x fix published | ✅ cleared | The patch shipped. `brace-expansion@5.0.8` installed, carried by the `minimatch@^10.2.6` override |
| `react-router` RSC CSRF bypass (2 packages) | 🟡 not reachable — RSC unused | ✅ cleared | **#716 deleted the package**, replacing it with `src/router/`. Not a bump — the dependency is gone at every depth |

⚠️ **Note which prediction was right.** New-2 below argued that folding the `react-router`
fix into #716's migration was "strictly better than doing it twice". That is what happened,
and it is the more durable outcome: no future `react-router` advisory can apply to this app,
whereas a bump would have left it exposed to the next one.

### Historic detail (retained) — the clusters as they stood at `fcab645`

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

**Recommendation:** low urgency, and **still no action available** — re-verified on this
commit: `brace-expansion` resolves to a single **2.1.2** and `minimatch` to a single
**9.0.9**. Bump `@wyw-in-js/vite` (and therefore `@linaria/react`) when upstream ships a
`minimatch` that depends on `brace-expansion@>= 5.0.8`; that is the only path out. Do
**not** collapse the range-keyed overrides into one. Track, don't chase.

> **This is now Dependabot alert 121** as well as an `npm audit` finding — the first alert
> in this repository's history that is live on *both* branches. It is also the only one of
> the 16 that merging `new_code` will not clear.

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

**History, and it vindicates the 7.18.1 bump.** `6df3db5` (PR #648) moved the app to
**7.18.1**. Between the last refresh and this one, **four further react-router advisories
were published** — Dependabot alerts **115–118** — covering an unauthenticated
route-matching **DoS**, an **open redirect** via backslash in `<Link>`/`useNavigate`, an
**XSS** via `RSCErrorHandler`, and **arbitrary constructor injection** in
`deserializeErrors()`. Every one of them has a fixed version of **7.18.0**, so the app was
already patched before they were published. Only alert **120** (the RSC CSRF bypass,
`>=7.12.0 <8.3.0`) still matches 7.18.1, and RSC is not used here.

That is worth stating plainly because the headline did not move: `npm audit` said "10
high" at `e17010c` and says "10 high" now, while the actual exposure fell.

**Exposure assessment:** the advisory concerns **RSC (React Server Components) mode** —
server-side action execution before a 400 response. This app is a **pure client-side SPA**:
`src/App.tsx:9` imports `BrowserRouter as Router`, and there is **no** `createBrowserRouter`,
`RouterProvider`, or `@react-router/rsc` anywhere in `src`. **The affected code path is not
used.**

**Recommendation:**

1. **Do not run `npm audit fix --force`.** It downgrades to `react-router-dom@7.11.0` — a
   breaking change that trades a non-applicable advisory for real regression risk across
   the **31** files that import `react-router-dom`.
2. **"Watch for a forward fix in the 7.x line" is still not viable.** `7.18.1` is the
   newest published 7.x, and the vulnerable range (`>=7.12.0 <8.3.0`) covers all of it as
   well as `8.0.0`–`8.2.0`. The first non-vulnerable release is **`react-router@8.3.0`** —
   and `react-router-dom` has **no 8.x at all**. Taking the fix means moving all **29**
   importing files off the `react-router-dom` package onto `react-router@8`: a router
   migration, not a version bump.
3. Given (2), **report [`04-remove-react.md`](./04-remove-react.md) removes
   `react-router-dom` entirely** (§10, **#716**) and resolves this permanently. Since *any*
   real fix is a 29-file migration anyway, folding it into that work is strictly better
   than doing it twice.

### New-3 · Overrides audit — five entries are now dead config

The Vitest migration ([`01-vitest-and-coverage.md`](./01-vitest-and-coverage.md)) removed
the jest/istanbul chain exactly as predicted. **Re-verified against the installed tree at
`fcab645` — the block is unchanged and the verdicts still hold, so the five dead entries
are now a refresh older.** The block below is the current `package.json` verbatim:

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

✅ **DONE — the recommendation this report carried for three refreshes has landed.**
`e27102f` deleted `test-exclude`, `glob`, `@babel/core` and `@istanbuljs/load-nyc-config`
from `overrides`. The block is now **4** entries — `yaml`, `dompurify`, `jsdom` (`^30.0.1`)
and `minimatch` (`^10.2.6`) — and every one is live. The analysis below is retained as the
record of how the dead ones were identified. Dead overrides are worse than clutter — they create false confidence that a class
of problem is pinned when the pin no longer applies to anything, and `@babel/core` in
particular reads as "alert 105 is handled" when in fact the package is simply gone. Fold
this into **#699**.

### Reproduce

```bash
npm ci
npm audit                 # ✅ found 0 vulnerabilities
npm run lint              # ✅ exit 0
npm run typecheck         # ✅ exit 0
npm run build             # ✅ exit 0
npm run test              # ✅ exit 0 — 133 test files / 1709 tests
npm run bundle:budget     # ✅ 887.5 kB raw / 243.7 kB gzip
gh api repos/HCL-TECH-SOFTWARE/domino-rest-adminclient/dependabot/alerts \
  --paginate -q '.[] | select(.state=="open")'   # 16 open — but computed on `main`
git rev-list --count origin/main..origin/new_code   # 479
```

---

## Process recommendations

- 🔴 **Fix the branch skew — it is now the *only* remaining item, and the whole report
  reduces to it.** **All 16** open alerts, including both criticals, are artifacts of `main`
  trailing `new_code` by **479 commits** — triple the skew of the previous refresh. Until
  `new_code` lands, the security tab reports entirely on code nobody ships. The previous
  refresh's sharper complaint (that the skew was *hiding* a real finding) no longer applies,
  because there is no longer a real finding to hide — but the inverse cost has grown: **16
  open alerts on a repo with zero actual vulnerabilities** trains everyone to ignore the
  security tab, which is the state in which a genuine alert gets missed.
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
