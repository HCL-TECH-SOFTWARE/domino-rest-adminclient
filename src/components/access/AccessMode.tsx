/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { v4 as uuid } from 'uuid';
import { useLocation } from '../../router/react';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useSelector } from 'react-redux';
import { AccessModeContainer } from './styles';
import TabsAccess from './TabsAccess';
import { Mode } from '../../store/databases/types';
import {
  cacheFormFields,
  setLoadedFields,
  addActiveFields,
  addForm,
  fetchSchema,
} from '../../store/databases/action';
import { resetAccessFields, setAccessFields } from '../../store/accessMode/action';
import type { AccessModeState } from '../../store/accessMode/types';
import { AppState } from '../../store';
import {
  KeepButton,
  KeepFieldList,
  KeepModeCompare,
  KeepNetworkErrorDialog,
  KeepPageLoading,
} from '../keep-elements/KeepElements';
import type { KeepFieldsAddDetail } from '../keep-elements/keep-field-list';
import { useNavigationGuard } from '../navigation/NavigationGuard';
import { useAppDispatch } from '../../store/hooks';

const AccessMode: React.FC = () => {
  const dispatch = useAppDispatch();

  // Was `useState({ [uuid()]: [] })` behind an `AccessContext.Provider`. #806 decision 1
  // (reports/04 §3) turns that context into a store slice, so the pair keeps its names and
  // its shape and every call site below is unchanged — `setstate` just dispatches now.
  //
  // The selector returns the slice's own object, so it is reference-stable between writes;
  // building one here would re-render on every unrelated store change.
  const state = useSelector((appState: AppState) => appState.accessMode.fields);
  const setstate = (next: AccessModeState['fields']) => {
    dispatch(setAccessFields(next));
  };
  const [modes, setModes] = useState<Array<Mode>>([]);

  // Refs so setPageIndex always reads the latest values, even when
  // called from stale closures (e.g. async save-then-switch-mode).
  const modesRef = useRef(modes);
  modesRef.current = modes;
  const stateRef = useRef(state);
  stateRef.current = state;
  const [modeIndex, setModeIndex] = useState(
    modes.findIndex((mode: any) => mode.modeName === 'default')
  );
  const [currentModeIndex, setCurrentModeIndex] = useState(modeIndex);
  const [schemaData, setSchemaData] = useState({
    '@unid': "",
    apiName: "",
    schemaName: "",
    description: "",
    nsfPath: "",
    icon: "beach",
    iconName: "beach",
    isActive: "true",
    owners: [],
    isModeFetch: false,
    modes: [],
    forms: [],
    configuredForms: [],
    views: [],
    agents: [],
  })

  const urls = useLocation();
  const nsfPath = decodeURIComponent(urls.pathname.split('/')[2]);
  const formName = decodeURIComponent(urls.pathname.split('/')[4]);
  const dbName = urls.pathname.split('/')[3];

  const [fieldIndex, setFieldIndex] = useState(0)

  const { loading } = useSelector((state: AppState) => state.dialog);
  // `loadedFields` used to be selected here only to be forwarded to the field palette,
  // which never destructured it. The palette reads the store for what it actually shows.
  const { newForm } = useSelector((state: AppState) => state.databases);
  const { nsfDesigns } = useSelector((state: AppState) => state.databases);

  /**
   * The modes of the form this screen is editing. #928.
   *
   * Was a `useState` seeded from the fetched schema, with the guard on the wrong variable:
   * it tested whether the *form list* had entries and then read `formModes` off whatever
   * `filter(…)[0]` returned. On a cold load — a pasted URL, a bookmark, F5 — nothing has
   * fetched that list yet, so the match was `undefined` (or matched a form with no
   * `formModes` key) and `allModes` became `undefined`. Eight `allModes.length` reads follow,
   * one of them in the render body, and there is no error boundary above this route, so the
   * first of them blanked the whole app.
   *
   * Derived rather than stored, for two reasons. It is a pure function of data this
   * component already has, so a copy in state can only ever be stale — which is exactly what
   * the re-sync effect below existed to paper over. And a single `?? []` here is a guarantee
   * for all eight readers, where `?? []` at each call site is eight chances to miss one.
   */
  const allModes: Array<Mode> = useMemo(() => {
    const schemaForms = (schemaData.forms ?? []) as Array<any>;
    const candidates = newForm.form ? [...schemaForms, newForm.form] : schemaForms;
    const match = candidates.find((form: any) => form?.formName === formName);
    return Array.isArray(match?.formModes) ? (match.formModes as Array<Mode>) : [];
  }, [schemaData.forms, newForm.form, formName]);

  const currentDesign = nsfDesigns[nsfPath];
  /**
   * The NSF's design forms. Also `?? []`, and for the same reason (#928): `nsfDesigns` is
   * only ever populated by the Forms tab's own effect, and this route is a sibling of that
   * one rather than a child. Reached directly, `currentDesign` is `undefined`, and the two
   * unguarded `fetchFieldsArray.length` reads — one in an effect, one in the render body —
   * threw before `allModes` was ever consulted. Empty means "design not loaded", which the
   * render already treats as "still loading".
   */
  const fetchFieldsArray: Array<any> = currentDesign?.forms ?? [];
  // `tabValue` used to live here. It was handed to the field palette, which called its
  // setter after a form was picked, and nothing in this file — or anywhere else — ever read
  // it. All the setter bought was an extra render of the mode editor beside the palette.
  const [openModeCompare, setOpenModeCompare] = useState(false);

  // Use the shared navigation guard for unsaved-changes protection
  const { setDirty, setSaveFunction } = useNavigationGuard();
  const saveRef = useRef<(() => Promise<void>) | null>(null);

  // Ref that survives TabsAccess unmount/remount during save's loading
  // spinner.  TabsAccess writes 'add' | 'clone' before save; on
  // remount it reads this to open the AddModeDialog.
  const postSaveActionRef = useRef<'add' | 'clone' | null>(null);

  // Keep the navigation guard's save function in sync with TabsAccess's save
  useEffect(() => {
    setSaveFunction(saveRef.current);
    return () => setSaveFunction(null);
  });

  // Wrapper that TabsAccess calls to mark dirty/clean state
  const setHasUnsavedChanges = (dirty: boolean) => {
    setDirty(dirty);
  };

  // A `useState` initialiser ran once per mount; the slice outlives this component, so the
  // reset has to be explicit. Without it the previous form's fields are still in the store
  // when the next one mounts. First of the effects on purpose — the ones below populate the
  // map, and this must not run after them.
  useEffect(() => {
    dispatch(resetAccessFields());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchSchema(nsfPath, dbName, setSchemaData))
  }, [dispatch, nsfPath, dbName])

  // Re-seed the shared field map from the mode the user is on whenever the schema comes back
  // from the server — a save, a mode add, a mode delete. `allModes` is derived now, so this
  // no longer has to recompute the form lookup, and the two reads it used to do unguarded
  // (`filter(…)[0].formModes`, then `currentModes[currentModeIndex].fields`) are covered:
  // an out-of-range mode index is a no-op rather than a crash. #928.
  useEffect(() => {
    if (allModes.length === 0 || newForm.enabled) return;
    const chosenMode = allModes[currentModeIndex];
    const currentKey = Object.keys(state)[0];
    if (!chosenMode || currentKey === undefined) return;
    setstate({
      ...state,
      [currentKey]: chosenMode.fields,
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schemaData, newForm.form, formName])

  useEffect(() => {
    function fetchSchemaFields() {
      setModeIndex(allModes.length - 1);
      // The index of the mode named `default`, or the first mode when there is none. This
      // was `findIndex(…) || 0`, which only looks like a fallback: `findIndex` answers -1
      // when it finds nothing, and -1 is truthy, so `allModes[-1].fields` threw for any form
      // whose default mode had been renamed or deleted. Same crash family as #928.
      const defaultIndex = Math.max(
        allModes.findIndex((mode: any) => mode.modeName === 'default'),
        0
      );
      let modeIdx: number;
      if (allModes.length > modes.length && modes.length === 0) {
        // init state
        modeIdx = defaultIndex;
        setCurrentModeIndex(modeIdx);
      } else if (allModes.length > modes.length) {
        // new mode added
        modeIdx = allModes.length - 1;
        setCurrentModeIndex(modeIdx);
      } else if (allModes.length < modes.length) {
        // mode deleted
        modeIdx = defaultIndex;
        setCurrentModeIndex(modeIdx);
      } else {
        // mode edited
        modeIdx = currentModeIndex;
      }
      // `?? []` rather than a bare read: `currentModeIndex` is this component's own state and
      // can outlive the mode it pointed at, so the "mode edited" branch above can address a
      // mode the server has since removed.
      const modifiedAccessFields = (allModes[modeIdx]?.fields ?? []).map((field: any) => ({
        id: uuid(),
        content: field.name,
        ...field,
      }));
      setModes(allModes);

      const newStates = [modifiedAccessFields];
      let counter = 0;

      const newDroppables = {} as any;
      for (const droppableKey in state) {
        newDroppables[droppableKey] = newStates[counter];
        counter++;
      }

      setstate({
        ...state,
        ...newDroppables,
      })
    }
    if (fetchFieldsArray.length === 0) {
      dispatch(setLoadedFields(formName, []));
      dispatch(addActiveFields(formName, []));
      dispatch(cacheFormFields(dbName, formName, []));
    }
    if (allModes.length > 0) {
      fetchSchemaFields();
    }

    // eslint-disable-next-line
  }, [urls, allModes, dbName, formName]); //NOSONAR

  const remove = (_idx: number, fieldList: any, all?: boolean) => {
    if (all) {
      setstate({ [uuid()]: [] })
    } else {
      const deleteId = fieldList.map((field: any) => {return field.id})
      const deleteContent = fieldList.map((field: any) => {return field.content})
      let stateBuffer = {...state}
      Object.keys(state).forEach((key) => {
        stateBuffer[key] = state[key].filter((field: any) => !deleteId.includes(field.id) && !deleteContent.includes(field.content))
      })
      setstate(stateBuffer)
    }
  };

  const update = (idx: number, droppableIndex: any, item: any) => {
    let items = state[droppableIndex].map((curItem: any, index: number) => {
      if (index !== idx) {
        return curItem;
      } else {
        return item;
      }
    });
    setstate({
      ...state,
      [droppableIndex]: [...items],
    });
  };

  const moveTo = (items: Array<any>, from: string) => {
    let addItems = {};
    let fieldsArray: any[] = [];

    const section = Object.keys(state)[from === 'read' ? 0 : 1];
    const read = Object.keys(state)[0];

    let contentArray: any[] = [];

    if (from === 'both') {
      contentArray = state[read].map((fld: any) => {
        return fld.content;
      });
    } else {
      contentArray = state[section].map((fld: any) => {
        return fld.content;
      });
    }

    items.forEach((item: any) => {
      if (!contentArray.includes(item.content)) {
        fieldsArray.push(item);
      }
    });

    if (from === 'both') {
      addItems = {
        [read]: [...state[read], ...fieldsArray],
      };
    } else {
      addItems = {
        [section]: [...state[section], ...fieldsArray],
      };
    }

    setstate({
      ...addItems,
    });
  };

  const addField = (from: string, item: any) => {
    const section = Object.keys(state)[from === 'read' ? 0 : 1];
    const read = Object.keys(state)[0];

    const find = state[section].find((field: any) => {
      return field.name === item.name;
    });
    if (find) {
      return 'The name already exists.';
    } else {
      // move to designated fields
      if (from === 'both') {
        setstate({
          ...state,
          [read]: [...state[read], item],
        });
      } else {
        setstate({
          ...state,
          [section]: [...state[section], item],
        });
      }
      return '';
    }
  };

  const matches = useMediaQuery('(max-width:768px)');

  const setPageIndex = (index: number) => {
    // Read from refs so this works correctly even when called from
    // a stale closure (e.g. after an async save completes).
    const currentModes = modesRef.current;
    const currentState = stateRef.current;

    const modifiedAccessFields = currentModes[index].fields.map((field: any) => {
      if (!field.id) {
        return {
          id: uuid(),
          content: field.name,
          ...field,
        };
      } else {
        return { ...field };
      }
    });

    const newStates = [modifiedAccessFields];
    let counter = 0;

    const newDroppables = {} as any;

    for (const droppableKey in currentState) {
      newDroppables[droppableKey] = newStates[counter];
      counter++;
    }

    setstate({
      ...currentState,
      ...newDroppables,
    });

    // Use functional update so we never overwrite server-updated modes
    // with stale closure data — just create a new reference to trigger
    // re-renders.
    setModes(prev => [...prev]);
  };

  const handleClickOpenModeCompare = () => {
    setOpenModeCompare(true);
  }

  const handleCloseModeCompare = () => {
    setOpenModeCompare(false);
  }

  useEffect(() => {
    addForm(false)
  })

  return (
    <>
      {fetchFieldsArray.length > 0 ? (
        <div>
          <div className='header-container'>
            <p className='header-text'>
              Schema Management - {formName}
            </p>
            <KeepButton 
              onClick={handleClickOpenModeCompare}
              disabled={modes.length === 1 || newForm === null}
            >
              Open Mode Compare
            </KeepButton>
          </div>
          <AccessModeContainer>
            {/*
              Four of the nine props this used to pass were never destructured by the
              component receiving them (`addField`, `fields`, `modes`, `tabValue`), and the
              fifth — `setTabValue` — wrote a piece of state nothing in this file reads. The
              `formName` ternary was dead too: this branch only renders when the design list
              is non-empty, so the 'All Fields' arm was unreachable.
            */}
            {!matches && (
              <KeepFieldList
                schemaName={dbName}
                nsfPath={nsfPath}
                formName={formName}
                onFieldsAdd={(event: CustomEvent<KeepFieldsAddDetail>) =>
                  moveTo(event.detail.items, 'read')
                }
              />
            )}

            <div className="access-container">
              {!loading && modes.length > 0 ? (
                <TabsAccess
                  currentModeIndex={currentModeIndex}
                  top={0}
                  modes={modes}
                  width={100}
                  state={state}
                  remove={remove}
                  update={update}
                  setPageIndex={setPageIndex}
                  setCurrentModeIndex={setCurrentModeIndex}
                  addField={addField}
                  schemaData={schemaData}
                  setSchemaData={setSchemaData}
                  fieldIndex={fieldIndex}
                  setFieldIndex={setFieldIndex}
                  setHasUnsavedChanges={setHasUnsavedChanges}
                  saveRef={saveRef}
                  postSaveActionRef={postSaveActionRef}
                />
              ) : (
                // `contained` keeps this inside .access-container. Without it the element
                // is absolutely positioned and 100px taller than that box, so it would
                // escape the panel and cover the page.
                <KeepPageLoading contained message="Loading form modes" />
              )}
            </div>
          </AccessModeContainer>
        </div>
      ) : (
        <KeepPageLoading message={`Loading ${formName} Form Access Data`} />
      )}
      <KeepNetworkErrorDialog />
      {/*
        The element takes the mode list rather than the whole schema: it used to dig the
        same list out with `forms[getFormIndex(forms, formName)].formModes`, which is the
        unguarded read this screen has now stopped making in three other places (#928).
      */}
      {!newForm.enabled && allModes.length > 0 && <KeepModeCompare
        open={openModeCompare}
        formName={formName}
        modes={allModes}
        currentModeIndex={currentModeIndex}
        onClose={handleCloseModeCompare}
      />}
    </>
  );
};

export default AccessMode;
