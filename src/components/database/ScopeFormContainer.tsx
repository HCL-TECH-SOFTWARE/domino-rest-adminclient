/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import ScopeForm from './ScopeForm';
import { AppState } from '../../store';
import DeleteDialog from '../dialogs/DeleteDialog';
import { toggleDrawer } from '../../store/drawer/action';
import { changeScope, clearDBError } from '../../store/databases/action';
import { toggleDeleteDialog } from '../../store/dialog/action';
import appIcons from '../../styles/app-icons';
import {
  DrawerFormContainer,
} from '../../styles/CommonStyles';
import { toggleAlert } from '../../store/alerts/action';
import { LitDrawer } from '../lit-elements/LitElements';

type ScopeFormContainerProps = {
  database?: any;
  isEdit?: boolean;
  permissions: any;
};

const ScopeFormSchema = Yup.object().shape({
  apiName: Yup.string()
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
    .min(4, 'Description is too short (minimum is 4 characters)')
    .required('Please provide a short description about this scope'),
  schemaName: Yup.string()
    .required('Please select a schema!'),
})

const ScopeFormContainer: React.FC<ScopeFormContainerProps> = ({database, isEdit, permissions}) => {
  const { visible } = useSelector((state: AppState) => state.drawer);
  const { deleteDialog } = useSelector((state: AppState) => state.dialog);
  const dispatch = useDispatch();
  const descriptionElementRef = React.useRef<HTMLElement>(null);
  const [nsfPath, setNsfPath] = useState('');
  const [schemaName, setSchemaName] = useState('');
  const [icon, setIcon] = useState(isEdit && database.iconName ? database.iconName : 'beach');
  const [isDisabled, setIsDisabled] = useState(false);

  const accessLevels = [
    'NoAccess',
    'Depositor',
    'Reader',
    'Author',
    'Editor',
    'Designer',
    'Manager'
  ];
  const [maximumAccessLevel, setMaximumAccessLevel] = useState( !isEdit && database.maximumAccessLevel !== "" ? 'Editor' : database.maximumAccessLevel);

  const formik = useFormik({
    initialValues: isEdit ? {
      apiName: database.apiName,
      description: database.description,
      server: database.server,
      nsfPath : database.nsfPath,
      schemaName : database.schemaName,
      isActive: database.isActive,
      icon: database.icon,
      iconName: database.iconName,
      maximumAccessLevel: database.maximumAccessLevel ? database.maximumAccessLevel : 'Editor',
    } : {
      apiName: '',
      description: '',
      server: '',
      nsfPath : nsfPath,
      schemaName : schemaName,
      isActive: true,
      icon: appIcons[icon],
      iconName: icon,
      maximumAccessLevel: 'Editor',
    },
    validationSchema: ScopeFormSchema,
    onSubmit: (values) => {
      const data = JSON.stringify(values, null, 2);
      const parseData = JSON.parse(data);
      const {server} = parseData;
      
      const formData = { // Form data for scope(api) submit
          ...parseData,
          server: server ? server.trim() : '',
          icon: appIcons[icon],
          iconName: icon,
          maximumAccessLevel: maximumAccessLevel,
          nsfPath,
          schemaName,
        }
      // Submit the form
      setIsDisabled(true);
      dispatch(changeScope(formData, isEdit) as any);
    },
  });
  const handleDelete = (apiName:string) => {
    if(permissions.deleteDbMapping){
      dispatch(toggleDeleteDialog());
    }else{
      dispatch(toggleAlert(`You don't have permission to delete scope.`));
    }
    
  };
  React.useEffect(() => {
    if (visible) {
      const { current: descriptionElement } = descriptionElementRef;
      if (descriptionElement !== null) {
        descriptionElement.focus();
      }
    }
    if (isEdit) {
      setNsfPath(database.nsfPath);
      setSchemaName(database.schemaName);
    } else {
      setSchemaName('');
      setNsfPath('');
    }
  }, [visible, isEdit, database]);
  
  const handleSetSchema = (schemaNameValue: string) => {
    formik.values.schemaName = schemaNameValue;
    setSchemaName(schemaNameValue);
  };
  toggleDrawer()

  const handleCLoseDrawer = () => {
    formik.resetForm();
    dispatch(clearDBError());
    dispatch(toggleDrawer());
  }

  return (
    <LitDrawer
      label={`${isEdit ? 'Edit' : 'Add New'} Scope`}
      open={visible}
      closeFn={handleCLoseDrawer}
    >
      <DrawerFormContainer>
        <ScopeForm
          isDisabled={isDisabled}
          selectedIcon={{ icon, setIcon }}
          maxAcl={{maximumAccessLevel, setMaximumAccessLevel}}
          accessLevels={accessLevels}
          formik={formik}
          isEdit={isEdit}
          handleDelete={handleDelete}
          path={{ nsfPath, setNsfPath, schemaName, setSchemaName: handleSetSchema }}
        />
        <DeleteDialog
          selected={{
            isDeleteSchema: false,
            apiName: database.apiName,
          }}
          open={deleteDialog}
        />
      </DrawerFormContainer>
    </LitDrawer>
  );
}
export default ScopeFormContainer;
