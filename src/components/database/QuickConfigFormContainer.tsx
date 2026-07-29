/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import QuickConfigForm from './QuickConfigForm';
import { AppState } from '../../store';
import { quickConfig } from '../../store/databases/action';
import {
  DrawerFormContainer,
} from '../../styles/CommonStyles';
import { appIconPayload, useAppIcons } from '../../services/app-icons';
import { KeepAlert } from '../keep-elements/react/KeepAlert';
import { KeepDrawer } from '../keep-elements/react/KeepDrawer';
import { useAppDispatch } from '../../store/hooks';

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
  const descriptionElementRef = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    if (quickConfigDrawer) {
      const { current: descriptionElement } = descriptionElementRef;
      if (descriptionElement !== null) {
        descriptionElement.focus();
      }
    }
    resetForm();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickConfigDrawer]);

  const [nsfPath, setNsfPath] = useState('');
  const [schemaName] = useState('');
  const [icon, setIcon] = useState('beach');
  const [isDisabled, setIsDisabled] = useState(true);

  // The POST body carries `icon` (the base64) next to `iconName`, so the payload must be
  // resolvable at submit time even though it now lives in a lazily loaded chunk (#772).
  // `index.tsx` warms it at boot, so it is present long before a drawer can be filled in.
  const appIcons = useAppIcons();

  const formik = useFormik({
    initialValues: {
      scopeName: '',
      description: '',
      nsfPath,
      schemaName,
      isActive: true,
      icon: appIconPayload(icon, appIcons),
      iconName: icon,
      additionalModes: {
        odata: false,
        dql: false,
      }
    },
    validationSchema: QuickConfigFormSchema,
    onSubmit: (values) => {
      const data = JSON.stringify(values, null, 2);
      let parseData = JSON.parse(data);
      const modes = Object.keys(parseData.additionalModes).filter((mode) => parseData.additionalModes[mode] === true)
      let {additionalModes, ...sendData} = parseData
      const formData = { // Form data for schema submit
          ...sendData,
          create: true,
          scopeName: `${parseData.scopeName}`,
          server: '',
          nsfPath,
          icon: appIconPayload(icon, appIcons),
          iconName: icon,
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
          additionalModes: modes,
        }
      // Submit the form
      setIsDisabled(true);
      dispatch(quickConfig(formData));
    },
  });

  const resetForm = () => {
    formik.resetForm({});
    setNsfPath('');
    setIcon('beach');
  }

  const handleNsfPath = (nsfPathValue: string) => {
    formik.values.nsfPath = nsfPathValue;
    setNsfPath(nsfPathValue);
  };
  
  return (
    <>
      <KeepDrawer label="Quick Config" open={quickConfigDrawer}>
        <DrawerFormContainer>
          <QuickConfigForm
            isDisabled={isDisabled}
            setIsDisabled={setIsDisabled}
            selectedIcon={{ icon, setIcon }}
            formik={formik}
            path={{ nsfPath, setNsfPath: handleNsfPath }}
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
