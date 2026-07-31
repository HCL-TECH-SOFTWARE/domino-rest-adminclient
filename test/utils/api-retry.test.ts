/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiRequestWithRetry, errorMessageOf, parseThrownError } from '../../src/utils/api-retry';
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

  // ---- Who reports the failure (#792) ----
  //
  // Both this helper and most of its callers raised a toast for the same
  // failure: <keep-alert> top-right for 5s from here, a MUI Snackbar
  // top-centre for 3s from the caller's catch. `notifyOnError: false` lets a
  // caller that already says something contextual own the message.

  describe('notifyOnError', () => {
    const exits: Array<[string, () => void]> = [
      ['a non-ok response', () => {
        fetchMock.mockResolvedValueOnce(
          fakeResponse({ ok: false, status: 500, body: { status: 500, message: 'Server exploded' } }),
        );
      }],
      ['a rejected request', () => fetchMock.mockRejectedValueOnce(new Error('Network down'))],
      ['a failed token refresh', () => {
        fetchMock.mockResolvedValueOnce(
          fakeResponse({ ok: false, status: 401, body: { status: 401, message: 'Unauthorized' } }),
        );
        vi.mocked(refreshToken).mockResolvedValueOnce({ error: 'invalid_grant' });
      }],
    ];

    it('raises exactly one toast per failure by default', async () => {
      for (const [name, arrange] of exits) {
        vi.clearAllMocks();
        arrange();

        await apiRequestWithRetry(apiRequest);

        expect(showSpy, name).toHaveBeenCalledTimes(1);
      }
    });

    it('stays silent on every failure exit when the caller reports it', async () => {
      for (const [name, arrange] of exits) {
        vi.clearAllMocks();
        arrange();

        const result = await apiRequestWithRetry(apiRequest, { notifyOnError: false });

        expect(showSpy, name).not.toHaveBeenCalled();
        // Silent about it, but still reporting it upward.
        expect(result.success, name).toBe(false);
      }
    });

    it('never toasts on success, whatever the option says', async () => {
      for (const opts of [undefined, { notifyOnError: true }, { notifyOnError: false }]) {
        vi.clearAllMocks();
        fetchMock.mockResolvedValueOnce(fakeResponse({ ok: true, status: 200, body: { id: 1 } }));

        await apiRequestWithRetry(apiRequest, opts);

        expect(showSpy).not.toHaveBeenCalled();
      }
    });
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

    it('reports a failed token refresh, which used to return silently', async () => {
      fetchMock.mockResolvedValueOnce(
        fakeResponse({ ok: false, status: 401, body: { status: 401, message: 'Unauthorized' } }),
      );
      vi.mocked(refreshToken).mockResolvedValueOnce({ error: 'invalid_grant' });

      await apiRequestWithRetry(apiRequest);

      expect(showSpy).toHaveBeenCalledWith('invalid_grant', 'danger', expect.any(Number));
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

describe('reading a thrown error (#1000)', () => {
  // The store's catch blocks used to do this by hand, 25 times:
  //
  //   const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
  //   const error = JSON.parse(err)
  //
  // Right for an API error, fatal for anything else — the parse threw a SyntaxError *out of
  // the catch*, so the handler never finished and the real fault was lost.

  describe('errorMessageOf', () => {
    it('takes an Error message without its class-name prefix', () => {
      expect(errorMessageOf(new Error('plain failure'))).toBe('plain failure');
    });

    it('does not mangle a TypeError the way toString().replace("Error: ") did', () => {
      // The old idiom replaced the substring wherever it appeared, and every built-in class
      // ends in `Error`, so "TypeError: Cannot read …" became "TypeCannot read …". That
      // corruption is visible in #1000's own repro, which reports `"TypeCannot"`.
      const message = "Cannot read properties of undefined (reading 'map')";
      const thrown = new TypeError(message);

      expect(thrown.toString().replace('Error: ', '')).toBe(`Type${message}`);
      expect(errorMessageOf(thrown)).toBe(message);
    });

    it('stringifies a throw that is not an Error at all', () => {
      expect(errorMessageOf('just a string')).toBe('just a string');
      expect(errorMessageOf(undefined)).toBe('undefined');
    });
  });

  describe('parseThrownError', () => {
    it('parses the JSON body the API layer throws', () => {
      const body = { status: 404, message: 'Database not found', errorId: 1234 };

      expect(parseThrownError(new Error(JSON.stringify(body)))).toEqual(body);
    });

    it('unescapes quotes, as the hand-written idiom did', () => {
      // Some bodies arrive with their quotes escaped; without this they do not parse, and
      // dropping it would silently turn every one of them into a raw-message fallback.
      const thrown = new Error('{\\"status\\":500,\\"message\\":\\"boom\\"}');

      expect(parseThrownError(thrown)).toEqual({ status: 500, message: 'boom' });
    });

    it('strips a leading "Error: " but never bites into "TypeError: "', () => {
      expect(parseThrownError('Error: {"message":"kept"}')).toEqual({ message: 'kept' });
      expect(parseThrownError(new TypeError('x is not a function')).message).toBe(
        'x is not a function',
      );
    });

    it('keeps the raw message when the throw is not an API error', () => {
      // The whole point. This is the case the old code destroyed.
      const thrown = new TypeError("Cannot read properties of undefined (reading 'map')");

      expect(parseThrownError(thrown)).toEqual({
        message: "Cannot read properties of undefined (reading 'map')",
      });
    });

    it('never throws, whatever it is handed', () => {
      for (const thrown of [undefined, null, 0, '', 'not json', { a: 1 }, new Error('x'), []]) {
        expect(() => parseThrownError(thrown)).not.toThrow();
        expect(typeof parseThrownError(thrown).message).toBe('string');
      }
    });

    it('treats JSON that is not an object as a message, not a body', () => {
      // `JSON.parse` happily returns numbers, strings, booleans and null; none of them is an
      // API error body, and returning one would give callers a `.message` of undefined.
      expect(parseThrownError('42')).toEqual({ message: '42' });
      expect(parseThrownError('null')).toEqual({ message: 'null' });
      expect(parseThrownError('"quoted"')).toEqual({ message: '"quoted"' });
    });

    it('always yields a message, even for a body that has none', () => {
      // Callers pass `error.message` into string-typed actions. Before #1000 a body without
      // one produced `undefined` there, or — on the fallback branch — the whole object.
      expect(parseThrownError(new Error('{"status":500}'))).toEqual({
        status: 500,
        message: '{"status":500}',
      });
    });
  });
});
