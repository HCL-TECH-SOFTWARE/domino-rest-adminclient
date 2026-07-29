/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequestWithRetry } from '../../src/utils/api-retry';
import { refreshToken } from '../../src/components/login/pkce';

// ---- Mocks ----

// `refreshToken` is the only symbol api-retry imports from pkce. Replace the
// whole module so the real PKCE/network code never runs and we can drive the
// refresh outcome per test. (Named export, matching the source import.)
vi.mock('../../src/components/login/pkce', () => ({
  refreshToken: vi.fn(),
}));

// `notify()` lives inside api-retry itself, so it cannot be swapped via
// vi.mock (the internal call binds to the module-local function, not the
// export). Its observable side effect is `document.createElement('keep-alert')`
// followed by `el.show(message, variant, duration)`. We register a stub
// custom element whose `show` is a spy, letting us both (a) keep notify from
// throwing in jsdom and (b) assert the toast that was surfaced.
const showSpy = vi.fn();
class KeepAlertStub extends HTMLElement {
  show(...args: unknown[]): void {
    showSpy(...args);
  }
}
if (!customElements.get('keep-alert')) {
  customElements.define('keep-alert', KeepAlertStub);
}

// ---- Helpers ----

interface FakeResponseOptions {
  ok: boolean;
  status: number;
  statusText?: string;
  body?: unknown;
  contentType?: string | null;
}

