/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useEffect, useRef } from 'react';
import { styled } from '@linaria/react';
import { useSelector } from 'react-redux';
import { useParams } from '../../router/react';
import CircularProgress from '@mui/material/CircularProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
// prop-types import removed — using TypeScript interfaces instead
import {
  SET_ACTIVEVIEWS,
  SET_ACTIVEAGENTS,
} from '../../store/databases/types';
import { AppState } from '../../store';
import { getDatabaseIndex } from '../../store/databases/scripts';
import DetailsSection from './DetailsSection';
import { SETUP_KEEP_API_URL } from '../../config.dev';
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
 } from '../../store/databases/action';
import { toggleSettings } from '../../store/dbsettings/action';
import { getToken } from '../../store/account/action';
import ErrorWrapper from '../wrapper/ErrorWrapper';
import TabForms from './TabForms';
import TabViews from './TabViews';
import TabAgents from './TabAgents';
import { TopNavigator } from '../../styles/CommonStyles';
import { Dispatch } from 'redux';
import { TopContainer } from '../../styles/CommonStyles';
import EditViewDialog from './EditView';
import { KeepButton, KeepMonacoEditor, KeepSource } from '../keep-elements/KeepElements';
import { isTextualView } from '../keep-elements/keep-source-header';
import { apiRequestWithRetry } from '../../utils/api-retry';
import FormDialogHeader from '../dialogs/FormDialogHeader';
import { getLogger } from '../../services/log-service';
import { useAppDispatch } from '../../store/hooks';

