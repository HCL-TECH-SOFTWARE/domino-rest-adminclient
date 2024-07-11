/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useRef, useState } from 'react';
import styled from 'styled-components';
import { TextEditorContainer } from './styles';
import { Box, Button, ButtonBase, TextField, Typography } from '@mui/material';
import { FiEdit2 } from 'react-icons/fi';
import CloseIcon from '@mui/icons-material/Close';
import { BlueSwitch, ButtonNeutral, ButtonYes } from '../../styles/CommonStyles';
import TestIcon from '@mui/icons-material/PlayArrow';

const AccessContainer = styled.div`
  border: 1px solid #A5AFBE;
  border-radius: 10px;
  padding: 16px;
  width: 45%;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .title {
    font-size: 16px;
    font-weight: 500;
  }

  .formula-container {
    font-size: 14px;
    font-weight: 400;
  }

  .no-formula {
    font-weight: 300;
    color: #7B808D;
    font-size: 14px;
  }

  .computed {
    font-size: 14px;
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
  background: #FFF;
  box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.25);
  border: none;
  width: 50%;
  padding: 30px 0;

  .header {
    display: flex;
    justify-content: space-between;
    padding: 0 30px 10px 30px;
  }

  .title {
    font-size: 20px;
    color: #000;
    font-weight: 400;
  }

  .content {
    padding: 0 30px;
    height: fit-content;
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
  }

  .compute-line {
    padding: 10px 0;
    display: flex;
    gap: 10px;
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
}

/**
 * The ScriptEditor allows clients to enter and test formulas against a particular form.
 *
 * @author Michael Angelo Silva 
 * @author Neil Schultz
 *
 */
const ScriptEditor: React.FC<ScriptEditorProps> = ({ data, setScripts, test }) => {
  const [formulaTitle, setFormulaTitle] = useState("")
  const [formula, setFormula] = useState("")
  const [formComputed, setFormComputed] = useState(data.computeWithForm)
  const ref = useRef<HTMLDialogElement>(null);

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
    if (ref.current?.close) {
      ref.current?.close();
    }
  }

  const handleToggleCompute = (event: any) => {
    setFormComputed(event.target.checked)
  }

  return (
    <TextEditorContainer>
      <Box className='settings-header'>
        <Typography className='settings-text'>Mode Formula Settings</Typography>
        <Button onClick={test}>
          <TestIcon className='action-icon' color='primary' />
          <Typography variant='body2' color='textPrimary'>
            Test Formulas
          </Typography>
        </Button>
      </Box>
      <Box className='formulas-container'>
        <AccessContainer>
          <FormulaHeader>
            <Typography className='title'>Formula for Read Access</Typography>
            <ButtonBase 
              disabled={!(!!data.readAccessFormula)} 
              onClick={() => openDialog("Formula for Read Access", data.readAccessFormula.formula)}
            >
              <FiEdit2 />
            </ButtonBase>
          </FormulaHeader>
          {data.readAccessFormula && <Typography className='formula-container'>{data.readAccessFormula.formula}</Typography>}
          {!data.readAccessFormula && <Typography className='no-formula'>Enter Formula...</Typography>}
        </AccessContainer>
        <AccessContainer>
          <FormulaHeader>
            <Typography className='title'>Formula for Write Access</Typography>
            <ButtonBase 
              disabled={!(!!data.writeAccessFormula)} 
              onClick={() => openDialog("Formula for Write Access", data.writeAccessFormula.formula)}
            >
              <FiEdit2 />
            </ButtonBase>
          </FormulaHeader>
          <Box className='write-formula'>
            {data.writeAccessFormula?.formula !== "" && <Typography className='formula-container'>{data.writeAccessFormula.formula}</Typography>}
            {data.writeAccessFormula?.formula === "" && <Typography className='no-formula'>Enter Formula...</Typography>}
            {data.computeWithForm && <Typography className='computed'>Computed with Form</Typography>}
          </Box>
        </AccessContainer>
      </Box>
      <Box className='formulas-container'>
        <AccessContainer>
          <FormulaHeader>
            <Typography className='title'>Formula for Delete Access</Typography>
            <ButtonBase 
              disabled={!(!!data.deleteAccessFormula)} 
              onClick={() => openDialog("Formula for Delete Access", data.deleteAccessFormula.formula)}
            >
              <FiEdit2 />
            </ButtonBase>
          </FormulaHeader>
          {data.deleteAccessFormula?.formula !== "" && <Typography className='formula-container'>{data.deleteAccessFormula.formula}</Typography>}
          {data.deleteAccessFormula?.formula === "" && <Typography className='no-formula'>Enter Formula...</Typography>}
        </AccessContainer>
        <AccessContainer>
          <FormulaHeader>
            <Typography className='title'>On Load Formula</Typography>
            <ButtonBase 
              disabled={!(!!data.onLoad)} 
              onClick={() => openDialog("On Load Formula", data.onLoad.formula)}
            >
              <FiEdit2 />
            </ButtonBase>
          </FormulaHeader>
          {data.onLoad?.formula !== "" && <Typography className='formula-container'>{data.onLoad.formula}</Typography>}
          {data.onLoad?.formula === "" && <Typography className='no-formula'>Enter Formula...</Typography>}
        </AccessContainer>
      </Box>
      <Box className='formulas-container'>
        <AccessContainer>
          <FormulaHeader>
            <Typography className='title'>On Save Formula</Typography>
            <ButtonBase 
              disabled={!(!!data.onSave)} 
              onClick={() => openDialog("On Save Formula", data.onSave.formula)}
            >
              <FiEdit2 />
            </ButtonBase>
          </FormulaHeader>
          {data.onSave?.formula !== "" && <Typography className='formula-container'>{data.onSave.formula}</Typography>}
          {data.onSave?.formula === "" && <Typography className='no-formula'>Enter Formula...</Typography>}
        </AccessContainer>
      </Box>
      <EditFormulaDialog ref={ref} onClose={handleClose}>
        <Box className='header'>
          <Typography className='title'>{formulaTitle}</Typography>
          <ButtonBase onClick={handleClose}><CloseIcon /></ButtonBase>
        </Box>
        <hr style={{ height: '1px', background: '#CBCBCB' }} />
        <Box className='content'>
          {formulaTitle === "Formula for Write Access" && <Box className='compute-line'>
            <Typography className='compute-text'>Compute with Form</Typography>
            <BlueSwitch size='small' checked={formComputed} onChange={handleToggleCompute} id='compute-with-form' />
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
        <hr style={{ height: '1px', background: '#CBCBCB' }} />
        <Box className='buttons'>
          <ButtonYes onClick={handleClickSave}><Typography className='button-text'>Save</Typography></ButtonYes>
          <ButtonNeutral onClick={handleClickCancel}>Cancel</ButtonNeutral>
        </Box>
      </EditFormulaDialog>
    </TextEditorContainer>
  );
};

export default ScriptEditor;
