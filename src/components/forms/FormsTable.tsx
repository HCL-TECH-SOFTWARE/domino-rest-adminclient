/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import * as React from "react";
import styled from "styled-components";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { Box, Button, ButtonBase, Tooltip, Typography } from "@mui/material";
import { useDispatch } from "react-redux";
import { FiEdit2 } from "react-icons/fi";
import { AiOutlineQuestionCircle } from "react-icons/ai";
import { useNavigate } from 'react-router-dom';
import { Database } from "../../store/databases/types";
import ActivateMenu from "./ActivateMenu";
import { ButtonNeutral, ButtonYes, WarningIcon } from "../../styles/CommonStyles";
import { IoMdClose } from "react-icons/io";
import { addForm, handleDatabaseForms } from "../../store/databases/action";
import { fullEncode } from "../../utils/common";
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  paddingLeft: "30px",
  paddingRight: "30px",
  [`&.${tableCellClasses.head}`]: {
    fontWeight: "bold",
    paddingTop: "30px",
    borderBottom: "1px solid #b8b8b8",
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
    paddingTop: "20px",
    paddingBottom: "20px",
    borderBottom: "none",
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(odd)": {
    backgroundColor: "#F8FBFF",
    borderBottom: "none",
  },
  // hide last border
  "&:last-child th, &:last-child td": {
    borderBottom: 0,
  },
}));

const StyledTableContainer = styled(TableContainer)`
  border-radius: 10px;
  box-sizing: border-box;
  border: 1px solid #B9B9B9;
  background: #FFF;

  .diamond-marker {
    margin-right: 5px;
    transform: translateY(-7%);
  }
`

const StatusHeader = styled.div`
  cursor: default;

  .tooltip {
    background: #ffffff;
    text-color: #000000;
  }

  .status-icon {
    transform: translateY(10%);
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
    color: #000;
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
      <StyledTableContainer>
        <Table sx={{ padding: "30px" }} aria-label="views and agents table">
          <TableHead>
            <TableRow>
              <StyledTableCell width="50px" />
              <StyledTableCell width="350px">
                <Box display='flex' flexDirection='row'>
                  <Box visibility='hidden' className='diamond-marker'>
                    <svg width='8' height='8' viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
                      <polygon points="4,0 8,4 4,8 0,4" fill="#962CEA"/>
                    </svg>
                  </Box>
                  Form Name
                </Box>
              </StyledTableCell>
              <StyledTableCell width="350px">Form Aliases</StyledTableCell>
              <StyledTableCell width="350px">Modes Available</StyledTableCell>
              <StyledTableCell>
                <StatusHeader>
                  <div>
                    <Tooltip
                      title={`Activate the Forms that should be accessible\nvia rest API`}
                    >
                      <div>
                        Status <AiOutlineQuestionCircle className="status-icon" />
                      </div>
                    </Tooltip>
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
                    <Box visibility={formList.includes(form.formName) ? 'hidden' : 'visible'} className='diamond-marker'>
                      <svg width='8' height='8' viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
                        <polygon points="4,0 8,4 4,8 0,4" fill="#962CEA"/>
                      </svg>
                    </Box>
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
                <StyledTableCell>
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
            <Box width='30px' height='30px' padding='0' display='flex' alignItems='center'><WarningIcon /></Box>
            <Typography className='title'>Activate Form?</Typography>
          </Box>
          <ButtonBase onClick={handleCloseActivateDialog}><IoMdClose size='1.5em' /></ButtonBase>
        </Box>
        <Box className='content'>
          <Typography className='text-content'>This form is inactive. Activate this form to edit it?</Typography>
        </Box>
        <Box className='buttons'>
          <ButtonYes className='button-ok' onClick={handleConfirmActivate} style={{ color: '#FFF' }}>OK</ButtonYes>
          <ButtonNeutral className='button-cancel' onClick={handleCloseActivateDialog}>Cancel</ButtonNeutral>
        </Box>
      </ActivateDialogContainer>
    </>
  );
};

export default FormsTable;

