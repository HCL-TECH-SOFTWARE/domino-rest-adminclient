/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import * as React from "react";
import { styled } from '@linaria/react';
import { Box, Button, ButtonBase } from "@mui/material";
import { useNavigate } from '../../router/react';
import { Database } from "../../store/databases/types";
import { WarningIcon } from "../../styles/CommonStyles";
import { addForm, handleDatabaseForms } from "../../store/databases/action";
import { fullEncode } from "../../utils/common";
import { KeepActivateMenu, KeepButton, KeepDataTable, KeepTooltip } from "../keep-elements/KeepElements";
import { KeepIcon } from "../keep-elements/react/KeepIcon";
import { useAppDispatch } from '../../store/hooks';

/** `width` is valid on <th> but absent from React's ThHTMLAttributes, which types it only on <td>. */
const colWidth = (width: string) => ({ width });

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
`;

const EditIcon = styled.div`
  cursor: pointer;

  /* Was FiEdit2 size='1.5em'. wa-icon takes its box from font-size, not width, so the
     same relative measure has to be spelled as a font-size here. */
  .edit-icon {
    font-size: 1.5em;
  }
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
    font-size: var(--wa-font-size-s);
    color: #475155;
  }
`;

const ActivateDialogContainer = styled.dialog`
  border: 1px solid white;
  border-radius: var(--wa-border-radius-l);
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

  /* Was IoMdClose size='1.5em'. */
  .close-icon {
    font-size: 1.5em;
  }

  .header {
    display: flex;
    gap: 16px;
    align-items: center;
  }

  .title {
    font-size: var(--wa-font-size-xl);
    color: var(--wa-color-text-normal);
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
    font-size: var(--wa-font-size-m);
    border-radius: var(--wa-border-radius-l);
    padding: 11px 24px;

    &:hover {
      background-color: #0B4AAE;
      color: #FFFFFF;
    }
  }

  .button-cancel {
    color: var(--wa-color-text-normal);
    font-weight: 700;
    font-size: var(--wa-font-size-m);
    border-radius: var(--wa-border-radius-l);
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
  const dispatch = useAppDispatch();
  const ref = React.useRef<HTMLDialogElement>(null)
  const [activateFormName, setActivateFormName] = React.useState("")
  
  const navigate = useNavigate();
  const openForm = (formName: string, modeLength: number) => {
    if (modeLength > 0) {
      dispatch(addForm(false))
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
      <KeepDataTable zebra>
        <table className="p-30" aria-label="views and agents table">
          <thead>
            <tr>
              <th {...colWidth('50px')}>{null}</th>
              <th {...colWidth('350px')}>
                <div className="flex flex-row">
                  <div className='forms-table-diamond-marker mr-5 hidden'>
                    <svg width='8' height='8' viewBox="0 0 8 8" xmlns="http://www.w3.org/2000/svg">
                      <polygon points="4,0 8,4 4,8 0,4" fill="#962CEA"/>
                    </svg>
                  </div>
                  Form Name
                </div>
              </th>
              <th {...colWidth('350px')}>Form Aliases</th>
              <th {...colWidth('150px')}>Modes Available</th>
              <th {...colWidth('200px')}>
                <StatusHeader>
                  <div>
                    <KeepTooltip content={`Activate the Forms that should be accessible\nvia rest API`} placement='bottom' without-arrow>
                      <div id='form-status-header-icon'>
                        Status <KeepIcon name='circle-question' />
                      </div>
                    </KeepTooltip>
                  </div>
                </StatusHeader>
              </th>
            </tr>
          </thead>
          <tbody>
            {forms.map((form,i) => (
              <tr key={form.formName+i}>
                <th scope="row" {...colWidth('50px')}>
                  <EditIcon onClick={() => openForm(form.formName, form.formModes.length)}>
                    <Button title={form.formName}><KeepIcon name='pencil' className='edit-icon' /></Button>
                  </EditIcon>
                </th>
                <td {...colWidth('550px')}>
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
                </td>
                <td>
                  <ViewNameDisplay>
                    <span>{form.alias}</span>
                  </ViewNameDisplay>
                </td>
                <td>
                  <ViewNameDisplay>
                    <span>{form.formModes.length}</span>
                  </ViewNameDisplay>
                </td>
                <td className='table-cell-activate-menu'>
                  {/* `nsfPath`, `dbName` and `forms` are not passed any more: the old
                      component declared them and never read them. */}
                  <KeepActivateMenu
                    form={form}
                    schemaData={schemaData}
                    setSchemaData={setSchemaData}
                    formList={formList}
                    onActivateForm={(e) => toggleConfigure(e.detail.formName, false)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </KeepDataTable>
      <ActivateDialogContainer ref={ref}>
        <Box className='header-close'>
          <Box className='header'>
            <div className="w-30px h-30px p-0 flex items-center">
              <WarningIcon />
            </div>
            <span className='title'>Activate Form?</span>
          </Box>
          <ButtonBase onClick={handleCloseActivateDialog}><KeepIcon name='xmark' label='Close' className='close-icon' /></ButtonBase>
        </Box>
        <Box className='content'>
          <span className='text-content'>This form is inactive. Activate this form to edit it?</span>
        </Box>
        <Box className='buttons'>
          <KeepButton onClick={handleConfirmActivate}>OK</KeepButton>
          <KeepButton variant="neutral" appearance="outlined" onClick={handleCloseActivateDialog}>Cancel</KeepButton>
        </Box>
      </ActivateDialogContainer>
    </>
  );
};

export default FormsTable;

