/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useParams } from "react-router-dom";
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@material-ui/core";
import { AppState } from "../../store";
import { validateFormSchemaName } from "../../store/databases/scripts";
import styled from "styled-components";
import { ButtonNeutral, ButtonYes, CommonDialog, TopNavigator } from "../../styles/CommonStyles";
import { RxDividerVertical } from "react-icons/rx";
import FormSearch from "./FormSearch";
import {
  addForm,
  handleDatabaseForms,
  pullForms,
} from "../../store/databases/action";
import FormsTable from "./FormsTable";
import FormDialogHeader from "../dialogs/FormDialogHeader";
import { createFilterOptions } from "@material-ui/lab";
import { toggleAlert } from "../../store/alerts/action";
import { Database } from "../../store/databases/types";

const ButtonsPanel = styled.div`
  margin: auto;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  .button {
    padding: 10px;
    text-transform: none;
  }

  .add-form {
    font-size: 16px;
    font-weight: bold;
    background-color: #DAE2EC;

    &:hover {
      background-color: #C2CCD8;
    }
  }

  .activate {
    color: #087251;
    padding: 0 10px 0 0;
    cursor: pointer;
    background-color: transparent;
  }

  .deactivate {
    color: #aa1f51;
    padding: 0 0 0 10px;
    cursor: pointer;
    background-color: transparent;
  }

  .disabled {
    color: #5d6160;
  }

  .vertical {
    transform: translateY(29%);
  }
`;

const CreateFormDialogContainer = styled.dialog`
  border: 1px solid white;
  border-radius: 10px;
  width: 30%;
  padding: 30px;
  height: fit-content;

  .content-container {
    padding: 0 0 55px 0;
    margin: 0;
  }

  .content-text {
    font-size: 16px;
    padding: 0;
    margin: 0;
  }

  .dialog-buttons {
    padding: 0 30px 30px 30px
  }
`

/**
 * Database views Component
 *
 * @author Alec Vincent Bardiano
 */

interface TabFormProps {
  setData: React.Dispatch<React.SetStateAction<string[]>>;
  schemaData: Database;
  setSchemaData: (schemaData: any) => void;
}

