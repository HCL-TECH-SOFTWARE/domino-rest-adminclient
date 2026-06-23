/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useState } from 'react';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { convert2FieldType } from './functions';
import { Box } from '@mui/material';
import { BlueSwitch, EncryptSignOptions, HorizontalDivider } from '../../styles/CommonStyles';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import { LitTooltip } from '../lit-elements/LitElements';

interface SingleFieldContainerProps {
  item?: any;
  itemIndex: any;
  droppableIndex: any;
  update: any;
  required: string[];
  setRequired: (required: string[]) => void;
}

const READ_ONLY = "RO";
const WRITE_ONLY = "WO";
const READ_WRITE = "RW";

const FieldContainer: React.FC<SingleFieldContainerProps> = ({
  item,
  update,
  itemIndex,
  droppableIndex,
  required,
  setRequired,
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

  const toggleRequired = (event: any) => {
    const isRequired = event.target.checked;
    let newRequired = [...required];
    if (isRequired) {
      // If editedItem.content is already in required, do nothing
      if (!newRequired.includes(editedItem.content)) {
        newRequired.push(editedItem.content);
      }
    } else {
      // If editedItem.content doesn't already exist in required, do nothing
      if (newRequired.includes(editedItem.content)) {
        newRequired = newRequired.filter((item) => item !== editedItem.content);
      }
    }
    setRequired(newRequired);
  }

  const toggleEncrypt = (event: any) => {
    const encrypt = event.target.checked;
    setEncrypt(encrypt);
    const newItem = {...editedItem, "encryptedField": encrypt};
    update(itemIndex, droppableIndex, newItem);
    setEditedItem(newItem)
  }

  return (
    <div className='config-field-container'>
      <div className='item-name-container'>
        <p className='field-item-title m-0'>Item Name</p>
        <p className='field-item-name'>{item.name}</p>
      </div>
      <HorizontalDivider />
      <div>
        <p className='field-setting-text m-0'>Field Setting</p>
        <div className='field-setting-details-container'>
          <div className='half-width pt-5 pb-5'>
            <TextField 
              label="Field Name" 
              value={!!editedItem.externalName ? editedItem.externalName || '' : editedItem.content || ''} 
              className='field-name-input'
              onChange={handleFieldNameChange} 
              id="field-name"
              size='small'
              slotProps={{
                input: { style: { fontSize: '14px' } }
              }}
            />
          </div>
          <div className='half-width pt-5 pb-5'>
            <TextField
              value={formatValue}
              onChange={handleFieldTypeChange}
              className='field-type-text-field'
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
          </div>
          <div className='half-width pt-5 pb-5'>
            <TextField
              value={editedItem.fieldAccess}
              onChange={handleAccessModeChange}
              className='field-access-input'
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
          </div>
          <LitTooltip
            content={editedItem.fieldGroup?.length > 0 ? "Field group should be empty to toggle off multi-value" : ""}
            className='flex flex-row half-width'
            placement='bottom'
          >
            <div className='half-width pt-5 pb-5 multi-value-container w-fit'>
              <p className='small-text m-0'>
                Multi-Value?
              </p>
              <BlueSwitch 
                size='small' 
                checked={isMultiValue} 
                onChange={toggleMultiValue} 
                disabled = {formatValue === "readers" || formatValue === "authors" || editedItem.fieldGroup?.length > 0} 
                id='multi-value'
              />
            </div>
          </LitTooltip>
          <LitTooltip
            content={isMultiValue ? "" : "Enable multi-value to input a field group"}
            className='flex flex-row half-width'
          >
            <div className='full-width pt-5 pb-5'>
              <TextField 
                label="Field Group" 
                value={editedItem.fieldGroup || ''} 
                style={{ "width":"50%" }}
                onChange={handleFieldGroupChange} 
                disabled={!isMultiValue} 
                id='field-group'
                size='small'
                slotProps={{
                  input: { style: { fontSize: '14px' } }
                }}
              />
            </div>
          </LitTooltip>
          <EncryptSignOptions>
            <section className='main-row'>
              <p className='small-text m-0'>
                Encrypt
              </p>
              <LitTooltip
                content='Please understand this option before enabling, see the documentation on enabling encryption.'
              >
                <HelpCenterIcon sx={{ color: '#2D91E3', fontSize: '14px' }} />
              </LitTooltip>
              <BlueSwitch size='small' checked={encrypt} onChange={toggleEncrypt} />
            </section>
            <text className='warning-text'>
              Please understand this option before enabling
            </text>
          </EncryptSignOptions>
          <Box className='input required-pill-container'>
            <p className='small-text m-0'>
              Required?
            </p>
            <BlueSwitch 
              size='small' 
              checked={required.includes(editedItem.content)} 
              onChange={toggleRequired} 
              id='required'
            />
          </Box>
        </div>
      </div>
    </div>
  );
};

export default FieldContainer;
