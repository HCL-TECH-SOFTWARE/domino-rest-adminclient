/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { useSelector } from 'react-redux';
import { FormikProps } from 'formik';
import { AppState } from '../../store';
import AppForm from './AppForm';
import TestForm from '../access/TestForm';
import {
  DrawerFormContainer,
} from '../../styles/CommonStyles';
import { KeepDrawer } from '../keep-elements/KeepElements';

interface FormDrawerProps {
  formName: string;
  formik: FormikProps<any>;
}

/**
 * Open up a drawer to contain the form.  Refactored so that it could be used
 * on multiple pages
 *
 * @author Neil Schultz
 *
 * @param formName the form to display
 * @param fromik form properties
 */
const FormDrawer: React.FC<FormDrawerProps> = ({ formName, formik }) => {
  const { applicationDrawer } = useSelector((state: AppState) => state.drawer);

  return (
    <KeepDrawer open={applicationDrawer} label="Application Form">
      {(() => {
        switch (formName) {
          // Application form
          case 'AppForm':
            return (
              <DrawerFormContainer>
                <AppForm formik={formik} />
              </DrawerFormContainer>
            )

          // Test form
          case 'TestForm':
            return (
              <div className='w-50vw'>
                <TestForm formik={formik} />
              </div>
            )
        }
      })()}
    </KeepDrawer>
  );
};

export default FormDrawer;
