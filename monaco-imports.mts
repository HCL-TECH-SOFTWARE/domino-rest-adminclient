/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * Build-time guard on `src/monaco-registrations.ts`.
 *
 * That file replaced `import 'monaco-editor'` with an explicit list of what to register
 * (#1022), and it has two failure modes that are both **completely silent**. Neither throws,
 * neither warns, and neither is visible in a green build:
 *
 * 1. **A specifier stops resolving.** Eight of the imports are deep paths that work only
 *    through 0.56's catch-all `exports` map rather than a published entry point, and #1021
 *    already watched this package break every import we had *without moving a single file*.
 *    An unresolvable import is caught by the bundler — but only for the paths a build
 *    actually reaches, and a bad *specifier* here would be reported far from its cause.
 *
 * 2. **Monaco grows a feature we never register.** This is the one real weakness of a
 *    denylist. An upgrade adds `features/somethingNew/`, nobody notices, and the editor
 *    quietly lacks it forever. No test can see the absence of a contribution nobody wrote a
 *    test for.
 *
 * 3. **Monaco changes what the registers cover.** The eight deep paths are not a list
 *    someone eyeballed once; they are *derived* — the imports in `esm/vs/index.js` that no
 *    `features/<x>/register` and no language register pulls in. If a future version folds
 *    one of them into a register, or adds a ninth, that set changes and this notices.
 *
 * So all three are re-checked on every build, against the installed package rather than
 * against a copy of what it looked like when this was written.
 *
 * Runs as a Vite plugin from `vite.config.mts`, which means it also runs for the smoke
 * build in `scripts/smoke.mjs` — the two gates that matter for Monaco cannot diverge.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const REPO_ROOT = path.dirname(fileURLToPath(import.meta.url));
const REGISTRATIONS = path.join(REPO_ROOT, 'src/monaco-registrations.ts');

/** Where the package keeps its ESM tree, resolved rather than assumed. */
const VS = path.resolve(path.dirname(require.resolve('monaco-editor')), '../../esm/vs');

/**
 * Features Monaco ships that we deliberately do not register, each with the reason.
 *
 * Keep this short and keep the reasons specific. Every entry is a capability the editor no
 * longer has, and the cost of being wrong is silent — so an entry needs to be worth more
 * than the bytes it saves.
 */
const DENIED_FEATURES = new Map([
  [
    'inlineCompletions',
    'nothing registers an inline-completion provider, and #1023 established there is no ' +
      'completion provider of any kind. The suggest widget is a separate feature and stays ' +
      '(features/suggest plus the suggestController deep path); that they are separable is a ' +
      'claim about the module graph, so test/smoke/editor.ts asserts the behaviour.'
  ]
]);

/**
 * Things `esm/vs/index.js` pulls in that we knowingly leave out, each with the reason. Any
 * *other* uncovered import is a build failure.
 */
const KNOWN_UNREGISTERED = new Map([
  [
    'external/monaco-lsp-client/out/index.js',
    'the native LSP client `index.js` exports as `lsp`. Nothing in this app calls it.'
  ],
  [
    'base/browser/ui/codicons/codicon/codicon-modifiers.css',
    '948 bytes animating .codicon-modifier-spin, which this app never shows — and ' +
      'unreachable by name anyway, since the catch-all exports map appends .js to it ' +
      '(see monaco-css.mts).'
  ]
]);

/** Every `import '…'` specifier in a file, in source order. */
function importsOf(file: string): string[] {
  return [...fs.readFileSync(file, 'utf8').matchAll(/^import\s+(?:.*?from\s+)?'([^']+)'/gm)].map(
    (match) => match[1]!
  );
}

/** The same, resolved to absolute paths relative to `base` — for reading Monaco's own tree. */
function resolvedImportsOf(file: string, base: string): string[] {
  return importsOf(file).map((specifier) => path.normalize(path.join(base, specifier)));
}

function problem(what: string, detail: string): never {
  throw new Error(
    `monaco-registrations.ts: ${what}\n\n${detail}\n\n` +
      'This is a build-time guard because the failure it describes is silent at runtime: a ' +
      'contribution nobody imported does not throw, it just never appears. See #1022.'
  );
}

/**
 * Fails the build unless the registration list is complete and every specifier in it still
 * resolves. Called from `vite.config.mts`.
 */
