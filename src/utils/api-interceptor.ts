/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import axios, { AxiosResponse, AxiosError } from 'axios';
import { getCurrentIdpLogin, removeAuth, set401Error } from '../store/account/action';
import { initState } from '../store/databases/action';

import { setCallStatus } from '../store/interceptor/action';

export default function injectInterceptor(dispatch: any) {
  axios.interceptors.response.use(
    (response: AxiosResponse) => {
      // Do something with response data

      // Dispatch Success Message
      dispatch(setCallStatus({ status: 200, statusText: 'success' }));

      return response;
    },
    (error: AxiosError) => {
	
	  // Check for status before displaying error
      if (error != null && error.response != null  && error.response.status != null && error.response.statusText != null) {
		
        // Unauthorized Access
        const { status, statusText } = error.response!;

        if (error.response!.status === 401) {
          dispatch(set401Error(true));
          const idpLogin = getCurrentIdpLogin()
          if (!idpLogin) {
            dispatch(removeAuth());
          }
          dispatch(initState());
        }

        if (error.response!.status === 403) {
          dispatch(setCallStatus({ status, statusText }));
        }

        if (error.response!.status === 404) {
          dispatch(setCallStatus({ status, statusText }));
        }

        // 500 Class Error
        if (error.response!.status === 500) {
          dispatch(setCallStatus({ status, statusText }));
        }
      }
      // Handle non standard error
      else if (error != null) {
	      console.log("Axios Error: "+error);
      }

      // Throw error (may be need for some other catch)
      return Promise.reject(error);
    }
  );
}
