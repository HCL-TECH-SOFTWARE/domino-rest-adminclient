/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

/**
 * The half of a real-browser gate that is not about what is being asserted: find Chrome,
 * serve a directory under a policy, speak the DevTools Protocol, and tear all of it down.
 *
 * Separated from `scripts/smoke.mjs` so that file contains only what it claims, and so the
 * next gate that needs a browser does not re-derive the awkward parts: the
 * `DevToolsActivePort` race, rejecting in-flight commands when the browser dies so a failure
 * reports instead of hanging, and tearing down a headless Chrome on a path that calls
 * `process.exit`.
 *
 * **No new dependency, on purpose.** Chrome is driven over CDP with Node's built-in
 * `WebSocket` (Node >= 22; `package.json` requires >= 24). A browser-test framework would
 * pull in a browser provider and a download step, which is exactly the kind of thing that
 * makes a gate get skipped in CI — and a skipped gate gates nothing.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * What a failure calls itself, taken from the script being run rather than passed in, so a
 * new gate cannot forget to name itself or report under someone else's name.
 */
const LABEL = path.basename(process.argv[1] ?? 'harness', '.mjs');

/**
 * Registered teardown. {@link fail} exits the process outright, so without this a failure
 * part-way through would leave a headless Chrome running and a port bound — on a gate meant
 * to be run repeatedly, that turns one red run into a machine nobody can get a green one on.
 */
export const cleanups = [];

export function cleanUp() {
  while (cleanups.length > 0) {
    try {
      cleanups.pop()();
    } catch {
      // Teardown is best-effort; a failure here must not mask the reason we are tearing down.
    }
  }
}

export function fail(message) {
  cleanUp();
  process.stderr.write(`\x1b[31m${LABEL}: ${message}\x1b[0m\n`);
  process.exit(1);
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A script's own `USAGE` block, read back out of its header comment rather than duplicated. */
export function usageFrom(fileUrl) {
  // [1], not [0]: every script here opens with the licence block, so the doc comment that
  // carries USAGE is the second one.
  const header = fs.readFileSync(fileURLToPath(fileUrl), 'utf8').split('*/')[1] ?? '';
  const lines = header
    .split('\n')
    .filter((line) => line.trimStart().startsWith('*'))
    .map((line) => line.replace(/^\s*\* ?/, ''));
  const from = lines.indexOf('USAGE');
  return from < 0
    ? `see the header comment in ${path.basename(fileURLToPath(fileUrl))}\n`
    : `${lines.slice(from + 1).join('\n').trim()}\n`;
}

/**
 * The Content-Security-Policy Keep actually serves the admin UI under, read out of
 * `jar/config/config.json` rather than copied into this file.
 *
 * Copying it would be the obvious thing and the wrong one. The whole claim of this gate is
 * "the editor works under the policy we ship"; a hardcoded copy makes that claim about a
 * policy that was true when someone last pasted it. `vite.config.mts` already mirrors this
 * same policy by hand for the dev server, and the comment there records that an earlier
 * mismatch — dev sending `style-src-attr 'unsafe-inline'` where production sends `'none'` —
 * is exactly how #685's inline styles went unnoticed. One reader, one source of truth.
 *
 * @param route - the config key to read. `/admin/ui/*` is what serves the built assets.
 */
export function shippedCsp(route = '/admin/ui/*') {
  const file = path.resolve(REPO_ROOT, 'jar/config/config.json');
  const entry = JSON.parse(fs.readFileSync(file, 'utf8'))?.webapps?.webjars?.[route];
  if (!entry?.csp) {
    fail(
      `no csp for "${route}" in jar/config/config.json. That file is where the shipped policy ` +
        'lives; if the route was renamed, point shippedCsp() at the new one rather than ' +
        'hardcoding a policy here — a gate running under a stale policy proves nothing.'
    );
  }
  return entry.csp.replace(/\s+/g, ' ').trim();
}

/** The repository root, two directories up from `scripts/lib/`. */
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** Chrome is a hard requirement, not an optional extra: a skipped browser check gates nothing. */
export function findChrome() {
  // An explicit CHROME_PATH that does not exist is an error, not a hint. Falling back to
  // whatever else is installed would run the gate against a browser nobody asked for.
  if (process.env.CHROME_PATH && !fs.existsSync(process.env.CHROME_PATH)) {
    fail(`CHROME_PATH is set to ${process.env.CHROME_PATH}, which does not exist`);
  }
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  const found = candidates.find((c) => fs.existsSync(c));
  if (!found) {
    fail(
      'no Chrome found. This gate needs a real browser: what it asserts — that Monaco is ' +
        'styled, tokenised and answered by its worker under the shipped CSP — cannot be ' +
        'expressed as a unit test, because the suite mocks monaco-editor wholesale and jsdom ' +
        `has no layout, no Worker and no CSP. Install Chrome or set CHROME_PATH. Looked in:\n  ${candidates.join('\n  ')}`
    );
  }
  return found;
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function listen(server, port, host) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.removeListener('error', reject);
      resolve(server.address().port);
    });
  });
}

