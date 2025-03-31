import { refreshToken } from "../components/login/pkce";

export const apiRequestWithRetry = async (apiRequest: () => Promise<any>) => {
    try {
        // Make the initial API request
        const response = await apiRequest();
        const data = await response.json();

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

            // For other errors, return the error details
            return {
                success: false,
                response,
                data,
                error: data,
            };
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
        return {
            success: false,
            response: null,
            data: null,
            error: err.message || "An unexpected error occurred",
        };
    }
};