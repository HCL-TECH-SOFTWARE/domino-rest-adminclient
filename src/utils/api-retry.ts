import { refreshToken } from "../components/login/pkce";
import { checkForResponse } from "./common";

export const apiRequestWithRetry = async (apiRequest: () => Promise<any>) => {
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

                // If the token refresh fails, return the error
                if (!refreshResponse || refreshResponse.error) {
                    return {
                        success: false,
                        response: null,
                        data: null,
                        error: refreshResponse.error || "Failed to refresh token",
                    };
                }

                // Retry the original API request after refreshing the token
                const retryResponse = await apiRequest();
                const retryData = await retryResponse.json();

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
            console.log(errorMsg)
            notify(errorMsg, 'danger')
            console.error(errorMsg)

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
        // Handle unexpected errors
        notify(err.message || "An unexpected error occured", 'danger')
        return {
            success: false,
            response: null,
            data: null,
            error: err.message || "An unexpected error occurred",
        };
    }
};

// https://shoelace.style/components/alert#toast-notifications
// Always escape HTML for text arguments!
function escapeHtml(html: string) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
  }

// // https://shoelace.style/components/alert#toast-notifications
// // Custom function to emit toast notifications
// export function notify(message: string, variant = 'brand') {
//     // Find the lit-alert element
//     const alertEl = document.querySelector('lit-alert');
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
 
interface LitAlertElement extends HTMLElement {
  show(message: string, variant: NotifyVariant, duration: number): void;
}
 
// ─── Singleton host ────────────────────────────────────────────────────────────
 
let _alertEl: LitAlertElement | null = null;
 
function _getOrCreateAlert(): LitAlertElement {
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
 
  _alertEl = document.createElement('lit-alert') as LitAlertElement;
 
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