/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import type { Dispatch } from '@reduxjs/toolkit';
import { BASE_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../account/action';
import { apiRequestWithRetry, parseThrownError } from '../../utils/api-retry';
import { encodeQueryValue } from '../../utils/common';
import { clearFormulaResults as clearFormulaResultsAction } from './reducer';
import { log } from './shared';

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
      const error = parseThrownError(e);

      // The panel's only output is the result string, so a failure has to travel through it
      // — that is how an API error has always been reported here, and `parseThrownError`
      // always yields a message, so the old `else` branch has nothing left to guard.
      //
      // What #1000 changed is the *other* kind of failure. `data.result[0].result[0]` above
      // is unguarded, so an ok response of another shape raises a `TypeError`; this handler
      // then parsed that TypeError's message as JSON and threw a `SyntaxError` out of the
      // thunk. `test/store/databases/formulas.test.ts` pinned that as behaviour, on the
      // reasoning that a rejection was better than showing a result that never came back.
      //
      // The rejection was not the safer option: nothing was logged, so the shape change that
      // caused it was invisible. Now the fault is logged and the panel shows the message —
      // which for a TypeError reads as an error, not as a formula result.
      log.error('Error testing formula', { error });
      dispatch(saveResult(formulaType, error.message));
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
