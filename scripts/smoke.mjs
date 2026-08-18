/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * Post-build smoke gate: a real browser, a real Vite build, a real Worker, the real CSP.
 *
 * WHY THIS EXISTS. `npm test` cannot see anything this asserts, and that is not a gap to be
 * closed by writing more unit tests — it is structural:
 *
 *   - `keep-monaco-editor.test.ts` replaces `monaco-editor` **wholesale** with a fake. It has
 *     to: importing the real one evaluates the whole editor bundle, which reaches for
 *     `document.queryCommandSupported` at module scope and then wants a layout engine.
 *   - `keep-monaco-editor.lifecycle.test.ts` does use real Monaco, but only to catch
 *     dispose-ordering assertions. jsdom gives it no layout, no `Worker` that answers, and
 *     no CSP.
 *   - Every other suite mocks the component.
 *   - `npm run bundle:budget` measures the **eager** closure. Monaco is entirely lazy, so it
 *     could lose half its features without moving that number by one byte.
 *
 * #1002 is the shape of bug this catches: the shipped policy sends `style-src-elem 'self'`,
 * which refuses an inline `<style>` — so 308 kB of Monaco CSS was inert in production and the
 * editor rendered with no gutter and no syntax colours. Nothing looked broken in the DOM (a
 * refused `<style>` keeps its text and only loses its `.sheet`) and nothing looked broken in
 * dev, where the same policy is report-only. No unit test could have stated it.
 *
 * #1022 is the reason it exists *now*: tree-shaking Monaco replaces the everything-import
 * with an explicit list of what to register, and every way that list can be wrong is silent.
 * A contribution nobody imported does not throw — the suggest widget simply never opens, the
 * folding chevron is simply not there, the codicons are simply blank boxes. So what the
 * editor can actually do is asserted here, in `test/smoke/editor.ts`, or nowhere.
 *
 * WHAT IT DOES.
 *   1. Builds the pages in `PAGES` with the repo's own `vite.config.mts` — same SWC
 *      transform, same minifier, same chunking — into `.smoke/`. A separate build rather
 *      than extra entries in `dist/`, so no test scaffolding is ever shipped to a customer.
 *   2. Serves `.smoke/` over HTTP under the policy `jar/config/config.json` actually sends
 *      for `/admin/ui/*`, read from that file rather than copied, and **enforcing** rather
 *      than report-only. Not `vite dev`: the dev server invents violations that never ship
 *      (its HMR client is an inline script, dev-mode Lit injects `<style>` elements).
 *   3. Drives headless Chrome over the DevTools Protocol — Node's built-in WebSocket, no new
 *      dependency — and reads back what the browser-side half asserted.
 *
 * Console output, uncaught exceptions and log entries are captured from the page *and* from
 * auto-attached Worker targets, and printed on failure: when this goes red, a worker-side
 * throw or a CSP refusal is usually the evidence that explains it.
 *
 * USAGE
 *   node scripts/smoke.mjs                   build, serve under the shipped CSP, assert
 *   node scripts/smoke.mjs --csp '<policy>'  serve under a policy of your choosing
 *   node scripts/smoke.mjs --no-csp          serve with no CSP header at all
 *   node scripts/smoke.mjs --no-build        reuse the existing .smoke/ build
 *   node scripts/smoke.mjs --verbose         print browser output even on success
 *
 * Set CHROME_PATH if Chrome is not in one of the usual places.
 */

import fs from 'node:fs';
import path from 'node:path';
import { build } from 'vite';
import {
  attachToPage,
  cleanUp,
  cleanups,
  fail,
  findChrome,
  launchChrome,
  recordBrowserEvents,
  REPO_ROOT,
  serve,
  shippedCsp,
  usageFrom,
  waitForResult
} from './lib/browser.mjs';

const OUT_DIR = path.join(REPO_ROOT, '.smoke');

/**
 * The harness pages, driven in order in one browser against one build.
 *
 * Vite writes an HTML entry to its path relative to `root`, so each page keeps its source
 * layout and its URL is its own relative path.
 */
const PAGES = [
  { rel: 'test/smoke/editor.html', what: 'Monaco: JSON tokenising, its worker, its features, its styling' }
];

