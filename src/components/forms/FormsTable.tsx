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
import ActivateSwitchForm from "./ActivateSwitchForm";
import { Button, Tooltip } from "@material-ui/core";
import { useDispatch } from "react-redux";
import { FiEdit2 } from "react-icons/fi";
import { AiOutlineQuestionCircle } from "react-icons/ai";
import { useHistory } from 'react-router-dom';
import { toggleAlert } from "../../store/alerts/action";
import { Database } from "../../store/databases/types";
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

const StyledTableContainer = styled(TableContainer)(({ theme }) => ({
  borderRadius: "10px",
  boxSizing: "border-box",
  border: "1px solid #B9B9B9",
  background: "#FFFFFF",
}));

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
  text-transform: none;
`;

interface FormsTableProps {
  forms: Array<any>;
  dbName: string;
  nsfPath: string;
  schemaData: Database;
}

const FormsTable: React.FC<FormsTableProps> = ({
  forms,
  dbName,
  nsfPath,
  schemaData,
}) => {
  const dispatch = useDispatch();
  
  
  const history = useHistory();
  const openForm = (formName: string, modeLength: number) => {
    if (modeLength > 0) {
      history.push(`/schema/${encodeURIComponent(nsfPath)}/${dbName}/${encodeURIComponent(formName)}/access`);
    } else {
      dispatch(toggleAlert(`Please activate this form before editing it!`))
    }
  };
  return (
    <StyledTableContainer>
      <Table sx={{ padding: "30px" }} aria-label="views and agents table">
        <TableHead>
          <TableRow>
            <StyledTableCell width="50px" />
            <StyledTableCell width="350px">Form Name</StyledTableCell>
            <StyledTableCell width="350px">Form Aliases</StyledTableCell>
            <StyledTableCell width="350px">Modes Available</StyledTableCell>
            <StyledTableCell>
              <StatusHeader>
                <div>
                  <Tooltip
                    title={`Activate the Views that should be accessible\nvia rest API`}
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
                  <span>{form.formName}</span>
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
                <ActivateSwitchForm form={form} nsfPath={nsfPath} dbName={dbName} forms={forms} schemaData={schemaData}/>
              </StyledTableCell>
            </StyledTableRow>
            
          ))}
        </TableBody>
      </Table>
    </StyledTableContainer>

    
    
  );
};

export default FormsTable;

