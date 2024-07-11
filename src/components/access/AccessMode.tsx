/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useEffect } from 'react';
import { v4 as uuid } from 'uuid';
import { DragDropContext } from 'react-beautiful-dnd';
import { useLocation } from 'react-router-dom';
import useMediaQuery from '@mui/material/useMediaQuery';
import Typography from '@mui/material/Typography';
import { useDispatch, useSelector } from 'react-redux';
import Fields from './Fields';
import { reorder, copy, move } from './functions';
import { AccessModeContainer } from './styles';
import TabsAccess from './TabsAccess';
import PageLoading from '../loaders/PageLoading';
import { Mode } from '../../store/databases/types';
import {
  cacheFormFields,
  setLoadedFields,
  addActiveFields,
  addForm,
  fetchSchema,
} from '../../store/databases/action';
import { AccessContext } from './AccessContext';
import { AppState } from '../../store';
import { TopContainer } from '../../styles/CommonStyles';
import NetworkErrorDialog from '../dialogs/NetworkErrorDialog';
import GenericLoading from '../loading/GenericLoading';
import styled from 'styled-components';
import { Button } from '@mui/material';
import ModeCompare from './ModeCompare';

const ModeCompareButton = styled(Button)`
  .text {
    font-size: 16px;
    font-weight: 700;
    line-height: normal;
    color: #FFFFFF;
  }

  .disabled {
    color: #8291A0;
  }
`

