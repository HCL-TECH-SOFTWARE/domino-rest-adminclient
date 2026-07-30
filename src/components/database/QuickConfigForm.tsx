/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useEffect } from 'react';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import { styled } from '@linaria/react';
import { useSelector } from 'react-redux';
import ClearIcon from '@mui/icons-material/Clear';
import { IconButton } from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Menu from '@mui/material/Menu';
import ChevronDown from '@mui/icons-material/KeyboardArrowDown';
import StorageIcon from '@mui/icons-material/Storage';
import { Alert, AlertTitle } from '@mui/material';
import FileContentsTree from './FileContentsTree';
import { AppState } from '../../store';
import { APP_ICON_NAMES } from '../../services/app-icons';
import { AppIcon } from '../commons/AppIcon';
import { toggleQuickConfigDrawer } from '../../store/drawer/action';
import {
  FormContentContainer,
  InputContainer,
} from '../../styles/CommonStyles';
import { clearDBError } from '../../store/databases/action';
import { KeepButton } from '../keep-elements/react/KeepButton';
import { KeepCheckbox } from '../keep-elements/react/KeepCheckbox';
import { KeepTooltip } from '../keep-elements/react/KeepTooltip';
import { useAppDispatch } from '../../store/hooks';
import type { FormController } from '../../store/FormController';
import type { QuickConfigValues } from './QuickConfigFormContainer';

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
    border-radius: var(--wa-border-radius-m);
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
  /**
   * The form the container owns. Was `formik: FormikProps<any>` (#717).
   *
   * `nsfPath` and the selected icon arrived as their own `path` and `selectedIcon` prop pairs,
   * each duplicating a field that was also in `formik.values`. Both are fields on this
   * controller now, so the props are gone with them (#894, #897).
   */
  form: FormController<QuickConfigValues>;
  isDisabled: boolean;
  setIsDisabled: (disabled: boolean) => void;
}

