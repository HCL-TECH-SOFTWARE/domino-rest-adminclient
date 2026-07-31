/* ========================================================================== *
 * Copyright (C) 2025, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { refreshToken } from "../components/login/pkce";
import { checkForResponse } from "./common";
import { getLogger } from "../services/log-service";

const log = getLogger('utils/api-retry');

/** The body shape `checkForResponse` produces for a non-JSON error response. */
export interface ApiErrorBody {
    status: number;
    message: string;
    errorId?: number;
}

/**
 * What a thrown API error looks like once read (#1000).
 *
 * Deliberately open. The named fields are the ones the store's catch blocks actually read —
 * different endpoints answer with different bodies, and this type exists to keep those reads
 * honest rather than to claim a schema nobody enforces. Everything is optional because a
 * throw that carried no API body at all still produces one of these.
 */
export interface ThrownApiError {
    /**
     * Always present: the API body's own `message` when it carried one, the raw thrown text
     * otherwise. Guaranteeing it is what lets a caller write `error.message` with no fallback
     * — several used to pass the whole *object* into a string-typed action when the message
     * was missing, which the old `any` from `JSON.parse` hid.
     */
    message: string;
    status?: number;
    statusCode?: number;
    statusText?: string;
    errorId?: number;
    [key: string]: unknown;
}

/**
 * The message a throw carries, without the class-name prefix.
 *
 * `e.message`, not `e.toString().replace('Error: ', '')`. That older idiom replaced the
 * substring **wherever it appeared**, and every built-in error class ends in `Error`: a
 * `TypeError` reading "TypeError: Cannot read properties of undefined" came out as
 * "TypeCannot read properties of undefined", losing the class name and corrupting the text.
 * That mangling is visible in #1000's own repro, where the resulting `SyntaxError` complains
 * about `"TypeCannot"`.
 */
export function errorMessageOf(thrown: unknown): string {
    return thrown instanceof Error ? thrown.message : String(thrown);
}

/**
 * Read a thrown API error, without letting the read become the failure (#1000).
 *
 * The API layer throws `new Error(JSON.stringify(body))`, so for a real API failure the
 * message *is* JSON and parsing it is right. **Every other failure inside the same `try` is
 * not JSON**, and 24 catch blocks across 11 store modules parsed it unguarded. A `TypeError`
 * from a shape change in a response — a renamed key, a null list — made `JSON.parse` throw a
 * `SyntaxError` **out of the catch block**, so the handler never completed: nothing was
 * logged, no alert was dispatched, no loading flag was cleared, and the original fault was
 * gone. The screen span forever on a request that had already failed.
 *
 * Three sites had already been patched around this by moving their `setApiLoading(false)`
 * *above* the parse, with comments saying why; `applications/action.ts` had been fixed
 * properly. This is that fix, once, for all of them.
 *
 * Same family as #949 (`notify()` throwing from inside `apiRequestWithRetry`'s catch) and
 * #800 (a null `response` raising a `TypeError` that landed in an API-error handler) — see
 * the {@link ApiResult} note. A handler that can throw is a handler that does not run.
 *
 * Returns the parsed body when the throw carried one, and `{ message }` when it did not, so
 * `error.message` is always the most specific text available.
 */
