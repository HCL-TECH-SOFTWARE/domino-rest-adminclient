/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import type { Dispatch } from '@reduxjs/toolkit';
import { BASE_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { apiRequestWithRetry } from '../../utils/api-retry';
import { encodeQueryValue } from '../../utils/common';
import { clearFormulaResults as clearFormulaResultsAction } from './reducer';

/**
 * Call a Keep Api to test a Formula against a database.
 *
 * @param formulaData Formula information needed to run the test
 */
export const testFormula = (dataSource: string, formulaData: any, formulaType: string) => {
  return async (dispatch: Dispatch) => {
    // Run Formula test
    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${BASE_KEEP_API_URL}/run/formula?dataSource=${encodeQueryValue(dataSource)}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getToken()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formulaData),
        })
      )

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      dispatch(saveResult(formulaType, data.result[0].result[0]));
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)

      // Use the response error if it's available
      if (error.message) {
        dispatch(saveResult(formulaType, error.message));
      }
      // Otherwise use the generic error
      else {
        dispatch(saveResult(formulaType, `Error: ${error}`));
      }
    }
  };
};
/**
 * Save the results of a Formula test.
 *
 * @param formulaType The Forumla being tested
 * @param result Test result
 */
export function saveResult(formulaType: string, result: string) {
  return {
    type: formulaType,
    payload: result
  };
}
/**
 * CLear all Formula test results
 */
export function clearFormulaResults() {
  return clearFormulaResultsAction();
}
