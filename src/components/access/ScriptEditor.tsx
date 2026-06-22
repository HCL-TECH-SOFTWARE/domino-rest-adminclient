/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { Button, ButtonBase, Collapse, TextField, Tooltip } from '@mui/material';
import { FiEdit2 } from 'react-icons/fi';
import { BlueSwitch } from '../../styles/CommonStyles';
import TestIcon from '@mui/icons-material/PlayArrow';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { LitButtonNeutral, LitButtonYes, LitTextformArray } from '../lit-elements/LitElements';
import FormDialogHeader from '../dialogs/FormDialogHeader';

interface ScriptEditorProps {
  data: any;
  setScripts: (data: any) => void;
  test: () => void;
  validationRules: Array<{ formula: String, formulaType: String, message: String }>;
  setValidationRules: (data: Array<{ formula: String, formulaType: String, message: String }>) => void;
}

/**
 * The ScriptEditor allows clients to enter and test formulas against a particular form.
 *
 * @author Michael Angelo Silva 
 * @author Neil Schultz
 *
 */
const ScriptEditor: React.FC<ScriptEditorProps> = ({ data, setScripts, test, validationRules, setValidationRules }) => {
  const [formulaTitle, setFormulaTitle] = useState("")
  const [formula, setFormula] = useState("")
  const [expanded, setExpanded] = useState(false)
  const [validationExpanded, setValidationExpanded] = useState(false)
  const [formComputed, setFormComputed] = useState(data.computeWithForm)
  const [continueOnError, setContinueOnError] = useState(data.continueOnError)
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setFormComputed(data.computeWithForm)
    setContinueOnError(data.continueOnError)
  }, [data])

  const handleClose = () => {
    if (ref.current?.close) {
      ref.current?.close();
    }
  }

  const openDialog = (title: string, formulaString: string) => {
    ref.current?.showModal();
    setFormulaTitle(title)
    setFormula(formulaString)
  }

  const handleTypeFormula = (event: React.ChangeEvent<any>) => {
    setFormula(event.target?.value)
  }

  const handleClickSave = () => {
    let name = ""
    switch(formulaTitle) {
      case "Formula for Read Access":
        name = "readAccessFormula"
        break
      case "Formula for Write Access":
        name = "writeAccessFormula"
        break
      case "Formula for Delete Access":
        name = "deleteAccessFormula"
        break
      case "On Load Formula":
        name = "onLoad"
        break
      case "On Save Formula":
        name = "onSave"
        break
    }

    setScripts({
      ...data,
      [name]: {
        formulaType: 'domino',
        formula: formula,
      },
      computeWithForm: formComputed,
      continueOnError: continueOnError,
    })

    if (ref.current?.close) {
      ref.current?.close();
    }

    setFormula("")
    setFormulaTitle("")
  }

  const handleClickCancel = () => {
    setFormula("")
    setFormulaTitle("")
    setFormComputed(data.computeWithForm)
    setContinueOnError(data.continueOnError)
    if (ref.current?.close) {
      ref.current?.close();
    }
  }

  const handleToggleCompute = (event: any) => {
    setFormComputed(event.target.checked)
  }

  const handleToggleContinue = (event: any) => {
    setContinueOnError(event.target.checked)
  }

  const handleToggleSign = (event: any) => {
    setScripts({
      ...data,
      sign: event.target.checked,
    })
  }

  const handleClickExpand = () => {
    setExpanded(!expanded)
  }

  const handleClickExpandValidation = () => {
    setValidationExpanded(!validationExpanded)
  }

  return (
    <>
      <div className='script-editor-container'>
        <div className='script-editor-settings-header'>
          <p className='script-editor-settings-text m-0'>Mode Settings</p>
          <div className='flex flex-row items-center'>
            <Button onClick={test}>
              <TestIcon className='action-icon' color='primary' />
              <p className='color-text-primary m-0 small-text'>
                Test Formulas
              </p>
            </Button>
            <Button className='expand-button' onClick={handleClickExpand}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </Button>
          </div>
        </div>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <div className='script-editor-formulas-container'>
            <div className='script-editor-access-container p-16 flex flex-col gap-10'>
              <div className='p-0 justify-between flex items-center'>
                <p className='small-text weight-500 m-0'>Formula for Read Access</p>
                <ButtonBase 
                  disabled={!(!!data.readAccessFormula)} 
                  onClick={() => openDialog("Formula for Read Access", data.readAccessFormula.formula)}
                >
                  <FiEdit2 />
                </ButtonBase>
              </div>
              {data.readAccessFormula && <p className='tiny-text weight-400 m-0'>{data.readAccessFormula.formula}</p>}
              {!data.readAccessFormula && <p className='weight-300 color-text-disabled tiny-text'>Enter Formula...</p>}
            </div>
            <div className='script-editor-access-container p-16 flex flex-col gap-10'>
              <div className='p-0 justify-between flex items-center'>
                <p className='small-text weight-500 m-0'>Formula for Write Access</p>
                <ButtonBase 
                  disabled={!(!!data.writeAccessFormula)} 
                  onClick={() => openDialog("Formula for Write Access", data.writeAccessFormula.formula)}
                >
                  <FiEdit2 />
                </ButtonBase>
              </div>
              <div className='flex justify-between'>
                {data.writeAccessFormula?.formula !== "" && <p className='tiny-text weight-400 m-0'>{data.writeAccessFormula.formula}</p>}
                {data.writeAccessFormula?.formula === "" && <p className='weight-300 color-text-disabled tiny-text'>Enter Formula...</p>}
                {data.computeWithForm ?
                  <p className='tiny-text weight-400 text-italic color-text-disabled m-0'>Computed with Form - enabled</p> :
                  <p className='tiny-text weight-400 text-italic color-text-disabled m-0'>Computed with Form - disabled</p>
                }
              </div>
            </div>
          </div>
          <div className='script-editor-formulas-container'>
            <div className='script-editor-access-container p-16 flex flex-col gap-10'>
              <div className='p-0 justify-between flex items-center'>
                <p className='small-text weight-500 m-0'>Formula for Delete Access</p>
                <ButtonBase 
                  disabled={!(!!data.deleteAccessFormula)} 
                  onClick={() => openDialog("Formula for Delete Access", data.deleteAccessFormula.formula)}
                >
                  <FiEdit2 />
                </ButtonBase>
              </div>
              {data.deleteAccessFormula?.formula !== "" && <p className='tiny-text weight-400 m-0'>{data.deleteAccessFormula.formula}</p>}
              {data.deleteAccessFormula?.formula === "" && <p className='weight-300 color-text-disabled tiny-text'>Enter Formula...</p>}
            </div>
            <div className='script-editor-access-container p-16 flex flex-col gap-10'>
              <div className='p-0 justify-between flex items-center'>
                <p className='small-text weight-500 m-0'>On Load Formula</p>
                <ButtonBase 
                  disabled={!(!!data.onLoad)} 
                  onClick={() => openDialog("On Load Formula", data.onLoad.formula)}
                >
                  <FiEdit2 />
                </ButtonBase>
              </div>
              {data.onLoad?.formula !== "" && <p className='tiny-text weight-400 m-0'>{data.onLoad.formula}</p>}
              {data.onLoad?.formula === "" && <p className='weight-300 color-text-disabled tiny-text'>Enter Formula...</p>}
            </div>
          </div>
          <div className='script-editor-formulas-container'>
            <div className='script-editor-access-container p-16 flex flex-col gap-10'>
              <div className='p-0 justify-between flex items-center'>
                <p className='small-text weight-500 m-0'>On Save Formula</p>
                <ButtonBase 
                  disabled={!(!!data.onSave)} 
                  onClick={() => openDialog("On Save Formula", data.onSave.formula)}
                >
                  <FiEdit2 />
                </ButtonBase>
              </div>
              {data.onSave?.formula !== "" && <p className='tiny-text weight-400 m-0'>{data.onSave.formula}</p>}
              {data.onSave?.formula === "" && <p className='weight-300 color-text-disabled tiny-text'>Enter Formula...</p>}
            </div>
            <div className='w-45 small-text'>
              <section className='flex full-width'>
                <span className='color-text-primary m-0 p-0'>
                  Sign Document
                </span>
                <Tooltip arrow title='Please understand this option before enabling, see the documentation on enabling encryption.'>
                  <HelpCenterIcon className='script-editor-help-icon' />
                </Tooltip>
                <BlueSwitch size='small' checked={data.sign} onChange={handleToggleSign} />
              </section>
              <span className='color-text-disabled tiny-text m-0 p-0'>
                Please understand this option before enabling
              </span>
            </div>
          </div>
          <dialog className='dialog half-width pr-0 pl-0' ref={ref} onClose={handleClose}>
            <div className='pr-30 pl-30 full-width'>
              <FormDialogHeader
                title={formulaTitle}
                onClose={handleClose}
              />
            </div>
            <hr className='divider' />
            <div className='dialog-content pl-30 pr-30 gap-20'>
              <div>
                {formulaTitle === "Formula for Write Access" && <div className='script-editor-formula-line flex half-width m-0 p-0'>
                  <span className='script-editor-compute-text half-width'>Compute with Form</span>
                  <BlueSwitch size='small' checked={formComputed} onChange={handleToggleCompute} id='compute-with-form' />
                </div>}
                {formulaTitle === "Formula for Write Access" && <div className='script-editor-formula-line flex half-width m-0 p-0'>
                  <span className={`small-text half-width ${!formComputed ? 'color-text-disabled' : ''}`}>Continue on Error</span>
                  <BlueSwitch
                    size='small'
                    checked={continueOnError}
                    onChange={handleToggleContinue}
                    id='continue-on-error'
                    disabled={!formComputed}
                  />
                </div>}
              </div>
              <TextField 
                variant='outlined' 
                hiddenLabel 
                className='input' 
                placeholder='Enter Formula...' 
                value={formula} 
                minRows={5} 
                multiline 
                onChange={handleTypeFormula} 
              />
            </div>
            <hr className='divider' />
            <div className='dialog-actions pl-30 pr-30 gap-20'>
              <LitButtonNeutral onClick={handleClickCancel} text='Cancel' />
              <LitButtonYes onClick={handleClickSave} text='Save' />
            </div>
          </dialog>
        </Collapse>
      </div>
      <div className='script-editor-container'>
        <div className='script-editor-settings-header'>
          <p className='script-editor-settings-text m-0'>Validation Rules</p>
          <div className='flex flex-row items-center'>
            <Button className='p-0 m-0' onClick={handleClickExpandValidation}>
              {validationExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </Button>
          </div>
        </div>
        <Collapse in={validationExpanded} timeout="auto" unmountOnExit>
          <LitTextformArray data={validationRules} setData={setValidationRules} title='message' />
        </Collapse>
      </div>
    </>
  );
};

export default ScriptEditor;
