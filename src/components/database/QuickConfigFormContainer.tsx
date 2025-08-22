/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import QuickConfigForm from './QuickConfigForm';
import { AppState } from '../../store';
import { toggleQuickConfigDrawer } from '../../store/drawer/action';
import { quickConfig } from '../../store/databases/action';
import {
  DrawerFormContainer,
} from '../../styles/CommonStyles';
import appIcons from '../../styles/app-icons';
import { LitDrawer } from '../lit-elements/LitElements';

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
  const dispatch = useDispatch();
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
  const [schemaName, setSchemaName] = useState('');
  const [icon, setIcon] = useState('beach');
  const [isDisabled, setIsDisabled] = useState(true);

  const formik = useFormik({
    initialValues: {
      scopeName: '',
      description: '',
      nsfPath,
      schemaName,
      isActive: true,
      icon: appIcons[icon],
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
          icon: appIcons[icon],
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
      dispatch(quickConfig(formData) as any);
    },
  });

  const handleClickOpen = () => {
    formik.resetForm({});
    dispatch(toggleQuickConfigDrawer());
  };

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
    <LitDrawer label="Quick Config" open={quickConfigDrawer}>
      <DrawerFormContainer>
        <QuickConfigForm
          isDisabled={isDisabled}
          setIsDisabled={setIsDisabled}
          selectedIcon={{ icon, setIcon }}
          formik={formik}
          path={{ nsfPath, setNsfPath: handleNsfPath }}
        />
      </DrawerFormContainer>
    </LitDrawer>
  );
}
