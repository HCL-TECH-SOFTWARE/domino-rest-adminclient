/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import * as Yup from 'yup';
import QuickConfigForm from './QuickConfigForm';
import { AppState } from '../../store';
import { quickConfig } from '../../store/databases/action';
import {
  DrawerFormContainer,
} from '../../styles/CommonStyles';
import { appIconPayload, useAppIcons, DEFAULT_APP_ICON_NAME } from '../../services/app-icons';
import { KeepAlert } from '../keep-elements/react/KeepAlert';
import { KeepDrawer } from '../keep-elements/react/KeepDrawer';
import { useAppDispatch } from '../../store/hooks';
import { useFormController } from '../../store/FormController.react';

/**
 * Everything the user fills in, and nothing else (#717).
 *
 * `nsfPath` and `iconName` used to live in React state *as well as* in `formik.values`, kept in
 * step by hand — `handleNsfPath` wrote `formik.values.nsfPath` directly (#894) and the icon was
 * only ever read back from the React copy (#897). Both are plain fields here, and the form is
 * the only place either exists.
 */
export interface QuickConfigValues {
  scopeName: string;
  description: string;
  nsfPath: string;
  schemaName: string;
  isActive: boolean;
  iconName: string;
  additionalModes: { odata: boolean; dql: boolean };
}

/**
 * A module constant, not built per render.
 *
 * `useFormController` reads `initialValues` **once** — matching Formik, whose
 * `enableReinitialize` defaults to `false` — and `reset()` is what re-reads it. A literal here
 * makes that unambiguous: there is no render at which "the initial values" could mean anything
 * different.
 */
const INITIAL_VALUES: QuickConfigValues = {
  scopeName: '',
  description: '',
  nsfPath: '',
  schemaName: '',
  isActive: true,
  iconName: DEFAULT_APP_ICON_NAME,
  additionalModes: {
    odata: false,
    dql: false,
  },
};

const QuickConfigFormSchema = Yup.object().shape({
  schemaName: Yup.string()
    .max(256, 'Schema Name is too long (maximum is 256 characters)')
    .required('Schema Name is required.')
    .test('First Character', 'Schema Name must start with a letter', (val) => {
      // Build Issue: character must be converted to an int before the isNaN call
      let retval = true;
      if (val && val.length) {
        retval = isNaN(parseInt(val.charAt(0), 10));
      }
      return retval;
    }),
  scopeName: Yup.string()
    .min(4, 'Scope Name is too short (minimum is 4 characters)')
    .max(256, 'Scope Name is too long (maximum is 256 characters)')
    .required('Scope Name is required.')
    .test('First Character', 'Scope Name must begin with a letter', (val) => {
      // Build Issue: character must be converted to an int before the isNaN call
      let retval = false;
      if (val && val.length) {
        retval = isNaN(parseInt(val.charAt(0), 10));
      }
      return retval;
    }),
  description: Yup.string()
    .required('Please provide a short description about this schema!'),
  nsfPath: Yup.string()
    .required('Please select a database!'),
});

export default function QuickConfigFormContainer() {
  const { quickConfigDrawer } = useSelector((state: AppState) => state.drawer);
  const { dbError, dbErrorMessage } = useSelector((state: AppState) => state.databases);
  const dispatch = useAppDispatch();

  const [isDisabled, setIsDisabled] = useState(true);

  // The POST body carries `icon` (the base64) next to `iconName`, so the payload must be
  // resolvable at submit time even though it now lives in a lazily loaded chunk (#772).
  // `index.tsx` warms it at boot, so it is present long before a drawer can be filled in.
  //
  // Read here rather than baked into `initialValues`, which is where it used to be: that copy
  // was captured on the first render, before the chunk could have landed, and then never read —
  // `onSubmit` recomputed it anyway (#897).
  const appIcons = useAppIcons();

  const form = useFormController<QuickConfigValues>({
    initialValues: INITIAL_VALUES,
    schema: QuickConfigFormSchema,
    onSubmit: (values) => {
      const { additionalModes, ...schema } = values;
      const formData = { // Form data for schema submit
        ...schema,
        create: true,
        server: '',
        icon: appIconPayload(values.iconName, appIcons),
        agents: [],
        views: [],
        forms: [],
        dqlAccess: true,
        dqlFormula: {
          formulaType: "domino",
          formula: "@True"
        },
        allowCode: true,
        openAccess: true,
        requireRevisionToUpdate: false,
        allowDecryption: true,
        owners: [],
        // The API takes the enabled mode names, not the record the checkboxes bind to.
        additionalModes: Object.keys(additionalModes).filter(
          (mode) => additionalModes[mode as keyof typeof additionalModes],
        ),
      };
      // Submit the form
      setIsDisabled(true);
      dispatch(quickConfig(formData));
    },
  });

  // Opening the drawer starts a fresh schema. `form.reset()` restores every field including
  // `nsfPath` and `iconName`, which needed their own resets while they were separate state.
  //
  // The drawer used to try to focus its description field here, through a ref that was never
  // attached to anything — so `current` was always null and nothing was ever focused. Removed
  // rather than wired up, because starting to focus a field is a change users notice and does
  // not belong in a Formik migration. #900 has the argument and covers every drawer.
  React.useEffect(() => {
    form.reset();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickConfigDrawer]);

  return (
    <>
      <KeepDrawer label="Quick Config" open={quickConfigDrawer}>
        <DrawerFormContainer>
          <QuickConfigForm
            isDisabled={isDisabled}
            setIsDisabled={setIsDisabled}
            form={form}
          />
        </DrawerFormContainer>
      </KeepDrawer>
      {dbError && (
        <KeepAlert
          variant='danger'
          heading='Quick config error!'
          message={dbErrorMessage}
        />
      )}
    </>
  );
}
