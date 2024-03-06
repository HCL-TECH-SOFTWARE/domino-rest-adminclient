/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useSelector, useDispatch } from 'react-redux';
import { Prompt, useParams } from 'react-router-dom';
import axios, { AxiosResponse } from 'axios';
import CircularProgress from '@material-ui/core/CircularProgress';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@material-ui/core';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import PropTypes from 'prop-types';
import {
  SET_ACTIVEVIEWS,
  SET_ACTIVEAGENTS,
} from '../../store/databases/types';
import { AppState } from '../../store';
import { getDatabaseIndex } from '../../store/databases/scripts';
import DetailsSection from './DetailsSection';
import { KEEP_ADMIN_BASE_COLOR, SETUP_KEEP_API_URL } from '../../config.dev';
import {
  setForms,
  setCurrentForms,
  setViews,
  fetchViews,
  setAgents,
  fetchAgents,
  setDbIndex,
  addNsfDesign,
  updateSchema,
  fetchFolders,
  addForm} from '../../store/databases/action';
import { toggleSettings } from '../../store/dbsettings/action';
import { getToken } from '../../store/account/action';
import ErrorWrapper from '../wrapper/ErrorWrapper';
import TabForms from './TabForms';
import TabViews from './TabViews';
import TabAgents from './TabAgents';
import { ButtonNeutral, ButtonNo, ButtonYes, Buttons, DialogContainer, TopNavigator } from '../../styles/CommonStyles';
import { Dispatch } from 'redux';
import { TopContainer } from '../../styles/CommonStyles';
import { JsonEditor } from 'react-jsondata-editor';
import { toggleAlert } from '../../store/alerts/action';
import { FiSave } from 'react-icons/fi';
import { ImCancelCircle } from 'react-icons/im';
import { BiExport } from 'react-icons/bi';
import EditViewDialog from './EditView';


const CoreContainer = styled.div<{ show: boolean }>`
  padding: 0;
  display: flex;
  height: calc( 100vh - 225px);
  overflow-y: auto;
  width: calc( 100% - 10px);
  @media only screen and (max-width: 768px) {
    height: calc( 100vh - 60px);
  }

  .error-message {
    font-size: 18px;
    font-weight: 500;
    color: #e53935;
  }

  .tab-button {
    text-transform: none;
    font-size: 20px;

    :focus {
      font-weight: bold;
    }

    .Mui-selected {
      font-weight: bold;
    }
  }

  .chosen-tab {
    color: black;
    font-weight: bold;
  }

  .textarea {
    height: 60vh;
    width: 100%;
    background-color: white;
    resize: none;
  }

  .flex-container {
    display: flex;
  }

  .flex-child {
    border: 2px solid lightgrey;
    flex: 1;
    min-height: 400px;
    margin-top: 25px;
    width: calc(50% - 25px);
  }

  .flex-child:first-child {
    margin-right: 50px;
  }
`;

const Details = styled.div`
  width: 20%;
  height: 100%;
  border-radius: 10px;
  border: 1px solid #d1d1d1;
  overflow-x: scroll;
  overflow-y: auto;
  padding: 20px 30px 20px 30px;
`;

const Stack = styled.div`
  flex: 1;
  padding: 0 25px;
  width: calc(100% - 190px);
`;

const TabContainer = styled.div`
  padding-left: 1px;
`;

const ToggleContainer = styled.div`
  margin-bottom: 6px;

  .toggle-container {
    position: relative;
    width: 257px;
    height: 34px;
    background-color: #e6ebf5;
    cursor: pointer;
    user-select: none;
    border-radius: 5px;
    padding: 5px;
    display: inline-block;
  }

  .toggle-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    box-sizing: border-box;
    width: 128px;
    height: 24px;
    font-size: 14px;
    line-height: 16px;
    cursor: pointer;
    color: #fff;
    background-color: #79a3e8;
    box-shadow: 0 2px 4px rgb(0, 0, 0, 0.25);
    padding: 8px 12px;
    border-radius: 5px;
    position: absolute;
    transition: all 0.2s ease;
    left: 128px;
    overflow-x: visible;
    text-transform: none;
  }

  .disable {
    left: 2px;
  }

  .unchecked {
    left: 134px;
    position: absolute;
    color: #6c7882;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 14px;
    line-height: 16px;
    padding: 4px 12px;
    text-transform: none;
  }

  .left {
    left: 20px;
  }

  .hidden {
    display: none;
  }
`

const JsonEditorContainer = styled.div`
  border: "solid 1px #dddddd";
  height: 60vh;
  overflow-y: auto;
`

