/* ========================================================================== *
 * Copyright (C) 2019, 2022 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Button from '@mui/material/Button';
import styled from 'styled-components';
import Typography from '@mui/material/Typography';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { Menu, MenuItem, Tooltip } from '@mui/material';
import { useFormik } from 'formik';
import FieldDNDContainer from './FieldDndContainer';
import AddModeDialog from './AddModeDialog';
import UnsavedChangesDialog from '../dialogs/UnsavedChangesDialog';
import { toggleApplicationDrawer } from '../../store/drawer/action';
import {
  testFormula,
  updateFormMode,
  deleteFormMode,
  updateSchema,
} from '../../store/databases/action';
import { AppState } from '../../store';
import FormDrawer from '../applications/FormDrawer';
import DeleteApplicationDialog from '../applications/DeleteApplicationDialog';
import { toggleDeleteDialog } from '../../store/dialog/action';
import { toggleAlert } from '../../store/alerts/action';
import {
  findScopeBySchema,
} from '../../store/databases/scripts';
import { isEmptyOrSpaces, verifyModeName } from '../../utils/form';
import { BiCopy } from 'react-icons/bi';
import { FiSave } from "react-icons/fi";
import { getTheme } from '../../store/styles/action';
import { Database } from '../../store/databases/types';

const TabAccessContainer = styled.div<{ width: number; top: number }>`
  width: ${(props) => props.width}%;
  min-height: fit-content;
  position: absolute;
  top: ${(props) => props.top}%;
  border: 1px solid light-dark(#D1D1D1, #3a3a4a);
  border-radius: 10px;
  height: 100%;
  padding: 30px;
  background-color: light-dark(#F9FBFF, #1e1e2e);
`;

const TabNavigator = styled.div`
  flex: 1;
  height: auto;
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
  align-items: center;
  background-color: light-dark(#f9fbff, #1e1e2e);
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
    font-size: 16px;
    margin-right: 5px;
    padding: 0;
  }
  .MuiButton-text {
    white-space: nowrap;
  }
  .button-disabled {
    &:hover {
      background-color: none;
    }
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
  schemaData: Database;
  setSchemaData: (schemaData: any) => void;
  fieldIndex: number;
  setFieldIndex: (fieldIndex: number) => void;
  setHasUnsavedChanges: (dirty: boolean) => void;
  saveRef: React.MutableRefObject<(() => Promise<void>) | null>;
  postSaveActionRef: React.MutableRefObject<'add' | 'clone' | null>;
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
  schemaData,
  setSchemaData,
  fieldIndex,
  setFieldIndex,
  setHasUnsavedChanges,
  saveRef,
  postSaveActionRef
}) => {
  const dispatch = useDispatch();
  const { themeMode } = useSelector((state: AppState) => state.styles);

  const { scopes, newForm } = useSelector(
    (state: AppState) => state.databases
  );

  const [scripts, setScripts] = useState({
    computeWithForm: modes[currentModeIndex].computeWithForm,
    readAccessFormula: modes[currentModeIndex].readAccessFormula,
    writeAccessFormula: modes[currentModeIndex].writeAccessFormula,
    deleteAccessFormula: modes[currentModeIndex].deleteAccessFormula,
    onLoad: modes[currentModeIndex].onLoad,
    onSave: modes[currentModeIndex].onSave,
    sign: modes[currentModeIndex].sign,
    continueOnError: !!modes[currentModeIndex].continueOnError ? modes[currentModeIndex].continueOnError : true,
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
  const [saveEnabled, setSaveEnabled] = useState(false)
  const [saveTooltip, setSaveTooltip] = useState("")

  // Track dirty state locally so action handlers can read it synchronously
  const isDirtyRef = useRef(false);
  const origSetHasUnsavedChanges = setHasUnsavedChanges;
  // Wrap setHasUnsavedChanges to keep isDirtyRef in sync
  const wrappedSetHasUnsavedChanges = useCallback((dirty: boolean) => {
    isDirtyRef.current = dirty;
    origSetHasUnsavedChanges(dirty);
  }, [origSetHasUnsavedChanges]);
  // Replace the prop reference so all existing call sites use the wrapper
  setHasUnsavedChanges = wrappedSetHasUnsavedChanges;

  // Pending action pattern: when user tries to switch mode / clone / add
  // while dirty, we stash the action and show a dialog.
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [pendingModeName, setPendingModeName] = useState<string | null>(null);

  // Ref mirror of pendingAction — immune to closure staleness across async
  // boundaries (e.g. after await saveRef.current()).  Handlers read from
  // the ref instead of the closure.
  const pendingActionRef = useRef<(() => void) | null>(null);
  const pendingModeNameRef = useRef<string | null>(null);
  // Track whether the pending action is 'add', 'clone', or a mode switch (null)
  const pendingActionTypeRef = useRef<'add' | 'clone' | null>(null);

  // Always-current ref for modes so the async save handler can read fresh data
  const modesRef = useRef(modes);
  modesRef.current = modes;

  // Snapshot of the mode's values at load time — used for value-based dirty comparison
  const initialSnapshotRef = useRef<{
    scripts: any;
    required: any;
    validationRules: any;
    fields: any[];
  } | null>(null);

  // ---- Dirty-tracking guard (declared early so handlers can reference it) ----
  // `isUserEditRef` stays false while the component is mounting or switching
  // modes (lots of cascading setState calls).  It flips to true after a
  // delay so only genuine user edits mark the form dirty.
  const isUserEditRef = useRef(false);
  const dirtyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Centralised helper — cancels any previous re-enable timer so only the
  // LAST pause wins.  This prevents earlier timers from prematurely
  // re-enabling dirty-tracking while a later cascade is still settling.
  const pauseDirtyTracking = useCallback((ms = 500) => {
    isUserEditRef.current = false;
    if (dirtyTimerRef.current) clearTimeout(dirtyTimerRef.current);
    dirtyTimerRef.current = setTimeout(() => {
      isUserEditRef.current = true;
      dirtyTimerRef.current = null;
    }, ms);
  }, []);

  const guardAction = useCallback((action: () => void, targetModeName?: string, actionType?: 'add' | 'clone') => {
    if (isDirtyRef.current) {
      pendingActionRef.current = action;
      pendingModeNameRef.current = targetModeName ?? null;
      pendingActionTypeRef.current = actionType ?? null;
      setPendingAction(() => action);
      setPendingModeName(targetModeName ?? null);
    } else {
      action();
    }
  }, []);

  const handlePendingActionSave = useCallback(async () => {
    // Read from refs — immune to closure staleness across the await.
    const targetMode = pendingModeNameRef.current;
    const actionType = pendingActionTypeRef.current;

    // Clear refs + state (closes the dirty dialog immediately)
    pendingActionRef.current = null;
    pendingModeNameRef.current = null;
    pendingActionTypeRef.current = null;
    setPendingAction(null);
    setPendingModeName(null);

    // For add/clone, store the action TYPE in the parent ref that
    // survives the unmount/remount cycle caused by the loading spinner
    // during save.  The on-mount useEffect will read it.
    if (!targetMode && actionType) {
      postSaveActionRef.current = actionType;
    }

    // Save current changes (try-catch so dialog still opens on error)
    try {
      if (saveRef.current) {
        await saveRef.current();
      }
    } catch (e) {
      console.error('Save failed:', e);
    }
    setHasUnsavedChanges(false);
    pauseDirtyTracking();

    if (targetMode) {
      // Defer the mode switch so React can process all pending renders
      // from the server response (schemaData → allModes → modes cascade).
      setTimeout(() => {
        const freshModes = modesRef.current;
        const newIdx = freshModes.findIndex((m: any) => m.modeName === targetMode);
        if (newIdx >= 0) {
          setCurrentModeValue(targetMode);
          setCurrentModeIndex(newIdx);
          setPageIndex(newIdx);
          setFieldIndex(0);
        }
      }, 300);
    }
    // Add/clone actions are handled by the on-mount useEffect reading
    // postSaveActionRef after TabsAccess remounts.
  }, [saveRef, setHasUnsavedChanges, setCurrentModeIndex, setPageIndex, setFieldIndex, pauseDirtyTracking, postSaveActionRef]);

  const handlePendingActionDiscard = useCallback(() => {
    // Read from refs — immune to closure staleness
    const stashedAction = pendingActionRef.current;
    const isModeSwitchAction = !!pendingModeNameRef.current;

    // Reset form data back to the last-saved server values
    const mode = modes[currentModeIndex];
    setScripts({
      computeWithForm: mode.computeWithForm,
      readAccessFormula: mode.readAccessFormula,
      writeAccessFormula: mode.writeAccessFormula,
      deleteAccessFormula: mode.deleteAccessFormula,
      onLoad: mode.onLoad,
      onSave: mode.onSave,
      sign: mode.sign,
      continueOnError: mode.continueOnError,
    });
    setRequired(mode.required);
    setValidationRules(mode.validationRules);
    // Also reset the field/DnD state in AccessMode so the full form
    // reverts to server values (not just scripts/required/validationRules).
    setPageIndex(currentModeIndex);

    // Pause dirty-tracking so the resets + action don't re-mark dirty
    pauseDirtyTracking();
    setHasUnsavedChanges(false);

    // Clear refs + state (closes the dirty dialog)
    pendingActionRef.current = null;
    pendingModeNameRef.current = null;
    pendingActionTypeRef.current = null;
    setPendingAction(null);
    setPendingModeName(null);

    if (stashedAction) {
      if (isModeSwitchAction) {
        // Mode switch — run directly (no dialog conflict)
        stashedAction();
      } else {
        // Non-mode-switch (add / clone) — delay so the
        // UnsavedChangesDialog exit transition finishes before the
        // native <dialog> (AddModeDialog) opens.
        setTimeout(() => stashedAction(), 300);
      }
    }
  }, [setHasUnsavedChanges, modes, currentModeIndex, pauseDirtyTracking, setPageIndex]);

  const handlePendingActionCancel = useCallback(() => {
    pendingActionRef.current = null;
    pendingModeNameRef.current = null;
    pendingActionTypeRef.current = null;
    setPendingAction(null);
    setPendingModeName(null);
  }, []);

  const handleFieldListOnClick = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    setAnchorEl(event.currentTarget);
  };
  const handleFieldListOnClose = () => {
    setAnchorEl(null);
  };
  const handleFieldListOnSelect = (value: string) => {
    // If the user selected the mode they're already on, it's a no-op.
    if (value === currentModeValue) {
      handleFieldListOnClose();
      return;
    }
    const doSwitch = () => {
      setCurrentModeValue(value);
      const newCardIndex = modes.findIndex(
        (eachMode: any) => eachMode.modeName === value
      );
      setCurrentModeIndex(newCardIndex);
      setPageIndex(newCardIndex);
      setFieldIndex(0);
      // Don't set scripts here — the [modes, currentModeIndex] effects
      // will sync scripts, required, and validationRules from the current
      // modes prop, which avoids stale-closure issues when doSwitch runs
      // after an async save.
    };
    handleFieldListOnClose();
    guardAction(doSwitch, value);
  };

  useEffect(() => {
    const modeScripts = {
      computeWithForm: modes[currentModeIndex].computeWithForm,
      readAccessFormula: modes[currentModeIndex].readAccessFormula,
      writeAccessFormula: modes[currentModeIndex].writeAccessFormula,
      deleteAccessFormula: modes[currentModeIndex].deleteAccessFormula,
      onLoad: modes[currentModeIndex].onLoad,
      onSave: modes[currentModeIndex].onSave,
      sign: modes[currentModeIndex].sign,
      continueOnError: modes[currentModeIndex].continueOnError,
    };
    setScripts(modeScripts);

    // Snapshot the mode's initial values for value-based dirty comparison.
    // Fields come from `state` which syncs separately, so we extract them here too.
    const keys = Object.keys(state);
    const currentFields = keys.length > 0
      ? state[keys[0]].map((field: any) => {
          const { content, id, ...rest } = field;
          return rest;
        })
      : [];
    initialSnapshotRef.current = {
      scripts: modeScripts,
      required: modes[currentModeIndex].required,
      validationRules: modes[currentModeIndex].validationRules,
      fields: currentFields,
    };
  }, [modes, currentModeIndex])

  const urls = useLocation();
  const navigate = useNavigate()

  const paths = urls.pathname.split('/');
  const nsfPath = decodeURIComponent(paths[2]);
  const db = paths[3];
  const form = decodeURIComponent(paths[4]);

  const currentSchema = schemaData;

  const [modeText, setModeText] = useState('');
  const [formError, setFormError] = useState('');
  const [newModeOpen, setNewModeOpen] = useState(false);
  const [required, setRequired] = useState(modes[currentModeIndex].required)
  const [validationRules, setValidationRules] = useState(modes[currentModeIndex].validationRules)

  /**
   * save is called when the Save button is clicked.  It gathers up the
   * form data and saves it off.
   */
  const save = async () => {
    // Gather form data from the page
    const formData = gatherFormData();

    if (newForm.enabled && !saveEnabled) {
      return
    }

    const newRequired = required

    // Check if creating new form schema or editing a form
    // Then save it off and post an alert
    if (!!newForm.form) {
      // add form to the schema by creating a new schema with the additional form
      const newSchema = {
        ...schemaData,
        forms: [
          ...schemaData.forms,
          {
            formName: newForm.form.formName,
            formValue: newForm.form.formName,
            alias: [newForm.form.formName],
            formModes: [{
              modeName: "default",
              fields: formData.fields.map((field: {
                fieldAccess: string,
                format: string,
                isMultiValue: boolean,
                name: string,
                type: string,
                items?: Array<any>,
              }) => {
                return {
                  externalName: field.name,
                  fieldAccess: field.fieldAccess,
                  fieldGroup: "",
                  format: field.format,
                  itemFlags: ["SUMMARY"],
                  name: field.name,
                  protectedField: false,
                  summaryField: true,
                  type: field.type,
                }
              }),
              computeWithForm: false,
              readAccessFormula: {formulaType: "domino", formula: "@True"},
              writeAccessFormula: {formulaType: "domino", formula: "@True"},
              deleteAccessFormula: {formulaType: "domino", formula: "@False"},
              onLoad: {formulaType: "domino", formula: ""},
              onSave: {formulaType: "domino", formula: ""},
              sign: false,
              required: required,
              validationRules: validationRules,
            }],
          }
        ]
      }
      dispatch(updateSchema(newSchema, setSchemaData) as any)
      setHasUnsavedChanges(false);
      navigate(`/schema/${encodeURIComponent(nsfPath)}/${db}`);
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
      await dispatch(updateFormMode(currentSchema, form, [], formData, -1, cloneMode, setSchemaData) as any);
      // After Saved the tab all data will be fetch from latest state again to ensure accuracy
      setCurrentModeValue(formModes[oriCardIndex].modeName);
      setHasUnsavedChanges(false);
      // Pause dirty-tracking so the server re-fetch cascade doesn't re-dirty
      pauseDirtyTracking();
    }

    setRequired(newRequired)
  };

  // Register the save function so the unsaved changes dialog can call it
  useEffect(() => {
    saveRef.current = save;
  });

  // On mount: check if a post-save action (add/clone) was stashed in the
  // parent ref before TabsAccess was unmounted by the loading spinner.
  // If so, open the appropriate dialog now that we've remounted.
  useEffect(() => {
    const action = postSaveActionRef.current;
    if (action) {
      postSaveActionRef.current = null;
      // Small delay to let the initial render settle
      const timer = setTimeout(() => {
        if (action === 'clone') {
          setCloneMode(true);
        }
        setNewModeOpen(true);
        setFormError('');
        setModeText('');
      }, 300);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run only on mount

  useEffect(() => {
    setCurrentModeValue(modes[currentModeIndex].modeName)
  }, [currentModeIndex])

  useEffect(() => {
    setRequired(modes[currentModeIndex].required)
    setValidationRules(modes[currentModeIndex].validationRules)
  }, [modes, currentModeIndex])

  // On mount and whenever the mode changes, pause dirty-tracking while the
  // effects that sync scripts / required / validationRules / state settle.
  useEffect(() => {
    pauseDirtyTracking();
    return () => {
      if (dirtyTimerRef.current) clearTimeout(dirtyTimerRef.current);
    };
  }, [currentModeIndex, pauseDirtyTracking]);

  // Helper: check if the current fields differ from the snapshot
  const isFieldsDirty = useCallback(() => {
    const snap = initialSnapshotRef.current;
    if (!snap) return false;
    const keys = Object.keys(state);
    const currentFields = keys.length > 0
      ? state[keys[0]].map((field: any) => {
          const { content, id, ...rest } = field;
          return rest;
        })
      : [];
    return JSON.stringify(currentFields) !== JSON.stringify(snap.fields);
  }, [state]);

  // Track user-driven changes to scripts, required, and validation rules.
  // Compare against the initial snapshot so reverting to original values clears dirty.
  useEffect(() => {
    if (!isUserEditRef.current) return;
    const snap = initialSnapshotRef.current;
    if (!snap) return;
    const scriptsChanged = JSON.stringify(scripts) !== JSON.stringify(snap.scripts);
    const requiredChanged = JSON.stringify(required) !== JSON.stringify(snap.required);
    const rulesChanged = JSON.stringify(validationRules) !== JSON.stringify(snap.validationRules);
    setHasUnsavedChanges(scriptsChanged || requiredChanged || rulesChanged || isFieldsDirty());
  }, [scripts, required, validationRules])

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
      required: required,
      validationRules: validationRules,
    };
    return formData;
  };

  useEffect(() => {
    const keys = Object.keys(state);
    const readAccessFields = state[keys[0]].map((field: any) => {
      let { content, id, ...newField } = field;
      return newField;
    });

    if (readAccessFields.length > 0) {
      setSaveEnabled(true)
      setSaveTooltip("")
    } else {
      setSaveEnabled(false)
      // setSaveTooltip("At least 1 field is required to save this new form.")
    }

    // Mark as dirty when fields change (skip initial load & mode switches).
    // Compare against initial snapshot so reverting to original values clears dirty.
    if (isUserEditRef.current) {
      const snap = initialSnapshotRef.current;
      if (snap) {
        const fieldsChanged = JSON.stringify(readAccessFields) !== JSON.stringify(snap.fields);
        const scriptsChanged = JSON.stringify(scripts) !== JSON.stringify(snap.scripts);
        const requiredChanged = JSON.stringify(required) !== JSON.stringify(snap.required);
        const rulesChanged = JSON.stringify(validationRules) !== JSON.stringify(snap.validationRules);
        setHasUnsavedChanges(fieldsChanged || scriptsChanged || requiredChanged || rulesChanged);
      }
    }
  }, [state])

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
    const value =
      event.target.name === 'computeWithForm'
        ? event.target.checked
        : event.target.value;

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
  };

  /**
   * deleteMode is called when user has confirmed that they want to
   * delete the mode.
   */
  const deleteMode = () => {
    dispatch(
      deleteFormMode(
        schemaData,
        form,
        modes[currentModeIndex].modeName,
        setSchemaData,
      ) as any
    );
    setCurrentModeIndex(0)
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
          updateFormMode(currentSchema, form, [], formModeData, -1, cloneMode, setSchemaData) as any
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
    guardAction(() => {
      setNewModeOpen(true);
      setFormError('');
      setModeText('');
    }, undefined, 'add');
  };

  const handleClickCloneMode = () => {
    guardAction(() => {
      setCloneMode(true);
      setNewModeOpen(true);
    }, undefined, 'clone');
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
            slotProps={{
              list: {
                'aria-labelledby': 'basic-button',
              }
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
            <button
              onClick={handleClickCloneMode}
              style={{ cursor: newForm.enabled ? "default" : "pointer", background: 'none', border: 'none', margin: 5, padding: 0, display: 'flex', alignItems: 'center', color: newForm.enabled ? '#A7A8A9' : getTheme(themeMode).textColorPrimary }}
              disabled={newForm.enabled}
            >
              <BiCopy className='action-icon' />
              <Typography variant='body2' style={{ color: newForm.enabled ? '#A7A8A9' : getTheme(themeMode).textColorPrimary}}>
                Clone Mode
              </Typography>
            </button>
            <button
              onClick={handleNewModeOpen}
              style={{ cursor: newForm.enabled ? "default" : "pointer", background: 'none', border: 'none', margin: 5, padding: 0, display: 'flex', alignItems: 'center', color: newForm.enabled ? '#A7A8A9' : getTheme(themeMode).textColorPrimary }}
              disabled={newForm.enabled}
            >
              <AddIcon className='action-icon' />
              <Typography variant='body2' style={{ color: newForm.enabled ? '#A7A8A9' : getTheme(themeMode).textColorPrimary}}>
                Add Mode
              </Typography>
            </button>
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
                <button
                  onClick={onDeleteClick}
                  style={{ cursor: "pointer", background: 'none', border: 'none', margin: 5, padding: 0, display: 'flex', alignItems: 'center' }}
                >
                  <DeleteIcon color='primary' className='action-icon' />
                  <Typography color='textPrimary' variant='body2' component='p'>
                    Delete Mode
                  </Typography>
                </button>
                <DeleteApplicationDialog
                  dialogTitle={deleteModeTitle}
                  deleteMessage={deleteModeMessage}
                  handleDelete={deleteMode}
                />
              </>
            )}
            <Tooltip title={saveTooltip} arrow>
              <button
                onClick={save}
                style={{
                  cursor: !newForm.enabled ? "pointer" : saveEnabled ? "pointer" : "default",
                  background: 'none',
                  border: 'none',
                  margin: 5,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                }}
                className='button-disabled'
              >
                <FiSave
                  className='action-icon'
                  color={!newForm.enabled ?
                    getTheme(themeMode).textColorPrimary
                    :
                    saveEnabled ? getTheme(themeMode).textColorPrimary : "#A7A8A9"}
                  size='0.9em'
                />
                <Typography variant='body2' style={{ color: !newForm.enabled ? getTheme(themeMode).textColorPrimary : saveEnabled ? getTheme(themeMode).textColorPrimary : "#A7A8A9" }}>
                  Save
                </Typography>
              </button>
            </Tooltip>
          </PagerAction>
        </TabsContainer>
        <LoadTabContainer>
          <FieldDNDContainer
            remove={remove}
            update={update}
            state={state}
            addField={addField}
            data={scripts}
            setScripts={setScripts}
            test={test}
            required={required}
            setRequired={setRequired}
            validationRules={validationRules}
            setValidationRules={setValidationRules}
            fieldIndex={fieldIndex}
            setFieldIndex={setFieldIndex}
          />
        </LoadTabContainer>
      </TabNavigator>
      <FormDrawer formName='TestForm' formik={formik} />
      <UnsavedChangesDialog
        open={pendingAction !== null}
        onSave={handlePendingActionSave}
        onDiscard={handlePendingActionDiscard}
        onCancel={handlePendingActionCancel}
      />
    </TabAccessContainer>
  );
};

export default TabsAccess;
