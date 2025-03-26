/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { refreshToken } from "../components/login/pkce"

export const apiRequestWithRetry = async (apiRequest: () => Promise<any>) => {
    try {
        const response = await apiRequest()
        const data = await response.json()
        
        if (!response.ok) {
            throw new Error(JSON.stringify(data))
        }

        return await apiRequest()
    } catch (e: any) {
        const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
        const error = JSON.parse(err)
        
        if (error.status === 401) {
            await refreshToken()
            return await apiRequest()
        }
        throw error
    }
}