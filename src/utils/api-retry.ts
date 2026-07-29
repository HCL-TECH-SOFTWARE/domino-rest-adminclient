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
  const el = _getOrCreateAlert();
  // Also re-enable pointer events on the host immediately
  el.parentElement!.style.pointerEvents = 'auto';
  el.show(message, variant, duration);
}