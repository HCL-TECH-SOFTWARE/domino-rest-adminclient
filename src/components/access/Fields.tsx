/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import Typography from '@mui/material/Typography';
import { useDispatch, useSelector } from 'react-redux';
import SwipeableViews from 'react-swipeable-views';
import Box from '@mui/material/Box';
import { MenuItem, CircularProgress, Select, Tooltip, Theme } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import { MdLibraryAdd } from 'react-icons/md';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import SingleFieldContainer from './SingleFieldContainer';
import { AppState } from '../../store';
import { getTheme } from '../../store/styles/action';
import { setLoading } from '../../store/loading/action';
import { fetchFields, getAllFieldsByNsf } from '../../store/databases/action';
import { fullEncode } from '../../utils/common';
import { FormSearchContainer, HorizontalDivider, SearchContainer, SearchInput } from '../../styles/CommonStyles';

const FieldContainer = styled.div<{ theme: string }>`
  border: 1px solid ${(props) => getTheme(props.theme).borderColor};
  border-radius: 10px;
  background: ${(props) => getTheme(props.theme).primary};
  display: flex;
  flex-direction: column;

  .select-form {
    font-size: 20px;
    font-weight: 600;
    margin: 5px 0;
  }
  .validation-error {
    color: #e53935;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .field-config {
    height: calc(100vh - 170px);
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    width: 100%;
  }
  .loading-container {
    margin: 10px 0;
    display: flex;
  }
  .field-list {
    height: 100%;
    background-color: yellow;
  }
`;

const ListContainer = styled.div`
  border-radius: 3px;
  flex: 0 0 150px;
  padding-left: 10px;
  font-family: sans-serif;
`;

const FieldList = styled(ListContainer)`
  top: 0;
  left: 0;
  bottom: 0;
  padding: 10px 1px;
`;

const FieldsDropDownHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 10px 0 0 10px;

  .mode-header {
    font-size: 14px;
    padding: 0;
    width: 100%;
  }
`;

const FieldsDropDown = styled.div`
  display: flex;
  align-items: center;
  padding: 5px 0;

  .add-all-btn {
    text-transform: none;
    flex-direction: row;
    margin-left: auto;
  }

  .dropdown {
    border: 1px solid #fff;
    border-radius: 10px;
    width: 100%;
  }

  .main-search-container {
    border: 0px solid #a5afbe;
    box-shadow: none;
  }

  .search-container {
    background-color: #f9f9f9;
    border-radius: 10px;
    border: 1px solid #a5afbe;
    width: 100%;
    align-items: center;
  }
`;

const IconButton = styled.button`
  border: 0;
  background: none;
  user-select: none;
  cursor: pointer;

  .add {
    margin-top: 15px;
  }

  .icon-button {
    margin-top: 10px;
    margin: 0;
    padding: 0;
    height: fit-content;
    display: flex;
    align-items: center;
  }

  .icon {
    margin: 0;
    width: 18px;
  }
