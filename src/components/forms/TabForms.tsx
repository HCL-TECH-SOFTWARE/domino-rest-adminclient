/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
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

const ButtonsPanel = styled.div`
  height: 60px;
  margin: auto;

  .activate {
    color: #087251;
    padding: 0 10px 0 0;
    cursor: pointer;
    text-transform: none;
    background-color: transparent;
  }

  .deactivate {
    color: #aa1f51;
    padding: 0 0 0 10px;
    cursor: pointer;
    text-transform: none;
    background-color: transparent;
  }

  .disabled {
    color: #5d6160;
  }

  .vertical {
    transform: translateY(29%);
  }
`;

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


  return (
    <>
      <TopNavigator>
        <FormSearch handleSearchDatabase={handleSearchDatabase} />
      </TopNavigator>
      <ButtonsPanel>
        <Button
          disabled={normalizeForms.length === 0 || loading}
          onClick={handleConfigureAll}
          className={`activate ${normalizeForms.length === 0 || loading ? "disabled" : ""}`}
        >
          Configure All
        </Button>
        <RxDividerVertical size={"1.4em"} className="vertical" />
        <Button
          disabled={normalizeForms.length === 0 || loading}
          onClick={() => setResetAllForms(true)}
          className={`deactivate ${normalizeForms.length === 0 || loading ? "disabled" : ""}`}
        >
          Unconfigure All
        </Button>
      </ButtonsPanel>
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