/**
 * Serves `dir` over HTTP under an optional Content-Security-Policy.
 *
 * The policy goes on **every** response, not just the document. A Worker loaded from a
 * network URL takes its CSP from its own response headers, so a policy applied to the HTML
 * alone would be testing something a real server-wide header does not do — and Monaco's
 * language services are workers.
 *
 * `report-uri` is honoured too: violations are POSTed back here and collected, so the gate
 * can assert on them rather than only on what the page managed to render. A refused
 * stylesheet is invisible in the DOM (#1002) but always shows up as a report.
 *
 * @returns the bound port, a `violations` array that fills as they arrive, and `close()`
 */
export async function serve(dir, { csp = null, port = 0 } = {}) {
  const violations = [];
  const root = path.resolve(dir);

  const handler = (req, res) => {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);

    // Whatever `report-uri` in the policy points at. Collected rather than merely 204'd:
    // this is the only channel through which a *refused* resource announces itself.
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        violations.push(body);
        res.writeHead(204).end();
      });
      return;
    }

    const file = path.resolve(root, `.${urlPath}`);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.statusCode = 404;
      res.end('not found');
      return;
    }
    if (csp) res.setHeader('Content-Security-Policy', csp);
    res.setHeader('Content-Type', MIME[path.extname(file)] ?? 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  };

  const server = http.createServer(handler);
  const bound = await listen(server, port, '127.0.0.1').catch((err) =>
    fail(`could not serve ${dir} — ${err.message}`)
  );
  return { port: bound, violations, close: () => server.close() };
}

/** Minimal CDP client over Node's built-in WebSocket. Flat sessions, so one socket sees workers too. */
export function connect(url) {
  const ws = new WebSocket(url);
  const pending = new Map();
  const listeners = [];
  let nextId = 0;

  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id === undefined) {
      for (const fn of listeners) fn(msg);
      return;
    }
    const slot = pending.get(msg.id);
    if (!slot) return;
    pending.delete(msg.id);
    if (msg.error) slot.reject(new Error(`${slot.method}: ${msg.error.message}`));
    else slot.resolve(msg.result);
  });

  // A browser that dies mid-run would otherwise leave every in-flight command pending
  // forever, and the gate would hang instead of reporting anything.
  ws.addEventListener('close', () => {
    for (const slot of pending.values()) {
      slot.reject(new Error(`${slot.method}: the browser closed the DevTools connection`));
    }
    pending.clear();
  });

  return {
    ready: new Promise((resolve, reject) => {
      ws.addEventListener('open', () => resolve(), { once: true });
      ws.addEventListener('error', () => reject(new Error('could not open a DevTools connection')), {
        once: true
      });
    }),
    on: (fn) => listeners.push(fn),
    send(method, params = {}, sessionId) {
      const id = ++nextId;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, method });
        ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      });
    },
    close: () => ws.close()
  };
}

