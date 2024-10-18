/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { convert2FieldType } from './functions';
import { Box, Tooltip } from '@mui/material';
import styled from 'styled-components';
import { BlueSwitch, EncryptSignOptions, HorizontalDivider } from '../../styles/CommonStyles';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';

interface SingleFieldContainerProps {
  item?: any;
  itemIndex: any;
  droppableIndex: any;
  update: any;
}

const ConfigFieldContainer = styled.div`
  border-radius: 5px;
  border: 1px solid #BFBFBF;
  background: #FFF;
  padding: 0;
  height: 45%;
  width: 100%;
  overflow-y: scroll;

  .title {
    font-size: 12px;
    font-weight: 400;
    color: #6C6C6C;
  }

  .name {
    font-size: 16px;
    font-weight: 500;
    color: #000;
  }

  .setting {
    font-size: 14px;
    font-weight: 700;
    color: #000;
    width: 100%;
    padding: 0 20px;
  }

  .details {
    padding: 10px 20px 0 20px;
    display: flex;
    flex-wrap: wrap;
    row-gap: 8px;
  }

  .input {
    width: 50%;
    padding: 5px 0;
  }
`

const READ_ONLY = "RO";
const WRITE_ONLY = "WO";
const READ_WRITE = "RW";

const FieldContainer: React.FC<SingleFieldContainerProps> = ({
  item,
  update,
  itemIndex,
  droppableIndex,
}) => {
  const [rwMode, setRWMode] = React.useState(() => {
    if (item.fieldAccess == null || item.fieldAccess.trim() === "") {
      if (item.readOnly && !item.writeOnly) {
        return READ_ONLY;
      } else if (!item.readOnly && item.writeOnly) {
        return WRITE_ONLY;
      } else {
        return READ_WRITE;
      }
    } else {
      return item.fieldAccess;
    }
  });

  const [isMultiValue, setIsMultiValue] = React.useState(item.isMultiValue ? item.isMultiValue : item.type === "array");
  const [encrypt, setEncrypt] = useState(item.encryptedField)
  const [formatValue, setFormatValue] = React.useState(() => {
    if (item.type === 'array') {
      if (!!item.items) {
        return item.items.format
      } else if (!!item.format) {
        return item.format
      } else {
        return 'string'
      }
    } else {
      if (!!item.format) {
        return item.format
      } else {
        return 'string'
      }
    }
  }
  );
  const [editedItem, setEditedItem] = useState({...item})

  useEffect(() => {
    setEditedItem({...item})
  }, [item])

  useEffect(() => {
    setEncrypt(item.encryptedField)
  }, [item.encryptedField])

  useEffect(() => {
    let fmt = 'string'
    if (editedItem.type === 'array') {
      if (!!editedItem.items) {
        fmt = editedItem.items.format
      } else if (!!editedItem.format) {
        fmt = editedItem.format
      }
    } else {
      if (!!editedItem.format) {
        fmt = editedItem.format
      }
    }
    setFormatValue(fmt)
  }, [editedItem.format, editedItem.items, editedItem.type])

  useEffect(() => {
    setIsMultiValue(editedItem.isMultiValue ? editedItem.isMultiValue : editedItem.type === "array")
  }, [editedItem.isMultiValue, editedItem.type])

  const handleAccessModeChange = (event:any) => {
    let newItem = {...editedItem};
    const btnValue = event.target.value;
    newItem.fieldAccess = btnValue;
    setRWMode(btnValue);
    update(itemIndex, droppableIndex, newItem);
    setEditedItem(newItem)
  };

  const handleFieldTypeChange = (event: any) => {
    const format = event.target.value;
    let newItem = null;
    if (editedItem.type === "array" || format === "readers" || format === "authors") {
      setIsMultiValue(true);
      const type = convert2FieldType(format, true);
      setFormatValue(format);
      newItem = {...editedItem, type, "isMultiValue":true, items: {format: format, type: editedItem.items ? editedItem.items.format : 'string'}};
    } else {
      setIsMultiValue(false);
      const type = convert2FieldType(format, isMultiValue);
      setFormatValue(format);
      newItem = {...editedItem, format: format, type};
    }
    update(itemIndex, droppableIndex, newItem);
    setEditedItem(newItem)
  };

  const handleFieldGroupChange = (event: any) => {
    const newItem = {...editedItem, "fieldGroup": event.target.value};
    update(itemIndex, droppableIndex, newItem);
    setEditedItem(newItem)
  };

  const handleFieldNameChange = (event: any) => {
    const newValue = event.target.value;
    const newItem = {...editedItem, "externalName": newValue === '' ? '' : newValue, "content": newValue === '' ? '' : newValue};
    update(itemIndex, droppableIndex, newItem);
    setEditedItem(newItem)
  }
  
  const toggleMultiValue = (event: any) => {
    const isMultiValue = event.target.checked;
    setIsMultiValue(isMultiValue);
    let newItem;
    if (!isMultiValue) {
      // handle toggle from multi value to single value, or checked to unchecked
      setFormatValue(editedItem.items.format);
      const type = convert2FieldType(editedItem.items.format, isMultiValue);
      newItem = {...editedItem, isMultiValue, format: editedItem.items.format, type};
    } else {
      // handle toggle from single to multi value, or unchecked to checked
      setFormatValue(editedItem.format);
      const type = convert2FieldType(editedItem.format, isMultiValue);
      newItem = {...editedItem, isMultiValue, type, items: {...editedItem.items, format: editedItem.format}};
    }
    update(itemIndex, droppableIndex, newItem);
    setEditedItem(newItem)
  };

  const toggleEncrypt = (event: any) => {
    const encrypt = event.target.checked;
    setEncrypt(encrypt);
    const newItem = {...editedItem, "encryptedField": encrypt};
    update(itemIndex, droppableIndex, newItem);
    setEditedItem(newItem)
  }

  return (
    <ConfigFieldContainer>
      <Box style={{ width: '30%', padding: '15px 20px 5px 20px' }}>
        <Typography className='title'>Item Name</Typography>
        <Typography className='name'>{item.name}</Typography>
      </Box>
      <HorizontalDivider />
      <Box>
        <Typography className='setting'>Field Setting</Typography>
        <Box className='details'>
          <Box className='input'>
            <TextField 
              label="Field Name" 
              value={!!editedItem.externalName ? editedItem.externalName || '' : editedItem.content || ''} 
              style={{ "width": "50%", fontSize: '14px' }}
              onChange={handleFieldNameChange} 
              id="field-name"
              size='small'
              slotProps={{
                input: { style: { fontSize: '14px' } }
              }}
            />
          </Box>
          <Box className='input'>
            <TextField
              value={formatValue}
              onChange={handleFieldTypeChange}
              style={{"width":"50%"}}
              label="Field Type"
              select
              id='field-type'
              size='small'
              slotProps={{
                input: { style: { fontSize: '14px' } }
              }}
            >
              <MenuItem value={"authors"}>authors</MenuItem>
              <MenuItem value={"binary"}>binary</MenuItem>
              <MenuItem value={"boolean"}>boolean</MenuItem>
              <MenuItem value={"byte"}>byte</MenuItem>
              <MenuItem value={"date"}>date</MenuItem>
              <MenuItem value={"date-time"}>date-time</MenuItem>
              <MenuItem value={"double"}>double</MenuItem>
              <MenuItem value={"float"}>float</MenuItem>
              <MenuItem value={"int32"}>int32</MenuItem>
              <MenuItem value={"int64"}>int64</MenuItem>
              <MenuItem value={"names"}>names</MenuItem>
              <MenuItem value={"password"}>password</MenuItem>
              <MenuItem value={"readers"}>readers</MenuItem>
              <MenuItem value={"richtext"}>richtext</MenuItem>
              <MenuItem value={"string"}>string</MenuItem>
            </TextField>
          </Box>
          <Box className='input'>
            <TextField
              value={editedItem.fieldAccess}
              onChange={handleAccessModeChange}
              style={{"width":"50%"}}
              label="Access"
              select
              id='field-access'
              size='small'
              slotProps={{
                input: { style: { fontSize: '14px' } }
              }}
            >
              <MenuItem value={"RW"}>Read/Write</MenuItem>
              <MenuItem value={"RO"}>Read Only</MenuItem>
              <MenuItem value={"WO"}>Write Only</MenuItem>
            </TextField>
          </Box>
          <Tooltip 
            title={editedItem.fieldGroup?.length > 0 ? "Field group should be empty to toggle off multi-value" : ""} 
            style={{ display: 'flex', flexDirection: 'row' }} 
            arrow
          >
            <Box className='input' style={{ display: 'flex', alignItems: 'center' }}>
              <Typography style={{ width: 'fit-content', fontSize: '14px' }}>
                Multi-Value?
              </Typography>
              <BlueSwitch 
                size='small' 
                checked={isMultiValue} 
                onChange={toggleMultiValue} 
                disabled = {formatValue === "readers" || formatValue === "authors" || editedItem.fieldGroup?.length > 0} 
                id='multi-value'
              />
            </Box>
          </Tooltip>
          <Tooltip title={isMultiValue ? "" : "Enable multi-value to input a field group"} arrow>
            <Box className='input'>
              <TextField 
                label="Field Group" 
                value={editedItem.fieldGroup} 
                style={{ "width":"50%" }}
                onChange={handleFieldGroupChange} 
                disabled={!isMultiValue} 
                id='field-group'
                size='small'
                slotProps={{
                  input: { style: { fontSize: '14px' } }
                }}
              />
            </Box>
          </Tooltip>
          <EncryptSignOptions>
            <section className='main-row'>
              <text style={{ fontSize: '14px' }}>
                Encrypt
              </text>
              <Tooltip arrow title='Please understand this option before enabling, see the documentation on enabling encryption.'>
                <HelpCenterIcon sx={{ color: '#2D91E3', fontSize: '14px' }} />
              </Tooltip>
              <BlueSwitch size='small' checked={encrypt} onChange={toggleEncrypt} />
            </section>
            <text className='warning-text'>
              Please understand this option before enabling
            </text>
          </EncryptSignOptions>
        </Box>
      </Box>
    </ConfigFieldContainer>
  );
};

export default FieldContainer;