const log = getLogger('components/forms/FormsContainer');

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
    background-color: var(--wa-color-surface-default);
    color: var(--wa-color-text-normal);
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
  border-radius: var(--wa-border-radius-l);
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
  const [nsfForms, setNsfForms] = useState([])
  const litsourceRef = useRef<any>(null)

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
  
  const dispatch = useAppDispatch();
  const setData = useState<Array<string>>([])[1];
  const { visible } = useSelector((state: AppState) => state.dbSetting);
  const { themeMode } = useSelector((state: AppState) => state.styles);
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
  
  const [editedContent, setEditedContent] = useState({})
  
  const [sourceTabContent, setSourceTabContent] = useState(JSON.stringify(schemaData, null, 1))
  // The left-hand side of the diff: the schema as last saved on the server. Same
  // formatting as the editor buffer, so the diff shows real edits and not whitespace.
  const savedSchemaText = React.useMemo(() => JSON.stringify(schemaData, null, 1), [schemaData])
  const [selectedOption, setSelectedOption] = useState('tree');
  const [saveChangesDialog, setSaveChangesDialog] = useState(false);
  const [discardChangesDialog, setDiscardChangesDialog] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const [viewOpen, setViewOpen] = useState(false);
  const [openViewName, setOpenViewName] = useState('');

  const editorRef = useRef<any>(null)
  // Lets the reset effect below tell a view switch apart from a schemaData refresh.
  const previousViewRef = useRef(selectedOption)
  const saveRef = useRef<HTMLDialogElement>(null);
  const discardRef = useRef<HTMLDialogElement>(null);

  // NOTE: Global console.error override was removed — it suppressed ALL errors app-wide.

  // NOTE: window.onerror override was removed — it silently swallowed ALL uncaught errors.

  const pullSubForms = async () => {
    try {
      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/designlist/subforms?nsfPath=${nsfPath}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json',
          },
        })
      );

      if (!response.ok) {
        throw new Error(JSON.stringify(data))
      }

      if (data) {
        dispatch(addNsfDesign(nsfPathDecode, data));
      }
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)
      setErrorStatus({
        status: error.status,
        statusText: error.message,
      });
      log.error('Error fetching subforms', error as Error);
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

      const { response, data } = await apiRequestWithRetry(() =>
        fetch(`${SETUP_KEEP_API_URL}/designlist/forms?nsfPath=${nsfPath}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            Accept: 'application/json',
          },
        })
      );
      const apiData = data

      if (!response.ok) {
        throw new Error(JSON.stringify(apiData))
      }

      if (apiData) {
        setNsfForms(apiData.forms.map((form: any) => form['@name']))
        dispatch(addNsfDesign(nsfPathDecode, apiData));

        // Get list of configured forms
        try {
          const { response, data } = await apiRequestWithRetry(() =>
            fetch(`${SETUP_KEEP_API_URL}/schema?nsfPath=${nsfPath}&configName=${dbName}`, {
              headers: {
                Authorization: `Bearer ${getToken()}`,
                Accept: 'application/json',
              },
            })
          )

          if (!response.ok) {
            throw new Error(JSON.stringify(apiData))
          }

          setErrorStatus({ status: 200, statusText: 'success' });
            setSchemaData({
              ...data,
              nsfPath: nsfPathDecode,
              schemaName: dbName,
            })
            // Loop through configured forms and fetch their modes
            configformsList = data.forms;
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
            setActiveViews(dbName, data.views);
            setActiveAgents(dbName, data.agents);
        } catch (e: any) {
          const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
          const error = JSON.parse(err)
          log.error('Error fetching configured forms', error as Error);
        }
      }
    } catch (e: any) {
      const err = e.toString().replace(/\\"/g, '"').replace("Error: ", "")
      const error = JSON.parse(err)
      log.error('Error fetching forms', error as Error);
      setErrorStatus({
        status: error.status,
        statusText: error.message,
      });
    }
  };

  // Moving between Text and Diff keeps the same editor buffer, so the live text has
  // to be captured before the switch — `value` is what the rebuilt editor reads, and
  // it would otherwise still hold the pre-edit content.
  const handleViewChange = (newOption: string) => {
    if (isTextualView(selectedOption) && isTextualView(newOption)) {
      setSourceTabContent(showValue());
    }
    setSelectedOption(newOption);
  }

  const handleClickSave = async () => {
    if (litsourceRef.current && litsourceRef.current.shadowRoot) {
      if (isTextualView(selectedOption)) {
        setEditedContent(JSON.parse(showValue()))
        setSourceTabContent(showValue())
      } else if (selectedOption === 'tree') {
        setEditedContent(litsourceRef.current.content)
        setSourceTabContent(JSON.stringify(litsourceRef.current.content, null, 2))
      }
    }
    setSaveChangesDialog(true);
  }

  const handleSaveChanges = async () => {
    setSaveChangesDialog(false)
    dispatch(updateSchema(editedContent, setSchemaData))
    pullForms()
    pullSubForms()
    dispatch(fetchViews(dbName, nsfPath))
    dispatch(fetchAgents(dbName, nsfPath))
  }

  const handleClickCancel = () => {
    if (isTextualView(selectedOption)) {
      setSourceTabContent(showValue())
    } else if (litsourceRef.current && litsourceRef.current.shadowRoot) {
      setSourceTabContent(JSON.stringify(litsourceRef.current.content, null, 2))
    }
    setDiscardChangesDialog(true)
  }

  const handleDiscardChanges = () => {
    setSourceTabContent(JSON.stringify(schemaData, null, 1))
    setDiscardChangesDialog(false);
    setUnsavedChanges(false);
  }

  const handleKeepEditing = () => {
    if (isTextualView(selectedOption)) {
      setSourceTabContent(showValue())
    } else if (selectedOption === 'tree') {
      setSourceTabContent(JSON.stringify(litsourceRef.current.content, null, 2))
    }
    setDiscardChangesDialog(false)
  }

  const handleClickNo = () => {
    setSourceTabContent(JSON.stringify(editedContent, null, 1))
    setSaveChangesDialog(false)
  }

  const showValue = () => {
    // Return value is a string, will need to parse after calling this
    return editorRef.current.getValue()
  }

  const handleCloseEditView = () => {
    setViewOpen(false);
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
          log.error('Error refreshing forms', error as Error);
        }
      } else {
        try {
          await pullForms();
          await pullSubForms();
          setIsFetch(true);
        } catch (error) {
          log.error('Error loading forms', error as Error);
          setIsFetch(true);
        }
      }
    }
    fetchForms();
    // eslint-disable-next-line
  }, []); //NOSONAR

  useEffect(() => {
    if (updateSchemaError) {
      setSourceTabContent(JSON.stringify(schemaData, null, 1));
    }
  }, [updateSchemaError, schemaData, dbName, nsfPathDecode])

  // Reset the source tab content (i.e. discard edits) when switching views
  useEffect(() => {
    const previous = previousViewRef.current;
    previousViewRef.current = selectedOption;

    // Text ⇄ Diff is a change of lens, not of buffer: both render the same pending
    // edits, and resetting here would leave the diff with nothing to show. Any other
    // switch keeps the original discard behaviour, as does a schemaData refresh
    // (where previous === selectedOption, so this guard doesn't apply).
    if (previous !== selectedOption && isTextualView(previous) && isTextualView(selectedOption)) {
      return;
    }

    if (selectedOption === 'tree' || isTextualView(selectedOption)) {
      setSourceTabContent(JSON.stringify(schemaData, null, 1));
    }
  }, [selectedOption, schemaData])

  function TabPanel({ children, value, index, ...other }: { children?: React.ReactNode; value: number; index: number; [key: string]: any }) {
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

  const handleTabChange = (_event: any, newValue: number) => {

    // Need future improvements:
    // Issue : userBlock component on react-dom-router version 6
    // This condition checks if you are moving on other tabs except newValue = 3 [Source Tab]
    // When user changes tab and it has some changes or updates on Source tab, 
    // it will pop a confirmation alert window, once user confirm it, changes will be discarded 
    // and user can move in different tab else, user will stay in Source tab
    if (unsavedChanges && newValue !== 3) {
      if (window.confirm("WARNING: Leaving this page will discard your changes to the schema. Are you sure you want to leave?")) {
        handleDiscardChanges();
        setValue(newValue);
      }
      return;
    }

    setValue(newValue);
    if (newValue === 1) {
      if (!isFetchedViews) {
        dispatch(setViews(dbName, []));
        dispatch(fetchViews(dbName, nsfPath));
        setIsFetchedViews(true);
      }
    } else if (newValue === 2) {
      if (!isFetchedAgents) {
        dispatch(setAgents(dbName, []));
        dispatch(fetchAgents(dbName, nsfPath));
        setIsFetchedAgents(true);
      }
    }
    
  };

  useEffect(() => {
    dispatch(fetchFolders(dbName, nsfPath))
  }, [dbName, dispatch, nsfPath])

  useEffect(() => {
    if (saveChangesDialog) {
      saveRef.current?.showModal()
    } else {
      if (saveRef.current?.close) {
        saveRef.current?.close()
      }
    }
  }, [saveChangesDialog])

  useEffect(() => {
    if (discardChangesDialog) {
      discardRef.current?.showModal()
    } else {
      if (discardRef.current?.close) {
        discardRef.current?.close()
      }
    }
  }, [discardChangesDialog])

  return (
    <ErrorWrapper errorStatus={errorStatus}>
      <TopContainer className='mt-15'>
        <span className="top-nav color-text-primary">
            Schema Management
        </span>
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
                className='text-bold flex'
                slotProps={{
                  indicator: {
                    title: 'indicator',
                    style: { backgroundColor: themeMode === 'dark' ? '#8CC7F9' : 'black' }
                  }
                }}
              >
                <Tab label="Database Forms" className='tab-button'/>
                <Tab label="Database Views" className='tab-button'/>
                <Tab label="Database Agents" className='tab-button'/>
                <Tab label="Source" className='tab-button'/>
              </Tabs>

              <TabPanel  value={value} index={0}>
                <TabForms setData={setData} schemaData={schemaData} setSchemaData={setSchemaData} formList={nsfForms} />
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
                <KeepSource
                  content={JSON.parse(sourceTabContent)}
                  selectedOption={selectedOption}
                  onSave={handleClickSave}
                  onCancel={handleClickCancel}
                  onDropdownChange={handleViewChange}
                  getExternalContent={showValue}
                  ref={litsourceRef}
                />
                {isTextualView(selectedOption) && <KeepMonacoEditor
                  ref={editorRef}
                  style={{ height: '70vh' }}
                  language="json"
                  value={sourceTabContent}
                  diffMode={selectedOption === 'diff'}
                  originalValue={savedSchemaText}
                />}
                <dialog ref={saveRef} className='dialog'>
                  <FormDialogHeader
                    title='Save changes?'
                    onClose={handleClickNo}
                  />
                  <div className='dialog-content'>
                    <text className='dialog-content-text'>
                      Are you sure you want to save the changes made to the schema? Click Yes to continue. Click No to go back and review your changes.
                    </text>
                  </div>
                  <div className='dialog-actions'>
                    <KeepButton variant="neutral" appearance="outlined" onClick={handleClickNo}>No</KeepButton>
                    <KeepButton onClick={handleSaveChanges}>Yes</KeepButton>
                  </div>
                </dialog>
                <dialog ref={discardRef} className='dialog'>
                  <FormDialogHeader
                    title='Discard changes?'
                    onClose={handleDiscardChanges}
                  />
                  <div className='dialog-content'>
                    <text className='dialog-content-text'>
                      WARNING: Clicking Cancel will discard the changes you've made to the schema. Continue?
                    </text>
                  </div>
                  <div className='dialog-actions'>
                    <KeepButton variant="neutral" appearance="outlined"
                      onClick={handleDiscardChanges}
                    >Discard Changes</KeepButton>
                    <KeepButton onClick={handleKeepEditing}>Keep Editing</KeepButton>
                  </div>
                </dialog>
              </TabPanel>
            </Stack>
          </>
        ) : (
          <div className='forms-container-loading-container'>
            <CircularProgress color="primary" />
            <div className='m-0 mt-10 mb-10 flex'>
              <span className="color-text-primary">Getting&nbsp;</span>
              <span className="color-base">
                {`Schema ${dbName}`}
              </span>
              <span className="color-text-primary">
                . This may take a few seconds...
              </span>
            </div>
          </div>
        )}
      </CoreContainer>
    </ErrorWrapper>
  );
};

/**
 * Orders forms by name, tolerating entries that have none.
 *
 * Exported for test: it is the logic that the bare `catch {}` below used to hide.
 */
export function compareFormNames(a: { formName?: string }, b: { formName?: string }): number {
  return String(a.formName ?? '')
    .toLowerCase()
    .localeCompare(String(b.formName ?? '').toLowerCase());
}

function loadUnconfiguredForms(
  apiData: {
    forms: Array<any>,
  },
  allForms: any[],
  dbName: string,
  setData: React.Dispatch<React.SetStateAction<string[]>>,
  dispatch: Dispatch<any>
) {
  apiData.forms.forEach((form: any) => {
    allForms.push({
      dbName,
      formName: form['@name'],
      alias: form['@alias'],
      formModes: []
    });
  });

  // Sort the form names alphabetically.
  //
  // This used to be wrapped in a bare `catch {}`: a design element with no `@name`
  // makes `formName` undefined, `undefined.toLowerCase()` throws, and Array#sort
  // propagates that out — so one nameless form left the *entire* list unsorted, with
  // nothing logged. `compareFormNames` cannot throw, so the failure is removed rather
  // than hidden or merely logged.
  allForms.sort(compareFormNames);

  // Save Forms Data
  setData(apiData.forms);
  dispatch(setForms(dbName, allForms));
  dispatch(setCurrentForms(dbName, allForms));
}

function loadConfiguredForms(
  configformsList: any[],
  allForms: any[],
  dbName: string,
  apiData: {
    forms: Array<any>,
  },
  setData: React.Dispatch<React.SetStateAction<string[]>>,
  dispatch: Dispatch<any>
) {
  let formPromises: Array<any> = [];

  for (const form of configformsList) {
    allForms.push({ dbName, ...form });
  }

  // Wait for all configured forms to be loaded
  Promise.allSettled(formPromises)
    .then(() => {
      // Once we have all the results build a complete list
      // and update our state
      // Add unconfigured forms
      let configformsNameList = configformsList.map((form) => form.formName);
      apiData.forms.forEach((form: any) => {
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
      setData(apiData.forms);
      dispatch(setForms(dbName, allForms));
      dispatch(setCurrentForms(dbName, allForms));
    })
    .catch((e: any) => log.error('Error processing unconfigured forms', e as Error));
}

export default FormsContainer;
