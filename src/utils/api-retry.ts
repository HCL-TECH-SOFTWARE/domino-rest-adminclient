/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { refreshToken } from "../components/login/pkce"

export const apiRequestWithRetry = async (apiRequest: () => Promise<any>) => {
    try {
        return await apiRequest()
    } catch (error: any) {
        if (error.status === 401) {
            await refreshToken()
            return await apiRequest()
        }
        throw error
    }
}