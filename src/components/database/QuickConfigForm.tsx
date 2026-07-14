/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import { styled } from '@linaria/react';
import { useSelector, useDispatch } from 'react-redux';
import ClearIcon from '@mui/icons-material/Clear';
import { IconButton } from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import ChevronDown from '@mui/icons-material/KeyboardArrowDown';
import StorageIcon from '@mui/icons-material/Storage';
import { Alert, AlertTitle } from '@mui/material';
import { FormikProps } from 'formik';
import FileContentsTree from './FileContentsTree';
import { AppState } from '../../store';
import appIcons from '../../styles/app-icons';
import { toggleQuickConfigDrawer } from '../../store/drawer/action';
import {
  FormContentContainer,
  InputContainer,
} from '../../styles/CommonStyles';
import { clearDBError } from '../../store/databases/action';
import {
  LitButton,
  LitCheckbox,
  LitTooltip,
} from '../lit-elements/LitElements';

const Forms = styled.form`
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
`;

const FileStructure = styled.div`
  width: 40%;
  display: flex;
  padding: 0 0 0 10px;
  flex-direction: column;
  min-height: 0;

  .header-title {
    margin-top: 50px;
    color: white;
    font-size: 18px;
    padding: 10px;
    height: 70px;
    border-radius: 5px;
  }

  .available-databases-label {
    font-size: 16px;
    margin: 5px 0;
  }
`;
const SearchDatabaseContainer = styled(Paper)`
  flex: 1 1 auto;
  min-height: 0;
  max-height: calc(100vh - 200px);
  margin-bottom: 24px;
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
        <span className="drawer-available-databases-text">
          {`Available ${listType}`}
        </span>
        <TextField
          label={`Search ${listType}`}
          fullWidth
          value={searchValue}
          onChange={handleSearchValue}
          className='mt-8'
          id={`Search ${listType}`}
          slotProps={{
            input: {
              endAdornment: !hideClearIcon && (
                <LitTooltip content="Clear" placement='bottom'>
                  <IconButton
                    size="small"
                    aria-label="clear search bar"
                    onClick={handleClearIcon}
                  >
                    <ClearIcon color="primary" className="clear-icon" />
                  </IconButton>
                </LitTooltip>
              )
            }
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
      <FormContentContainer className='full-width flex flex-col'>
        <span className="scope-form-header">
          <StorageIcon />
          <span className='ml-10'>{`Quick Config`}</span>
        </span>
        {dbError && dbErrorMessage && (
          <Alert className='m-0 mt-10 mb-10' severity="error">
            <AlertTitle>{`Quick config error:`}</AlertTitle>
            <span className='color-text-danger small-text'>
              {dbErrorMessage}
            </span>
          </Alert>
        )}
        <InputContainer className='mt-5'>
          <span className='color-text-primary font-15'>{`Database: ${nsfPath}`}</span>
        </InputContainer>
        {!nsfPath && formik.touched.schemaName ? (
            <span className='color-text-danger small-text'>
              {`${formik.errors.nsfPath}`}
            </span>
          ) : null}
        <InputContainer className='mt-5'>
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
            <span className='color-text-danger small-text'>
              {`${formik.errors.schemaName}`}
            </span>
          ) : (schemaNameError ? (
            <span className='color-text-danger small-text'>
              {schemaNameError}
            </span>
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
            <span className='color-text-danger small-text'>
              {`${formik.errors.scopeName}`}
            </span>
          ) : (scopeNameError ? (
            <span className='color-text-danger small-text'>
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
            variant='standard'
          />
          {formik.errors.description && formik.touched.description ? (
            <span className='color-text-danger small-text'>
              {`${formik.errors.description}`}
            </span>
          ) : null}
        </InputContainer>
        <InputContainer className='flex flex-col'>
          <span className="small-text color-text-primary full-width">
            {`${itemType} Icon`}
          </span>
          <Button
            aria-controls="icons-menu"
            aria-haspopup="true"
            onClick={handleSelectIcon}
            className="icon-select flex gap-5 small-text w-fit"
          >
            <img
              className="quick-config-icon-image"
              src={`data:image/svg+xml;base64, ${appIcons[icon]}`}
              alt="db-icon"
            />
            <span>{icon}</span>
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
              >
                <div className='flex items-center gap-5'>
                  <img
                    className="quick-config-icon-image"
                    src={`data:image/svg+xml;base64, ${appIcons[iconName]}`}
                    alt="db-icon"
                  />
                  {iconName}
                </div>
              </MenuItem>
            ))}
          </Menu>
        </InputContainer>
        <div className="flex flex-row items-center gap-2">
          <LitCheckbox
            checked={formik.values.isActive}
            onChange={(e) => formik.setFieldValue('isActive', (e.target as any).checked)}
            size='m'
          />
          <span>Active</span>
        </div>
        <InputContainer className='flex flex-col full-width'>
          <span className="small-text color-text-primary full-width">
            Additional Modes
          </span>
          <div className='pl-10'>
            <LitCheckbox
              checked={formik.values.additionalModes.odata}
              onChange={(e) => formik.setFieldValue('additionalModes.odata', (e.target as any).checked)}
            />
            <span>Odata</span>
          </div>
          <div className='pl-10'>
            <LitCheckbox
              checked={formik.values.additionalModes.dql}
              onChange={(e) => formik.setFieldValue('additionalModes.dql', (e.target as any).checked)}
            />
            <span>DQL</span>
          </div>
          <div className='pl-10'>
            <LitCheckbox
              checked={formik.values.additionalModes.odata}
              onChange={(e) => formik.setFieldValue('additionalModes.odata', (e.target as any).checked)}
            />
            <span>Odata</span>
          </div>
          <div className='pl-10'>
            <LitCheckbox
              checked={formik.values.additionalModes.dql}
              onChange={(e) => formik.setFieldValue('additionalModes.dql', (e.target as any).checked)}
            />
            <span>DQL</span>
          </div>
        </InputContainer>
        <section>
          <LitButton
            className='quarter-width'
            onClick={resetForm}
          >
            Close
          </LitButton>
          <LitButton 
            disabled={isDisabled}
            className='quarter-width'
            onClick={handleAdd}>
            Add
          </LitButton>
        </section>
      </FormContentContainer>
    </Forms>
  );
};

export default QuickConfigForm;
