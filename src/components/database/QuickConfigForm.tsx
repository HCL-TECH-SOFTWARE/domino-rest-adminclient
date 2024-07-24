/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import CloseIcon from '@mui/icons-material/Close';
import ClearIcon from '@mui/icons-material/Clear';
import { FormControlLabel, Checkbox, IconButton } from '@mui/material';
import CheckboxIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import MenuItem from '@mui/material/MenuItem';
import { Typography, Tooltip } from '@mui/material';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import ChevronDown from '@mui/icons-material/KeyboardArrowDown';
import StorageIcon from '@mui/icons-material/Storage';
import { Alert, AlertTitle } from '@mui/lab';
import { FormikProps } from 'formik';
import FileContentsTree from './FileContentsTree';
import { AppState } from '../../store';
import appIcons from '../../styles/app-icons';
import { getTheme } from '../../store/styles/action';
import { KEEP_ADMIN_BASE_COLOR } from '../../config.dev';
import { toggleQuickConfigDrawer } from '../../store/drawer/action';
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

interface QuickConfigProps {
  path: {
    nsfPath: string;
    setNsfPath: (path: string) => void;
  };
  selectedIcon: {
    icon: string;
    setIcon: (icon: string) => void;
  };
  formik: FormikProps<any>;
  isDisabled : boolean;
  setIsDisabled: any;
}

