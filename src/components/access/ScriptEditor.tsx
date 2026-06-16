/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { TextEditorContainer } from './styles';
import { Box, Button, ButtonBase, Collapse, TextField, Tooltip, Typography } from '@mui/material';
import { FiEdit2 } from 'react-icons/fi';
import CloseIcon from '@mui/icons-material/Close';
import { BlueSwitch, ButtonNeutral, ButtonYes, EncryptSignOptions } from '../../styles/CommonStyles';
import TestIcon from '@mui/icons-material/PlayArrow';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { LitTextformArray } from '../lit-elements/LitElements';

const AccessContainer = styled.div`
  border: 1px solid light-dark(#A5AFBE, #3a3a4a);
  border-radius: 10px;
  padding: 16px;
  width: 45%;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .title {
    font-size: 14px;
    font-weight: 500;
  }

  .formula-container {
    font-size: 12px;
    font-weight: 400;
  }

  .no-formula {
    font-weight: 300;
    color: #7B808D;
    font-size: 12px;
  }

  .computed {
    font-size: 12px;
    font-weight: 400;
    font-style: italic;
    color: #475155;
  }

  .write-formula {
    display: flex;
    justify-content: space-between;
  }
`;

const EditFormulaDialog = styled.dialog`
  border-radius: 10px;
  background: light-dark(#FFF, #252535);
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  border: none;
  width: 50%;
  padding: 30px 0;
  background: red;

  .header {
    display: flex;
    justify-content: space-between;
    padding: 0 30px;
    width: 100%;
    align-items: center;
  }

  .title {
    font-size: 20px;
    color: light-dark(#000, #e0e0e0);
    font-weight: 400;
  }

  .content {
    padding: 0 30px;
    height: fit-content;
    width: 100%;
  }

  .input {
    padding: 10px 0;
    width: 100%;
  }

  .button-text {
    color: #FFF;
  }

  .buttons {
    padding: 10px 30px 0 30px;
    display: flex;
    flex-direction: row-reverse;
    gap: 20px;
  }

  .compute-text {
    font-size: 15px;
    width: 50%;
  }

  .compute-line {
    padding: 5px 0;
    display: flex;
    width: 50%;
  }

  .continue-line {
    padding-left: 10px;
  }

  .continue-text {
    font-size: 14px;
    width: 50%;
  }

  .disabled {
    color: #A5AFBE;
  }
`

