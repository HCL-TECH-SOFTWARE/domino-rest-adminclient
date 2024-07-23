/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import CloseIcon from '@mui/icons-material/Close';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import {
  Typography,
  Tooltip,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import CheckboxIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import ChevronDown from '@mui/icons-material/KeyboardArrowDown';
import StorageIcon from '@mui/icons-material/Storage';
import { Alert, AlertTitle } from '@mui/lab';
import { FormikProps } from 'formik';
import SchemaContentsTree from './SchemaContentsTree';
import { AppState } from '../../store';
import appIcons from '../../styles/app-icons';
import { checkIcon } from '../../styles/scripts';
import { getTheme } from '../../store/styles/action';
import { KEEP_ADMIN_BASE_COLOR } from '../../config.dev';
import { toggleDrawer } from '../../store/drawer/action';
import {
  FormContentContainer,
  InputContainer,
  ActionButtonBar,
} from '../../styles/CommonStyles';
import { clearDBError } from '../../store/databases/action';

const Forms = styled.form`
  display: flex;
`;

const FileStructure = styled.div`
  width: 45%;
  display: flex;
  padding: 0 0 0 10px;
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
  const handleActiveButtonToggle = (event: React.ChangeEvent<{}>) => {
    setUpdateButtonDisabled(false);
    formik.handleChange(event);
  }
  const listType = 'Schema';
  const itemType = 'Scope';
  const filterAvailableDatabases = availableDatabases.filter((db) => db.apinames.length > 0);

  // Disable button class conditions
  const onUpdateDisable = updateButtonDisabled ? "button-disabled" : "";
  const onAddDisable = isDisabled ?  "button-disabled" : "";

  return (
    <Forms onSubmit={formik.handleSubmit}>
      <FileStructure>
        <Typography
          className="header-title"
          color="textPrimary"
          style={{ backgroundColor: KEEP_ADMIN_BASE_COLOR }}
        >
          {`Available ${listType}`}
        </Typography>
        <TextField
          label={`Search ${listType}`}
          fullWidth
          value={searchValue}
          onChange={handleSearchValue}
          style={{ marginTop: '8px' }}
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
      <FormContentContainer>
        <Tooltip arrow title="Close">
          <CloseIcon
            cursor="pointer"
            className="close-icon float-right"
            onClick={() => {
              formik.resetForm();
              dispatch(clearDBError());
              dispatch(toggleDrawer());
            }}
          />
        </Tooltip>

        <Typography
          className="header-title"
          color="textPrimary"
          style={{ marginTop: 35, backgroundColor: KEEP_ADMIN_BASE_COLOR }}
        >
          <StorageIcon />
          <span style={{ marginLeft: 10 }}>{isEdit ? `Edit Scope` : `Add New Scope`}</span>
        </Typography>
        {dbError && dbErrorMessage && (
          <Alert style={{ margin: '10px 0' }} severity="error">
            <AlertTitle>{`Error: Unable to ${isEdit?'edit':'add'} scope`}</AlertTitle>
            <Typography
              style={{ fontSize: 18 }}
              component="p"
              variant="caption"
            >
              {dbErrorMessage}
            </Typography>
          </Alert>
        )}
        <InputContainer style={{ marginTop: 5 }}>
          <Typography color="textPrimary">{`Database: ${nsfPath}`}</Typography>
        </InputContainer>
        <InputContainer>
          <Typography color="textPrimary" style={{ textOverflow: 'ellipsis', overflowX: 'hidden'}} >{`Schema: ${schemaName}`}</Typography>
        </InputContainer>
        {!schemaName && formik.touched.apiName ? (
            <Typography className="validation-error" color="textPrimary">
              {`${formik.errors.schemaName}`}
            </Typography>
          ) : null}
        <InputContainer style={{ marginTop: 5 }}>
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
            <Typography className="validation-error" color="textPrimary">
              {`${formik.errors.apiName}`}
            </Typography>
          ) : (scopeNameError ? (
            <Typography className="validation-error" color="textPrimary">
              {scopeNameError}
            </Typography>
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
            <Typography className="validation-error" color="textPrimary">
              {`${formik.errors.description}`}
            </Typography>
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
          />
          {formik.errors.server && formik.touched.server ? (
            <Typography className="validation-error" color="textPrimary">
              {`${formik.errors.server}`}
            </Typography>
          ) : null}
        </InputContainer>
        <InputContainer>
          <Typography className="icon-heading" color="textPrimary">
            Maximum Access Level
          </Typography>
          <Button
            aria-controls="acl-menu"
            aria-haspopup="true"
            onClick={handleSelectAcl}
            className="icon-select"
          >
            {maximumAccessLevel ? maximumAccessLevel : "Editor"}
            <ChevronDown style={{ fontSize: 18 }} />
          </Button>
          <Menu
            id="acl-menu"
            anchorEl={aclMenuAnchorEl}
            keepMounted
            open={Boolean(aclMenuAnchorEl)}
            onClose={handleAclMenuClose}
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
        <InputContainer>
          <Typography className="icon-heading" color="textPrimary">
            {`${itemType} Icon`}
          </Typography>
          <Button
            aria-controls="icons-menu"
            aria-haspopup="true"
            onClick={handleSelectIcon}
            className="icon-select"
          >
            {
              checkIcon(icon) ? (
                <img
                  className="icon-image"
                  src={`data:image/svg+xml;base64, ${appIcons[icon]}`}
                  alt="db-icon"
                  style={{
                    color: getTheme(themeMode).hoverColor,
                  }}
                />
              ) : (
                <StorageIcon style={{ width: '35px', marginRight: '15px'}}/>
              )
            }
            {checkIcon(icon) ? icon : ''}
            <ChevronDown style={{ fontSize: 18 }} />
          </Button>
          <Menu
            id="lock-menu"
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            {Object.keys(appIcons).map((iconName, index) => (
              <MenuItem
                key={iconName}
                selected={index === selectedIndex}
                onClick={(event) => handleMenuItemClick(event, index)}
              >
                <>
                  <img
                    className="icon-image"
                    src={`data:image/svg+xml;base64, ${appIcons[iconName]}`}
                    alt="db-icon"
                    style={{
                      color: getTheme(themeMode).hoverColor,
                      height: 35,
                      width: 35,
                      marginRight: 10,
                    }}
                  />
                  {iconName}
                </>
              </MenuItem>
            ))}
          </Menu>
        </InputContainer>
        <InputContainer>
          <FormControlLabel
            control={
              <Checkbox
                checked={formik.values.isActive}
                color="primary"
                icon={<CheckboxIcon fontSize="medium" color="primary" />}
              />
            }
            label="Active"
            name="isActive"
            onChange={handleActiveButtonToggle}
            value={formik.values.isActive}
          />
        </InputContainer>
        <ActionButtonBar>
          <Button
            className="button-style"
            onClick={() => {
              formik.resetForm();
              dispatch(toggleDrawer());
            }}
          >
            Close
          </Button>
          <Button 
            className={`button-style ${onUpdateDisable} ${onAddDisable}`}
            disabled={updateButtonDisabled || isDisabled} 
            onClick={() => handleAdd(formik.values.apiName)}>
              {isEdit ? 'Update' : 'Add'}
          </Button>
          { isEdit &&
          <Button className="button-style" onClick={()=>handleDelete(formik.values.apiName)}>
            Delete
          </Button>
          }
        </ActionButtonBar>
      </FormContentContainer>
    </Forms>
  );
};

export default ScopeForm;
