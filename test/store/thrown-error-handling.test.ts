/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Level, Logger } from '../../src/services/log-service';
import {
  fetchFolders,
  fetchViews,
  fetchAgents,
  fetchFields,
  fetchScopes,
  pullForms,
} from '../../src/store/databases/action';
// apiRequestWithRetry notifies through a <keep-alert> on its error paths.
import '../../src/components/keep-elements/keep-alert';

/**
 * #1000 — a store thunk's `catch` must complete, whatever went wrong inside its `try`.
 *
 * ## The bug
 *
 * 25 catch blocks across 11 modules read the thrown error like this:
 *
 * ```ts
 * const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
 * const error = JSON.parse(err)
 * ```
 *
 * That is right for the case it was written for — the API layer throws
 * `new Error(JSON.stringify(body))`, so the message really is JSON. **Every other failure
 * inside the same `try` was destroyed by it.** A `TypeError` from a response shape change
 * does not parse, so `JSON.parse` threw a `SyntaxError` *out of the catch block*: the handler
 * never completed, nothing was logged, no loading flag was cleared, and the original fault —
 * the one worth reading — was gone.
 *
 * Three sites had been patched around it by moving `setApiLoading(false)` *above* the parse,
 * with comments saying why. That is the shape of a bug that needs fixing at the root.
 *
 * ## What these cases do
 *
 * Each drives one module's fetch thunk against an `ok` response whose body is the wrong
 * shape, which makes the thunk dereference something undefined — the exact fault the issue
 * reproduced (`data.folders.map` on `undefined`).
 *
 * Two assertions per module, and the second is what keeps the first honest:
 *
 *   1. the thunk **resolves** — the catch ran to its end rather than throwing again;
 *   2. the failure was **reported**, in a log line or a dispatched action, and the text names
 *      the underlying fault.
 *
 * Without (2) a stub that failed to provoke any error at all would satisfy (1) trivially.
 *
 * Same family as `test/utils/api-retry.test.ts`'s `notifyOnError` cases (#949) and the
 * {@link ApiResult} contract (#800): a handler that can throw is a handler that does not run.
 */

const ROOT = resolve(process.cwd());

/** An `ok` response carrying a body the thunk under test does not expect. */
const wrongShape = (body: unknown) =>
  ({
    ok: true,
    status: 200,
    statusText: 'stubbed',
    headers: { get: () => 'application/json' },
    json: async () => body,
  }) as unknown as Response;

/**
 * Text of the fault, however the thunk chose to report it.
 *
 * Deliberately not a bare `/undefined/` — that matched incidental text and would have let a
 * stub that provoked nothing satisfy the non-vacuity check. Every case is confirmed to match
 * a real fault: "Cannot read properties of undefined (reading 'map')" for the three that map
 * a named array, "scopes.filter is not a function" for scopes, and "Cannot read properties of
 * null (reading 'type')" for fields.
 */
const FAULT = /cannot read|is not a function|is not iterable|undefined is not/i;