const FormulaHeader = styled.div`
  padding: 0;
  justify-content: space-between;
  display: flex;
  align-items: center;

  .edit {
    width: 10px;
  }
`;

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
            <AccessContainer>
              <FormulaHeader>
                <p className='small-text weight-500 m-0'>Formula for Read Access</p>
                <ButtonBase 
                  disabled={!(!!data.readAccessFormula)} 
                  onClick={() => openDialog("Formula for Read Access", data.readAccessFormula.formula)}
                >
                  <FiEdit2 />
                </ButtonBase>
              </FormulaHeader>
              {data.readAccessFormula && <p className='tiny-text weight-400 m-0'>{data.readAccessFormula.formula}</p>}
              {!data.readAccessFormula && <p className='weight-300 color-text-disabled tiny-text'>Enter Formula...</p>}
            </AccessContainer>
            <AccessContainer>
              <FormulaHeader>
                <p className='small-text weight-500 m-0'>Formula for Write Access</p>
                <ButtonBase 
                  disabled={!(!!data.writeAccessFormula)} 
                  onClick={() => openDialog("Formula for Write Access", data.writeAccessFormula.formula)}
                >
                  <FiEdit2 />
                </ButtonBase>
              </FormulaHeader>
              <div className='flex justify-between'>
                {data.writeAccessFormula?.formula !== "" && <p className='tiny-text weight-400 m-0'>{data.writeAccessFormula.formula}</p>}
                {data.writeAccessFormula?.formula === "" && <p className='weight-300 color-text-disabled tiny-text'>Enter Formula...</p>}
                {data.computeWithForm ?
                  <p className='tiny-text weight-400 text-italic color-text-disabled m-0'>Computed with Form - enabled</p> :
                  <p className='tiny-text weight-400 text-italic color-text-disabled m-0'>Computed with Form - disabled</p>
                }
              </div>
            </AccessContainer>
          </div>
          <div className='script-editor-formulas-container'>
            <AccessContainer>
              <FormulaHeader>
                <p className='small-text weight-500 m-0'>Formula for Delete Access</p>
                <ButtonBase 
                  disabled={!(!!data.deleteAccessFormula)} 
                  onClick={() => openDialog("Formula for Delete Access", data.deleteAccessFormula.formula)}
                >
                  <FiEdit2 />
                </ButtonBase>
              </FormulaHeader>
              {data.deleteAccessFormula?.formula !== "" && <p className='tiny-text weight-400 m-0'>{data.deleteAccessFormula.formula}</p>}
              {data.deleteAccessFormula?.formula === "" && <p className='weight-300 color-text-disabled tiny-text'>Enter Formula...</p>}
            </AccessContainer>
            <AccessContainer>
              <FormulaHeader>
                <p className='small-text weight-500 m-0'>On Load Formula</p>
                <ButtonBase 
                  disabled={!(!!data.onLoad)} 
                  onClick={() => openDialog("On Load Formula", data.onLoad.formula)}
                >
                  <FiEdit2 />
                </ButtonBase>
              </FormulaHeader>
              {data.onLoad?.formula !== "" && <p className='tiny-text weight-400 m-0'>{data.onLoad.formula}</p>}
              {data.onLoad?.formula === "" && <p className='weight-300 color-text-disabled tiny-text'>Enter Formula...</p>}
            </AccessContainer>
          </div>
          <div className='script-editor-formulas-container'>
            <AccessContainer>
              <FormulaHeader>
                <p className='small-text weight-500 m-0'>On Save Formula</p>
                <ButtonBase 
                  disabled={!(!!data.onSave)} 
                  onClick={() => openDialog("On Save Formula", data.onSave.formula)}
                >
                  <FiEdit2 />
                </ButtonBase>
              </FormulaHeader>
              {data.onSave?.formula !== "" && <p className='tiny-text weight-400 m-0'>{data.onSave.formula}</p>}
              {data.onSave?.formula === "" && <p className='weight-300 color-text-disabled tiny-text'>Enter Formula...</p>}
            </AccessContainer>
            <EncryptSignOptions>
              <section className='main-row'>
                <text>
                  Sign Document
                </text>
                <Tooltip arrow title='Please understand this option before enabling, see the documentation on enabling encryption.'>
                  <HelpCenterIcon sx={{ color: '#2D91E3', fontSize: '16px' }} />
                </Tooltip>
                <BlueSwitch size='small' checked={data.sign} onChange={handleToggleSign} />
              </section>
              <text className='warning-text'>
                Please understand this option before enabling
              </text>
            </EncryptSignOptions>
          </div>
          <EditFormulaDialog ref={ref} onClose={handleClose}>
            <Box className='header'>
              <Typography className='title'>{formulaTitle}</Typography>
              <ButtonBase onClick={handleClose}><CloseIcon /></ButtonBase>
            </Box>
            <hr className='divider' />
            <Box className='content'>
              {formulaTitle === "Formula for Write Access" && <Box className='compute-line'>
                <Typography className='compute-text'>Compute with Form</Typography>
                <BlueSwitch size='small' checked={formComputed} onChange={handleToggleCompute} id='compute-with-form' />
              </Box>}
              {formulaTitle === "Formula for Write Access" && <Box className='compute-line continue-line'>
                <Typography className={`continue-text ${!formComputed ? 'disabled' : ''}`}>Continue on Error</Typography>
                <BlueSwitch
                  size='small'
                  checked={continueOnError}
                  onChange={handleToggleContinue}
                  id='continue-on-error'
                  disabled={!formComputed}
                />
              </Box>}
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
            </Box>
            <hr className='divider' />
            <Box className='buttons'>
              <ButtonYes sx={{ backgroundColor: '#0F5FDC' }} onClick={handleClickSave}><Typography className='button-text'>Save</Typography></ButtonYes>
              <ButtonNeutral sx={{ border: '1px solid #000' }} onClick={handleClickCancel}>Cancel</ButtonNeutral>
            </Box>
          </EditFormulaDialog>
        </Collapse>
      </div>
      <TextEditorContainer>
        <Box className='settings-header'>
          <Typography className='settings-text'>Validation Rules</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
          <Button className='expand-button' onClick={handleClickExpandValidation}>
            {validationExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Button>
          </Box>
        </Box>
        <Collapse in={validationExpanded} timeout="auto" unmountOnExit>
          <LitTextformArray data={validationRules} setData={setValidationRules} title='message' />
        </Collapse>
      </TextEditorContainer>
    </>
  );
};

export default ScriptEditor;
