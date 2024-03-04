/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import Typography from '@material-ui/core/Typography';
import ColumnDetails from './ColumnDetails';
import { useDispatch } from 'react-redux';
import { fetchViews, updateSchema } from '../../store/databases/action';
import axios from 'axios';
import { SETUP_KEEP_API_URL } from '../../config.dev';
import { getToken } from '../../store/account/action';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { getDatabaseIndex } from '../../store/databases/scripts';
import { Database, SET_ACTIVEVIEWS } from '../../store/databases/types';
import { checkIcon } from '../../styles/scripts';
import appIcons from '../../styles/app-icons';
import { setLoading } from '../../store/loading/action';
import APILoadingProgress from '../loading/APILoadingProgress';
import { FiSave, FiPlusSquare, FiRefreshCcw, FiPlus } from 'react-icons/fi';
import { BsCheck2Circle } from 'react-icons/bs';
import { IoMdClose } from 'react-icons/io';
import { Box, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';
import { Buttons } from '../../styles/CommonStyles';
import { fullEncode } from '../../utils/common';

const EditViewDialogContainer = styled.div`
  width: 100%;
  height: 1022px;

  background: #F8F8F8;
  border-radius: 10px;

  .close-btn {
    cursor: pointer;
    justify-content: right;
    align-items: right;

    position: absolute;
    top: 1%;
    right: 2%;
  }
`

const DialogContainer = styled.dialog`
  border: 1px solid white;
    
  width: 95vw;
  position: relative;
  height: 95vh;
  max-height: 95vh;
  margin: 0;

  background-color: #F8F8F8;
  background-color: yellow;

  .close-btn {
    cursor: pointer;
    justify-content: right;
    align-items: right;

    position: absolute;
    top: 1%;
    right: 2%;
  }
`

const DialogTitleContainer = styled.div`
  .header {
    margin-top: 44px;
    margin-left: 37px;
  }

  .title-text {
    width: 80%;
    
    font-weight: 700;
    line-height: 19px;
    letter-spacing: 0em;
    text-align: left;
    
    margin-top: 44px;
    margin-left: 37px;
  }
`

const ColumnBarContainer = styled.div`
  box-sizing: border-box;

  position: absolute;
  width: 20%;
  height: 87%;
  margin: 2%;
  overflow-y: scroll;
  overflow-x: scroll;
  
  background: #FFFFFF;
  
  border: 1px solid #A5AFBE;
  border-radius: 10px;

  .add-all-container {
    height: 10%;
    text-align: right;
    align-items: center;
    padding-right: 6%;
    line-height: 6;
    vertical-align: middle;
    color: #5E1EBE;

    cursor: pointer;
  }

  .add-all-icon {
    margin-right: 2%;
    display: inline-block;
    transform: translateY(4%);
  }

  .column-list {
    height: 90%;
  }
`

const AllColumnsList = styled.div`
  height: 90%;

  .list-item {
    padding: 20px;
    cursor: pointer;
    display: flex;
  }

  .added-column {
    background: #beebb4;
  }

  .check-icon {
    top: 70%;
  }

  .icon {
    flex: 0 0 auto;
    font-size: 1.4em;
    transform: translateY(60%);
    margin: 0;
    position: absolute;
  }

  .icons-column {
    display: inline-block;
  }

  .column-info {
    width: 90%;
  }

  .column-name {
    font-style: normal;
    font-weight: bold;
    line-height: 19px;
    flex: 0 0 auto;
  }

  .columnDetails {
    margin-top: 5px;
    white-space: pre-wrap;

    font-weight: 400;
    font-size: 14px;
    line-height: 17px;

    color: #636363;
  }
`

interface EditViewDialogProps {
  open: boolean;
  handleClose: () => void;
  viewName: string;
  dbName: string;
  nsfPathProp: string;
  scopes: any[];
  setOpen: any;
  schemaData: Database;
}

const EditViewDialog: React.FC<EditViewDialogProps> = ({
  open,
  handleClose,
  viewName,
  dbName,
  nsfPathProp,
  scopes,
  setOpen,
  schemaData,
}) => {
  const [chosenColumns, setChosenColumns] = useState<any[]>([]);
  const [fetchedColumns, setFetchedColumns] = useState<any[]>([]);
  const [editColumn, setEditColumn] = useState({});
  const [hoveredColumn, setHoveredColumn] = useState({});
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const dispatch = useDispatch();

  const { databases, folders } = useSelector((state: AppState) => state.databases);
  const nsfPathDecode = decodeURIComponent(nsfPathProp);

  const {
    apiName,
    description,
    nsfPath,
    iconName,
    dqlAccess,
    openAccess,
    allowCode,
    allowDecryption,
    formulaEngine,
    dqlFormula,
    requireRevisionToUpdate,
    icon,
    isActive,
    forms,
    agents,
    views
  } = schemaData;

  const selectedDB = useMemo(() => ({
    apiName,
    description,
    nsfPath,
    iconName,
    dqlAccess,
    openAccess,
    allowCode,
    allowDecryption,
    formulaEngine,
    dqlFormula,
    requireRevisionToUpdate,
    icon,
    isActive,
    applicationAccessApprovers: undefined,
    configuredForms: [],
    excludedViews: undefined,
    owners: [],
    storedProcedures: [],
    forms
  }), [apiName, description, nsfPath, iconName, dqlAccess, openAccess, allowCode, allowDecryption, formulaEngine, dqlFormula, requireRevisionToUpdate, icon, isActive, forms]);

  const [displayIconName, setDisplayIconName] = useState(checkIcon(iconName) ? iconName : 'beach');
  const [displayIcon, setDisplayIcon] = useState(checkIcon(iconName) ? icon : appIcons['beach']);

  const [dbContext, setDbContext] = useState(selectedDB);

  const { loading } = useSelector( (state: AppState) => state.loading );

  const scopeNames = scopes.filter((scope) => { return scope.schemaName === dbName && scope.nsfPath === nsfPath });
  const aScopeName = scopeNames.length > 0 ? scopeNames[0].apiName : '';

  const ref = useRef<HTMLDialogElement>(null);

  const handleClickColumn = (column: any) => {
    let existingColumn = chosenColumns.filter((col) => col.name === column.name);
    if (existingColumn.length === 0) {
      let updatedColumn = {
        name: column.name,
        externalName: !!column.title ? column.title.replaceAll(/[^\w ]/g, "").replaceAll(' ', '_') : column.name.replaceAll(/[^\w $@-]/g, "").replaceAll(' ', '_'),
        title: column.title,
      }
      setChosenColumns ([...chosenColumns, updatedColumn]);
    }
  }

  const setEditColumnName = (columnName: string) => {
    let index = chosenColumns.findIndex((col) => col.name === columnName);
    setEditColumn(chosenColumns[index]);
  }

  const setRemoveColumn = (columnName: string) => {
    let chosenColumnsBuffer: any[];
    chosenColumnsBuffer = [];
    chosenColumns.forEach((column: any) => {
      if (column.name !== columnName) {
        chosenColumnsBuffer.push(column);
      }
    })
    setChosenColumns(chosenColumnsBuffer);
  }

  const handleClickClose = () => {
    setChosenColumns([]);
    handleClose();
    setEditColumn({});
  }

  const handleConfirmReset = () => {
    if (views) {
      let viewsBuffer = views.map((view: any) => {
        if (view.name === viewName) {
          // remove columns for chosen view
          return {
            name: view.name,
            alias: view.alias,
            unid: view.unid,
          }
        } else if (!!view.columns) {
          // retain columns for other views that have columns
          return {
            name: view.name,
            alias: view.alias,
            unid: view.unid,
            columns: view.columns,
          }
        } else {
          // retain no columns for views that don't have columns
          return {
            name: view.name,
            alias: view.alias,
            unid: view.unid,
          }
        }
      });

      const {
        apiName,
        nsfPath,
        description,
        isActive,
        formulaEngine,
        allowCode,
        dqlAccess,
        openAccess,
        allowDecryption,
        dqlFormula,
        requireRevisionToUpdate,
        excludedViews,
        owners,
        forms,
      } = dbContext;
      const updatedSchema = {
        apiName,
        schemaName: dbName,
        nsfPath,
        description,
        isActive,
        icon: displayIcon,
        iconName: displayIconName,
        formulaEngine,
        allowCode,
        dqlAccess,
        openAccess,
        allowDecryption,
        dqlFormula,
        requireRevisionToUpdate,
        agents,
        views: viewsBuffer,
        excludedViews,
        owners,
        forms,
      };

      dispatch(updateSchema(updatedSchema) as any);
      setActiveViews(dbName, viewsBuffer);
      setOpen(false);
    }
  }

  const handleClickSave = () => {
    if (views) {
      let viewsBuffer;
      let columnsPayload = chosenColumns.map((column) => {
        return {
          name: column.name,
          externalName: column.externalName,
        }
      });
      // fill up views buffer
      if (columnsPayload.length > 0) {
        viewsBuffer = views.map((view: any) => {
          if (view.name === viewName) {
            return {
              name: view.name,
              alias: view.alias,
              unid: view.unid,
              columns: columnsPayload,
              viewUpdated: true
            }
          } else if (!!view.columns) {
            return {
              name: view.name,
              alias: view.alias,
              unid: view.unid,
              columns: view.columns,
              viewUpdated: view.viewUpdated ? true : false
            }
          } else {
            return {
              name: view.name,
              alias: view.alias,
              unid: view.unid,
              viewUpdated: view.viewUpdated ? true : false
            }
          }
        });
      } else {
        viewsBuffer = views.map((view: any) => {
          if (view.name !== viewName) {
            return {
              name: view.name,
              alias: view.alias,
              unid: view.unid,
              columns: view.columns
            }
          } else {
            return {
              name: view.name,
              alias: view.alias,
              unid: view.unid,
            }
          }
        });
      }

      // update schema
      const {
        apiName,
        nsfPath,
        description,
        isActive,
        formulaEngine,
        allowCode,
        dqlAccess,
        openAccess,
        allowDecryption,
        dqlFormula,
        requireRevisionToUpdate,
        excludedViews,
        owners,
        forms,
      } = dbContext;
      const updatedSchema = {
        apiName,
        schemaName: dbName,
        nsfPath,
        description,
        isActive,
        icon: displayIcon,
        iconName: displayIconName,
        formulaEngine,
        allowCode,
        dqlAccess,
        openAccess,
        allowDecryption,
        dqlFormula,
        requireRevisionToUpdate,
        agents,
        views: viewsBuffer,
        excludedViews,
        owners,
        forms,
      };
      dispatch(updateSchema(updatedSchema) as any);
      handleClose();
      
      setActiveViews(dbName, viewsBuffer);
    }
  }

  const handleClickAddAll = () => {
    let updatedColumns = fetchedColumns.map((column) => {
      return {
        name: column.name,
        externalName: !!column.title ? column.title.replaceAll(/[^\w ]/g, "").replaceAll(' ', '_') : column.name.replaceAll(/[^\w $@-]/g, "").replaceAll(' ', '_'),
      }
    });
    setChosenColumns(updatedColumns);
  }

  const handleEditColumn = (editedColumn: any, newExternalName: string) => {
    const columnName = editedColumn.name;
    let error: any;
    
    // set original placeholder to column title or name
    if (newExternalName === "") {
      newExternalName = !!editedColumn.title ? editedColumn.title.replaceAll(/[^a-zA-Z0-9 ]/g, "").replaceAll(' ', '_') : editedColumn.name.replaceAll(/[^a-zA-Z0-9 ]/g, "").replaceAll(' ', '_')
    }
    let externalNamesArray = chosenColumns.map((column: any) => {
      if (column.name === columnName) {
        return newExternalName
      } else {
        return column.externalName
      }
    });
    
    let chosenColumnsBuffer = chosenColumns.map((column: any) => {
      if (column.name === columnName) {
        let sameExternalNames = externalNamesArray.filter((externalName) => externalName === newExternalName);
        if (sameExternalNames.length > 1) {
          error = "duplicate"
        } else {
          error = null;
        }
        return {
          name: column.name,
          externalName: newExternalName,
          title: column.title,
          error: error,
        }
      } else {
        let sameExternalNames = externalNamesArray.filter((externalName) => externalName === column.externalName);
        if (sameExternalNames.length > 1) {
          error = "duplicate"
        } else {
          error = null;
        }
        return {
          ...column,
          error: error,
        }
      }
    });
    setChosenColumns(chosenColumnsBuffer);
  }

  const handleClickReset = () => {
    // open dialog to confirm reset
    setResetDialogOpen(true);
  }
  
  useEffect(() => {
    const fetchColumns = async () => {
      let encodedViewName = fullEncode(viewName);
      const folderNames = folders.map((folder) => {return folder.viewName});
      const isFolder = folderNames.includes(viewName);

      const data = await axios
        .get(`${SETUP_KEEP_API_URL}/design/${isFolder ? 'folders' : 'views'}/${encodedViewName}?nsfPath=${fullEncode(nsfPathProp)}&raw=false`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
            "Content-Type": 'application/json'
          }
        })
        .then((res) => {
          const items = Object.keys(res.data);
          let fetchedColumnsBuffer: any[];
          items.forEach((item: any) => {
            // skip items with '@' at the start of the key, it is metadata
            if (!(item[0] === '@')) {
              let newColumn = {
                ...res.data[item],
                name: item,
              };
              fetchedColumnsBuffer = !!fetchedColumnsBuffer ? [...fetchedColumnsBuffer, newColumn] : [newColumn];
              setFetchedColumns(fetchedColumnsBuffer);
            }
          });
        });

      dispatch(setLoading({status: false}));
    }

    if (open) {
      dispatch(setLoading({status: true}));
      fetchColumns();
    }

    if (views) {
      views.forEach((view: any) => {
        if (!!view.columns) {
          if (view.name === viewName) {
            setChosenColumns(view.columns);
          }
          return {
            name: view.name,
            alias: view.alias,
            unid: view.unid,
            columns: view.columns
          }
        } else {
          if (view.name === viewName) {
            setChosenColumns([]);
          }
          return {
            name: view.name,
            alias: view.alias,
            unid: view.unid,
          }
        }
      })
    }
  }, [aScopeName, open, viewName, views, nsfPathProp, dispatch, folders])

  function setActiveViews(dbName: string, views: Array<any>) {
    // Build Active View list
    let viewsList: Array<any> = [];
    views?.forEach((view) => {
      let alias = view.alias != null && view.alias.length > 0 ? view.alias[0] : '';
      let viewBool = (view.columns && view.columns.length > 0) ? true : false;

      // Suppress alias when it's a duplicate of the name LABS-1903
      alias = alias === view.name ? '' : alias;
      viewsList.push({
        viewName: view.name,
        viewAlias: alias,
        viewUnid: view.unid,
        viewActive: view.active,
        viewColumns: view.columns,
        viewUpdated: viewBool
      });
    });
    // Save Active Views \ Agents Data (Right Panel)
    dispatch(fetchViews(dbName, nsfPath) as any);
    dispatch({
      type: SET_ACTIVEVIEWS,
      payload: {
        db: dbName,
        activeViews: viewsList
      }
    });
  }
  return (
    <>
      <Dialog 
        fullScreen 
        style={{ height: '90vh', width: '95vw', position: 'absolute', left: '2.5vw', top: '4vh' }} 
        PaperProps={{ style: { borderRadius: '5px' } }}
        open={open} 
        onClose={handleClickClose}
      >
        <EditViewDialogContainer>
          <div className='close-btn' onClick={handleClickClose}>
            <IoMdClose size="1.5em" />
          </div>
          <DialogTitleContainer>
            <Typography className="title-text">
              {`Edit ${viewName} Columns`}
            <Buttons>
              <Button 
                className='cancel btn' 
                onClick={handleClickReset}
                style={{top: '34px', right: 'calc(93px + 2.5%)', marginTop: '4px'}}
              >
                <FiRefreshCcw />
                <span className='text'>
                  Reset
                </span>
              </Button>
              <Button 
                className="save btn" 
                onClick={handleClickSave} 
                disabled={new Set(chosenColumns.map((column) => column.externalName)).size === chosenColumns.length ? false : true}
                style={{top: '34px', right: '2%', marginTop: '4px'}}
              >
                <FiSave />
                <span className="text">
                  Save
                </span>
              </Button>
            </Buttons>
            </Typography>
          </DialogTitleContainer>
          <div>
            <ColumnBarContainer>
              <Box className='add-all-container' onClick={handleClickAddAll}>
                <div className='add-all-icon'><FiPlus size={'1.2em'} /></div>
                Add All
              </Box>
              <AllColumnsList className='column-list'>
                {loading.status ? <div className="list-item"><APILoadingProgress label="Columns" /></div> :
                  fetchedColumns.map((column: any, index: any) => (
                    <div key={index}>
                      <hr style={{ margin: '0 0 0 0' }} />
                      <div key={column.name} className={`list-item ${[...chosenColumns.map((column) => {return column.name})].includes(column.name) ? 'added-column' : ''}`} 
                      onClick={() => handleClickColumn(column)} onMouseOver={() => {setHoveredColumn(column)}} onMouseLeave={() => {setHoveredColumn({})}}>
                        <div className='column-info'>
                          <div className="column-name">{column.name}</div>
                          <Typography display="block" className="columnDetails">{`Column Position ${column.position}`}</Typography>
                          {column.title.length > 0 && <Typography display="block" className="columnDetails">{`Title: ${column.title}`}</Typography>}
                        </div>
                        <div className='icons-column'>
                          <div className='icon'>
                            {[...chosenColumns.map((column) => {return column.name})].includes(column.name) ? 
                              <BsCheck2Circle color='#087251' /> : 
                              ( (column === hoveredColumn) && <FiPlusSquare/> )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                }
              </AllColumnsList>
            </ColumnBarContainer>
            <ColumnDetails viewName={viewName} column={editColumn} chosenColumns={chosenColumns} handleEditColumn={handleEditColumn} setEditColumn={setEditColumnName} setRemoveColumn={setRemoveColumn} />
          </div>
        </EditViewDialogContainer>
      </Dialog>
      <Dialog open={resetDialogOpen}>
        <DialogTitle id="reset-edit-view-title">
          {`Reset View?`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="reset-edit-view-description" color='textPrimary'>
            Resetting this view will remove all columns you've previously added including the External Names. This will reset the view to its initial state including any changes you've made on this page. Are you sure you want to continue with the reset?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {setResetDialogOpen(false)}}>No</Button>
          <Button onClick={handleConfirmReset}>Yes</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default EditViewDialog;
