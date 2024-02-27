/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import Button from '@material-ui/core/Button';
import styled from 'styled-components';
import Typography from '@material-ui/core/Typography';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import DeleteIcon from '@material-ui/icons/Delete';
import AddIcon from '@material-ui/icons/Add';
import ArrowDropDownIcon from '@material-ui/icons/ArrowDropDown';
import { Menu, MenuItem } from '@material-ui/core';
import { useFormik } from 'formik';
import FieldDNDContainer from './FieldDndContainer';
import AddModeDialog from './AddModeDialog';
import { toggleApplicationDrawer } from '../../store/drawer/action';
import {
  testFormula,
  updateFormMode,
  deleteFormMode,
  saveNewForm,
  addForm,
} from '../../store/databases/action';
import { AppState } from '../../store';
import FormDrawer from '../applications/FormDrawer';
import DeleteApplicationDialog from '../applications/DeleteApplicationDialog';
import { toggleDeleteDialog } from '../../store/dialog/action';
import { toggleAlert } from '../../store/alerts/action';
import {
  getDatabaseIndex,
  findScopeBySchema,
} from '../../store/databases/scripts';
import { isEmptyOrSpaces, verifyModeName } from '../../utils/form';
import { BiCopy } from 'react-icons/bi';
import { FiSave } from "react-icons/fi";
import { convertField2DesignType } from './functions';

const TabAccessContainer = styled.div<{ width: number; top: number }>`
  width: ${(props) => props.width}%;
  position: absolute;
  top: ${(props) => props.top}%;
  border: 1px solid #D1D1D1;
  border-radius: 10px;
  height: 100%;
  padding: 30px;
  background-color: #F9FBFF;
`;

const TabNavigator = styled.div`
  flex: 1;
  height: 100%;
  .MuiButtonBase-root {
    text-transform: inherit;
    font-size: 16px;
    color: #5e5966;
  }
  .Mui-disabled.MuiButtonBase-root {
    color: rgba(0, 0, 0, 0.26);
  }
`;

const LoadTabContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 92%;
`;

const TabsContainer = styled.div`
  display: flex;
  cursor: pointer;
  align-items: center;
  background-color: #f9fbff;
  padding-bottom: 21px;

  .change-mode-btn .MuiButton-label {
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    justify-content: left !important;
  }

  .change-mode-svg-btn {
    width: 24px;
    height: 24px;
    min-width: 24px !important;
    padding: 0;
  }
`;

const PagerAction = styled.div`
  flex: 1 0 0%;
  display: flex;
  padding: 0 20px;
  justify-content: flex-end;

  .action-icon {
    font-size: 18px;
    margin-right: 5px;
  }
  .MuiButton-text {
    white-space: nowrap;
  }
