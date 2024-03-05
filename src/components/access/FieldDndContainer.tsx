/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useRef, useState } from 'react';
import Typography from '@material-ui/core/Typography';
import { Box, Tooltip, TextField, Button, Checkbox, ButtonBase } from '@material-ui/core';
import { TabsProps } from '@material-ui/core/Tabs';
import styled from 'styled-components';
import AddIcon from '@material-ui/icons/Add';
import { ButtonNeutral, ButtonYes, HorizontalDivider } from '../../styles/CommonStyles';
import { capitalizeFirst, insertCharacter } from '../../utils/common';
import FieldContainer from './FieldContainer';
import { Field } from '../../store/databases/types';
import ScriptEditor from './ScriptEditor';
import CloseIcon from '@material-ui/icons/Close';
import { toggleAlert } from '../../store/alerts/action';

interface DeleteButtonProps {
  remove: (idx: number, list: string) => void;
  index: number;
  list: any;
}

const SelectedFieldsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-radius: 5px;
  border: 1px solid #A5AFBE;
  background: #FFF;
  height: 100%;
  width: 25%;

  .add-custom-field {
    display: flex;
    align-items: center;
    padding-left: 20px;
    padding-top: 5px;
  }

  .add-fields-text {
    font-size: 14px;
    font-style: italic;
    font-weight: 400;
    padding: 20px;
    color: #000;
  }

  .batch-delete-container {
    display: flex;
    justify-content: flex-end;
    padding: 0 11px;
    max-width: 100%;
    flex-wrap: wrap;
  }

  .batch-delete-button {
    background-color: transparent;
    width: fit-content;
    padding: 10px;
    display: flex;
    justify-content: end;
    align-items: end;
  }

  .batch-delete {
    text-transform: none;
    font-size: 12px;
    font-weight: 400;
    color: #AA1F51;
    margin: 0;
    padding: 0;
    text-overflow: ellipsis;
  }

  .disabled {
    color: #6C6C6C;
  }

  .field-list {
    overflow-y: scroll;
    padding: 0 0 10px 0;
    margin: 0;
    overflow-x: clip;
  }
`

const ConfigFieldContainer = styled.div`
  border-radius: 5px;
  border: 1px solid #BFBFBF;
  background: #FFF;
  padding: 0;
  height: 45%;
  width: 100%;

  .setting {
    font-size: 16px;
    font-weight: 700;
    color: #000;
    width: 100%;
    padding: 10px 20px 0 20px;
    height: 15%;
  }

  .select-message-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 85%;
  }
`

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
`

const CustomItem = styled.div`
  display: flex;
  align-items: center;
  width: 100%;
  justify-content: space-between !important;
  padding: 10px 20px 10px 20px;

  &:hover {
    cursor: pointer;
    background-color: #D7E0F3;
  }

  .field-info {
    width: 60%;
    text-overflow: ellipsis;
  }

  .field-checkbox {
    min-width: 10%;
    padding: 0;
  }

  .field-name {
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #000;
    font-size: 14px;
  }

  .field-meta-data {
    font-size: 12px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: left;
  }
`;

const RemoveFieldDialog = styled.dialog`
  border-radius: 10px;
  background: #FFF;
  border: none;
  width: 50%;
  padding: 30px 40px;

  .header-close {
    display: flex;
    justify-content: space-between;
  }

  .header {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .title {
    font-size: 22px;
    color: #000;
    font-weight: 700;
  }

  .content {
    padding: 35px 0;
  }

  .text-content {
    font-size: 14px;
    font-weight: 400;
  }

  .field {
    font-weight: 700;
  }

  .buttons {
    padding: 0;
    display: flex;
    flex-direction: row-reverse;
    gap: 20px;
  }

  .button-ok {
    background-color: #0F5FDC;
    color: #FFFFFF;
    font-weight: 700;
    font-size: 14px;
    border-radius: 10px;
    padding: 11px 24px;

    &:hover {
      background-color: #0B4AAE;
      color: #FFFFFF;
    }
  }

  .button-cancel {
    color: #000;
    font-weight: 700;
    font-size: 14px;
    border-radius: 10px;
    border: 1px solid #323A3D;
    padding: 11px 24px;
  }
`

interface TabsPropsFixed extends Omit<TabsProps, "onChange"> {
  state: any;
  remove: any;
  update: any;
  addField:(from: string, item: any) => string;
  data: any;
  setScripts: (data: any) => void;
  test: () => void;
}