describe('store thunks survive a non-API error in their try (#1000)', () => {
  let dispatch: any;
  let reported: string[];
  let previousLevel: number;
  let previousTarget: any;

  beforeAll(() => {
    previousLevel = Logger.getLevel();
    previousTarget = Logger.logTarget[Level.ERROR];
  });

  afterAll(() => {
    Logger.setLevel(previousLevel);
    Logger.setLogTarget(Level.ERROR, previousTarget);
  });

  beforeEach(() => {
    reported = [];
    Logger.setLevel(Level.ERROR);
    Logger.setLogTarget(Level.ERROR, (...args: unknown[]) => {
      reported.push(args.map((a) => JSON.stringify(a) ?? String(a)).join(' '));
    });

    // Thunks here dispatch other thunks, so the stub has to run them.
    const d: any = vi.fn((action: any) => {
      if (typeof action === 'function') return action(d);
      reported.push(JSON.stringify(action) ?? String(action));
      return action;
    });
    dispatch = d;

    localStorage.setItem('user_token', JSON.stringify({ bearer: 'a-bearer' }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  /**
   * One case per module whose `try` actually dereferences the response, with a body chosen to
   * make that dereference fail. The bodies differ because the thunks differ — an empty object
   * is enough for the three that map a named array, but `fetchScopes` guards on `.length` and
   * `fetchFields` iterates keys, so each needs a shape that gets past its guard and then
   * fails.
   */
  const cases: Array<[string, unknown, () => Promise<unknown>]> = [
    // `data.views.map` / `data.folders.map` / `data.agents.map` on undefined — the issue's
    // own repro.
    ['databases/folders', {}, () => fetchFolders('db.nsf', '/n.nsf')(dispatch)],
    ['databases/views', {}, () => fetchViews('db.nsf', '/n.nsf')(dispatch)],
    ['databases/agents', {}, () => fetchAgents('db.nsf', '/n.nsf')(dispatch)],
    // Past `scopes && scopes.length > 0`, then `.filter` is not a function. An endpoint
    // answering with an object where the client expects an array is the realistic shape here.
    ['databases/scopes', { length: 2 }, () => fetchScopes()(dispatch)],
    // `for (const key in data)` reaches `field.type` on a null entry.
    [
      'databases/fields',
      { someField: null },
      () => fetchFields('schema', '/n.nsf', 'Form', 'Form', 'design')(dispatch),
    ],
  ];

  it.each(cases)('%s completes its catch and reports the fault', async (_name, body, run) => {
    vi.stubGlobal('fetch', vi.fn(async () => wrongShape(body)));

    await expect(run()).resolves.not.toThrow();
    expect(
      reported.some((line) => FAULT.test(line)),
      `nothing reported the underlying fault, so this case proves nothing — the stub body ` +
        `did not provoke an error inside the try.\n${reported.join('\n')}`,
    ).toBe(true);
  });

  it('is not reachable in pullForms, whose try only dispatches', async () => {
    // Recorded rather than skipped. `pullForms`'s `try` holds the fetch and one dispatch, so
    // the only throw it can catch is its own `new Error(JSON.stringify(data))` — which is
    // JSON and always parsed cleanly. The bug was **latent** there, not live, and the same is
    // true of several of the 25 sites. Worth stating: the fix is uniform, the exposure was
    // not, and a reader comparing this table against the issue's list should know why it is
    // shorter.
    vi.stubGlobal('fetch', vi.fn(async () => wrongShape({ design: [] })));

    await expect(pullForms('/n.nsf')(dispatch)).resolves.not.toThrow();
    expect(reported.some((line) => FAULT.test(line))).toBe(false);
  });

  it('leaves no unguarded parse of an error message in the store', () => {
    // The import scan's companion: the fix is only durable if the idiom does not come back
    // by copy-paste, which is how it reached 25 sites. Comment lines are stripped, because
    // the docblock above quotes the very code it bans.
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        return entry.isDirectory() ? walk(path) : [path];
      });

    const sources = walk(resolve(ROOT, 'src/store'))
      .filter((file) => file.endsWith('.ts'))
      .map((file) => ({
        file: file.slice(ROOT.length + 1),
        code: readFileSync(file, 'utf8')
          .split('\n')
          .filter((line) => !/^\s*(\/\/|\/?\*)/.test(line))
          .join('\n'),
      }));

    expect(sources.length, 'no store sources found — did src/store move?').toBeGreaterThan(20);

    const offenders = sources
      .filter(({ code }) => /JSON\.parse\(\s*err\b/.test(code))
      .map(({ file }) => file);

    expect(
      offenders,
      `these parse a thrown error's message unguarded: ${offenders.join(', ')}\n\n` +
        'Use `parseThrownError` from utils/api-retry — it keeps the raw message when the ' +
        'throw was not an API error, instead of throwing a SyntaxError out of the catch.',
    ).toEqual([]);
  });
});
