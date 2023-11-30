/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import Typography from '@material-ui/core/Typography';
import { Box, Tooltip, TextField, Button } from '@material-ui/core';
import { TabsProps } from '@material-ui/core/Tabs';
import RemoveIcon from '@material-ui/icons/Delete';
import styled from 'styled-components';
import AddIcon from '@material-ui/icons/Add';
import { HorizontalDivider } from '../../styles/CommonStyles';
import { capitalizeFirst, insertCharacter } from '../../utils/common';
import FieldContainer from './FieldContainer';
import { Field } from '../../store/databases/types';
import ScriptEditor from './ScriptEditor';

interface TabPanelProps {
  children?: React.ReactNode;
  index: any;
  value: any;
}

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
    padding: 0 15px;
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
  height: 40%;
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
  flex-wrap: wrap;
  width: 100%;
  justify-content: space-between !important;
  padding: 10px 20px;

  &:hover {
    cursor: pointer;
    background-color: #D7E0F3;
  }

  .field-info {
    width: 70%;
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

  .field-remove {
    margin-left: 10px;
    width: 10%;
  }
`;

const DeleteButton: React.FC<DeleteButtonProps> = ({remove, index, list}) => {
  return (
    <Tooltip title="remove field" arrow>
      <RemoveIcon
        onClick={() => remove(index, list)}
        className="remove-icon"
        cursor="pointer"
        style={{ right: 35 }}
      />
    </Tooltip>
  );
};

interface TabsPropsFixed extends Omit<TabsProps, "onChange"> {
  state: any;
  remove: any;
  update: any;
  addField:(from: string, item: any) => string;
  data: any;
  handleChangeScript: (event: React.ChangeEvent<any>) => void;
}

const FieldDNDContainer: React.FC<TabsPropsFixed> = ({ state, remove, update, addField, data, handleChangeScript }) => {
  const [value, setValue] = useState(0);
  const stateList = Object.keys(state);

  const [customFieldError, setCustomFieldError] = useState('')
  const [fieldText, setFieldText] = useState('')
  const [editField, setEditField] = useState(state[stateList[0]][0] || null)

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

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
    remove(0, stateList[0], true)
    setEditField(null)
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
              label="Add Custom Field"
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
            <Button 
              className='batch-delete-button'
              style={{}}
              onClick={handleBatchDelete} 
              disabled={state[stateList[0]].length === 0}
            >
              <Typography className={`batch-delete ${state[stateList[0]].length === 0 ? 'disabled' : ''}`}>Batch Delete</Typography>
            </Button>
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
                  return (
                    <CustomItem onClick={() => setEditField(item)}>
                      <div className="field-info">
                        <div className="field-name">{item.name}</div>
                        <div className="field-meta-data">{`${capitalizeFirst(format)} ${format ? '•' : ''} ${rwFlag} ${fieldGroup ? '•' : ''} ${fieldGroup}`}</div>
                      </div>
                      <div className="field-remove">
                        <DeleteButton remove={remove} index={index} list={list} />
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
        <ScriptEditor handleChange={handleChangeScript} data={data} />
      </Box>
    </Box>
  );
};

export default FieldDNDContainer;