const FieldDNDContainer: React.FC<TabsPropsFixed> = ({ state, remove, update, addField, data, setScripts, test }) => {
  const stateList = Object.keys(state);

  const [customFieldError, setCustomFieldError] = useState('')
  const [fieldText, setFieldText] = useState('')
  const [editField, setEditField] = useState(state[stateList[0]][0] || null)
  const [batchDelete, setBatchDelete] = useState(false)
  const [deleteFields, setDeleteFields]= useState([] as Array<any>)

  const ref = useRef<HTMLDialogElement>(null);

  const handleAddField = () => {
    if (fieldText) {
      if (fieldText.trim()) {
        const item = {
          'content':fieldText,
          'externalName': fieldText,
          'type':"string",
          'format':"string",
          'isMultiValue': false,
          'name': fieldText,
          'fieldAccess': "RW",
          'fieldGroup': "",
        }
        const addFieldResult = addField('read', item);
        setEditField(item)
        setCustomFieldError(addFieldResult);
      } else {
        setCustomFieldError('Field name cannot be empty.');
      }
    }
  }

  const onAddFieldTextChange = (e: any) => {
    setFieldText(e.target.value);
    setCustomFieldError('');
  }

  const handleBatchDelete = () => {
    remove(0, deleteFields)
    toggleBatchDelete()
    handleCloseDialog()
    toggleAlert(`Successfully deleted fields from the current mode.`)
  }

  const handleCloseDialog = () => {
    if (ref.current?.close) {
      ref.current?.close();
    }
  }

  const openDialog = () => {
    if (deleteFields.length > 0) {
      ref.current?.showModal();
    }
  }

  const toggleBatchDelete = () => {
    setBatchDelete(!batchDelete)
    if (!batchDelete) {
      setDeleteFields([])
    }
  }

  // Select field to delete.
  const handleSelectField = (event: any, item: any) => {
    let deleteBuffer = []
    if (event.target.checked) {
      deleteBuffer = deleteFields
      deleteBuffer.push(item)
      setDeleteFields(deleteBuffer)
    } else {
      deleteBuffer = deleteFields.filter((field: any) => field.id !== item.id && field.content !== item.content)
      setDeleteFields(deleteBuffer)
    }
  }

  const handleSelectAll = (event: any) => {
    if (event.target.checked) {
      let deleteBuffer = deleteFields
      deleteBuffer = []
      Object.keys(state).forEach((key) => {
        state[key].forEach((item: any) => {
          deleteBuffer.push(item)
        })
      })
      setDeleteFields(deleteBuffer)
    } else {
      setDeleteFields([])
    }
  }

  const WarningIcon = () => {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 35 35" fill="none">
        <g clip-path="url(#clip0_2139_16855)">
          <path d="M17.5 0C7.83594 0 0 7.83594 0 17.5C0 27.1641 7.83594 35 17.5 35C27.1641 35 35 27.1641 35 17.5C35 7.83594 27.1641 0 17.5 0ZM17.5 32.0312C9.47656 32.0312 2.96875 25.5234 2.96875 17.5C2.96875 9.47656 9.47656 2.96875 17.5 2.96875C25.5234 2.96875 32.0312 9.47656 32.0312 17.5C32.0312 25.5234 25.5234 32.0312 17.5 32.0312Z" fill="#D6466F"/>
          <path d="M15.625 24.375C15.625 24.8723 15.8225 25.3492 16.1742 25.7008C16.5258 26.0525 17.0027 26.25 17.5 26.25C17.9973 26.25 18.4742 26.0525 18.8258 25.7008C19.1775 25.3492 19.375 24.8723 19.375 24.375C19.375 23.8777 19.1775 23.4008 18.8258 23.0492C18.4742 22.6975 17.9973 22.5 17.5 22.5C17.0027 22.5 16.5258 22.6975 16.1742 23.0492C15.8225 23.4008 15.625 23.8777 15.625 24.375ZM16.5625 20H18.4375C18.6094 20 18.75 19.8594 18.75 19.6875V9.0625C18.75 8.89062 18.6094 8.75 18.4375 8.75H16.5625C16.3906 8.75 16.25 8.89062 16.25 9.0625V19.6875C16.25 19.8594 16.3906 20 16.5625 20Z" fill="#D6466F"/>
        </g>
        <defs>
          <clipPath id="clip0_2139_16855">
            <rect width="35" height="35" fill="white"/>
          </clipPath>
        </defs>
      </svg>
  )}

  return (
    <Box height='100%' display='flex' style={{ gap: '16px' }}>
      <SelectedFieldsContainer>
        <Box className='add-custom-field'>
            <TextField
              onChange={onAddFieldTextChange}
              autoFocus
              margin="dense"
              id="addField"
              placeholder="Add custom field..."
              hiddenLabel
              type="text"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <IconButton title="Add Custom Field" className='add'
              onClick={handleAddField}
            >
              <AddIcon style={{ margin: '0 5px' }} />
          </IconButton>
          </Box>
          {customFieldError && 
            <Typography className="validation-error" color="textPrimary">
              {customFieldError}
            </Typography>
          }
          <HorizontalDivider />
          <Box className='batch-delete-container'>
            {!batchDelete && <Button 
              className='batch-delete-button'
              style={{}}
              onClick={toggleBatchDelete} 
              disabled={state[stateList[0]].length === 0}
            >
              <Typography className={`batch-delete ${state[stateList[0]].length === 0 ? 'disabled' : ''}`}>Delete Multiple</Typography>
            </Button>}
            {batchDelete && <Box display='flex' justifyContent='space-between' width='100%' padding='0'>
              <Checkbox
                className='field-checkbox' 
                onChange={handleSelectAll}
                size='small'
                style={{
                  color: '#0E5FDC',
                }}
              />
              <Box display='flex' flexWrap='wrap'>
                <Button 
                  className='batch-delete-button'
                  style={{}}
                  onClick={toggleBatchDelete} 
                  disabled={state[stateList[0]].length === 0}
                >
                  <Typography className={`batch-delete`} style={{ color: '#000' }}>Cancel</Typography>
                </Button>
                <Tooltip title={deleteFields.length === 0 ? "Please select which field/s to remove first." : ""} arrow>
                  <Button 
                    className='batch-delete-button'
                    onClick={openDialog}
                  >
                    <Typography className={`batch-delete ${deleteFields.length === 0 ? 'disabled' : ''}`}>Remove</Typography>
                  </Button>
                </Tooltip>
              </Box>
            </Box>}
          </Box>
          {state[stateList[0]].length > 0 && <Box className='field-list'>
            {
              stateList.map((list, idx) => {
                return state[list].length && (state[list].map((item: any, index: any) => {
                  console.log(item)
                  const fieldGroup = item.fieldGroup || '';
                  let rwFlag;
                  if (!!item.isMultiValue) {
                    item = {
                      ...item,
                      isMultiValue: item.isMultiValue,
                    }
                  } else {
                    item = {
                      ...item,
                      isMultiValue: item.type === "array",
                    }
                  }
                  if (item.fieldAccess == null || item.fieldAccess.trim() === "") {
                    if (item.readOnly && !item.writeOnly) {
                      rwFlag = "R / O";
                    } else if (!item.readOnly && item.writeOnly) {
                      rwFlag = "W / O";
                    } else {
                      rwFlag = "R / W";
                    }
                  } else {
                    rwFlag = insertCharacter(item.fieldAccess, 1, " / ");
                  }
                  const format = !item.isMultiValue ? item.format : (!!item.items ? item.items.format : item.format);
                  item = {
                    ...item,
                    delete: false,
                  }
                  return (
                    <CustomItem onClick={() => setEditField(item)} key={`${item.name}-${idx}`}>
                      {batchDelete && <Checkbox 
                        className='field-checkbox' 
                        onChange={(e) => {handleSelectField(e, item)}}
                        size='small'
                        style={{
                          color: '#0E5FDC',
                        }}
                        checked={deleteFields.filter((field) => field.name === item.name).length === 1}
                      />}
                      <div className="field-info">
                        <div className="field-name">{item.name}</div>
                        <div className="field-meta-data">{`${capitalizeFirst(format)} ${format ? '•' : ''} ${rwFlag} ${fieldGroup ? '•' : ''} ${fieldGroup}`}</div>
                      </div>
                    </CustomItem>
                  )
                }))
            })}
          </Box>}
          {state[stateList[0]].length === 0 && <Typography className='add-fields-text'>Please add field/s...</Typography>}
      </SelectedFieldsContainer>
      <Box display='flex' flexDirection='column' width='100%' height='100%' style={{ gap: '20px' }}>
        {editField && 
          <FieldContainer 
            item={editField} 
            update={update} 
            droppableIndex={stateList[0]} 
            itemIndex={state[stateList[0]].findIndex((field: Field) => field.name === editField.name)} 
        />}
        {!editField && <ConfigFieldContainer>
          <Typography className='setting'>Field Setting</Typography>
          <Box className='select-message-container'>
            <Typography>No field found. Please select a field.</Typography>
          </Box>
        </ConfigFieldContainer>}
        <ScriptEditor setScripts={setScripts} data={data} test={test} />
      </Box>
      <RemoveFieldDialog ref={ref}>
        <Box className='header-close'>
          <Box className='header'>
            <Box width='30px' height='30px' padding='0' display='flex' alignItems='center'><WarningIcon /></Box>
            <Typography className='title'>Remove Field</Typography>
          </Box>
          <ButtonBase onClick={handleCloseDialog}><CloseIcon /></ButtonBase>
        </Box>
        <Box className='content'>
          <Typography className='text-content'>Are you sure you want to remove the following fields:</Typography>
          <ul>
            {deleteFields.map((field: any) => {
              return <li key={field.name}><Typography className='text-content field'>{`${field.name} `}</Typography></li>
            })}
          </ul>
          <Typography className='text-content'>on this mode?</Typography>
        </Box>
        <Box className='buttons'>
          <ButtonYes className='button-ok' onClick={handleBatchDelete} style={{ color: '#FFF' }}>OK</ButtonYes>
          <ButtonNeutral className='button-cancel' onClick={handleCloseDialog}>Cancel</ButtonNeutral>
        </Box>
      </RemoveFieldDialog>
    </Box>
  );
};

export default FieldDNDContainer;
