/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef, useState } from 'react';
import Typography from '@mui/material/Typography';
import { Box, Tooltip, TextField, Button, Checkbox, ButtonBase } from '@mui/material';
import { TabsProps } from '@mui/material/Tabs';
import styled from 'styled-components';
import AddIcon from '@mui/icons-material/Add';
import { ButtonNeutral, ButtonYes, HorizontalDivider, WarningIcon } from '../../styles/CommonStyles';
import { capitalizeFirst, insertCharacter } from '../../utils/common';
import FieldContainer from './FieldContainer';
import { Field } from '../../store/databases/types';
import ScriptEditor from './ScriptEditor';
import CloseIcon from '@mui/icons-material/Close';
import { toggleAlert } from '../../store/alerts/action';

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
  required: string[];
  setRequired: (required: string[]) => void;
  validationRules: Array<{ formula: String, formulaType: String, message: String }>;
  setValidationRules: (data: Array<{ formula: String, formulaType: String, message: String }>) => void;
  fieldIndex: number;
  setFieldIndex: (fieldIndex: number) => void;
}

const FieldDNDContainer: React.FC<TabsPropsFixed> = ({
  state,
  remove,
  update,
  addField,
  data,
  setScripts,
  test,
  required,
  setRequired,
  validationRules,
  setValidationRules,
  fieldIndex,
  setFieldIndex,
}) => {
  const stateList = Object.keys(state);

  const [customFieldError, setCustomFieldError] = useState('')
  const [fieldText, setFieldText] = useState('')
  const [editField, setEditField] = useState(state[stateList[0]][fieldIndex] || null)
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

  const handleClickField = (item: any, idx: number) => {
    setEditField(item)
    setFieldIndex(idx)
  }

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
              <Typography className={`batch-delete ${state[stateList[0]].length === 0 ? 'disabled' : ''}`}>Delete Field(s)</Typography>
            </Button>}
            {batchDelete && <Box display='flex' justifyContent='space-between' width='100%' padding='0'>
              <Box display='flex' flexWrap='wrap'>
                <Tooltip title={deleteFields.length === 0 ? "Please select which field/s to remove first." : ""} arrow>
                  <Button 
                    className='batch-delete-button'
                    onClick={openDialog}
                  >
                    <Typography className={`batch-delete ${deleteFields.length === 0 ? 'disabled' : ''}`}>Remove</Typography>
                  </Button>
                </Tooltip>
                <Button 
                  className='batch-delete-button'
                  style={{}}
                  onClick={toggleBatchDelete} 
                  disabled={state[stateList[0]].length === 0}
                >
                  <Typography className={`batch-delete`} style={{ color: '#000' }}>Cancel</Typography>
                </Button>
              </Box>
              <Checkbox
                className='field-checkbox' 
                onChange={handleSelectAll}
                size='small'
                style={{
                  color: '#0E5FDC',
                }}
              />
            </Box>}
          </Box>
          {state[stateList[0]].length > 0 && <Box className='field-list'>
            {
              stateList.map((list, idx) => {
                return state[list].length && (state[list].map((item: any, index: any) => {
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
                  const isRequired = required.includes(item.content)
                  return (
                    <CustomItem onClick={() => handleClickField(item, index)} key={`${item.name}-${idx}`}>
                      <div className="field-info" onChange={(e) => {handleSelectField(e, item)}}>
                        <div className="field-name">{item.name}</div>
                        <div className="field-meta-data">{`${capitalizeFirst(format)} ${format ? '•' : ''} ${rwFlag} ${fieldGroup ? '•' : ''} ${fieldGroup} ${isRequired ? '• Required' : ''}`}</div>
                      </div>
                      {batchDelete && <Checkbox 
                        className='field-checkbox' 
                        onChange={(e) => {handleSelectField(e, item)}}
                        size='small'
                        style={{
                          color: '#0E5FDC',
                        }}
                        checked={deleteFields.filter((field) => field.name === item.name).length === 1}
                      />}
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
            required={required}
            setRequired={setRequired}
        />}
        {!editField && <ConfigFieldContainer>
          <Typography className='setting'>Field Setting</Typography>
          <Box className='select-message-container'>
            <Typography>No field found. Please select a field.</Typography>
          </Box>
        </ConfigFieldContainer>}
        <ScriptEditor setScripts={setScripts} data={data} test={test} validationRules={validationRules} setValidationRules={setValidationRules} />
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
