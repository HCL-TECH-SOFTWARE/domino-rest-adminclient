/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
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
import { getDatabaseIndex } from "../../store/databases/scripts";
import styled from "styled-components";
import { CommonDialog, TopNavigator } from "../../styles/CommonStyles";
import { RxDividerVertical } from "react-icons/rx";
import FormSearch from "./FormSearch";
import {
  handleDatabaseForms,
  pullForms,
} from "../../store/databases/action";
import FormsTable from "./FormsTable";
import FormDialogHeader from "../dialogs/FormDialogHeader";
import { Autocomplete, createFilterOptions } from "@material-ui/lab";
import zIndex from "@material-ui/core/styles/zIndex";

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
}

const TabForms: React.FC<TabFormProps> = ({ setData }) => {
  const { forms } = useSelector((state: AppState) => state.databases);
  const { databases } = useSelector((state: AppState) => state.databases);
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
  

  const normalizeForms =
    forms && forms.length > 0
      ? forms.map((form) =>
          "formModes" in form
            ? form
            : { ...form, formModes: form.formAccessModes }
        )
      : [];

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
    const currentSchema =
      databases[getDatabaseIndex(databases, dbName, nsfPath)];
    dispatch(handleDatabaseForms(currentSchema, dbName, forms) as any);
    dispatch(pullForms(nsfPath, dbName, setData) as any);
  }

  async function handleUnConfigureAll() {
    const currentSchema =
      databases[getDatabaseIndex(databases, dbName, nsfPath)];

    dispatch(handleDatabaseForms(currentSchema, dbName, []) as any);
    dispatch(pullForms(nsfPath, dbName, setData) as any);
    setResetAllForms(false);
  }

  const handleCreateFormClose = () => {
    setCreateFormOpen(false)
  };

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
        <Autocomplete
          value={value}
          onChange={(event, newValue) => { setValue(newValue) }}
          options={normalizeForms.map((form) => form.formName)}
          filterOptions={(options, params) => {
            // const filtered = [];
            const filtered = filter(options, params)
            const { inputValue } = params;
            // Suggest the creation of a new value
            const isExisting = options.some((option) => inputValue === option);
            console.log(options)
            if (inputValue !== '' && !isExisting) {
              filtered.push(inputValue)

            }
    
            return filtered;
          }}
          selectOnFocus
          clearOnBlur
          handleHomeEndKeys
          id="free-solo-with-text-demo"
          disablePortal
          fullWidth
          renderOption={(option) => {
            console.log(option)
            if (normalizeForms.map((form) => form.formName).includes(option)) {
              return option
            } else {
              return `Create "${option}"`
            }
            // if (!(normalizeForms.map((form) => form.formName).includes(option))) {
            //   return `Create "${option}"`
            // }
          }}
          style={{ margin: 0, padding: 0, width: '100%' }}
          freeSolo
          renderInput={(params) => (
            <TextField
              {...params}
              value={value}
              onChange={(e) => { setValue(e.target.value) }}
              variant="outlined"
              error={normalizeForms.map((form) => form.formName).includes(value || "")}
              helperText={`The form name "${value}" already exists.`}
            />
          )}
        />
        {console.log(value)}
        <Box>
          <Button>Cancel</Button>
          <Button>Create</Button>
        </Box>
      </CreateFormDialogContainer>
      <FormsTable forms={
            searchKey === ""
              ? normalizeForms.filter(
                  (form) =>
                    form.dbName === dbName
                )
              : filtered.filter(
                  (form) =>
                    form.dbName === dbName
                )
          } dbName={dbName} nsfPath={nsfPath}
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
