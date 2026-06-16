/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef, useState } from 'react';
import { Tooltip, TextField, Button, Checkbox } from '@mui/material';
import { TabsProps } from '@mui/material/Tabs';
import AddIcon from '@mui/icons-material/Add';
import { WarningIcon } from '../../styles/CommonStyles';
import { capitalizeFirst, insertCharacter } from '../../utils/common';
import FieldContainer from './FieldContainer';
import { Field } from '../../store/databases/types';
import ScriptEditor from './ScriptEditor';
import { toggleAlert } from '../../store/alerts/action';
import FormDialogHeader from '../dialogs/FormDialogHeader';
import { LitButtonNeutral, LitButtonYes } from '../lit-elements/LitElements';

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

  // Sync the selected field when the fields list changes (e.g. mode switch)
  // or when fieldIndex is reset.
  useEffect(() => {
    const fields = state[stateList[0]];
    if (fields && fields.length > 0) {
      const idx = fieldIndex < fields.length ? fieldIndex : 0;
      setEditField(fields[idx]);
    } else {
      setEditField(null);
    }
  }, [state, fieldIndex]);

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
    <div className='full-height flex gap-16'>
      <div className='flex flex-col gap-10 selected-fields-container full-height quarter-width'>
        <div className='flex items-center pl-20 pt-5 m-0'>
            <TextField
              onChange={onAddFieldTextChange}
              autoFocus
              margin="dense"
              id="addField"
              placeholder="Add custom field..."
              hiddenLabel
              type="text"
              fullWidth
              slotProps={{
                inputLabel: { shrink: true }
              }}
            />
            <button title="Add Custom Field" className='field-list-icon-button'
              onClick={handleAddField}
            >
              <AddIcon className='add-icon' />
            </button>
        </div>
        {customFieldError && 
          <p className="color-text-danger small-text">
            {customFieldError}
          </p>
        }
        <hr className='divider' />
        <div className='flex justify-end field-batch-delete-container'>
          {!batchDelete && <Button 
            className='field-batch-delete-button'
            onClick={toggleBatchDelete} 
            disabled={state[stateList[0]].length === 0}
          >
            <p
              className={`
                field-batch-delete-text
                m-0 p-0
                ${state[stateList[0]].length === 0 ? 'color-text-disabled' : ''}
              `}
            >
              Delete Field(s)
            </p>
          </Button>}
          {batchDelete && <div className='flex justify-between full-width p-0'>
            <div className='flex flex-wrap'>
              <Tooltip title={deleteFields.length === 0 ? "Please select which field/s to remove first." : ""} arrow>
                <Button 
                  className='field-batch-delete-button'
                  onClick={openDialog}
                >
                  <p
                    className={`
                      field-batch-delete-text
                      m-0 p-0
                      tiny-text
                      ${deleteFields.length === 0 ? 'color-text-disabled' : ''}
                    `}
                  >
                    Remove
                  </p>
                </Button>
              </Tooltip>
              <Button 
                className='field-batch-delete-button'
                onClick={toggleBatchDelete} 
                disabled={state[stateList[0]].length === 0}
              >
                <p
                  className={`batch-delete-cancel-button m-0 p-0 tiny-text`}
                >
                  Cancel
                </p>
              </Button>
            </div>
            <Checkbox
              className='field-checkbox' 
              onChange={handleSelectAll}
              size='small'
              style={{
                color: '#0E5FDC',
              }}
            />
          </div>}
        </div>
        {state[stateList[0]].length > 0 && <div className='field-list-container p-0 pb-10 m-0'>
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
                  <div
                    className='flex items-center full-width field-list-custom-item small-text'
                    onClick={() => handleClickField(item, index)} key={`${item.name}-${idx}`}
                  >
                    <div className="field-list-field-info" onChange={(e) => {handleSelectField(e, item)}}>
                      <div className="field-list-field-name">{item.name}</div>
                      <div className="field-list-field-metadata">
                        {`${capitalizeFirst(format)} ${format ? '•' : ''} ${rwFlag} ${fieldGroup ? '•' : ''} ${fieldGroup} ${isRequired ? '• Required' : ''}`}
                      </div>
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
                  </div>
                )
              }))
          })}
        </div>}
        {state[stateList[0]].length === 0 && <p className='small-text text-italic please-add-fields-text p-20 m-0'>Please add field/s...</p>}
      </div>
      <div className='flex flex-col full-width full-height gap-20'>
        {editField && 
          <FieldContainer 
            item={editField} 
            update={update} 
            droppableIndex={stateList[0]} 
            itemIndex={state[stateList[0]].findIndex((field: Field) => field.name === editField.name)} 
            required={required}
            setRequired={setRequired}
        />}
        {!editField && <div className='p-0 field-config-field-container full-width'>
          <p className='field-config-field-setting'>Field Setting</p>
          <div className='field-select-message-container'>
            <p>No field found. Please select a field.</p>
          </div>
        </div>}
        <ScriptEditor setScripts={setScripts} data={data} test={test} validationRules={validationRules} setValidationRules={setValidationRules} />
      </div>
      <dialog className='dialog' ref={ref}>
        <div className='flex justify-between full-width'>
          <div className='flex gap-16 items-center full-width'>
            <div className='remove-field-warning-icon p-0 flex items-center'>
              <WarningIcon />
            </div>
            <div className='full-width'>
              <FormDialogHeader
                title="Remove Field"
                onClose={handleCloseDialog}
              />
            </div>
          </div>
        </div>
        <div className='dialog-content gap-10'>
          <p className='dialog-content-text'>Are you sure you want to remove the following fields:</p>
          <ul>
            {deleteFields.map((field: any) => {
              return <li key={field.name}><p className='dialog-content-text small-text text-bold'>{`${field.name} `}</p></li>
            })}
          </ul>
          <p className='dialog-content-text'>on this mode?</p>
        </div>
        <div className='dialog-actions'>
          <LitButtonNeutral onClick={handleCloseDialog} text='Cancel' />
          <LitButtonYes onClick={handleBatchDelete} text='OK' autoFocus />
        </div>
      </dialog>
    </div>
  );
};

export default FieldDNDContainer;
