/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import * as React from "react";
import { styled } from '@linaria/react';
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { Box, Button, ButtonBase } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { FiEdit2 } from "react-icons/fi";
import { AiOutlineQuestionCircle } from "react-icons/ai";
import { useNavigate } from 'react-router-dom';
import { Database } from "../../store/databases/types";
import ActivateMenu from "./ActivateMenu";
import { ButtonNeutral, ButtonYes, WarningIcon } from "../../styles/CommonStyles";
import { IoMdClose } from "react-icons/io";
import { addForm, handleDatabaseForms } from "../../store/databases/action";
import { fullEncode } from "../../utils/common";
import { getTheme } from "../../store/styles/action";
import { AppState } from "../../store";
import { LitButtonNeutral, LitButtonYes, LitTooltip } from "../lit-elements/LitElements";

const StyledTableCell = styled(TableCell)`
  padding-left: 30px;
  padding-right: 30px;

  &.${tableCellClasses.head} {
    font-weight: bold;
    padding-top: 30px;
    border-bottom: 1px solid #b8b8b8;
  }

  &.${tableCellClasses.body} {
    font-size: 14px;
    padding-top: 20px;
    padding-bottom: 20px;
    border-bottom: none;
  }
`;

const StyledTableRow = styled(TableRow)`
  &:nth-of-type(odd) {
    background-color: light-dark(#f8fbff, #1e1e2e);
  }

  &:last-child th, &:last-child td {
    border-bottom: 0;
  }
`;

const StyledTableContainer = styled(TableContainer)<{ themeMode?: string }>`
  border-radius: 10px;
  box-sizing: border-box;
  border: 1px solid ${(props) => props.themeMode ? getTheme(props.themeMode).borderColor : '#B9B9B9'};
  background: ${(props) => props.themeMode ? getTheme(props.themeMode).secondary : '#FFF'};
`

const StatusHeader = styled.div`
  cursor: default;

  .tooltip {
    background: #ffffff;
    text-color: #000000;
  }

  /* Render the trigger ("Status <icon />") on a single line. */
  & > div > div {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .status-icon {
    display: inline-block;
    vertical-align: middle;
  }
`;

const EditIcon = styled.div`
  cursor: pointer;
`;

const ViewNameDisplay = styled.div`
  display: flex;
  align-items: flex-start;

  .text {
    text-transform: none;
    display: flex;
    flex-direction: column;
  }

  .custom-form {
    font-size: 12px;
    color: #475155;
  }
`;

const ActivateDialogContainer = styled.dialog`
  border: 1px solid white;
  border-radius: 10px;
  width: 40%;
  padding: 30px;
  height: fit-content;

  .content {
    padding-bottom: 30px;
  }

  .dialog-buttons {
    padding: 0 30px 30px 30px
  }

  .header-close {
    display: flex;
    justify-content: space-between;
    padding-bottom: 25px;
  }

  .header {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .title {
    font-size: 22px;
    color: light-dark(#000, #e0e0e0);
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
    color: light-dark(#000, #e0e0e0);
    font-weight: 700;
    font-size: 14px;
    border-radius: 10px;
    border: 1px solid #323A3D;
    padding: 11px 24px;
  }
`

interface FormsTableProps {
  forms: Array<any>;
  dbName: string;
  nsfPath: string;
  schemaData: Database;
  setSchemaData: (schemaData: any) => void;
  formList: Array<string>;
}

