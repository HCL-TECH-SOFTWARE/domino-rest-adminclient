/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startupFailure, waitForDevToolsPort } from '../scripts/lib/browser.mjs';

/**
 * The launch half of the real-browser gate — the part that decides whether Chrome came up.
 *
 * This exists because that decision was wrong in a way no assertion could see. Run
 * 34251416387 failed `npm run smoke` with the single line "Chrome never wrote a
 * DevToolsActivePort file", on a commit that changed three comments and nothing else, whose
 * parent had passed the very same step six minutes earlier in 2.7 seconds. The gate was
 * red on a tree that worked.
 *
 * The cause was a budget written as a loop count — 200 turns of a 50 ms poll — which reads
 * like a retry policy and behaves like a ten-second deadline. Chrome needs 200–400 ms here
 * and well under a second on a warm runner, so the number looked generous and was, right up
 * until a cold start on a contended runner walked past it.
 *
 * A timing budget cannot be tested by waiting for it, so what is pinned instead is
 * everything around it: that the poll keeps waiting across many turns rather than sampling
 * once, that it tolerates the half-written file Chrome genuinely produces, and that a
 * failure carries the browser's own output — which the old timeout path threw away, leaving
 * that CI run undiagnosable after the fact.
 */

const dirs: string[] = [];
const tempProfile = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'keep-startup-test-'));
  dirs.push(dir);
  return dir;
};

afterEach(() => {
  while (dirs.length > 0) fs.rmSync(dirs.pop()!, { recursive: true, force: true });
});

/** Chrome is alive and has said nothing — the state during a normal, slow start. */
const starting = () => ({ value: false, output: '' });

describe('waitForDevToolsPort', () => {
  it('reads the port and the socket path Chrome wrote', async () => {
    const dir = tempProfile();
    fs.writeFileSync(path.join(dir, 'DevToolsActivePort'), '54321\n/devtools/browser/abc-123\n');

    await expect(waitForDevToolsPort(dir, starting())).resolves.toBe(
      'ws://127.0.0.1:54321/devtools/browser/abc-123',
    );
  });

  it('keeps waiting while Chrome is still starting, rather than sampling once', async () => {
    const dir = tempProfile();
    const file = path.join(dir, 'DevToolsActivePort');

    // Deliberately many poll turns away: with pollMs at 5 this lands somewhere past the
    // fortieth read. A budget expressed as a number of turns is what broke in CI, so the
    // guard is that turns are not what runs out.
    setTimeout(() => fs.writeFileSync(file, '9222\n/devtools/browser/late\n'), 200);

    await expect(waitForDevToolsPort(dir, starting(), { timeoutMs: 10_000, pollMs: 5 })).resolves.toBe(
      'ws://127.0.0.1:9222/devtools/browser/late',
    );
  });

  it('does not read a DevToolsActivePort file that is only half written', async () => {
    const dir = tempProfile();
    const file = path.join(dir, 'DevToolsActivePort');

    // The file appears before it is complete. Chrome writes the port, then the socket path,
    // and a read can land between the two — so existence is not the signal, having both
    // halves is. Returning here would hand back "ws://127.0.0.1:9222undefined".
    fs.writeFileSync(file, '9222\n');
    setTimeout(() => fs.writeFileSync(file, '9222\n/devtools/browser/whole\n'), 100);

    await expect(waitForDevToolsPort(dir, starting(), { timeoutMs: 10_000, pollMs: 5 })).resolves.toBe(
      'ws://127.0.0.1:9222/devtools/browser/whole',
    );
  });

  it('prefers a port file that arrived over an exit that followed it', async () => {
    const dir = tempProfile();
    fs.writeFileSync(path.join(dir, 'DevToolsActivePort'), '7000\n/devtools/browser/raced\n');

    // Chrome wrote its endpoint and the exit flag is already set — a launch that succeeded
    // and a process that has since gone. The endpoint is real and was read; reporting this
    // as a failed launch would blame the wrong thing.
    await expect(waitForDevToolsPort(dir, { value: true, output: 'later noise' })).resolves.toBe(
      'ws://127.0.0.1:7000/devtools/browser/raced',
    );
  });
});

describe('startupFailure', () => {
  it('repeats whatever Chrome printed', () => {
    const message = startupFailure({
      waitedMs: 1_000,
      exited: true,
      output: 'error while loading shared libraries: libnss3.so',
    });

    // The whole point of the fix: the browser's own words survive to the log. Without them a
    // CI failure is one line that cannot be told apart from a slow machine.
    expect(message).toContain('libnss3.so');
    expect(message).toContain('exited before it opened a DevTools port');
  });

  it('distinguishes a browser that died from one that never finished starting', () => {
    const stillGoing = startupFailure({ waitedMs: 60_000, exited: false, output: '' });

    expect(stillGoing).toContain('still running');
    expect(stillGoing).toContain('60s');
    expect(stillGoing).not.toContain('exited');
  });

  it('says so plainly when there was no output at all', () => {
    expect(startupFailure({ waitedMs: 60_000, exited: false, output: '' })).toContain(
      'printed nothing',
    );
  });
});
