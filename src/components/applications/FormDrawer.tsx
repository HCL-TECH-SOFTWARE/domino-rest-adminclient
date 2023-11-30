/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import Drawer from '@material-ui/core/Drawer';
import { useSelector, useDispatch } from 'react-redux';
import { FormikProps } from 'formik';
import { AppState } from '../../store';
import { toggleApplicationDrawer } from '../../store/drawer/action';
import AppForm from './AppForm';
import GroupForm from '../groups/GroupForm';
import PeopleForm from '../people/PeopleForm';
import TestForm from '../access/TestForm';
import {
  DrawerFormContainer,
} from '../../styles/CommonStyles';

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
  const dispatch = useDispatch();

  return (
    <Drawer
      anchor="right"
      open={applicationDrawer}
      onClose={() => dispatch(toggleApplicationDrawer())}
      style={{ zIndex: 0 }}
    >
      {(() => {
        switch (formName) {
          // Application form
          case 'AppForm':
            return (
              <DrawerFormContainer>
                <AppForm formik={formik} />
              </DrawerFormContainer>
            )

          // Group form
          case 'GroupForm':
            return (
              <div style={{ width: '55vw' }}>
                <GroupForm formik={formik} />
              </div>
            )

          // People form
          case 'PeopleForm':
            return (
              <div style={{ width: '50vw' }}>
                <PeopleForm formik={formik} />
              </div>
            )

             // Test form
          case 'TestForm':
            return (
              <div style={{ width: '50vw' }}>
                <TestForm formik={formik} />
              </div>
            )
        }
      })()}
    </Drawer>
  );
};

export default FormDrawer;