const QuickConfigForm: React.FC<QuickConfigProps> = ({
  path: { nsfPath, setNsfPath },
  selectedIcon: { icon, setIcon },
  formik,
  isDisabled,
  setIsDisabled,
}) => {
  const { availableDatabases, scopes } = useSelector(
    (state: AppState) => state.databases
  );
  const { dbError, dbErrorMessage, databases } = useSelector(
    (state: AppState) => state.databases
  );
  const [schemas, setSchemas] = useState([]) as any;
  const [hideClearIcon, setHideClearIcon] = useState(true);
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const dispatch = useDispatch();

  const [schemaNameError, setSchemaNameError] = useState('');
  const [scopeNameError, setScopeNameError] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [filtered, setFiltered] = useState([...availableDatabases]);

  const [formulaEngine, setFormulaEngine] = React.useState('Domino');

  useEffect(() => {
    const schemas = databases.map((database) => {
      return database.nsfPath + ":" + database.schemaName;
    });
    setSchemas(schemas);
  }, [databases]);

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setFormulaEngine(event.target.value as string);
  };

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(1);

  const handleSelectIcon = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuItemClick = (
    event: React.MouseEvent<HTMLElement>,
    index: number
  ) => {
    setSelectedIndex(index);
    setAnchorEl(null);
    setIcon(Object.keys(appIcons)[index]);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAdd = () => {
    const schemaName = formik.values.schemaName;
    const nsfPath = formik.values.nsfPath;
    if (schemas.includes(nsfPath + ":" + schemaName)) {
      setSchemaNameError('The schema name already exists in this database.');
    } else {
      const find = scopes.find((scope) => {
        return (scope.apiName === formik.values.scopeName);
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

    if (key.length > 0) {
      setHideClearIcon(false);
    } else {
      setHideClearIcon(true);
    }

    setSearchValue(key);
    const filteredData = availableDatabases.filter((data) => {
      return data.title.toLowerCase().indexOf(key.toLowerCase()) !== -1;
    });
    setFiltered(filteredData);
  };
  
  const handleClearIcon = () => {
    setSearchValue('');
    setHideClearIcon(true);
  };

  const handleSchemaNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    e.target.value = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    formik.handleChange(e);
    setSchemaNameError('');
    setIsDisabled(false);
  };
  const handleScopeNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    e.target.value = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    formik.handleChange(e);
    setScopeNameError('');
    setIsDisabled(false);
  };
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsDisabled(false);
    formik.handleChange(e);
  };
  const resetForm = () => {
    formik.resetForm();
    setNsfPath('');
    setIcon('beach');
    dispatch(clearDBError());
    dispatch(toggleQuickConfigDrawer());
    setIsDisabled(true);
  };
  const listType = 'Databases';
  const itemType = 'Schema';

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
          id={`Search ${listType}`}
          InputProps={{
            endAdornment: !hideClearIcon && (
              <Tooltip title="clear" arrow>
                <IconButton
                  size="small"
                  aria-label="clear search bar"
                  onClick={handleClearIcon}
                >
                  <ClearIcon color="primary" className="clear-icon" />
                </IconButton>
              </Tooltip>
            )
          }}
        />
        <SearchDatabaseContainer>
          <FileContentsTree
            setNsfPath={setNsfPath}
            contents={
              searchValue === ''
                ? availableDatabases
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
            onClick={resetForm}
          />
        </Tooltip>

        <Typography
          className="header-title"
          color="textPrimary"
          style={{ marginTop: 35, backgroundColor: KEEP_ADMIN_BASE_COLOR }}
        >
          <StorageIcon />
          <span style={{ marginLeft: 10 }}>{`Quick Config`}</span>
        </Typography>
        {dbError && dbErrorMessage && (
          <Alert style={{ margin: '10px 0' }} severity="error">
            <AlertTitle>{`Quick config error:`}</AlertTitle>
            <Typography
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
        {!nsfPath && formik.touched.schemaName ? (
            <Typography className="validation-error" color="textPrimary">
              {`${formik.errors.nsfPath}`}
            </Typography>
          ) : null}
        <InputContainer style={{ marginTop: 5 }}>
          <TextField
            onChange={handleSchemaNameChange}
            value={formik.values.schemaName}
            name="schemaName"
            color="primary"
            id={`${itemType} Name`}
            label={`${itemType} Name`}
            variant='standard'
            fullWidth
          />
          {formik.errors.schemaName && formik.touched.schemaName ? (
            <Typography className="validation-error" color="textPrimary">
              {`${formik.errors.schemaName}`}
            </Typography>
          ) : (schemaNameError ? (
            <Typography className="validation-error" color="textPrimary">
              {schemaNameError}
            </Typography>
          ) : null)}
        </InputContainer>
        <InputContainer>
          <TextField
            fullWidth
            name="scopeName"
            label="Scope Name"
            color="primary"
            onChange={handleScopeNameChange}
            value={formik.values.scopeName}
            variant='standard'
          />
          {formik.errors.scopeName && formik.touched.scopeName ? (
            <Typography className="validation-error" color="textPrimary">
              {`${formik.errors.scopeName}`}
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
            variant='standard'
          />
          {formik.errors.description && formik.touched.description ? (
            <Typography className="validation-error" color="textPrimary">
              {`${formik.errors.description}`}
            </Typography>
          ) : null}
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
            <img
              className="icon-image"
              src={`data:image/svg+xml;base64, ${appIcons[icon]}`}
              alt="db-icon"
              style={{
                color: getTheme(themeMode).hoverColor,
              }}
            />
            {icon}
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
            onChange={formik.handleChange}
            value={formik.values.isActive}
          />
        </InputContainer>
        <InputContainer style={{ display: 'flex', flexDirection: 'column' }}>
          <Typography className="icon-heading" color="textPrimary">
            Additional Modes
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={formik.values.additionalModes.odata}
                color="primary"
                icon={<CheckboxIcon fontSize="small" color="primary" />}
                size='small'
              />
            }
            label="Odata"
            name="additionalModes.odata"
            onChange={formik.handleChange}
            value={formik.values.additionalModes.odata}
            style={{ fontSize: 12, paddingLeft: '10px' }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={formik.values.additionalModes.dql}
                color="primary"
                icon={<CheckboxIcon fontSize="small" color="primary" />}
                size='small'
              />
            }
            label="DQL"
            name="additionalModes.dql"
            onChange={formik.handleChange}
            value={formik.values.additionalModes.dql}
            style={{ fontSize: 12, paddingLeft: '10px' }}
          />
        </InputContainer>
        <ActionButtonBar>
          <Button
            className="button-style"
            onClick={resetForm}
          >
            Close
          </Button>
          <Button 
            disabled={isDisabled}
            className={`button-style ${!isDisabled ? '' : 'button-disabled'}`}
            onClick={handleAdd}>
            Add
          </Button>
        </ActionButtonBar>
      </FormContentContainer>
    </Forms>
  );
};

export default QuickConfigForm;
