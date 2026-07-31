/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequestWithRetry, notify } from '../../src/utils/api-retry';

/**
 * `notify()` without anything having registered `keep-alert` first (#949).
 *
 * This is a **separate file from `api-retry.test.ts` on purpose.** That suite defines a stub
 * `keep-alert` at module scope so it can spy on `show()`, which means the element is always
 * registered there and the failure this covers is unreachable. Custom element registries are
 * per-environment, and vitest gives each file its own, so the only way to exercise "nobody
 * imported it" is to be in a file that does not.
 *
 * What used to happen: `notify()` called `document.createElement('keep-alert')`, got a plain
 * un-upgraded `HTMLElement` back, and called `el.show(...)` — `undefined`. The `TypeError`
 * was raised **inside `apiRequestWithRetry`'s catch block**, so the API error the caller was
 * meant to receive was replaced by it and no toast appeared.
 *
 * It did not reproduce in the running app, and only by accident: the shell mounts the Quick
 * Config drawer on every page and that element imports `keep-alert`. A shared error path in
 * `utils/` worked because an unrelated drawer happened to pull in its dependency.
 */

vi.mock('../../src/components/login/pkce', () => ({ refreshToken: vi.fn() }));

const fakeResponse = (status: number, body: unknown) =>
  ({
    ok: false,
    status,
    statusText: 'Error',
    headers: { get: () => 'application/json' },
    json: async () => body,
  }) as unknown as Response;

describe('notify() without a registered keep-alert', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('starts with keep-alert genuinely undefined, or this file proves nothing', () => {
    expect(
      customElements.get('keep-alert'),
      'something registered keep-alert; this suite can no longer see the failure it covers',
    ).toBeUndefined();
  });

  it('does not throw', () => {
    expect(() => notify('something went wrong', 'danger')).not.toThrow();
  });

  it('registers the element and shows the toast once the deferred import lands', async () => {
    notify('deferred toast', 'danger', 1000);

    // The import is dynamic and pulls in Lit and Web Awesome, so registration is a real
    // module load away — ~140ms here — not a microtask. Polling a handful of ticks is not
    // enough, which is how the first version of this test failed.
    await vi.waitFor(() => expect(customElements.get('keep-alert')).toBeTruthy(), {
      timeout: 5000,
    });
    const el = document.querySelector('keep-alert');
    expect(el, 'notify() created no alert element').toBeTruthy();
    expect(typeof (el as { show?: unknown }).show).toBe('function');
  });

  it('lets the API error through instead of replacing it with a TypeError', async () => {
    // The regression this exists for: the toast is raised from inside the catch block, so a
    // throw in there does not surface the failure — it replaces it.
    vi.mocked(fetch).mockResolvedValueOnce(
      fakeResponse(500, { status: 500, message: 'Server exploded' }),
    );

    const result = await apiRequestWithRetry(() => fetch('/x'));

    expect(result.success).toBe(false);
    expect(result.error).toEqual({ status: 500, message: 'Server exploded' });
  });
});
