/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import styled from 'styled-components';
import Checkbox from '@material-ui/core/Checkbox';
import { TextEditorContainer } from './styles';

const AcessContainer = styled.div`
  flex: 1;
  border: 1px solid #e0e0e0;
`;

const ReadAccessTextarea = styled.textarea`
  resize: none;
  width: 100%;
  height: 100% !important;
  font-size: 14px;
  padding: 5px 10px;
  border: 0;
  outline: none;
`;

const FormulaHeader = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  background: #f5f6fa;
  height: 40px;
  padding-left: 15px;
  justify-content: space-between;
`;

const Title = styled.p`
  font-size: 16px;
`;

interface ScriptEditorProps {
  data: any;
  handleChange: any;
}

/**
 * The ScriptEditor allows clients to enter and test formulas against a particular form.
 *
 * @author Michael Angelo Silva 
 * @author Neil Schultz
 *
 */
const ScriptEditor: React.FC<ScriptEditorProps> = ({ data, handleChange }) => {
  return (
    <TextEditorContainer>
      <AcessContainer>
        <FormulaHeader>
          <Title>Formula for Read Access</Title>
        </FormulaHeader>
        <ReadAccessTextarea
          onChange={handleChange}
          name="readAccessFormula"
          value={data.readAccessFormula ? data.readAccessFormula.formula :""}
          placeholder="Enter Formula..."
        />
      </AcessContainer>
      <AcessContainer>
        <FormulaHeader>
          <Title>Formula for Write Access</Title>
          <div style={{ display: 'flex', alignItems: 'center', paddingRight: "10px"}}>
            <Checkbox
              checked={data.computeWithForm}
              onChange={handleChange}
              color="primary"
              name="computeWithForm"
            />
            <Title>Compute With Form</Title>
          </div>
        </FormulaHeader>
        <ReadAccessTextarea
          name="writeAccessFormula"
          value={data.writeAccessFormula ? data.writeAccessFormula.formula :""}
          onChange={handleChange}
          placeholder="Enter Formula..."
        />
      </AcessContainer>
      <AcessContainer>
        <FormulaHeader>
          <Title>Formula for Delete Access</Title>
        </FormulaHeader>
        <ReadAccessTextarea
          name="deleteAccessFormula"
          value={data.deleteAccessFormula ? data.deleteAccessFormula.formula :""}
          onChange={handleChange}
          placeholder="Enter Formula..."
        />
      </AcessContainer>
      <AcessContainer>
        <FormulaHeader>
          <Title>On Load Formula</Title>
        </FormulaHeader>
        <ReadAccessTextarea
          onChange={handleChange}
          value={data.onLoad ? data.onLoad.formula : ""}
          name="onLoad"
          placeholder="Enter Formula..."
        />
      </AcessContainer>
      <AcessContainer>
        <FormulaHeader>
          <Title>On Save Formula</Title>
        </FormulaHeader>
        <ReadAccessTextarea
          onChange={handleChange}
          value={data.onSave ? data.onSave.formula : ""}
          name="onSave"
          placeholder="Enter Formula..."
        />
      </AcessContainer>
    </TextEditorContainer>
  );
};

export default ScriptEditor;