const QuickConfigForm: React.FC<QuickConfigProps> = ({
  form,
  isDisabled,
  setIsDisabled,
}) => {
  // One subscription, not two. This read `state.databases` twice in a row, and neither selector
  // narrowed — both returned the whole slice, so every change anywhere in the busiest slice in
  // the app re-rendered this component twice over (#895).
  const { availableDatabases, scopes, dbError, dbErrorMessage, databases } = useSelector(
    (state: AppState) => state.databases
  );
  const [schemas, setSchemas] = useState([]) as any;
  const [hideClearIcon, setHideClearIcon] = useState(true);
  const dispatch = useAppDispatch();

  const [schemaNameError, setSchemaNameError] = useState('');
  const [scopeNameError, setScopeNameError] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [filtered, setFiltered] = useState([...availableDatabases]);

  useEffect(() => {
    const schemas = databases.map((database) => {
      return database.nsfPath + ":" + database.schemaName;
    });
    setSchemas(schemas);
  }, [databases]);

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleSelectIcon = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  // Takes the name, not the list index. The index only existed to look the name back up in
  // APP_ICON_NAMES, and a separate `selectedIndex` state then had to agree with it — it was
  // seeded to 1 while the initial icon was 'beach', so the menu highlighted the wrong entry.
  const handleMenuItemClick = (iconName: string) => {
    setAnchorEl(null);
    form.setValue('iconName', iconName);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleAdd = () => {
    const { schemaName, nsfPath, scopeName } = form.values;
    if (schemas.includes(nsfPath + ":" + schemaName)) {
      setSchemaNameError('The schema name already exists in this database.');
    } else if (scopes.some((scope) => scope.apiName === scopeName)) {
      setScopeNameError('The name already exists.');
    } else {
      form.submit();
    }
  }

  /**
   * Enter in any field, which had never worked (#896).
   *
   * `onSubmit` was wired to `formik.handleSubmit` and nothing could ever reach it: the only
   * control that submits is the Add `KeepButton`, which is not form-associated and whose
   * `<wa-button>` sits in a shadow root, so it never appears in `form.elements`. The hidden
   * native button below is what gives the form a submitter — the same fix #809 needed on the
   * login page.
   *
   * Routed through `handleAdd` rather than straight to `form.submit()`, so Enter and the button
   * take the same path: same uniqueness checks, same validation. Wiring the submit event to
   * `submit()` would let Enter skip the duplicate-name checks the button honours.
   */
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isDisabled) return; // mirrors the Add button, which is disabled until something changes
    handleAdd();
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

  /** Schema and scope names are stored lowercase and alphanumeric, so the field enforces it. */
  const sanitize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

  // These used to mutate `e.target.value` and hand the event to `formik.handleChange`, which
  // read `name` off the element. The controller takes the field and the value directly, so the
  // event no longer has to be edited on its way through.
  const handleSchemaNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue('schemaName', sanitize(e.target.value));
    setSchemaNameError('');
    setIsDisabled(false);
  };
  const handleScopeNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue('scopeName', sanitize(e.target.value));
    setScopeNameError('');
    setIsDisabled(false);
  };
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsDisabled(false);
    form.setValue('description', e.target.value);
  };
  const resetForm = () => {
    // `reset()` restores nsfPath and iconName too, which needed their own resets while they
    // were React state alongside the form.
    form.reset();
    dispatch(clearDBError());
    dispatch(toggleQuickConfigDrawer());
    setIsDisabled(true);
  };
  const listType = 'Databases';
  const itemType = 'Schema';
  const { nsfPath, iconName } = form.values;

  return (
    <Forms onSubmit={handleSubmit}>
      <FileStructure>
        <span className="drawer-available-databases-text">
          {`Available ${listType}`}
        </span>
        <TextField
          label={`Search ${listType}`}
          fullWidth
          value={searchValue}
          onChange={handleSearchValue}
          // The search box is inside the form but not part of the schema, and the form now has
          // a submitter — so without this, Enter here would try to create the schema.
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.preventDefault();
          }}
          className='mt-8'
          id={`Search ${listType}`}
          slotProps={{
            input: {
              endAdornment: !hideClearIcon && (
                <KeepTooltip content="Clear" placement='bottom'>
                  <IconButton
                    size="small"
                    aria-label="clear search bar"
                    onClick={handleClearIcon}
                  >
                    <ClearIcon color="primary" className="clear-icon" />
                  </IconButton>
                </KeepTooltip>
              )
            }
          }}
        />
        <SearchDatabaseContainer>
          <FileContentsTree
            setNsfPath={(path: string) => form.setValue('nsfPath', path)}
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
        {/* Was gated on `touched.schemaName` while showing `errors.nsfPath`, and tested the
            prop rather than the error — so it could render the string "undefined" (#893). */}
        {form.submitted && form.errors.nsfPath ? (
            <span className='color-text-danger small-text'>
              {form.errors.nsfPath}
            </span>
          ) : null}
        <InputContainer className='mt-5'>
          <TextField
            onChange={handleSchemaNameChange}
            value={form.values.schemaName}
            name="schemaName"
            color="primary"
            id={`${itemType} Name`}
            label={`${itemType} Name`}
            variant='standard'
            fullWidth
          />
          {/* `submitted` rather than `touched`: Formik only ever set `touched` on a submit
              attempt here, because handleBlur was wired nowhere. Same moment, honest name. */}
          {form.submitted && form.errors.schemaName ? (
            <span className='color-text-danger small-text'>
              {form.errors.schemaName}
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
            value={form.values.scopeName}
            variant='standard'
          />
          {form.submitted && form.errors.scopeName ? (
            <span className='color-text-danger small-text'>
              {form.errors.scopeName}
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
            value={form.values.description}
            variant='standard'
          />
          {form.submitted && form.errors.description ? (
            <span className='color-text-danger small-text'>
              {form.errors.description}
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
            <AppIcon
              name={iconName}
              className="quick-config-icon-image"
              alt="db-icon"
            />
            <span>{iconName}</span>
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
            {APP_ICON_NAMES.map((name) => (
              <MenuItem
                key={name}
                selected={name === iconName}
                onClick={() => handleMenuItemClick(name)}
              >
                <div className='flex items-center gap-5'>
                  <AppIcon
                    name={name}
                    className="quick-config-icon-image"
                    alt="db-icon"
                  />
                  {name}
                </div>
              </MenuItem>
            ))}
          </Menu>
        </InputContainer>
        <div className="flex flex-row items-center gap-2">
          <KeepCheckbox
            checked={form.values.isActive}
            onChange={(e) => form.setValue('isActive', (e.target as any).checked)}
            size='m'
          />
          <span>Active</span>
        </div>
        <InputContainer className='flex flex-col full-width'>
          <span className="small-text color-text-primary full-width">
            Additional Modes
          </span>
          {/* Odata and DQL were each rendered twice — four checkboxes, two duplicate pairs
              bound to the same two values, so nothing could catch it: they stayed in sync and
              the payload was right. Only the drawer looked wrong (#892). */}
          <div className='pl-10'>
            <KeepCheckbox
              checked={form.values.additionalModes.odata}
              onChange={(e) => form.setValue('additionalModes.odata', (e.target as any).checked)}
            />
            <span>Odata</span>
          </div>
          <div className='pl-10'>
            <KeepCheckbox
              checked={form.values.additionalModes.dql}
              onChange={(e) => form.setValue('additionalModes.dql', (e.target as any).checked)}
            />
            <span>DQL</span>
          </div>
        </InputContainer>
        <section>
          <KeepButton
            className='quarter-width'
            onClick={resetForm}
          >
            Close
          </KeepButton>
          <KeepButton
            disabled={isDisabled}
            className='quarter-width'
            onClick={handleAdd}>
            Add
          </KeepButton>
          {/* The form's only submitter, so Enter in a field reaches `handleSubmit` (#896).
              `hidden` keeps it out of the layout but leaves it in `form.elements`, which is
              what implicit submission looks through; `disabled` would remove it. */}
          <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
        </section>
      </FormContentContainer>
    </Forms>
  );
};

export default QuickConfigForm;