`;

const ListRoot = styled(List)(({ theme }) => ({
  width: "100%",
  maxWidth: 360,
  // backgroundColor: theme.palette.background.paper,
  paddingTop: "0px",
  paddingBottom: "0px",
  fontSize: "14px",
}));

const ListItemField = styled(ListItem)(({ theme: Theme }) => ({
  paddingBottom: "2px",
}));

const DivSpacer = styled("div")(({ theme: Theme }) => ({
  paddingTop: "0px",
}));

const anchorEmoji = '⚓';

interface TabPanelProps {
  children?: React.ReactNode;
  dir?: string;
  index: any;
  value: any;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}>
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

interface FieldsProps {
  fields: any;
  moveTo: (item: any, from: string) => void;
  addField: (from: string, item: any) => string;
  schemaName: string;
  nsfPath: string;
  formName: string;
  modes: Array<any>;
  tabValue: number;
  setTabValue: (index: number) => void;
}

const Fields: React.FC<FieldsProps> = ({ moveTo, addField, schemaName, nsfPath, formName, tabValue, setTabValue }) => {
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const dispatch = useDispatch();

  // Sort forms liat before display
  const { nsfDesigns } = useSelector((state: AppState) => state.databases);
  const currentDesign = nsfDesigns[nsfPath];
  const formsInDb = currentDesign?.forms;
  let formsSorted: Array<any> = [];
  formsInDb.forEach((form: any) => {
    formsSorted.push({
      dbName: schemaName,
      designType: 'forms',
      name: form['@name'],
      externalName: form['@name']
    });
  });

  const subformsInDb = currentDesign?.subforms;
  subformsInDb.forEach((subform: any) => {
    formsSorted.push({
      dbName: schemaName,
      designType: 'subforms',
      name: subform['@name'],
      externalName: `${anchorEmoji}${subform['@name']}`
    });
  });

  const allFieldObj = {
    dbName: schemaName,
    name: 'keep_internal_form_for_allFields',
    externalName: 'keep_internal_form_for_allFields'
  };
  formsSorted.unshift(allFieldObj);

  const { activeFields, newForm } = useSelector((state: AppState) => state.databases);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const initialFormState = formsInDb.length > 0 ? formName : 'Not Selected';
  const [currentFormValue, setCurrentFormValue] = useState(initialFormState || 'N/A');
  const [searchFieldKey, setSearchFieldKey] = useState('');

  const { loading } = useSelector((state: AppState) => state.loading);

  useEffect(() => {
    const designFormNames = [
      ...formsInDb.map((form: { '@alias': Array<string>; '@flags': string; '@name': string; '@unid': string }) => form['@name']),
      ...subformsInDb.map((form: { '@alias': Array<string>; '@flags': string; '@name': string; '@unid': string }) => form['@name'])
    ];

    if (!designFormNames.includes(formName)) {
      dispatch(getAllFieldsByNsf(fullEncode(nsfPath)) as any);
      dispatch(setLoading({ status: false }));
    } else if (formsInDb.length > 0 && !!formName && !newForm.enabled) {
      dispatch(fetchFields(schemaName, fullEncode(nsfPath), formName, formName, 'forms') as any);
    } else if (!newForm.enabled) {
      dispatch(getAllFieldsByNsf(fullEncode(nsfPath)) as any);
    }
  }, [schemaName, nsfPath, formName, formsInDb, subformsInDb, newForm, dispatch]);

  const handleFieldListOnClick = (event: any) => {
    setAnchorEl(event.target);
    setCurrentFormValue(event.target.value);
  };
  const handleFieldListOnClose = () => {
    setAnchorEl(null);
  };
  const handleFormListOnSelect = (form: any) => {
    setCurrentFormValue(form.externalName);
    onAddExistForm(schemaName, nsfPath, form.name, form.externalName, form.designType);
    handleFieldListOnClose();
    showFieldListTab();
  };

  /**
   * onAddExistForm is called when we pick another form
   */
  const onAddExistForm = async (schemaName: string, nsfPath: any, formName: string, externalName: string, designType: string) => {
    dispatch(setLoading({ status: true }));
    if (formName === 'keep_internal_form_for_allFields') {
      await dispatch(getAllFieldsByNsf(fullEncode(nsfPath)) as any);
    } else {
      await dispatch(fetchFields(schemaName, fullEncode(nsfPath), formName, externalName, designType) as any);
    }
    dispatch(setLoading({ status: false }));
  };

  const handleRefreshFields = async () => {
    dispatch(setLoading({ status: true }));
    await dispatch(fetchFields(schemaName, fullEncode(nsfPath), formName, formName, 'forms') as any);
    dispatch(setLoading({ status: false }));
  };

  const handleAddAll = async () => {
    let allFields: any[] = [];

    currentActiveFields.forEach((item: any) => {
      item.fields
        .filter((fld: any) => {
          if (!fld.content.startsWith('@') && !fld.content.startsWith('~#')) {
            return true;
          } else {
            return false;
          }
        })
        .forEach((fld: any) => {
          allFields.push({
            ...fld,
            name: fld.content
          });
        });
    });
    moveTo(allFields, 'read');
  };

  const handleSearchField = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setSearchFieldKey(key);
  };

  const showFieldListTab = () => {
    setTabValue(0);
  };
  // By default should be only one active fields, if we need multi ones will need to update SwipeableViews
  const currentActiveFields = activeFields.filter((item) => item.formName === currentFormValue);
  const [fieldsDisplayed, setFieldsDisplayed] = useState(currentActiveFields);

  const noFieldObj = { item: { content: 'No Field Available' } };

  useEffect(() => {
    const currentActiveFields = activeFields.filter((item) => item.formName === currentFormValue);
    const filteredFields = currentActiveFields.map((form) => {
      const newFields = form.fields.filter(
        (field: any) => !!field.content && field.content.toLowerCase().indexOf(searchFieldKey.toLowerCase()) !== -1
      );
      return {
        ...form,
        fields:
          newFields.length > 0
            ? newFields
            : (() => {
                for (let i = searchFieldKey.length; i >= 0; i--) {
                  const slicedSearchFieldKey = searchFieldKey.slice(0, i).toLowerCase();
                  const filteredFields = form.fields.filter(
                    (field: any) => !!field.content && field.content.toLowerCase().indexOf(slicedSearchFieldKey) !== -1
                  );
                  if (filteredFields.length > 0) {
                    return filteredFields;
                  }
                }
                return [];
              })()
      };
    });
    if (searchFieldKey !== '') {
      setFieldsDisplayed(filteredFields);
    } else {
      setFieldsDisplayed(currentActiveFields);
    }
  }, [searchFieldKey, activeFields, currentFormValue]);

  return (
    <FieldContainer theme={themeMode} className="field-container">
      <Box padding="0 23.5px">
        <FieldsDropDownHeader style={{ justifyContent: 'center' }}>
          <Typography className="mode-header">Show fields from:</Typography>
          <Tooltip title="Refresh List of Fields" arrow>
            <IconButton className="icon-button" onClick={handleRefreshFields}>
              <RefreshIcon className="icon" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add All Fields" arrow>
            <IconButton className="icon-button" onClick={handleAddAll}>
              <MdLibraryAdd className="icon" />
            </IconButton>
          </Tooltip>
        </FieldsDropDownHeader>
        <FieldsDropDown>
          <Select
            value={currentFormValue}
            onChange={handleFieldListOnClick}
            variant="outlined"
            className="dropdown"
            SelectDisplayProps={{
              style: {
                paddingTop: '10px',
                paddingBottom: '10px',
                borderRadius: '10px',
                border: '1px solid #323A3D',
                justifyContent: 'center'
              }
            }}>
            {formsSorted.map((form: any, idx: any) => (
              <MenuItem
                key={`${form.externalName}-${idx}`}
                value={!!form.externalName ? form.externalName : 'All Fields'}
                onClick={() => {
                  handleFormListOnSelect(form);
                }}>
                {form.externalName === 'keep_internal_form_for_allFields' ? 'All Fields' : form.externalName}
              </MenuItem>
            ))}
          </Select>
        </FieldsDropDown>
        <FieldsDropDown>
          <FormSearchContainer className="main-search-container">
            <SearchContainer className="search-container">
              <SearchIcon color="primary" className="search-icon" />
              <SearchInput placeholder="Search Field" onChange={handleSearchField} />
            </SearchContainer>
          </FormSearchContainer>
        </FieldsDropDown>
      </Box>
      <HorizontalDivider />
      {loading.status ? (
        <div className="field-config">
          <CircularProgress color="primary" />
          <div className="loading-container">
            <Typography color="textPrimary">Loading fields...</Typography>
          </div>
        </div>
      ) : (
        <SwipeableViews axis="x" index={tabValue} style={{ borderRadius: '10px' }}>
          {fieldsDisplayed.map((item: any, index: any) => (
            <ListRoot key={`${item.formName}-${index}`}>
            {
              <DivSpacer>
                <List component="div" disablePadding>
                  <ListItemField>
                    <FieldList className="fields-list">
                      {item.fields.length > 0 ? (
                        item.fields.map(
                          (item: any, index: any) =>
                            !item.content.startsWith("@") &&
                            !item.content.startsWith("~#") &&
                            !item.content.startsWith("Formula") && (
                              <SingleFieldContainer
                                key={`${item.content}-${index}`}
                                moveTo={moveTo}
                                item={{
                                  name: item.content,
                                  ...item,
                                }}
                              />
                            )
                        )
                      ) : (
                        <SingleFieldContainer
                          key="0"
                          moveTo={() => {}}
                          item={noFieldObj}
                        />
                      )}
                    </FieldList>
                  </ListItemField>
                </List>
              </DivSpacer>
            }
          </ListRoot>
          ))}
        </SwipeableViews>
      )}
    </FieldContainer>
  );
};

export default Fields;
