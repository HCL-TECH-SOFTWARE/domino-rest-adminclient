/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import { styled } from '@linaria/react';
import { useSelector, useDispatch } from 'react-redux';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import ChevronDown from '@mui/icons-material/KeyboardArrowDown';
import StorageIcon from '@mui/icons-material/Storage';
import { Alert, AlertTitle } from '@mui/material';
import { FormikProps } from 'formik';
import SchemaContentsTree from './SchemaContentsTree';
import { AppState } from '../../store';
import appIcons from '../../styles/app-icons';
import { checkIcon } from '../../styles/scripts';
import { toggleDrawer } from '../../store/drawer/action';
import {
  FormContentContainer,
  InputContainer,
} from '../../styles/CommonStyles';
import { LitButton, LitCheckbox } from '../lit-elements/LitElements';

const Forms = styled.form`
  display: flex;
`;

const FileStructure = styled.div`
  width: 40%;
  display: flex;
  margin: 0;
  flex-direction: column;

  .header-title {
    margin-top: 50px;
    color: white;
    font-size: 18px;
    padding: 10px;
    height: 70x;
    border-radius: 5px;
  }

  .available-databases-label {
    font-size: 16px;
    margin: 5px 0;
  }
`;
const SearchDatabaseContainer = styled(Paper)`
  height: calc(100vh - 153px);
  padding: 5px 0;
  overflow-y: auto;
`;

interface ScopeFormProps {
  path: {
    nsfPath: string;
    setNsfPath: (path: string) => void;
    schemaName: string;
    setSchemaName: (path: string) => void;
  };
  isEdit?: boolean;
  selectedIcon: {
    icon: string;
    setIcon: (icon: string) => void;
  };
  maxAcl: {
    maximumAccessLevel: string;
    setMaximumAccessLevel: (maximumAccessLevel: string) => void;
  };
  accessLevels: Array<string>;
  formik: FormikProps<any>;
  handleDelete: (apiName: string) => void;
  isDisabled : boolean;
}