export function assertMonacoImports(): void {
  const declared = importsOf(REGISTRATIONS);

  /* 1 — every specifier still resolves. */
  const unresolvable = declared.filter((specifier) => {
    try {
      require.resolve(specifier);
      return false;
    } catch {
      return true;
    }
  });
  if (unresolvable.length > 0) {
    problem(
      `${unresolvable.length} import(s) no longer resolve`,
      `${unresolvable.map((s) => `  ${s}`).join('\n')}\n\n` +
        "Monaco 0.56's exports map is a catch-all — `\"./*\": \"./esm/vs/*.js\"` — so these " +
        'names are answered by file layout rather than by a published entry point. If the ' +
        'layout changed, find where each module moved to and update the import.'
    );
  }

  /* 2 — no feature is shipped that we neither register nor deny. */
  const shipped = fs
    .readdirSync(path.join(VS, 'features'))
    .filter((entry) => !entry.startsWith('register.all'))
    .sort();
  const registered = new Set(
    declared
      .map((specifier) => /^monaco-editor\/features\/([^/]+)\/register$/.exec(specifier)?.[1])
      .filter((name): name is string => Boolean(name))
  );
  const unaccounted = shipped.filter((name) => !registered.has(name) && !DENIED_FEATURES.has(name));
  if (unaccounted.length > 0) {
    problem(
      `Monaco ships ${unaccounted.length} feature(s) this file neither registers nor denies`,
      `${unaccounted.map((name) => `  ${name}`).join('\n')}\n\n` +
        'Add an import for each in the FEATURES block, or add it to DENIED_FEATURES in ' +
        'monaco-imports.mts with a reason. Adding the import is almost always right: the ' +
        'list is a denylist precisely so that a new feature arrives switched on.'
    );
  }
  // A denied feature that Monaco has since dropped means the entry is now a lie about the
  // package. Cheap to notice, and it keeps the reasons above honest.
  const staleDenials = [...DENIED_FEATURES.keys()].filter((name) => !shipped.includes(name));
  if (staleDenials.length > 0) {
    problem(
      `DENIED_FEATURES names ${staleDenials.length} feature(s) Monaco no longer ships`,
      `${staleDenials.map((name) => `  ${name}`).join('\n')}\n\nRemove them from DENIED_FEATURES.`
    );
  }

  /* 3 — the derived deep-path set still matches what index.js needs. */
  const covered = new Set<string>();
  for (const dir of fs.readdirSync(path.join(VS, 'features'))) {
    const register = path.join(VS, 'features', dir, 'register.js');
    if (fs.existsSync(register)) {
      for (const imported of resolvedImportsOf(register, path.join(VS, 'features', dir))) {
        covered.add(imported);
      }
    }
  }
  for (const dir of fs.readdirSync(path.join(VS, 'languages/definitions'))) {
    covered.add(path.normalize(path.join(VS, 'languages/definitions', dir, 'register.js')));
  }
  for (const dir of fs.readdirSync(path.join(VS, 'languages/features'))) {
    covered.add(path.normalize(path.join(VS, 'languages/features', dir, 'register.js')));
  }

  const declaredFiles = new Set(declared.map((specifier) => require.resolve(specifier)));
  const missing = resolvedImportsOf(path.join(VS, 'index.js'), VS)
    .filter((imported) => !covered.has(imported))
    .filter((imported) => !declaredFiles.has(imported))
    .filter((imported) => {
      const relative = path.relative(VS, imported).split(path.sep).join('/');
      // `esm/external/...` sits outside `esm/vs`, so it arrives as a `../` path.
      const key = relative.startsWith('../') ? relative.replace(/^\.\.\//, '') : relative;
      return !KNOWN_UNREGISTERED.has(key);
    });
  if (missing.length > 0) {
    problem(
      `${missing.length} module(s) that esm/vs/index.js loads are covered by nothing`,
      `${missing.map((file) => `  ${path.relative(VS, file)}`).join('\n')}\n\n` +
        'These are the deep paths: modules the everything-entry pulls in that no ' +
        '`features/<x>/register` covers. Either add an import for each to the DEEP PATHS ' +
        'block, or add it to KNOWN_UNREGISTERED in monaco-imports.mts with a reason. ' +
        'The sharpest of them is suggestController — without it the suggest widget does ' +
        'not exist, with no error anywhere.'
    );
  }
}