const FormsTable: React.FC<FormsTableProps> = ({
  forms,
  dbName,
  nsfPath,
  schemaData,
  setSchemaData,
  formList,
}) => {
  const dispatch = useDispatch();
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const ref = React.useRef<HTMLDialogElement>(null)
  const [activateFormName, setActivateFormName] = React.useState("")
  
  const navigate = useNavigate();
  const openForm = (formName: string, modeLength: number) => {
    if (modeLength > 0) {
      dispatch(addForm(false) as any)
      navigate(`/schema/${encodeURIComponent(nsfPath)}/${dbName}/${fullEncode(formName)}/access`);
    } else {
      setActivateFormName(formName)
      ref.current?.showModal()
    }
  };

  const handleCloseActivateDialog = () => {
    if (ref.current?.close) {
      ref.current?.close();
    }
  }

  const handleConfirmActivate = () => {
    toggleConfigure(activateFormName)
    if (ref.current?.close) {
      ref.current?.close();
    }
  }

  const toggleConfigure = (formName: string, openForm = true) => {
    const formIndex = forms.findIndex(
      (f: { formName: string; dbName: string; }) => f.formName === formName && f.dbName === dbName
    );
    const formModeData = {
      modeName: "default",
      fields: [],
      readAccessFormula: {
        formulaType: "domino",
        formula: "@True",
      },
      writeAccessFormula: {
        formulaType: "domino",
        formula: "@True",
      },
      deleteAccessFormula: {
        formulaType: "domino",
        formula: "@False",
      },
      computeWithForm: false,
    };

    const alias = forms[formIndex].alias;
    const newForm = {
      formValue: formName,
      formName: formName,
      alias: alias,
      formModes: [formModeData],
    }
    if (openForm) {
      dispatch(
        handleDatabaseForms(
          schemaData,
          dbName,
          [...schemaData.forms, newForm],
          setSchemaData,
          `${formName} activated successfully.`,
          () => {navigate(`/schema/${fullEncode(nsfPath)}/${dbName}/${fullEncode(formName)}/access`)},
        ) as any
      );
    } else {
      dispatch(
        handleDatabaseForms(
          schemaData,
          dbName,
          [...schemaData.forms, newForm],
          setSchemaData,
          `${formName} activated successfully.`,
        ) as any
      );
    }
  };

  return (
    <>
      <StyledTableContainer themeMode={themeMode}>
        <Table className="p-30" aria-label="views and agents table">
          <TableHead>
            <TableRow>
              <StyledTableCell width="50px" />
              <StyledTableCell width="350px">
                <div className="flex flex-row">
                  <div className='forms-table-diamond-marker mr-5 hidden'>
                    <svg width='8' height='8' viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
                      <polygon points="4,0 8,4 4,8 0,4" fill="#962CEA"/>
                    </svg>
                  </div>
                  Form Name
                </div>
              </StyledTableCell>
              <StyledTableCell width="350px">Form Aliases</StyledTableCell>
              <StyledTableCell width="150px">Modes Available</StyledTableCell>
              <StyledTableCell width="200px">
                <StatusHeader>
                  <div>
                    <LitTooltip content={`Activate the Forms that should be accessible\nvia rest API`} placement='bottom' without-arrow>
                      <div id='form-status-header-icon'>
                        Status <AiOutlineQuestionCircle className="status-icon" />
                      </div>
                    </LitTooltip>
                  </div>
                </StatusHeader>
              </StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {forms.map((form,i) => (
              <StyledTableRow key={form.formName+i}>
                <StyledTableCell component="th" scope="row" width="50px">
                  <EditIcon onClick={() => openForm(form.formName, form.formModes.length)}>
                    <Button title={form.formName}><FiEdit2 size='1.5em' /></Button>
                  </EditIcon>
                </StyledTableCell>
                <StyledTableCell width="550px">
                  <ViewNameDisplay>
                    <div className={`forms-table-diamond-marker ${formList.includes(form.formName) ? 'hidden' : 'visible'}`}>
                      <svg width='8' height='8' viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="4,0 8,4 4,8 0,4" fill="#962CEA"/>
                      </svg>
                    </div>
                    <Box className="text">
                      <span>{form.formName}</span>
                      {!formList.includes(form.formName) && <span className='custom-form'>custom form</span>}
                    </Box>
                  </ViewNameDisplay>
                </StyledTableCell>
                <StyledTableCell>
                  <ViewNameDisplay>
                    <span>{form.alias}</span>
                  </ViewNameDisplay>
                </StyledTableCell>
                <StyledTableCell>
                  <ViewNameDisplay>
                    <span>{form.formModes.length}</span>
                  </ViewNameDisplay>
                </StyledTableCell>
                <StyledTableCell className='table-cell-activate-menu'>
                  <ActivateMenu
                    form={form}
                    nsfPath={nsfPath}
                    dbName={dbName}
                    forms={forms}
                    schemaData={schemaData}
                    setSchemaData={setSchemaData}
                    formList={formList}
                    toggleActivate={toggleConfigure}
                  />
                </StyledTableCell>
              </StyledTableRow>
              
            ))}
          </TableBody>
        </Table>
      </StyledTableContainer>
      <ActivateDialogContainer ref={ref}>
        <Box className='header-close'>
          <Box className='header'>
            <div className="w-30px h-30px p-0 flex items-center">
              <WarningIcon />
            </div>
            <span className='title'>Activate Form?</span>
          </Box>
          <ButtonBase onClick={handleCloseActivateDialog}><IoMdClose size='1.5em' /></ButtonBase>
        </Box>
        <Box className='content'>
          <span className='text-content'>This form is inactive. Activate this form to edit it?</span>
        </Box>
        <Box className='buttons'>
          <LitButtonYes text='OK' onClick={handleConfirmActivate} />
          <LitButtonNeutral text='Cancel' onClick={handleCloseActivateDialog} />
        </Box>
      </ActivateDialogContainer>
    </>
  );
};

export default FormsTable;