const TabForms: React.FC<TabFormProps> = ({ setData, schemaData, setSchemaData }) => {
  const { forms } = useSelector((state: AppState) => state.databases);
  const { loading } = useSelector((state: AppState) => state.dialog);
  const dispatch = useDispatch();
  const [searchKey, setSearchKey] = useState("");
  const [filtered, setFiltered] = useState(
    forms && forms.length > 0 ? [...forms] : []
  );
  const ref = useRef<HTMLDialogElement>(null)
  const [createFormOpen, setCreateFormOpen] = useState(false)
  const [value, setValue] = React.useState<string | null>(null)
  const filter = createFilterOptions<string>()
  const history = useHistory()
  const [formNameError, setFormNameError] = useState(false)
  const [formNameErrorMessage, setFormNameErrorMessage] = useState("")
  
  const [normalizeForms, setNormalizeForms] = useState(
    forms && forms.length > 0
      ? forms.map((form) =>
          "formModes" in form
            ? form
            : { ...form, formModes: form.formAccessModes }
        )
      : []
  )

  useEffect(() => {
    setNormalizeForms(
      forms && forms.length > 0
      ? forms.map((form) =>
          "formModes" in form
            ? form
            : { ...form, formModes: form.formAccessModes }
        )
      : []
    )
  }, [forms])

  let { dbName, nsfPath } = useParams() as { dbName: string; nsfPath: string };
  const [resetAllForms, setResetAllForms] = useState(false);
  // Searching the forms based on entered searchKey values
  const handleSearchDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const key = e.target.value;
    setSearchKey(key);
    const filteredDatabases = forms.filter((form) => {
      return form.formName.toLowerCase().indexOf(key.toLowerCase()) !== -1;
    });
    setFiltered(filteredDatabases);
  };
  function handleConfigureAll() {
    dispatch(handleDatabaseForms(schemaData, dbName, forms) as any);
    dispatch(pullForms(nsfPath, dbName, setData) as any);
  }

  async function handleUnConfigureAll() {
    dispatch(handleDatabaseForms(schemaData, dbName, []) as any);
    dispatch(pullForms(nsfPath, dbName, setData) as any);
    setResetAllForms(false);
  }

  const handleCreateFormClose = () => {
    setCreateFormOpen(false)
  };

  const handleFormNameInput = (e: any) => {
    const newFormName = e.target.value
    setValue(newFormName)
    const validation = validateFormSchemaName(newFormName, normalizeForms.map((form) => form.formName))
    setFormNameError(validation.error)
    setFormNameErrorMessage(validation.errorMessage)
  }

  const handleClickCreateForm = async () => {
    if (value !== null && value.length > 0) {
      const newForm = {
        alias: [value],
        dbName: dbName,
        formModes: [{
          computeWithForm: false,
          deleteAccessFormula: {
            formula: "@False",
            formulaType: "domino",
          },
          fields: [],
          modeName: "default",
          onLoad: {
            formula: "",
            formulaType: "domino",
          },
          onSave: {
            formula: "",
            formulaType: "domino",
          },
          readAccessFields: [],
          readAccessFormula: {
            formula: "@True",
            formulaType: "domino",
          },
          required: [],
          validationRules: [],
          writeAccessFields: [],
          writeAccessFormula: {
            formula: "@False",
            formulaType: "True",
          },
        }],
        formAccessModes: [{
          computeWithForm: false,
          deleteAccessFormula: {
            formula: "@False",
            formulaType: "domino",
          },
          fields: [],
          modeName: "default",
          onLoad: {
            formula: "",
            formulaType: "domino",
          },
          onSave: {
            formula: "",
            formulaType: "domino",
          },
          readAccessFields: [],
          readAccessFormula: {
            formula: "@True",
            formulaType: "domino",
          },
          required: [],
          validationRules: [],
          writeAccessFields: [],
          writeAccessFormula: {
            formula: "@False",
            formulaType: "True",
          },
        }],
        formName: value,
        formValue: value,
      }
      await dispatch(addForm(true, newForm) as any)
      history.push(`/schema/${encodeURIComponent(nsfPath)}/${dbName}/${encodeURIComponent(value)}/access`)
    } else {
      dispatch(toggleAlert(`Please enter a valid form schema name!`))
    }
  }

  useEffect(() => {
    if (createFormOpen) {
      ref.current?.showModal();
    } else {
      if (ref.current?.close) {
        ref.current?.close();
      }
    }
  }, [createFormOpen])

  return (
    <>
      <TopNavigator>
        <FormSearch handleSearchDatabase={handleSearchDatabase} />
      </TopNavigator>
      <ButtonsPanel>
        <Box>
          <Button
            disabled={normalizeForms.length === 0 || loading}
            onClick={handleConfigureAll}
            className={`button activate ${normalizeForms.length === 0 || loading ? "disabled" : ""}`}
          >
            Configure All
          </Button>
          <RxDividerVertical size={"1.4em"} className="vertical" />
          <Button
            disabled={normalizeForms.length === 0 || loading}
            onClick={() => setResetAllForms(true)}
            className={`button deactivate ${normalizeForms.length === 0 || loading ? "disabled" : ""}`}
          >
            Unconfigure All
          </Button>
        </Box>
        <Button
          onClick={() => setCreateFormOpen(true)}
          className="button add-form"
        >
          Add New Form Schema
        </Button>
      </ButtonsPanel>
      <CreateFormDialogContainer ref={ref} onClose={handleCreateFormClose}>
        <FormDialogHeader title="Add New Form Schema" onClose={handleCreateFormClose} />
        <Box style={{ width: '100%', height: '10vh' }}>
          <TextField
            value={value}
            onChange={handleFormNameInput}
            variant="outlined"
            error={formNameError}
            helperText={formNameErrorMessage}
            style={{ width: '100%' }}
          />
        </Box>
        <ButtonsPanel style={{ justifyContent: 'flex-end', gap: '10px', padding: '10px 0 0 0', margin: 0 }}>
          <ButtonNeutral
            onClick={() => {
              setCreateFormOpen(false)
              setValue("")
              dispatch(addForm(false) as any)
            }}
          >
            Cancel
          </ButtonNeutral>
          <ButtonYes
            onClick={handleClickCreateForm}
            disabled={formNameError}
          >
            Create
          </ButtonYes>
        </ButtonsPanel>
      </CreateFormDialogContainer>
      <FormsTable
        forms={
          searchKey === ""
            ? normalizeForms.filter(
                (form) =>
                  form.dbName === dbName
              )
            : filtered.filter(
                (form) =>
                  form.dbName === dbName
              )
        }
        dbName={dbName}
        nsfPath={nsfPath}
        schemaData={schemaData}
        setSchemaData={setSchemaData}
      >
        
      </FormsTable>
      <CommonDialog
        open={resetAllForms}
        onClose={() => {
          setResetAllForms(false);
        }}
        aria-labelledby="reset-form-dialog"
        aria-describedby="reset-form-description"
      >
        
        <DialogTitle id="reset-form-dialog-title">
          <Box className="title">
            {"WARNING: Unconfigure ALL forms?"}
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="reset-form-contents" color="textPrimary">
            This action deletes all form modes and removes all configurations done to <span style={{ color: 'red' }}>ALL</span> of the forms. Do you wish to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions style={{ display: 'flex', marginBottom: '20px', padding: '0 30px 20px 0' }}>

          <Button
            className="btn right save"
            
            onClick={handleUnConfigureAll}
          >
            Yes
          </Button>
          <Button 
            className="btn cancel" 
            onClick={() => {
              setResetAllForms(false);
            }}
            style={{ right: 'calc(93px + 5px + 30px)' }}
          >
            No
          </Button>
        </DialogActions>
      </CommonDialog>
    </>
  );
};
export default TabForms;