const AccessMode: React.FC = () => {
  const [state, setstate] = useState({ [uuid()]: [] }) as any;
  const dispatch = useDispatch();
  const [modes, setModes] = useState<Array<Mode>>([]);
  const [modeIndex, setModeIndex] = useState(
    modes.findIndex((mode: any) => mode.modeName === 'default')
  );
  const [currentModeIndex, setCurrentModeIndex] = useState(modeIndex);
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

  const urls = useLocation();
  const nsfPath = decodeURIComponent(urls.pathname.split('/')[2]);
  const formName = decodeURIComponent(urls.pathname.split('/')[4]);
  const dbName = urls.pathname.split('/')[3];

  const { loading } = useSelector((state: AppState) => state.dialog);
  const { loadedFields, newForm } = useSelector((state: AppState) => state.databases);
  const forms: any[] = []
  const allForms = newForm.form ? [...forms, newForm.form] : forms
  const { nsfDesigns } = useSelector((state: AppState) => state.databases);
  const [allModes, setAllModes] = useState(allForms.length > 0 ? allForms.filter((form) => form.formName === formName)[0].formModes : [])
  const currentDesign = nsfDesigns[nsfPath];
  const fetchFieldsArray = currentDesign?.forms;
  const [tabValue, setTabValue] = useState(0);
  const [openModeCompare, setOpenModeCompare] = useState(false);

  useEffect(() => {
    dispatch(fetchSchema(nsfPath, dbName, setSchemaData) as any)
  }, [dispatch, nsfPath, dbName])

  useEffect(() => {
    const forms = schemaData.forms
    const allForms = newForm.form ? [...forms, newForm.form] : forms
    setAllModes(allForms.length > 0 ? allForms.filter((form) => form.formName === formName)[0].formModes : [])
  }, [schemaData, newForm.form, formName])

  useEffect(() => {
    function fetchSchemaFields() {
      setModeIndex(allModes.length - 1);
      let modifiedAccessFields;
      if (allModes.length > modes.length && modes.length === 0) {
        // init state
        let defaultIndex =
          allModes.findIndex((mode: any) => mode.modeName === 'default') || 0;
        setCurrentModeIndex(defaultIndex);
        modifiedAccessFields = allModes[defaultIndex].fields.map(
          (field: any) => ({
            id: uuid(),
            content: field.name,
            ...field,
          })
        );
      } else if (allModes.length > modes.length) {
        // new mode added
        setCurrentModeIndex(allModes.length - 1);
        modifiedAccessFields = allModes[allModes.length - 1].fields.map(
          (field: any) => ({
            id: uuid(),
            content: field.name,
            ...field,
          })
        );
      } else if (allModes.length < modes.length) {
        // mode deleted
        let defaultIndex =
          allModes.findIndex((mode: any) => mode.modeName === 'default') || 0;
        setCurrentModeIndex(defaultIndex);
        modifiedAccessFields = allModes[defaultIndex].fields.map(
          (field: any) => ({
            id: uuid(),
            content: field.name,
            ...field,
          })
        );
      } else {
        // mode edited
        modifiedAccessFields = allModes[currentModeIndex].fields.map(
          (field: any) => ({
            id: uuid(),
            content: field.name,
            ...field,
          })
        );
      }
      setModes(allModes);

      const newStates = [modifiedAccessFields];
      let counter = 0;

      const newDroppables = {} as any;
      for (const droppableKey in state) {
        newDroppables[droppableKey] = newStates[counter];
        counter++;
      }

      setstate({
        ...state,
        ...newDroppables,
      })
    }
    if (fetchFieldsArray.length === 0) {
      dispatch(setLoadedFields(formName, []) as any);
      dispatch(addActiveFields(formName, []) as any);
      dispatch(cacheFormFields(dbName, formName, []) as any);
    }
    if (allModes.length > 0) {
      fetchSchemaFields();
    }

    // eslint-disable-next-line
  }, [urls, allModes, dbName, formName]); //NOSONAR

  const onDragEnd = (result: any) => {
    const { source, destination } = result;

    if (!destination) {
      return;
    }

    switch (source.droppableId) {
      case destination.droppableId:
        setstate({
          ...state,
          [destination.droppableId]: reorder(
            state[source.droppableId],
            source.index,
            destination.index
          ),
        });
        break;
      case 'ITEMS':
        setstate({
          ...state,
          [destination.droppableId]: copy(
            loadedFields,
            state[destination.droppableId],
            source,
            destination
          ),
        });
        break;
      default:
        setstate(
          move(
            state[source.droppableId],
            state[destination.droppableId],
            source,
            destination
          )
        );
        break;
    }
  };

  const remove = (idx: number, fieldList: any, all?: boolean) => {
    if (all) {
      setstate({ [uuid()]: [] })
    } else {
      const deleteId = fieldList.map((field: any) => {return field.id})
      const deleteContent = fieldList.map((field: any) => {return field.content})
      let stateBuffer = {...state}
      Object.keys(state).forEach((key) => {
        stateBuffer[key] = state[key].filter((field: any) => !deleteId.includes(field.id) && !deleteContent.includes(field.content))
      })
      setstate(stateBuffer)
    }
  };

  const update = (idx: number, droppableIndex: any, item: any) => {
    let items = state[droppableIndex].map((curItem: any, index: number) => {
      if (index !== idx) {
        return curItem;
      } else {
        return item;
      }
    });
    setstate({
      ...state,
      [droppableIndex]: [...items],
    });
  };

  const moveTo = (items: Array<any>, from: string) => {
    let addItems = {};
    let fieldsArray: any[] = [];

    const section = Object.keys(state)[from === 'read' ? 0 : 1];
    const read = Object.keys(state)[0];

    let contentArray: any[] = [];

    if (from === 'both') {
      contentArray = state[read].map((fld: any) => {
        return fld.content;
      });
    } else {
      contentArray = state[section].map((fld: any) => {
        return fld.content;
      });
    }

    items.forEach((item: any) => {
      if (!contentArray.includes(item.content)) {
        fieldsArray.push(item);
      }
    });

    if (from === 'both') {
      addItems = {
        [read]: [...state[read], ...fieldsArray],
      };
    } else {
      addItems = {
        [section]: [...state[section], ...fieldsArray],
      };
    }

    setstate({
      ...addItems,
    });
  };

  const addField = (from: string, item: any) => {
    const section = Object.keys(state)[from === 'read' ? 0 : 1];
    const read = Object.keys(state)[0];

    const find = state[section].find((field: any) => {
      return field.name === item.name;
    });
    if (find) {
      return 'The name already exists.';
    } else {
      // move to designated fields
      if (from === 'both') {
        setstate({
          ...state,
          [read]: [...state[read], item],
        });
      } else {
        setstate({
          ...state,
          [section]: [...state[section], item],
        });
      }
      return '';
    }
  };

  const matches = useMediaQuery('(max-width:768px)');

  const setPageIndex = (index: number) => {
    const modifiedAccessFields = modes[index].fields.map((field: any) => {
      if (!field.id) {
        return {
          id: uuid(),
          content: field.name,
          ...field,
        };
      } else {
        return { ...field };
      }
    });

    const newStates = [modifiedAccessFields];
    let counter = 0;

    const newDroppables = {} as any;

    for (const droppableKey in state) {
      newDroppables[droppableKey] = newStates[counter];
      counter++;
    }

    setstate({
      ...state,
      ...newDroppables,
    });

    const modesCopy = [...modes];
    setModes(modesCopy);
  };

  const handleClickOpenModeCompare = () => {
    setOpenModeCompare(true);
  }

  const handleCloseModeCompare = () => {
    setOpenModeCompare(false);
  }

  useEffect(() => {
    addForm(false)
  })

  return (
    <AccessContext.Provider value={[state, setstate]}>
      {fetchFieldsArray.length > 0 ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <TopContainer style={{ marginTop: '15px' }}>
            <Typography className='top-nav' color='textPrimary'>
              Schema Management - {formName}
            </Typography>
            <ModeCompareButton 
              className={`button-compare ${modes.length > 1 ? '' : 'compare-disabled'}`} 
              onClick={handleClickOpenModeCompare}
              disabled={modes.length === 1 || newForm === null}
            >
              <Typography className={`text ${modes.length > 1 ? '' : 'disabled'}`}>
                Open Mode Compare
              </Typography>
          </ModeCompareButton>
          </TopContainer>
          <AccessModeContainer>
            {!matches && (
              <Fields
                schemaName={dbName}
                nsfPath={nsfPath}
                formName={
                  fetchFieldsArray.length === 0 ? 'All Fields' : formName
                }
                moveTo={moveTo}
                addField={addField}
                fields={loadedFields}
                modes={modes}
                tabValue={tabValue}
                setTabValue={setTabValue}
              />
            )}

            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                alignItems: 'center',
                paddingTop: 50 * modes.length,
                position: 'relative',
                margin: '10px px',
                height: 'calc (100vh - 71px)',
              }}
            >
              {!loading && modes.length > 0 ? (
                <TabsAccess
                  currentModeIndex={currentModeIndex}
                  top={0}
                  modes={modes}
                  width={100}
                  state={state}
                  remove={remove}
                  update={update}
                  setPageIndex={setPageIndex}
                  setCurrentModeIndex={setCurrentModeIndex}
                  addField={addField}
                  schemaData={schemaData}
                  setSchemaData={setSchemaData}
                />
              ) : (
                <GenericLoading />
              )}
            </div>
          </AccessModeContainer>
        </DragDropContext>
      ) : (
        <PageLoading message={`Loading ${formName} Form Access Data`} />
      )}
      <NetworkErrorDialog />
      {!newForm.enabled && allModes.length > 0 && <ModeCompare 
        open={openModeCompare}
        handleClose={handleCloseModeCompare}
        currentModeIndex={currentModeIndex}
        schemaData={schemaData}
      />}
    </AccessContext.Provider>
  );
};

export default AccessMode;