`;

interface TabsAccessProps {
  state: any;
  width: number;
  modes: any;
  top: number;
  currentModeIndex: number;
  setPageIndex: any;
  setCurrentModeIndex: any;
  remove: any;
  update: any;
  addField:(from: string, item: any) => string;
}

/**
 * The TabsAccess displays the formulas section of the page.
 *
 * @author Michael Angelo Silva
 * @author Neil Schultz
 *
 */
const TabsAccess: React.FC<TabsAccessProps> = ({
  state,
  width,
  modes,
  top,
  currentModeIndex,
  setPageIndex,
  setCurrentModeIndex,
  remove,
  update,
  addField,
}) => {
  const dispatch = useDispatch();

  const { databases, scopes, newForm } = useSelector(
    (state: AppState) => state.databases
  );

  const [scripts, setScripts] = useState({
    computeWithForm: modes[currentModeIndex].computeWithForm,
    readAccessFormula: modes[currentModeIndex].readAccessFormula,
    writeAccessFormula: modes[currentModeIndex].writeAccessFormula,
    deleteAccessFormula: modes[currentModeIndex].deleteAccessFormula,
    onLoad: modes[currentModeIndex].onLoad,
    onSave: modes[currentModeIndex].onSave,
  });
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentModeValue, setCurrentModeValue] = useState(
    modes[currentModeIndex].modeName
  );
  const open = Boolean(anchorEl);
  const sortedModes =
    modes && modes.length > 0
      ? modes
          .slice()
          .sort((a: any, b: any) => (a.modeName > b.modeName ? 1 : -1))
      : modes;
  const [cloneMode, setCloneMode] = useState(false);

  const handleFieldListOnClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    setAnchorEl(event.currentTarget);
  };
  const handleFieldListOnClose = () => {
    setAnchorEl(null);
  };
  const handleFieldListOnSelect = (value: string) => {
    setCurrentModeValue(value);
    const newCardIndex = modes.findIndex(
      (eachMode: any) => eachMode.modeName === value
    );
    setCurrentModeIndex(newCardIndex);
    setPageIndex(newCardIndex);
    setScripts({
      computeWithForm: modes[newCardIndex].computeWithForm,
      readAccessFormula: modes[newCardIndex].readAccessFormula,
      writeAccessFormula: modes[newCardIndex].writeAccessFormula,
      deleteAccessFormula: modes[newCardIndex].deleteAccessFormula,
      onLoad: modes[newCardIndex].onLoad,
      onSave: modes[newCardIndex].onSave,
    });
    handleFieldListOnClose();
  };

  const urls = useLocation();
  const history = useHistory()

  const paths = urls.pathname.split('/');
  const nsfPath = decodeURIComponent(paths[2]);
  const db = paths[3];
  const form = decodeURIComponent(paths[4]);

  const currentSchema = databases[getDatabaseIndex(databases, db, nsfPath)];

  const [modeText, setModeText] = useState('');
  const [formError, setFormError] = useState('');
  const [newModeOpen, setNewModeOpen] = useState(false);

  /**
   * save is called when the Save button is clicked.  It gathers up the
   * form data and saves it off.
   */
  const save = () => {
    // Gather form data from the page
    const formData = gatherFormData();
    console.log(formData)

    // Save it off and post an alert
    if (newForm) {
      saveNewForm(
        {
          formName: newForm.formName,
          fields: formData.fields.map((field: {
            fieldAccess: string,
            format: string,
            isMultiValue: boolean,
            name: string,
            type: string,
            items?: Array<any>,
          }) => {
            return {
              allowMultiValues: field.isMultiValue,
              name: field.name,
              type: convertField2DesignType(field.format),
            }
          }),
        },
        nsfPath,
      )
      history.push(`/schema/${encodeURIComponent(nsfPath)}/${db}/`)
    } else {
      const currentForms = currentSchema.forms
        .filter((form: any) => form.formModes.length > 0)
        .map((form: any) => {
          return {
            formName: form.formName,
            alias: form.alias,
            formModes: form.formModes,
          };
        });
      const currentTargetForm = currentForms.filter(
        (targetForm: any) => form === targetForm.formName
      );
      const { formModes } = currentTargetForm[0];
      const oriCardIndex = formModes.findIndex(
        (mode: any) => currentModeValue === mode.modeName
      );
      setCurrentModeIndex(oriCardIndex);
      dispatch(updateFormMode(currentSchema, form, [], formData, -1, cloneMode) as any);
      // After Saved the tab all data will be fetch from latest state again to ensure accuracy
      setPageIndex(oriCardIndex);
      setCurrentModeValue(formModes[oriCardIndex].modeName);
    }
    // const currentForms = currentSchema.forms
    //   .filter((form: any) => form.formModes.length > 0)
    //   .map((form: any) => {
    //     return {
    //       formName: form.formName,
    //       alias: form.alias,
    //       formModes: form.formModes,
    //     };
    //   });
    // const currentTargetForm = currentForms.filter(
    //   (targetForm: any) => form === targetForm.formName
    // );
    // const { formModes } = currentTargetForm[0];
    // const oriCardIndex = formModes.findIndex(
    //   (mode: any) => currentModeValue === mode.modeName
    // );
    // setCurrentModeIndex(oriCardIndex);
    // dispatch(updateFormMode(currentSchema, form, [], formData, -1, cloneMode) as any);
    // // After Saved the tab all data will be fetch from latest state again to ensure accuracy
    // setPageIndex(oriCardIndex);
    // setCurrentModeValue(formModes[oriCardIndex].modeName);
  };

  /**
   * gatherFormData harvests form data from the Formulas page
   */
  const gatherFormData = () => {
    const keys = Object.keys(state);
    const readAccessFields = state[keys[0]].map((field: any) => {
      let { content, id, ...newField } = field;
      return newField;
    });
    const formData = {
      modeName: modes[currentModeIndex].modeName,
      ...scripts,
      fields: readAccessFields,
      strictInput: true,
    };
    return formData;
  };

  /**
   * formik provide form support for the Test Formulas Form
   */
  const formik = useFormik({
    // Initial form values
    initialValues: {
      readFormula: false,
      readFormulaText: '',
      writeFormula: false,
      writeFormulaText: '',
      deleteFormula: false,
      deleteFormulaText: '',
      loadFormula: false,
      loadFormulaText: '',
      saveFormula: false,
      saveFormulaText: '',
      userId: '',
      documentId: '',
    },

    /**
     * Run the Formula tests
     *
     * @param values Form values needed to run Formula tests
     */
    onSubmit: (values) => {
      let formulaList: Array<string> = [
        'SAVE_READ_RESULT',
        'SAVE_WRITE_RESULT',
        'SAVE_DELETE_RESULT',
        'SAVE_LOAD_RESULT',
        'SAVE_SAVE_RESULT',
      ];
      let formulaOn = false;
      let formula = null;
      const scopeIndex = findScopeBySchema(scopes, db, nsfPath);
      if (scopeIndex < 0) {
        dispatch(
          toggleAlert(
            `Only schemas configured with scopes support this feature. Please configure this schema with a scope first.`
          )
        );
        return;
      }
      const scope = scopes[scopeIndex];

      // Loop through formula types
      for (let index in formulaList) {
        switch (formulaList[index]) {
          case 'SAVE_READ_RESULT': {
            formulaOn = values.readFormula;
            formula = values.readFormulaText;
            break;
          }
          case 'SAVE_WRITE_RESULT': {
            formulaOn = values.writeFormula;
            formula = values.writeFormulaText;
            break;
          }
          case 'SAVE_DELETE_RESULT': {
            formulaOn = values.deleteFormula;
            formula = values.deleteFormulaText;
            break;
          }
          case 'SAVE_LOAD_RESULT': {
            formulaOn = values.loadFormula;
            formula = values.loadFormulaText;
            break;
          }
          case 'SAVE_SAVE_RESULT': {
            formulaOn = values.saveFormula;
            formula = values.saveFormulaText;
            break;
          }
        }

        // If Formula check box was checked, run the formula
        if (formulaOn) {
          // Assemble the fields we will need
          const testValues = {
            formula: formula,
            query: '',
            type: 'domino',
            save: false,
            unid: values.documentId,
            user: values.userId,
          };

          // Run the Formula Test
          dispatch(
            testFormula(scope.apiName, testValues, formulaList[index]) as any
          );
        }
      }
    },
  });

  /**
   * test is called when the Test Formulas button is clicked.  It gathers the list
   * of formulas from the page and then opens up the Test Formulas page.
   */
  const test = () => {
    const scopeIndex = findScopeBySchema(scopes, db, nsfPath);
    if (scopeIndex < 0) {
      dispatch(
        toggleAlert(
          `Only schemas configured with scopes support this feature. Please configure this schema with a scope first.`
        )
      );
      return;
    }
    // Gather Formulas from the page
    const formData = gatherFormData();

    // Save Formulas for later use
    formik.values.readFormulaText = formData.readAccessFormula
      ? formData.readAccessFormula.formula
      : '';
    formik.values.writeFormulaText = formData.writeAccessFormula
      ? formData.writeAccessFormula.formula
      : '';
    formik.values.deleteFormulaText = formData.deleteAccessFormula
      ? formData.deleteAccessFormula.formula
      : '';
    formik.values.loadFormulaText = formData.onLoad
      ? formData.onLoad.formula
      : '';
    formik.values.saveFormulaText = formData.onSave
      ? formData.onSave.formula
      : '';

    // Open the Test Formula Form drawer
    dispatch(toggleApplicationDrawer());
  };

  const handleChange = (event: React.ChangeEvent<any>) => {
    console.log(event.target)
    console.log(event.target.value)
    const value =
      event.target.name === 'computeWithForm'
        ? event.target.checked
        : event.target.value;
    console.log(value)
    console.log(event.target.name)

    // map the value in object
    const formulaObj = {
      formulaType: 'domino',
      formula: value,
    };

    setScripts({
      ...scripts,
      [event.target.name]:
        event.target.name === 'computeWithForm' ? value : formulaObj,
    });
    console.log({
      ...scripts,
      [event.target.name]:
        event.target.name === 'computeWithForm' ? value : formulaObj,
    })
  };

  /**
   * deleteMode is called when user has confirmed that they want to
   * delete the mode.
   */
  const deleteMode = () => {
    dispatch(
      deleteFormMode(
        databases[getDatabaseIndex(databases, db, nsfPath)],
        form,
        modes[currentModeIndex].modeName
      ) as any
    );
  };

  /**
   * onDeleteClick is called when the Delete mode icon button is clicked.
   *
   */
  const onDeleteClick = () => {
    // Open the delete confirmation dialog
    dispatch(toggleDeleteDialog());
  };

  const handleSaveNewMode = async () => {
    if (isEmptyOrSpaces(modeText)) {
      setFormError('Mode Name is Required.');
    } else if (verifyModeName(modeText.trim())) {
      setFormError(
        'This field can only contains digits, letters, underscores and spaces, but no space at the beginning or end'
      );
    } else {
      const isExist =
        modes.findIndex((mode: any) => mode.modeName === modeText.trim()) >= 0;
      if (!isExist) {
        const formModeData = cloneMode ? {
          ...modes[currentModeIndex],
          modeName: modeText.trim(),
        } : {
          modeName: modeText.trim(),
          fields: [],
          readAccessFormula: {
            formulaType: 'domino',
            formula: '@True',
          },
          writeAccessFormula: {
            formulaType: 'domino',
            formula: '@True',
          },
          deleteAccessFormula: {
            formulaType: 'domino',
            formula: '@False',
          },
          computeWithForm: false,
        };

        await dispatch(
          updateFormMode(currentSchema, form, [], formModeData, -1, cloneMode) as any
        );
        setCurrentModeValue(modeText);
        setNewModeOpen(false);
        setCloneMode(false);
      } else {
        setFormError('Mode Already Exist.');
      }
    }
  };

  const handleTextChange = (e: any) => {
    setModeText(e.target.value);
    setFormError('');
  };

  const handleNewModeClose = () => {
    setNewModeOpen(false);
    setCloneMode(false);
  };

  const handleNewModeOpen = () => {
    setNewModeOpen(true);
    setFormError('');
    setModeText('');
  };

  const handleClickCloneMode = () => {
    setCloneMode(true);
    setNewModeOpen(true);
    // addModeDialog.showModal();
  }

  const deleteModeTitle: string = 'Delete Mode';
  const deleteModeMessage: string =
    'Are you sure you want to delete this Mode?';

  return (
    <TabAccessContainer top={top} width={width}>
      <TabNavigator>
        <TabsContainer>
          <Typography variant='body2' color='textPrimary' style={{ fontSize: '16px', fontWeight: 400 }}>
            Mode:{' '}
          </Typography>
          <Button
            className='change-mode-btn'
            aria-controls={open ? 'basic-menu' : undefined}
            aria-haspopup='true'
            aria-expanded={open ? 'true' : undefined}
            onClick={handleFieldListOnClick}
            style={{ textTransform: 'none' }}
          >
            {currentModeValue}
          </Button>
          <Button
            className='change-mode-svg-btn'
            onClick={handleFieldListOnClick}
            style={{ textTransform: 'none' }}
          >
            <ArrowDropDownIcon />
          </Button>
          <Menu
            style={{ maxWidth: '70%' }}
            anchorEl={anchorEl}
            open={open}
            onClose={handleFieldListOnClose}
            MenuListProps={{
              'aria-labelledby': 'basic-button',
            }}
          >
            {sortedModes.map((eachMode: any, idx: any) => (
              <MenuItem
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                key={idx}
                onClick={() => handleFieldListOnSelect(eachMode.modeName)}
              >
                {eachMode.modeName}
              </MenuItem>
            ))}
          </Menu>
          <PagerAction>
            <Button onClick={handleClickCloneMode}>
              <BiCopy className='action-icon' />
              <Typography variant='body2' color='textPrimary'>
                Clone Mode
              </Typography>
            </Button>
            <Button onClick={handleNewModeOpen}>
              <AddIcon className='action-icon' color='primary' />
              <Typography variant='body2' color='textPrimary'>
                Add Mode
              </Typography>
            </Button>
            <AddModeDialog
              handleSave={handleSaveNewMode}
              open={newModeOpen}
              handleTextChange={handleTextChange}
              formError={formError}
              handleClose={handleNewModeClose}
              clone={cloneMode}
              modeName={modes[currentModeIndex].modeName}
            />
            {modes[currentModeIndex].modeName !== 'default' && (
              <>
                <Button onClick={onDeleteClick}>
                  <DeleteIcon color='primary' className='action-icon' />
                  <Typography color='textPrimary' variant='body2' component='p'>
                    Delete Mode
                  </Typography>
                </Button>
                <DeleteApplicationDialog
                  dialogTitle={deleteModeTitle}
                  deleteMessage={deleteModeMessage}
                  handleDelete={deleteMode}
                />
              </>
            )}
            <Button onClick={save}>
              <FiSave className='action-icon' color='primary' size='0.9em' />
              <Typography variant='body2' color='textPrimary'>
                Save
              </Typography>
            </Button>
          </PagerAction>
        </TabsContainer>
        <LoadTabContainer>
          <FieldDNDContainer remove={remove} update={update} state={state} addField={addField} data={scripts} setScripts={setScripts} test={test} />
        </LoadTabContainer>
      </TabNavigator>
      <FormDrawer formName='TestForm' formik={formik} />
    </TabAccessContainer>
  );
};

export default TabsAccess;