export function parseThrownError(thrown: unknown): ThrownApiError {
    // `\"` unescaping is kept from the original idiom: some bodies arrive with their quotes
    // escaped, and without this they do not parse. The `Error: ` strip is anchored, so it
    // cannot bite into `TypeError: ` the way the unanchored version did.
    const cleaned = errorMessageOf(thrown).replace(/\\"/g, '"').replace(/^Error: /, '');
    try {
        const parsed: unknown = JSON.parse(cleaned);
        // `JSON.parse` happily returns numbers, strings and null. Only an object is an API
        // error body; anything else is a message that merely looked like JSON.
        if (parsed !== null && typeof parsed === 'object') {
            const body = parsed as Partial<ThrownApiError>;
            // A body with no `message` of its own keeps the raw text as one, so the
            // guarantee above holds for every shape an endpoint might answer with.
            return typeof body.message === 'string'
                ? (body as ThrownApiError)
                : { ...body, message: cleaned };
        }
    } catch {
        // Not an API error body. The raw message is the best information available, and
        // keeping it is the whole point — it is what the old code destroyed.
    }
    return { message: cleaned };
}

export interface ApiSuccess<T = any> {
    success: true;
    response: Response;
    data: T;
    error: null;
}

export interface ApiFailure<T = any> {
    success: false;
    response: Response;
    data: T | ApiErrorBody;
    error: any;
}

/**
 * The result of `apiRequestWithRetry`.
 *
 * `response` is a `Response` on **both** branches and is never null. That is
 * load-bearing: some 30 call sites read `response.ok` the moment they
 * destructure, so a null here raised a `TypeError` inside the caller's `try`,
 * which then landed in a `catch` written for an API error. Several of those
 * handlers ran `JSON.parse` on the message and threw a second time, so the
 * handler never completed and its `setApiLoading(false)` never dispatched —
 * the screen span forever on a request that had already failed. See #800.
 */
export type ApiResult<T = any> = ApiSuccess<T> | ApiFailure<T>;

/**
 * A failure that never reached — or never completed — an HTTP exchange.
 *
 * `Response.error()` is the Fetch standard's own network-error response:
 * `ok === false`, `status === 0`, `type === 'error'`. Using it rather than a
 * hand-rolled object means callers reading `.ok` or `.status` get spec
 * behaviour, and `status: 0` stays honest — no HTTP status was received.
 *
 * `data` mirrors `checkForResponse`'s error shape so a caller doing the common
 * `throw new Error(JSON.stringify(data))` produces something its own `catch`
 * can parse back into a message.
 */
const networkFailure = (message: string): ApiFailure => ({
    success: false,
    response: Response.error(),
    data: { status: 0, message },
    error: message,
});

export interface ApiRequestOptions {
    /**
     * Raise a `danger` toast when the request fails. Default `true`.
     *
     * Pass `false` where the caller already reports the failure itself. Most
     * thunks catch and dispatch something contextual — "Delete scope failed!
     * …" — which is a better message than the generic one raised here; with
     * both firing the user got two toasts for one failure, in two corners of
     * the screen, on two different timers (#792).
     */
    notifyOnError?: boolean;
}

export const apiRequestWithRetry = async (
    apiRequest: () => Promise<any>,
    { notifyOnError = true }: ApiRequestOptions = {},
): Promise<ApiResult> => {
    try {
        // Make the initial API request
        const response = await apiRequest();
        const data = await checkForResponse(response);

        // If the response is not OK, handle errors
        if (!response.ok) {
            const error = data;

            // Handle 401 Unauthorized by attempting a token refresh
            if (error.status === 401) {
                const refreshResponse = await refreshToken();

                // If the token refresh fails, return the error. `refreshResponse`
                // itself may be absent, so it has to be read optionally — reading
                // `.error` off it unconditionally was how a failed refresh
                // surfaced to the user as "Cannot read properties of undefined".
                if (!refreshResponse || refreshResponse.error) {
                    const refreshError = refreshResponse?.error || "Failed to refresh token";
                    // This exit used to return silently, so a refresh that failed
                    // produced no toast at all unless the caller raised one.
                    if (notifyOnError) notify(refreshError, 'danger')
                    log.error(refreshError)
                    return networkFailure(refreshError);
                }

                // Retry the original API request after refreshing the token.
                // Via checkForResponse, not .json() — a gateway that answers the
                // retry with HTML would otherwise throw here and be reported as
                // a parse failure rather than as the 502 it is.
                const retryResponse = await apiRequest();
                const retryData = await checkForResponse(retryResponse);

                return {
                    success: retryResponse.ok,
                    response: retryResponse,
                    data: retryData,
                    error: retryResponse.ok ? null : retryData,
                };
            }

            const returnError = {
                success: false,
                response,
                data,
                error: data,
            }

            const errorMsg = `Error ${error.status}: ${error.message || 'An error occurred during the API request.'}`
            // Was logged twice — console.log and console.error with the identical
            // string, either side of the notify(). Kept once, at error.
            if (notifyOnError) notify(errorMsg, 'danger')
            log.error(errorMsg)

            // For other errors, return the error details
            return returnError;
        }

        // If the response is OK, return the success result
        return {
            success: true,
            response,
            data,
            error: null,
        };
    } catch (err: any) {
        // Handle unexpected errors — a dropped connection, a DNS failure, an
        // aborted request. Nothing was received, so this is a network failure.
        const message = err.message || "An unexpected error occurred";
        if (notifyOnError) notify(message, 'danger')
        log.error(message, { err })
        return networkFailure(message);
    }
};

// // https://shoelace.style/components/alert#toast-notifications
// // Custom function to emit toast notifications
// export function notify(message: string, variant = 'brand') {
//     // Find the keep-alert element
//     const alertEl = document.querySelector('keep-alert');
//     if (!alertEl) return;

//     // Set properties
//     (alertEl as any).text = message;
//     (alertEl as any).variant = variant;

//     // Show the callout with fade-in, ensuring smooth transition
//     const callout = alertEl.shadowRoot?.querySelector('wa-callout');
//     if (callout) {
//         // Clear any previous fade-out timer
//         if ((callout as any)._fadeTimeout) {
//             clearTimeout((callout as any)._fadeTimeout);
//         }
//         callout.classList.remove('hide');
//         // Force reflow to trigger transition
//         void callout.offsetWidth;
//         callout.style.display = 'block';
//         // Auto-hide after 5s with fade-out
//         (callout as any)._fadeTimeout = setTimeout(() => {
//             callout.classList.add('hide');
//             setTimeout(() => {
//                 callout.style.display = 'none';
//             }, 300);
//         }, 5000);
//     }
// }

export type NotifyVariant = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
 
interface KeepAlertElement extends HTMLElement {
  show(message: string, variant: NotifyVariant, duration: number): void;
}
 
// ─── Singleton host ────────────────────────────────────────────────────────────
 
/**
 * Register `keep-alert` before we try to use it (#949).
 *
 * `notify()` raises its toast by *creating* the element, and this module never imported it.
 * `document.createElement` on an undefined custom element returns a plain un-upgraded
 * `HTMLElement`, so `el.show` is `undefined` and calling it throws — **from inside
 * `apiRequestWithRetry`'s own catch block**, replacing the API error the caller was meant to
 * see with a `TypeError`, and showing no toast at all.
 *
 * It has not been reproducible in the app, and only by luck: the shell mounts the Quick Config
 * drawer on every page and `keep-quick-config-drawer.ts` imports `keep-alert`. A shared error
 * path in `utils/` worked because an unrelated drawer happened to pull in its dependency.
 *
 * Deferred rather than static, following `load-popover.ts`. This module is on the eager path,
 * so a static import would pull `keep-alert` and its Web Awesome dependencies into the entry
 * closure — #813 measured a single WA component there at ~4% of the budget. A toast that
 * appears a chunk-load later is not a cost anyone can perceive.
 *
 * The `customElements.get` check is what keeps tests working unchanged: they register a stub
 * `keep-alert` before exercising a failing request, and importing the real module on top of
 * that would throw `NotSupportedError` for the duplicate name.
 */
let _alertModule: Promise<unknown> | undefined;

function _loadAlert(): Promise<unknown> {
  if (customElements.get('keep-alert')) return Promise.resolve();
  _alertModule ??= import('../components/keep-elements/keep-alert');
  return _alertModule;
}
 
let _alertEl: KeepAlertElement | null = null;
 
function _getOrCreateAlert(): KeepAlertElement {
  if (_alertEl) return _alertEl;
 
  // Fixed viewport anchor — lives outside the React root
  const host = document.createElement('div');
  Object.assign(host.style, {
    position:       'fixed',
    top:            '1.25rem',
    right:          '1.25rem',
    zIndex:         '9999',
    pointerEvents:  'none',   // let clicks fall through when no toast is visible
  });
 
  _alertEl = document.createElement('keep-alert') as KeepAlertElement;
 
  // Restore pointer-events: none once the alert has fully hidden
  _alertEl.addEventListener('alert-closed', () => {
    host.style.pointerEvents = 'none';
  });
 
  host.appendChild(_alertEl);
  document.body.appendChild(host);
 
  return _alertEl;
}
 
/**
 * notify(message, variant?, duration?)
 *
 * @param message  - Text to display.
 * @param variant  - 'brand' | 'success' | 'warning' | 'danger' | 'neutral'  (default: 'neutral')
 * @param duration - Auto-dismiss after this many ms (default: 5000)
 *
 * @example
 *   import { notify } from './notify.js';
 *   notify('Saved!', 'success');
 *   notify('Something went wrong.', 'danger', 8000);
 */
export function notify(
  message: string,
  variant: NotifyVariant = 'neutral',
  duration: number = 5000,
): void {
  /*
   * Nothing in here may throw. Every call site is a catch block reporting something that has
   * already gone wrong, so an exception raised here does not surface a failure — it replaces
   * one, and the real error is lost. #949.
   */
  void _loadAlert()
    .then(() => {
      const el = _getOrCreateAlert();
      if (typeof el.show !== 'function') {
        // Belt and braces: the element is registered by the time we get here, so this is
        // unreachable. It stays because the cost of being wrong is swallowing an API error.
        log.error('keep-alert did not upgrade; dropping toast', { message, variant });
        return;
      }
      // Optional chaining, not `!`: the singleton element is memoised at module scope and
      // can outlive its host — a test that clears the DOM between cases detaches it, and
      // `el.parentElement!.style` then threw the exact TypeError this function must never
      // raise. The toast still shows; only the pointer-events restore is skipped.
      if (el.parentElement) el.parentElement.style.pointerEvents = 'auto';
      el.show(message, variant, duration);
    })
    .catch((error: unknown) => {
      log.error('Could not raise the error toast', { message, variant, error });
    });
}