async function waitForDevToolsPort(userDataDir, chromeExited) {
  const portFile = path.join(userDataDir, 'DevToolsActivePort');
  for (let i = 0; i < 200; i++) {
    if (chromeExited.value) {
      fail(`Chrome exited before it opened a DevTools port:\n${chromeExited.output}`);
    }
    if (fs.existsSync(portFile)) {
      const [devtoolsPort, wsPath] = fs.readFileSync(portFile, 'utf8').trim().split('\n');
      if (devtoolsPort && wsPath) return `ws://127.0.0.1:${devtoolsPort}${wsPath}`;
    }
    await sleep(50);
  }
  fail('Chrome never wrote a DevToolsActivePort file');
}

/**
 * Launches headless Chrome on a throwaway profile and returns a connected CDP client.
 * Registers its own teardown, so a caller that never reaches its own cleanup still does not
 * leak a browser.
 */
export async function launchChrome(chrome, { extraArgs = [] } = {}) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keep-smoke-'));
  cleanups.push(() => fs.rmSync(userDataDir, { recursive: true, force: true }));
  const chromeExited = { value: false, output: '' };

  const child = spawn(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--disable-background-networking',
      `--user-data-dir=${userDataDir}`,
      '--remote-debugging-port=0',
      ...extraArgs,
      'about:blank'
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  cleanups.push(() => child.kill('SIGKILL'));
  child.stdout.on('data', (d) => (chromeExited.output += d));
  child.stderr.on('data', (d) => (chromeExited.output += d));
  child.on('exit', () => (chromeExited.value = true));

  const client = connect(await waitForDevToolsPort(userDataDir, chromeExited));
  await client.ready;
  return client;
}

/** Attaches to the page target Chrome opened for `about:blank`, flat-session style. */
export async function attachToPage(client) {
  const targets = await client.send('Target.getTargets');
  const page = targets.targetInfos.find((t) => t.type === 'page');
  if (!page) fail('Chrome opened no page target');
  const { sessionId } = await client.send('Target.attachToTarget', {
    targetId: page.targetId,
    flatten: true
  });
  return sessionId;
}

/**
 * Records console output, uncaught exceptions and browser log entries into `events`, from the
 * page *and* from any target that auto-attaches.
 *
 * The worker half is the point: Monaco's language services run in workers, and a worker's
 * console output and its CSP violations do not surface on the page at all. When this gate
 * goes red, a worker-side throw is usually the evidence that explains it.
 */
export function recordBrowserEvents(client, events) {
  client.on((msg) => {
    const where = msg.sessionId ? `session ${msg.sessionId.slice(0, 8)}` : 'browser';
    if (msg.method === 'Runtime.consoleAPICalled') {
      const text = (msg.params.args ?? []).map((a) => a.value ?? a.description ?? a.type).join(' ');
      events.push(`[${where}] console.${msg.params.type}: ${text}`);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails;
      events.push(`[${where}] uncaught: ${d.exception?.description ?? d.text}`);
    } else if (msg.method === 'Log.entryAdded') {
      events.push(`[${where}] log(${msg.params.entry.source}/${msg.params.entry.level}): ${msg.params.entry.text}`);
    } else if (msg.method === 'Target.attachedToTarget') {
      const sid = msg.params.sessionId;
      events.push(`[${where}] attached ${msg.params.targetInfo.type}: ${msg.params.targetInfo.url}`);
      void client.send('Runtime.enable', {}, sid);
      void client.send('Log.enable', {}, sid);
      void client.send('Runtime.runIfWaitingForDebugger', {}, sid);
    }
  });
}

/**
 * Polls the page for a value the browser-side half publishes on `window` when it is done.
 *
 * A poll and not a promise: the navigation swaps execution contexts, so an `evaluate` that
 * lands in the gap throws, and the only robust reading is "ask again".
 */
export async function waitForResult(client, sessionId, globalName, { timeoutMs = 60_000 } = {}) {
  for (let waited = 0; waited < timeoutMs; waited += 100) {
    await sleep(100);
    try {
      const evaluated = await client.send(
        'Runtime.evaluate',
        { expression: `window.${globalName} ?? null`, returnByValue: true, awaitPromise: false },
        sessionId
      );
      const value = evaluated.result?.value ?? undefined;
      if (value !== undefined && value !== null) return value;
    } catch {
      // Expected while the execution context is being replaced.
    }
  }
  return undefined;
}
