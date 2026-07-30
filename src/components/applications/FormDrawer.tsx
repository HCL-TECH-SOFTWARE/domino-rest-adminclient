/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useContext } from 'react';
import { useSelector } from 'react-redux';
import { FormikProps } from 'formik';
import { AppState } from '../../store';
import { useLocation } from '../../router/react';
import { matchPath } from '../../router/router';
import { AppFormContext } from './ApplicationContext';
import {
  DrawerFormContainer,
} from '../../styles/CommonStyles';
import { KeepAppForm, KeepDrawer, KeepTestForm } from '../keep-elements/KeepElements';

interface FormDrawerProps {
  formName: string;
  formik: FormikProps<any>;
}

/** The route the Test Formulas drawer is always opened over. */
const ACCESS_ROUTE = '/schema/:nsfPath/:dbName/:formName/access';

/**
 * Open up a drawer to contain the form.  Refactored so that it could be used
 * on multiple pages
 *
 * @author Neil Schultz
 *
 * @param formName the form to display
 * @param fromik form properties
 *
 * ## What `formik` still carries
 *
 * `keep-test-form` owns its own form state and runs its own submit, so nothing that the user
 * types reaches this object any more. It survives here as the transport for two things the
 * still-React ancestors own:
 *
 * - the five formula texts, which `TabsAccess` gathers off the mode being edited and writes
 *   into `formik.values` immediately before opening this drawer;
 * - the Application form's seed values, which `AppCard` and `AppItem` push in with
 *   `setValues` and `Kanban` clears with `resetForm`.
 *
 * The submit handlers those containers built are now unreachable. They go when the containers
 * convert, and this prop goes with them.
 */
const FormDrawer: React.FC<FormDrawerProps> = ({ formName, formik }) => {
  const { applicationDrawer } = useSelector((state: AppState) => state.drawer);
  // The schema and database the Test Formulas run is made against. `TabsAccess` reads the same
  // two segments off the same location; this reads them through the route pattern instead of
  // by index, so a malformed escape decodes to itself rather than throwing out of render.
  const { pathname } = useLocation();
  const params = matchPath(ACCESS_ROUTE, pathname) ?? {};
  // Add or Edit. The leaf used to read this context itself; an element cannot, so it is read
  // here and passed down. `TabsAccess` renders this drawer outside the provider, where the
  // context is still its `{}` default — hence the shape check rather than a destructure,
  // which is what threw there.
  const appFormContext = useContext(AppFormContext);
  const formContext = Array.isArray(appFormContext) ? String(appFormContext[0] ?? '') : '';

  return (
    <KeepDrawer open={applicationDrawer} label="Application Form">
      {(() => {
        switch (formName) {
          // Application form
          case 'AppForm':
            return (
              <DrawerFormContainer>
                <KeepAppForm formContext={formContext} initialValues={formik.values} />
              </DrawerFormContainer>
            )

          // Test form
          case 'TestForm':
            return (
              <div className='w-50vw'>
                <KeepTestForm
                  nsfPath={params.nsfPath ?? ''}
                  schemaName={params.dbName ?? ''}
                  readFormulaText={formik.values.readFormulaText ?? ''}
                  writeFormulaText={formik.values.writeFormulaText ?? ''}
                  deleteFormulaText={formik.values.deleteFormulaText ?? ''}
                  loadFormulaText={formik.values.loadFormulaText ?? ''}
                  saveFormulaText={formik.values.saveFormulaText ?? ''}
                />
              </div>
            )
        }
      })()}
    </KeepDrawer>
  );
};

export default FormDrawer;