const ScopeForm: React.FC<ScopeFormProps> = ({
  path: { nsfPath, setNsfPath, schemaName, setSchemaName },
  isEdit,
  selectedIcon: { icon, setIcon },
  maxAcl: { maximumAccessLevel, setMaximumAccessLevel },
  accessLevels,
  formik,
  handleDelete,
  isDisabled,
}) => {
  const { availableDatabases, scopes } = useSelector(
    (state: AppState) => state.databases
  );
  const { dbError, dbErrorMessage } = useSelector(
    (state: AppState) => state.databases
  );
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const dispatch = useDispatch();

  const [searchValue, setSearchValue] = useState('');
  const [filtered, setFiltered] = useState([...availableDatabases]);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(1);

  const [scopeNameError, setScopeNameError] = useState('');

  const [updateButtonDisabled, setUpdateButtonDisabled] = useState(true);

  const [aclIndex, setAclIndex] = useState(accessLevels.findIndex(acl => acl === maximumAccessLevel));
  const [aclMenuAnchorEl, setAclMenuAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleSelectIcon = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleSelectAcl = (event: React.MouseEvent<HTMLElement>) => {
    setAclMenuAnchorEl(event.currentTarget);
  };

  const handleMenuItemClick = (
    event: React.MouseEvent<HTMLElement>,
    index: number
  ) => {
    setSelectedIndex(index);
    setAnchorEl(null);
    setIcon(Object.keys(appIcons)[index]);
    setUpdateButtonDisabled(false);
  };

  const handleAclMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    index: number
  ) => {
    setAclIndex(index);
    setAclMenuAnchorEl(null);
    setMaximumAccessLevel(accessLevels[index]);
    setUpdateButtonDisabled(false);
  };

  const handleAclMenuClose = () => {
    setAclMenuAnchorEl(null);
  }

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAdd = (apiName:string) => {
    if (isEdit) {
      formik.submitForm();
    } else {
      const find = scopes.find((scope) => {
        return (scope.apiName === apiName);
      });
      if (find) {
        setScopeNameError('The name already exists.');
      } else {
        formik.submitForm();
      }
    }
  }

  const handleSearchValue = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setSearchValue(key);
    var filteredData:Array<any> = [];
    availableDatabases.forEach((data) => {
      if (data.apinames && data.apinames.length > 0) {
        var initApiName:Array<string> = [];
        var matchedData = {
          title: data.title,
          nsfpath: data.nsfpath,
          apinames: initApiName
        };
        data.apinames.forEach((apiname) => {
          if (apiname.toLowerCase().indexOf(key.toLowerCase()) !== -1) {
            matchedData.apinames.push(apiname);
          }
        });
        if (matchedData.apinames.length > 0) {
          filteredData.push(matchedData);
        }
      }
    });
    setFiltered(filteredData);
  };
  const handleScopeNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    e.target.value = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    setScopeNameError('');
    setUpdateButtonDisabled(false);
    formik.handleChange(e);
  };
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUpdateButtonDisabled(false);
    formik.handleChange(e);
  };
  const handleServerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUpdateButtonDisabled(false);
    formik.handleChange(e);
  }
  const handleActiveButtonToggle = (event: any) => {
    setUpdateButtonDisabled(false);
    formik.setFieldValue('isActive', event.target.checked);
  }
  const listType = 'Schema';
  const itemType = 'Scope';
  const filterAvailableDatabases = availableDatabases.filter((db) => db.apinames.length > 0);



  return (
    <Forms onSubmit={formik.handleSubmit}>
      <FileStructure>
        <span className="drawer-available-databases-text">
          {`Available ${listType}`}
        </span>
        <TextField
          label={`Search ${listType}`}
          fullWidth
          value={searchValue}
          onChange={handleSearchValue}
          className='mt-8'
        />
        <SearchDatabaseContainer>
          <SchemaContentsTree
            setNsfPath={setNsfPath}
            setSchemaName={setSchemaName}
            contents={
              searchValue === ''
                ? filterAvailableDatabases
                    .slice()
                    .sort((a, b) =>
                      a.title.toLowerCase() > b.title.toLowerCase() ? 1 : -1
                    )
                : filtered
            }
          />
        </SearchDatabaseContainer>
      </FileStructure>
      <FormContentContainer className='full-width flex flex-col'>

        <span className="scope-form-header">
          <StorageIcon />
          <span className='ml-10'>{isEdit ? `Edit Scope` : `Add New Scope`}</span>
        </span>
        {dbError && dbErrorMessage && (
          <Alert className='m-0 mt-0 mb-0' severity="error">
            <AlertTitle>{`Error: Unable to ${isEdit?'edit':'add'} scope`}</AlertTitle>
            <span className='color-text-danger big-text'>
              {dbErrorMessage}
            </span>
          </Alert>
        )}
        <InputContainer className='mt-5'>
          <span className='color-text-primary flex'>
            <span className='min-width-85'>Database:</span>
            <span>{nsfPath}</span>
          </span>
        </InputContainer>
        <InputContainer>
          <span className='scope-form-text-schema'>
            <span className='min-width-85'>Schema:</span>
            <span>{schemaName}</span>
          </span>
        </InputContainer>
        {!schemaName && formik.touched.apiName ? (
            <span className="small-text color-text-danger">
              {`${formik.errors.schemaName}`}
            </span>
          ) : null}
        <InputContainer className='mt-5'>
          <TextField
            onChange={handleScopeNameChange}
            value={formik.values.apiName}
            name="apiName"
            id="apiName"
            color="primary"
            disabled={isEdit}
            label={`${itemType} Name`}
            variant='standard'
            fullWidth
          />
          {formik.errors.apiName && formik.touched.apiName ? (
            <span className="small-text color-text-danger">
              {`${formik.errors.apiName}`}
            </span>
          ) : (scopeNameError ? (
            <span className="small-text color-text-danger">
              {scopeNameError}
            </span>
          ) : null)}
        </InputContainer>
        <InputContainer>
          <TextField
            fullWidth
            name="description"
            label="Description"
            color="primary"
            onChange={handleDescriptionChange}
            value={formik.values.description}
            id="description"
            variant='standard'
          />
          {formik.errors.description && formik.touched.description ? (
            <span className="small-text color-text-danger">
              {`${formik.errors.description}`}
            </span>
          ) : null}
        </InputContainer>
        <InputContainer>
          <TextField
            fullWidth
            name="server"
            label="Server"
            color="primary"
            onChange={handleServerChange}
            value={formik.values.server}
            variant='standard'
            slotProps={{
              formHelperText: { sx: { color: 'primary.main', fontSize: 12 } }
            }}
            helperText={
              <div>
                <span>Optional : Server name must be heirarchical or canonical format.<br/>For example:</span>
                <ul className='m-0 mt-4 mb-4 pl-20'>
                  <li>Server/Org</li>
                  <li>CN=Server/O=Org</li>
                </ul>
              </div>
            }
          />
          {formik.errors.server && formik.touched.server ? (
            <span className="small-text color-text-danger">
              {`${formik.errors.server}`}
            </span>
          ) : null}
        </InputContainer>
        <InputContainer className='flex flex-col w-fit'>
          <span className="small-text">
            Maximum Access Level
          </span>
          <Button
            aria-controls="acl-menu"
            aria-haspopup="true"
            onClick={handleSelectAcl}
            className="icon-select color-text-primary p-0 w-fit"
          >
            {maximumAccessLevel ? maximumAccessLevel : "Editor"}
            <ChevronDown className='big-text' />
          </Button>
          <Menu
            id="acl-menu"
            anchorEl={aclMenuAnchorEl}
            keepMounted
            open={Boolean(aclMenuAnchorEl)}
            onClose={handleAclMenuClose}
            disablePortal={true}
          >
            {accessLevels.map((acl, index) => (
              <MenuItem
                key={acl}
                selected={index === aclIndex}
                onClick={(event) => handleAclMenuClick(event, index)}
              >
                {acl}
              </MenuItem>
            ))}
          </Menu>
        </InputContainer>
        <InputContainer className='flex flex-col'>
          <span className="small-text color-text-primary">
            {`${itemType} Icon`}
          </span>
          <Button
            aria-controls="icons-menu"
            aria-haspopup="true"
            onClick={handleSelectIcon}
            className="icon-select color-text-primary p-0 w-fit flex gap-5"
          >
            {
              checkIcon(icon) ? (
                <img
                  className="quick-config-icon-image"
                  src={`data:image/svg+xml;base64, ${appIcons[icon]}`}
                  alt="db-icon"
                />
              ) : (
                <StorageIcon className='w-35px mr-15' />
              )
            }
            {checkIcon(icon) ? icon : ''}
            <ChevronDown className='big-text' />
          </Button>
          <Menu
            id="lock-menu"
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={handleClose}
            disablePortal={true}
          >
            {Object.keys(appIcons).map((iconName, index) => (
              <MenuItem
                key={iconName}
                selected={index === selectedIndex}
                onClick={(event) => handleMenuItemClick(event, index)}
                className='flex gap-5'
              >
                <>
                  <img
                    className="quick-config-icon-image"
                    src={`data:image/svg+xml;base64, ${appIcons[iconName]}`}
                    alt="db-icon"
                  />
                  {iconName}
                </>
              </MenuItem>
            ))}
          </Menu>
        </InputContainer>
        <div className="flex flex-row items-center gap-2">
          <LitCheckbox
            checked={formik.values.isActive}
            onChange={(e) => handleActiveButtonToggle(e)}
            size='m'
          />
          <span>Active</span>
        </div>
        <section>
          <LitButton
              className='quarter-width'
              onClick={() => {
                formik.resetForm();
                dispatch(toggleDrawer());
              }}
            >
              Close
            </LitButton>
            <LitButton 
              className='quarter-width'
              disabled={isEdit ? updateButtonDisabled : isDisabled}
              onClick={() => handleAdd(formik.values.apiName)}
            >
                {isEdit ? 'Update' : 'Add'}
            </LitButton>
            { isEdit &&
              <LitButton
                className='quarter-width'
                onClick={()=>handleDelete(formik.values.apiName)}
              >
                Delete
              </LitButton>
            }
        </section>
      </FormContentContainer>
    </Forms>
  );
};

export default ScopeForm;
