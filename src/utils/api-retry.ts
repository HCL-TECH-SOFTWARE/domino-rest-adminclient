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
            notify(errorMsg, 'danger', 'exclamation-triangle', 5000)
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
        notify(err.message || "An unexpected error occured", 'danger', 'exclamation-triangle')
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

// https://shoelace.style/components/alert#toast-notifications
// Custom function to emit toast notifications
export function notify(message: string, variant = 'primary', icon = 'info-circle') {
    const alert = Object.assign(document.createElement('sl-alert'), {
      variant,
      closable: true,
      innerHTML: `
        <sl-icon name="${icon}" slot="icon"></sl-icon>
        ${escapeHtml(message)}
      `
    });

    document.body.append(alert);
    return alert.toast();
  }