/**
 * Displays the Database Forms, Views and Agents Pages
 *
 * @author Michael Angelo Silva
 * @author Neil Schultz
 */
const FormsContainer = () => {
  const { databasesOverview, updateSchemaError, scopes } = useSelector(
    (state: AppState) => state.databases
  );

  // check if formModes key is present in the form object
  // if not, it will add new key(formModes) and add the formAccessModes values
  

  const { show } = useSelector((state: AppState) => state.search);
  const { nsfPath, dbName } = useParams() as {
    nsfPath: string;
    dbName: string;
  };

  const [isFetch, setIsFetch] = useState(false);
  const [isFetchedViews, setIsFetchedViews] = useState(false);
  const [isFetchedAgents, setIsFetchedAgents] = useState(false);
  const [errorStatus, setErrorStatus] = useState({
    status: 200,
    statusText: ''
  });
  
  const dispatch = useDispatch();
  const setData = useState<Array<string>>([])[1];
  const { visible } = useSelector((state: AppState) => state.dbSetting);
  const [schemaData, setSchemaData] = useState({
    '@unid': "",
    apiName: "",
    schemaName: "",
    description: "",
    nsfPath: "",
    icon: "beach",
    iconName: "beach",
    isActive: "true",
    owners: [],
    isModeFetch: false,
    modes: [],
    forms: [],
    configuredForms: [],
    views: [],
    agents: [],
  })

  const nsfPathDecode = decodeURIComponent(nsfPath);
  
  const [styledObjMode, setStyledObjMode] = useState(true);
  
  const [sourceTabContent, setSourceTabContent] = useState(JSON.stringify(schemaData, null, 1))
  const [buttonsEnabled, setButtonsEnabled] = useState(false);
  const [saveChangesDialog, setSaveChangesDialog] = useState(false);
  const [discardChangesDialog, setDiscardChangesDialog] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [exportFileName, setExportFileName] = useState(`${dbName}.json`);

  const [viewOpen, setViewOpen] = useState(false);
  const [openViewName, setOpenViewName] = useState('');

  const pullSubForms = async () => {
    try {
      const response = await axios.get(
        `${SETUP_KEEP_API_URL}/designlist/subforms?nsfPath=${nsfPath}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json'
          }
        }
      );

      if (response) {
        dispatch(addNsfDesign(nsfPathDecode, response.data));
      }
    } catch (e: any) {
      setErrorStatus({
        status: e.response.status,
        statusText: e.response.statusText
      });
    }
  }

  useEffect(() => {
    setSourceTabContent(JSON.stringify(schemaData, null, 1))
  }, [dbName, nsfPathDecode, schemaData])

  /**
   * Retrieve the information for a particular database and
   * save off the form data for later display.
   *
   * @param dbName the name of the database
   */
  const pullForms = async () => {
    try {
      let allForms: Array<any> = [];
      let configformsList: Array<any> = [];

      const apiData = await axios.get(
        `${SETUP_KEEP_API_URL}/designlist/forms?nsfPath=${nsfPath}`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json'
          }
        }
      );

      if (apiData) {
        dispatch(addNsfDesign(nsfPathDecode, apiData.data));

        // Get list of configured forms
        axios
          .get(
            `${SETUP_KEEP_API_URL}/schema?nsfPath=${nsfPath}&configName=${dbName}`,
            {
              headers: {
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
              }
            }
          )
          .then((response) => {
            setErrorStatus({ status: 200, statusText: 'success' });
            setSchemaData({
              ...response.data,
              nsfPath: nsfPathDecode,
              schemaName: dbName,
            })
            // Loop through configured forms and fetch their modes
            configformsList = response.data.forms;
            if (configformsList != null && configformsList.length > 0) {
              loadConfiguredForms(
                configformsList,
                allForms,
                dbName,
                apiData,
                setData,
                dispatch
              );
            } else {
              // Add unconfigured forms
              loadUnconfiguredForms(
                apiData,
                allForms,
                dbName,
                setData,
                dispatch
              );
            }
            setActiveViews(dbName, response.data.views);
            setActiveAgents(dbName, response.data.agents);
          });
      }
    } catch (e: any) {
      setErrorStatus({
        status: e.response.status,
        statusText: e.response.statusText
      });
    }
  };

  const handleChangeContent = (output: any) => {
    if (output === sourceTabContent && buttonsEnabled) {
      // disable buttons if edits were made but the changes are equal to the current schema, so no need for actual save
      setButtonsEnabled(false);
      dispatch(toggleAlert(`The new edits are the same as the current schema - no new changes are made. Disabling Save and Cancel buttons.`));
    } else if (output === sourceTabContent) {
      dispatch(toggleAlert(`The new edits are the same as the current schema - no new changes are made.`));
    } else if (!buttonsEnabled) {
      setButtonsEnabled(true);
      setSourceTabContent(output);
      setUnsavedChanges(true);
    } else {
      setSourceTabContent(output);
      setUnsavedChanges(true);
    }
  }

  const handleClickSave = async () => {
    setSaveChangesDialog(true);
  }

  const handleSaveChanges = async () => {
    setSaveChangesDialog(false);
    await dispatch(updateSchema(JSON.parse(sourceTabContent), setSchemaData) as any);
    setButtonsEnabled(false);
    setUnsavedChanges(false);
  }

  const handleClickCancel = () => {
    setDiscardChangesDialog(true);
  }

  const handleDiscardChanges = () => {
    setSourceTabContent(JSON.stringify(schemaData, null, 1));
    setDiscardChangesDialog(false);
    setUnsavedChanges(false);
    setButtonsEnabled(false);
  }

  const handleClickExport = () => {
    download();
    dispatch(toggleAlert('Schema exported in your default downloads folder.'));
  }

  const handleCloseEditView = () => {
    setViewOpen(false);
  }

  const download = () => {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(sourceTabContent));
    element.setAttribute('download', exportFileName);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
  }

  useEffect(() => {
    document.title = `HCL Domino REST API | ${dbName} Forms`;
    // check if settings dialog is opened
    if (visible) dispatch(toggleSettings());

    // Fetch current forms
    async function fetchForms() {
      const dbIndex = getDatabaseIndex(databasesOverview, dbName, nsfPathDecode);
      dispatch(setDbIndex(dbIndex));
      if (databasesOverview.length > 0) {
        // LABS-1865 Reinitialize state on refresh
        try {
          await pullForms();
          await pullSubForms();
          setIsFetch(true);
        } catch (error) {
          console.log(error);
        }
      } else {
        try {
          await pullForms();
          await pullSubForms();
          setIsFetch(true);
        } catch (error) {
          console.log(error);
          setIsFetch(true);
        }
      }
    }
    fetchForms();
    //TODO
    // eslint-disable-next-line
  }, []); //NOSONAR

  useEffect(() => {
    if (updateSchemaError) {
      setSourceTabContent(JSON.stringify(schemaData, null, 1));
      setButtonsEnabled(true);
    }
  }, [updateSchemaError, schemaData, dbName, nsfPathDecode])

  function TabPanel(props: any) {
    const { children, value, index, ...other } = props;

    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`dbTabpanel${index}`}
        {...other}
      >
        {value === index && <TabContainer>{children}</TabContainer>}
      </div>
    );
  }

  TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.any.isRequired,
    value: PropTypes.any.isRequired
  };

  function setActiveViews(dbName: string, views: Array<any>) {
    // Build Active View list
    const viewsList: Array<any> = [];
    views?.forEach((view) => {
      let alias =
        view.alias != null && view.alias.length > 0 ? view.alias[0] : '';

      // Suppress alias when it's a duplicate of the name LABS-1903
      alias = alias === view.name ? '' : alias;
      let viewUpdatedBool = (view.columns && view.columns.length > 0) ? true : false
      viewsList.push({
        viewName: view.name,
        viewAlias: alias,
        viewUnid: view.unid,
        viewActive: true,
        viewUpdated: viewUpdatedBool
       
      });
    });
    // Save Active Views \ Agents Data (Right Panel)
    dispatch({
      type: SET_ACTIVEVIEWS,
      payload: {
        db: dbName,
        activeViews: viewsList
      }
    });
    return viewsList;
  }

  function setActiveAgents(dbName: string, agents: Array<any>) {
    // Build Active View list
    const agentsList: Array<any> = [];
    agents?.forEach((agent) => {
      let alias =
        agent.alias != null && agent.alias.length > 0 ? agent.alias[0] : '';

      // Suppress alias when it's a duplicate of the name LABS-1903
      alias = alias === agent.name ? '' : alias;
      agentsList.push({
        agentName: agent.name,
        agentAlias: alias,
        agentUnid: agent.unid,
        agentActive: true
      });
    });
    // Save Active agents \ Agents Data (Right Panel)
    dispatch({
      type: SET_ACTIVEAGENTS,
      payload: {
        db: dbName,
        activeAgents: agentsList
      }
    });
    return agentsList;
  }
  const [value, setValue]  = React.useState(0);

  const handleTabChange = (event: any, newValue: number) => {
    setValue(newValue);
    if (newValue === 1) {
      if (!isFetchedViews) {
        dispatch(setViews(dbName, []) as any);
        dispatch(fetchViews(dbName, nsfPath) as any);
        setIsFetchedViews(true);
      }
    } else if (newValue === 2) {
      if (!isFetchedAgents) {
        dispatch(setAgents(dbName, []) as any);
        dispatch(fetchAgents(dbName, nsfPath) as any);
        setIsFetchedAgents(true);
      }
    }
  };

  const handleToggle = () => {
    setStyledObjMode(!styledObjMode);
  };

  useEffect(() => {
    dispatch(fetchFolders(dbName, nsfPath) as any)
  }, [dbName, dispatch, nsfPath])

  useEffect(() => {
    dispatch(addForm(false) as any)
  }, [dispatch])

  return (
    <ErrorWrapper errorStatus={errorStatus}>
      <TopContainer style={{ marginTop: '15px' }}>
        <Typography
            className="top-nav"
            color="textPrimary"
          >
            Schema Management
        </Typography>
      </TopContainer>
      <CoreContainer show={show} id="databases-list">
        {isFetch ? (
          <>
            <Details>
              <DetailsSection dbName={dbName} nsfPathProp={nsfPathDecode} schemaData={schemaData} setSchemaData={setSchemaData} />
            </Details>
            <Stack>
              <Tabs 
                value={value} 
                onChange={handleTabChange} 
                variant='scrollable'
                style={{ fontWeight: 'bold', display: 'flex' }}
                TabIndicatorProps={{
                  title: 'indicator',
                  style: { backgroundColor: 'black' }
                }}
              >
                <Tab label="Database Forms" className='tab-button'/>
                <Tab label="Database Views" className='tab-button'/>
                <Tab label="Database Agents" className='tab-button'/>
                <Tab label="Source" className='tab-button'/>
              </Tabs>

              <TabPanel  value={value} index={0}>
                <TabForms setData={setData} schemaData={schemaData} setSchemaData={setSchemaData} />
              </TabPanel>
              <TabPanel value={value} index={1}>
                <TabViews 
                  key={`${schemaData.schemaName}-${schemaData.nsfPath}`}
                  setViewOpen={setViewOpen}
                  setOpenViewName={setOpenViewName}
                  schemaData={schemaData}
                  setSchemaData={setSchemaData}
                />
                <EditViewDialog
                  open={viewOpen}
                  dbName={dbName}
                  nsfPathProp={nsfPath}
                  handleClose={handleCloseEditView}
                  viewName={openViewName}
                  scopes={scopes}
                  setOpen={setViewOpen}
                  schemaData={schemaData}
                  setSchemaData={setSchemaData}
                />
              </TabPanel>
              <TabPanel value={value} index={2}>
                <TabAgents schemaData={schemaData} />
              </TabPanel>
              <TabPanel value={value} index={3}>
                <TopNavigator />
                <div>
                  <ToggleContainer>
                    <div className='toggle-container' onClick={handleToggle}>
                      <Button className={`toggle-btn ${!styledObjMode ? 'disable' : ''}`}>{ styledObjMode ? "Styled Object" : "Text Mode" }</Button>
                      <Button className={`unchecked ${styledObjMode ? 'left' : ''}`}>{ styledObjMode ? "Text Mode" : "Styled Object" }</Button>
                    </div>
                    <Buttons>
                      <Button 
                        onClick={handleClickSave} 
                        disabled={!buttonsEnabled} 
                        className={styledObjMode ? 'btn' : 'hidden'}
                        style={{right: 'calc(93px + 2% + 93px)'}}
                      >
                        <FiSave />
                        <span className='text'>
                          Save
                        </span>
                      </Button>
                      <Button 
                        onClick={handleClickCancel} 
                        disabled={!buttonsEnabled} 
                        className={styledObjMode ? 'btn' : 'hidden'}
                        style={{right: 'calc(93px + 2%)'}}
                      >
                        <ImCancelCircle />
                        <span className='text'>
                          Cancel
                        </span>
                      </Button>
                      <Button
                        onClick={handleClickExport}
                        className='btn'
                        style={{right: '2%'}}
                      >
                        <BiExport />
                        <span className='text'>
                          Export
                        </span>
                      </Button>
                    </Buttons>
                  </ToggleContainer>
                </div>
                {
                  styledObjMode && 
                  <JsonEditorContainer>
                    <JsonEditor 
                      jsonObject={sourceTabContent}
                      onChange={(output: any) => {handleChangeContent(output)}}
                    />
                    <Dialog open={saveChangesDialog}>
                      <DialogContainer>
                        <DialogTitle className='title'>
                          <Typography className='title'>
                            Save changes?
                          </Typography>
                          {/* Save changes? */}
                        </DialogTitle>
                        <DialogContent>
                          Are you sure you want to save the changes made to the schema? Click Yes to continue.
                        </DialogContent>
                        <DialogActions className='actions'>
                          <ButtonNeutral onClick={() => setSaveChangesDialog(false)}>No</ButtonNeutral>
                          <ButtonYes onClick={handleSaveChanges}>Yes</ButtonYes>
                        </DialogActions>
                      </DialogContainer>
                    </Dialog>
                    <Dialog open={discardChangesDialog}>
                      <DialogContainer>
                        <DialogTitle className='title'>
                          <Typography className='title'>
                            Discard changes?
                          </Typography>
                        </DialogTitle>
                        <DialogContent>
                          WARNING: Clicking Cancel will discard the changes you've made to the schema. Continue?
                        </DialogContent>
                        <DialogActions className='actions'>
                          <ButtonNo onClick={handleDiscardChanges}>Discard Changes</ButtonNo>
                          <ButtonYes onClick={() => {setDiscardChangesDialog(false)}}>Keep Editing</ButtonYes>
                        </DialogActions>
                      </DialogContainer>
                    </Dialog>
                  </JsonEditorContainer>
                }
                {
                  !styledObjMode &&
                  <textarea 
                    className="textarea" 
                    value={JSON.stringify(JSON.parse(sourceTabContent), null, 4)} 
                    disabled 
                  /> 
                }
              </TabPanel>
            </Stack>
          </>
        ) : (
          <div
            style={{
              height: 'calc(100vh - 170px)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              width: '100%'
            }}
          >
            <CircularProgress color="primary" />
            <div style={{ margin: '10px 0', display: 'flex' }}>
              <Typography color="textPrimary">Getting&nbsp;</Typography>
              <Typography style={{ color: KEEP_ADMIN_BASE_COLOR }}>
                {`Schema ${dbName}`}
              </Typography>
              <Typography color="textPrimary">
                . This may take a few seconds...
              </Typography>
            </div>
          </div>
        )}
      </CoreContainer>
      <Prompt
        when={unsavedChanges}
        message={`WARNING: Leaving this page will discard your changes to the schema. Are you sure you want to leave?`}
      />
    </ErrorWrapper>
  );
};

function loadUnconfiguredForms(
  apiData: AxiosResponse<any, any>,
  allForms: any[],
  dbName: string,
  setData: React.Dispatch<React.SetStateAction<string[]>>,
  dispatch: Dispatch<any>
) {
  apiData.data.forms.forEach((form: any) => {
    allForms.push({
      dbName,
      formName: form['@name'],
      alias: form['@alias'],
      formModes: []
    });
  });

  // Sort the form names alphabetically
  try {
    allForms.sort((a, b) =>
      a.formName.toLowerCase() > b.formName.toLowerCase() ? 1 : -1
    );
  } catch (e) {}

  // Save Forms Data
  setData(apiData.data.forms);
  dispatch(setForms(dbName, allForms));
  dispatch(setCurrentForms(dbName, allForms));
}

function loadConfiguredForms(
  configformsList: any[],
  allForms: any[],
  dbName: string,
  apiData: AxiosResponse<any, any>,
  setData: React.Dispatch<React.SetStateAction<string[]>>,
  dispatch: Dispatch<any>
) {
  let formPromises: Array<any> = [];

  for (const form of configformsList) {
    allForms.push({ dbName, ...form });
  }

  // Wait for all configured forms to be loaded
  Promise.allSettled(formPromises)
    .then((results) => {
      // Once we have all the results build a complete list
      // and update our state
      // Add unconfigured forms
      let configformsNameList = configformsList.map((form) => form.formName);
      apiData.data.forms.forEach((form: any) => {
        if (!configformsNameList.includes(form['@name']))
          allForms.push({
            dbName,
            formName: form['@name'],
            alias: form['@alias'],
            formModes: []
          });
        });
      // Sort the form names alphabetically
      allForms.sort((a, b) =>
        a.formName.toLowerCase() > b.formName.toLowerCase() ? 1 : -1
      );
      // Save Forms Data
      setData(apiData.data.forms);
      dispatch(setForms(dbName, allForms));
      dispatch(setCurrentForms(dbName, allForms));
    })
    .catch((e: any) => console.log('Error processing: ' + e));
}

export default FormsContainer;