function parseArgs(argv) {
  const opts = { csp: shippedCsp(), verbose: false, doBuild: true };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--csp':
        opts.csp = argv[++i];
        if (opts.csp === undefined) fail('--csp needs a policy string');
        break;
      case '--no-csp':
        opts.csp = null;
        break;
      case '--verbose':
        opts.verbose = true;
        break;
      case '--no-build':
        opts.doBuild = false;
        break;
      case '-h':
      case '--help':
        process.stdout.write(usageFrom(import.meta.url));
        process.exit(0);
        break;
      default:
        fail(`unknown argument ${argv[i]} (try --help)`);
    }
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const chrome = findChrome();

  if (opts.doBuild) {
    /*
     * The repo's own config file, overridden only in where it writes to and what it builds.
     * Anything that changes how the app is bundled — the SWC decorator transform, the
     * minifier, the chunking — changes this build the same way, which is the entire reason
     * running it is worth anything.
     *
     * `input` is a merge, not a replacement: Vite unions it with the two entries
     * `vite.config.mts` declares. That is load-bearing rather than incidental —
     * `appearanceBootScript()` throws by design if the bundle has no `appearance-boot` entry
     * chunk, so a build that replaced the inputs outright would fail in that plugin for a
     * reason having nothing to do with Monaco.
     */
    await build({
      configFile: path.join(REPO_ROOT, 'vite.config.mts'),
      root: REPO_ROOT,
      logLevel: 'warn',
      build: {
        outDir: OUT_DIR,
        emptyOutDir: true,
        rollupOptions: {
          input: Object.fromEntries(
            PAGES.map((page) => [path.basename(page.rel, '.html'), path.join(REPO_ROOT, page.rel)])
          )
        }
      }
    });
  }
  for (const page of PAGES) {
    if (!fs.existsSync(path.join(OUT_DIR, page.rel))) {
      fail(`${path.relative(REPO_ROOT, path.join(OUT_DIR, page.rel))} is missing — build first`);
    }
  }

  const server = await serve(OUT_DIR, { csp: opts.csp });
  cleanups.push(() => server.close());

  const events = [];
  const results = new Map();
  try {
    const client = await launchChrome(chrome);
    recordBrowserEvents(client, events);
    const sessionId = await attachToPage(client);

    await client.send('Runtime.enable', {}, sessionId);
    await client.send('Log.enable', {}, sessionId);
    await client.send('Page.enable', {}, sessionId);
    // Worker targets: their console output and their CSP violations never reach the page.
    await client.send(
      'Target.setAutoAttach',
      { autoAttach: true, waitForDebuggerOnStart: true, flatten: true },
      sessionId
    );

    // One page at a time in the same tab. Each navigation replaces the document, so the
    // previous page's `__smokeResult` goes with it and cannot be mistaken for this one's.
    for (const page of PAGES) {
      await client.send('Page.navigate', { url: `http://127.0.0.1:${server.port}/${page.rel}` }, sessionId);
      results.set(page.rel, await waitForResult(client, sessionId, '__smokeResult'));
    }
    client.close();
  } finally {
    cleanUp();
  }

  const dump = () => {
    if (events.length === 0) process.stdout.write('  (the browser logged nothing)\n');
    for (const e of events) process.stdout.write(`  ${e}\n`);
  };

  process.stdout.write(`\nCSP: ${opts.csp ?? '(none sent)'}\n`);

  const failures = [];
  for (const page of PAGES) {
    const result = results.get(page.rel);
    process.stdout.write(`\n${page.rel} — ${page.what}\n`);
    if (result === undefined) {
      process.stdout.write('browser output:\n');
      dump();
      fail(`${page.rel} never published a result — the page did not finish (see above)`);
    }
    for (const check of result.checks) {
      const mark = check.ok ? '\x1b[32m  ok  \x1b[0m' : '\x1b[31m FAIL \x1b[0m';
      process.stdout.write(`${mark} ${check.name}: ${check.detail}\n`);
    }
    failures.push(...result.checks.filter((c) => !c.ok).map((c) => c.name));
  }

  /*
   * A refused resource is invisible in the DOM — that is the whole lesson of #1002 — so the
   * reports are asserted on directly rather than inferred from what rendered.
   *
   * Two are known, both found by this gate on its first run and both filed. They are in
   * Monaco's own bundle (`source-file` is `editor.api-*.js`, not our source), so neither is
   * something a change here introduced, and neither is in scope for the gate that found
   * them. They are allowlisted by signature rather than by count: a *new* violation, or one
   * of these moving to a different directive, still fails.
   *
   * Delete an entry the moment its issue closes — an allowlist nobody prunes is how a gate
   * stops meaning anything.
   */
  const KNOWN_VIOLATIONS = [
    {
      directive: 'style-src-attr',
      sample: 'position:absolute;top:0px;width:10px',
      why: '#1024 — Monaco sets the scrollbar slider geometry with setAttribute(\'style\'), which ' +
        'never passes through the createTrustedTypesPolicy hook monaco-inline-styles.ts uses'
    },
    {
      directive: 'style-src-elem',
      sample: '.monaco-list.list_id_1:focus',
      why: '#1024 — the suggest widget\'s list builds a <style> element outside the editor ' +
        'container, so neither installDocumentHeadAdoption() nor adoptStyleElements() sees it'
    }
  ];

  const unexpected = [];
  for (const raw of server.violations) {
    let report;
    try {
      report = JSON.parse(raw)['csp-report'] ?? {};
    } catch {
      unexpected.push(raw);
      continue;
    }
    const known = KNOWN_VIOLATIONS.find(
      (k) =>
        k.directive === report['effective-directive'] &&
        String(report['script-sample'] ?? '').startsWith(k.sample)
    );
    if (known) {
      process.stdout.write(`\x1b[33m known \x1b[0m ${known.directive}: ${known.why}\n`);
    } else {
      unexpected.push(raw);
    }
  }
  if (unexpected.length > 0) {
    process.stdout.write(`\n\x1b[31m${unexpected.length} unexpected CSP violation(s):\x1b[0m\n`);
    for (const v of unexpected) process.stdout.write(`  ${v}\n`);
    failures.push('no-new-csp-violations');
  }

  if (opts.verbose || failures.length > 0) {
    process.stdout.write('browser output:\n');
    dump();
  }

  /*
   * Guards against a vacuous pass. Every worker assertion below would also be "green" in a
   * browser that simply has no `Worker`, which is exactly how jsdom lets the unit suite stay
   * green over a broken one.
   */
  const workerCapable = results.get(PAGES[0].rel)?.workerConstructor;
  if (!workerCapable) fail('this browser has no Worker constructor, so the worker checks proved nothing');

  if (failures.length > 0) fail(`failing checks: ${failures.join(', ')}`);
  process.stdout.write(
    '\n\x1b[32mMonaco mounts, tokenises, formats and is answered by its worker — in a real ' +
      'browser, against a real build, under the policy Keep actually ships.\x1b[0m\n'
  );
}

await main();