// Minimal Response-like object covering exactly what checkForResponse() and
// api-retry touch: ok, status, statusText, headers.get('Content-Type'), json().
function fakeResponse({
  ok,
  status,
  statusText = '',
  body = {},
  contentType = 'application/json',
}: FakeResponseOptions): Response {
  return {
    ok,
    status,
    statusText,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? contentType : null,
    },
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

// The injected apiRequest simply performs the (stubbed) network call, so
// assertions on `fetch` call counts reflect the retry behaviour directly.
const apiRequest = () => fetch('/api/resource');

// The shape ~25 thunks in store/databases/action.ts use verbatim. Reproduced
// here rather than described, because the defect this guards against is not in
// any single line of it — it is the interaction between a null `response` and
// the catch handler's JSON.parse. See `deleteScope` for the original.
async function callLikeAThunk(): Promise<
  { outcome: 'ok'; data: unknown } | { outcome: 'handled'; message: string }
> {
  try {
    const { response, data } = await apiRequestWithRetry(apiRequest);

    if (!response.ok) {
      throw new Error(JSON.stringify(data));
    }
    return { outcome: 'ok', data };
  } catch (e: any) {
    const err = e.toString().replace(/\\"/g, '"').replace('Error: ', '');
    const error = JSON.parse(err);
    return { outcome: 'handled', message: error.message };
  }
}

describe('apiRequestWithRetry', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('resolves with the parsed body and does not refresh when the request is ok', async () => {
    fetchMock.mockResolvedValueOnce(
      fakeResponse({ ok: true, status: 200, body: { id: 1, name: 'app' } }),
    );

    const result = await apiRequestWithRetry(apiRequest);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 1, name: 'app' });
    expect(result.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(refreshToken).not.toHaveBeenCalled();
    expect(showSpy).not.toHaveBeenCalled();
  });

  it('refreshes the token and retries once on a 401, then succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(
        fakeResponse({
          ok: false,
          status: 401,
          body: { status: 401, message: 'Unauthorized' },
        }),
      )
      .mockResolvedValueOnce(
        fakeResponse({ ok: true, status: 200, body: { id: 2 } }),
      );
    vi.mocked(refreshToken).mockResolvedValueOnce({ access_token: 'fresh' });

    const result = await apiRequestWithRetry(apiRequest);

    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 2 });
    expect(result.error).toBeNull();
    expect(showSpy).not.toHaveBeenCalled();
  });

  it('returns a failure without retrying when the token refresh reports an error', async () => {
    fetchMock.mockResolvedValueOnce(
      fakeResponse({
        ok: false,
        status: 401,
        body: { status: 401, message: 'Unauthorized' },
      }),
    );
    vi.mocked(refreshToken).mockResolvedValueOnce({ error: 'invalid_grant' });

    const result = await apiRequestWithRetry(apiRequest);

    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no retry attempted
    expect(result.success).toBe(false);
    expect(result.error).toBe('invalid_grant');
    expect(result.data).toEqual({ status: 0, message: 'invalid_grant' });
    expect(result.response.ok).toBe(false);
  });

  it('surfaces the retry failure when the request still fails after a refresh', async () => {
    fetchMock
      .mockResolvedValueOnce(
        fakeResponse({
          ok: false,
          status: 401,
          body: { status: 401, message: 'Unauthorized' },
        }),
      )
      .mockResolvedValueOnce(
        fakeResponse({
          ok: false,
          status: 403,
          body: { status: 403, message: 'Forbidden' },
        }),
      );
    vi.mocked(refreshToken).mockResolvedValueOnce({ access_token: 'fresh' });

    const result = await apiRequestWithRetry(apiRequest);

    expect(refreshToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.success).toBe(false);
    expect(result.error).toEqual({ status: 403, message: 'Forbidden' });
    expect(result.data).toEqual({ status: 403, message: 'Forbidden' });
  });

  it('surfaces a non-401 error via notify and never refreshes the token', async () => {
    fetchMock.mockResolvedValueOnce(
      fakeResponse({
        ok: false,
        status: 500,
        body: { status: 500, message: 'Server exploded' },
      }),
    );

    const result = await apiRequestWithRetry(apiRequest);

    expect(refreshToken).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(false);
    expect(result.error).toEqual({ status: 500, message: 'Server exploded' });
    expect(result.data).toEqual({ status: 500, message: 'Server exploded' });
    expect(result.response).not.toBeNull();
    // The error was surfaced to the user as a danger toast.
    expect(showSpy).toHaveBeenCalledTimes(1);
    expect(showSpy).toHaveBeenCalledWith(
      expect.stringContaining('Error 500'),
      'danger',
      expect.any(Number),
    );
  });

  it('handles an unexpected thrown error by notifying and returning a generic failure', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network down'));

    const result = await apiRequestWithRetry(apiRequest);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Network down');
    expect(refreshToken).not.toHaveBeenCalled();
    expect(showSpy).toHaveBeenCalledWith('Network down', 'danger', expect.any(Number));
  });

  // ---- The failure contract (#800) ----
  //
  // Every failure exit used to return `response: null`, while every caller
  // reads `response.ok` unconditionally. The result was a TypeError raised
  // *inside* the caller's try, landing in a catch written for an API error.

  describe('the failure contract', () => {
    it('never hands back a null response, whichever exit is taken', async () => {
      const exits: Array<[string, () => void]> = [
        ['request rejected', () => fetchMock.mockRejectedValueOnce(new Error('Network down'))],
        [
          'token refresh reported an error',
          () => {
            fetchMock.mockResolvedValueOnce(
              fakeResponse({ ok: false, status: 401, body: { status: 401, message: 'Unauthorized' } }),
            );
            vi.mocked(refreshToken).mockResolvedValueOnce({ error: 'invalid_grant' });
          },
        ],
        [
          'token refresh resolved falsy',
          () => {
            fetchMock.mockResolvedValueOnce(
              fakeResponse({ ok: false, status: 401, body: { status: 401, message: 'Unauthorized' } }),
            );
            vi.mocked(refreshToken).mockResolvedValueOnce(undefined as never);
          },
        ],
      ];

      for (const [name, arrange] of exits) {
        vi.clearAllMocks();
        arrange();

        const result = await apiRequestWithRetry(apiRequest);

        expect(result.response, name).not.toBeNull();
        expect(result.response.ok, name).toBe(false);
        expect(result.success, name).toBe(false);
      }
    });

    it('carries a status/message body, so a caller that stringifies data can parse it back', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network down'));

      const result = await apiRequestWithRetry(apiRequest);

      expect(result.data).toEqual({ status: 0, message: 'Network down' });
      // The round trip every thunk's catch performs.
      expect(JSON.parse(JSON.stringify(result.data)).message).toBe('Network down');
    });

    it('lets a thunk-shaped caller handle a dropped connection instead of crashing', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network down'));

      // Previously: `response.ok` threw TypeError, the catch's JSON.parse threw
      // SyntaxError on the TypeError's message, and the handler never finished —
      // which is why the loading flag stayed set and the spinner never stopped.
      await expect(callLikeAThunk()).resolves.toEqual({
        outcome: 'handled',
        message: 'Network down',
      });
    });

    it('reports a falsy token refresh as a refresh failure, not as a TypeError', async () => {
      fetchMock.mockResolvedValueOnce(
        fakeResponse({ ok: false, status: 401, body: { status: 401, message: 'Unauthorized' } }),
      );
      // `refreshToken` resolving undefined hit `refreshResponse.error` on the
      // line that was meant to handle exactly that case.
      vi.mocked(refreshToken).mockResolvedValueOnce(undefined as never);

      const result = await apiRequestWithRetry(apiRequest);

      expect(result.error).toBe('Failed to refresh token');
      expect(fetchMock).toHaveBeenCalledTimes(1); // no retry attempted
    });

    it('surfaces a non-JSON error body from the retry, rather than a parse failure', async () => {
      fetchMock
        .mockResolvedValueOnce(
          fakeResponse({ ok: false, status: 401, body: { status: 401, message: 'Unauthorized' } }),
        )
        .mockResolvedValueOnce(
          // A gateway returning HTML: the retry used to call .json() directly.
          fakeResponse({ ok: false, status: 502, statusText: 'Bad Gateway', contentType: 'text/html' }),
        );
      vi.mocked(refreshToken).mockResolvedValueOnce({ access_token: 'fresh' });

      const result = await apiRequestWithRetry(apiRequest);

      expect(result.success).toBe(false);
      expect(result.data).toMatchObject({ status: 502, message: 'Bad Gateway' });
    });
  });
});
