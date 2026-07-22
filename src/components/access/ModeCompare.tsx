/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef, useState } from 'react';
import FormDialogHeader from '../dialogs/FormDialogHeader';
import { BlueSwitch, DeleteIcon, SearchInput } from '../../styles/CommonStyles';
import { styled } from '@linaria/react';
import { useLocation } from 'react-router-dom';
import SearchIcon from '@mui/icons-material/Search';
import { getFieldIndex, getFormIndex, getFormModeIndex } from '../../store/databases/scripts';
import { Database, Field } from '../../store/databases/types';
import { Box, MenuItem, Select } from '@mui/material';
import { Mode } from 'fs';
import { LitButton, LitTooltip } from '../lit-elements/LitElements';
import { IMG_DIR } from '../../config.dev';

const ModeCardsContainer = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 75vh;
  gap: 0 10px;
  overflow-y: scroll;

  @media (max-height: 500px) {
    height: 50vh;
  }

  @media (min-height: 501px) and (max-height: 600px) {
    height: 60vh;
  }

  @media (min-height: 601px) and (max-height: 900px) {
    height: 65vh;
  }

  @media (min-height: 901px) and (max-height: 1200px) {
    height: 75vh;
  }

  @media (min-height: 1201px) {
    height: 80vh;
  }

  .row {
    display: flex;
    flex-direction: row;
    gap: 10px;
  }

  .card-top {
    border-radius: 10px 10px 0 0;
    margin-left: 4px;
    height: fit-content;
    box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.2);
    min-width: 332px;

    width: calc(50% - 10px - 4px);
    padding: 0 0 0 0;
  }

  .summary-container {
    padding: 0 40px 24px 40px;
  }

  .mode-details {
    font-style: italic;
    padding-top: 15px;
    padding-bottom: 21px;
    gap: 9px;
  }

  .fields-summary {
    padding-top: 17px;
    display: flex;
  }

  .total-fields {
    color: #646464;
    font-size: 14px;
  }

  .fields-number {
    font-size: 20px;
    padding-left: 5px;
  }

  .summary-content {
    display: flex;
    flex-direction: row;
    margin-left: auto;
    align-items: center;
  }

  .field-detail {
    padding: 20px 40px;
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    min-width: 332px;

    margin-left: 4px;
    box-shadow: 0 0 8px 0 rgba(0, 0, 0, 0.2);
    width: calc(50% - 10px - 4px);
  }

  .field-row {
    display: flex;
    flex-direction: row;
    gap: 10px;
  }

  .hidden {
    display: none;
  }

  .field-name {
    color: light-dark(#000, #e0e0e0);
    font-size: 16px;
    font-style: normal;
    font-weight: 700;
    line-height: normal;
    padding-left: 15px;
  }

  .diff {
    background: #ffdeea;
  }

  .keys-container {
    display: flex;
    flex-container: row;
  }

  .key-text {
    color: #323a3d;
    font-size: 14px;
    display: flex;
    flex-direction: row;
    padding-top: 12px;
    flex-wrap: wrap;
    gap: 4px 0;
  }

  .circle-divider {
    height: 5px;
    width: 5px;
    margin: 0 5px;
    color: #323a3d;
  }

  .key-diff {
    font-weight: bold;
  }
`;

interface ModeCompareProps {
  open: boolean;
  handleClose: () => void;
  currentModeIndex: number;
  schemaData: Database;
}

const ModeCompare: React.FC<ModeCompareProps> = ({ open, handleClose, currentModeIndex, schemaData }) => {
  const urls = useLocation();
  const formName = decodeURIComponent(urls.pathname.split('/')[4]);
  const formulas = ['computeWithForm', 'onLoad', 'onSave', 'readAccessFormula', 'writeAccessFormula']

  const { forms } = schemaData;
  const allModes = forms[getFormIndex(forms, formName)].formModes;
  const allModeNames = allModes.map((mode: any) => {
    return mode.modeName;
  });
  const [selectedModeNames, setSelectedModeNames] = useState(Array<any>); // ensure all selected mode names are unique
  const [diffFields, setdiffFields] = useState({});
  const [diffFormulas, setDiffFormulas] = useState(Array<String>)
  const [allFieldNames, setAllFieldNames] = useState(Array<string | unknown>);
  const [showDiffOnly, setShowDiffOnly] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [filteredFields, setFilteredFields] = useState(allFieldNames);
  const [showRemove, setShowRemove] = useState(false);

  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      if (currentModeIndex >= 0 && !!allModes[currentModeIndex]) {
        setSelectedModeNames([
          allModes[currentModeIndex].modeName,
          currentModeIndex === 0 ? allModes[1].modeName : allModes[0].modeName
        ]);
      } else {
        setSelectedModeNames([]);
      }
    }
  }, [allModes, currentModeIndex, open]);

  useEffect(() => {
    if (selectedModeNames.length <= 2) {
      setShowRemove(false);
    } else {
      setShowRemove(true);
    }
  }, [selectedModeNames]);

  useEffect(() => {
    if (searchInput.length > 0) {
      setFilteredFields(
        allFieldNames.filter((fieldName: any) => {
          return fieldName.toLowerCase().indexOf(searchInput.toLowerCase()) !== -1;
        })
      );
    } else {
      setFilteredFields(allFieldNames);
    }
  }, [allFieldNames, searchInput]);

  useEffect(() => {
    // Get all unique field names across all modes to compare
    function getFieldNames(selectedModes: Array<string>) {
      let fieldNames = new Set();

      allModes.forEach((mode: any) => {
        if (selectedModes.includes(mode.modeName) && mode.fields.length > 0) {
          mode.fields.forEach((field: Field) => {
            fieldNames.add(field.name);
          });
        }
      });

      return Array.from(fieldNames);
    }

    // Deep compare two objects
    function deepEqual(obj1: any, obj2: any): boolean {
      if (obj1 === obj2) {
        return true
      }
    
      if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
        return false
      }
    
      const keys1 = Object.keys(obj1)
      const keys2 = Object.keys(obj2)
    
      if (keys1.length !== keys2.length) {
        return false
      }
    
      for (const key of keys1) {
        if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
          return false
        }
      }
    
      return true
    }

    // Check if field is equal across all modes
    function isFieldEqual(fieldName: string) {
      let fieldEqual = true;

      let baseModeContents = allModes[getFormModeIndex(allModes, selectedModeNames[0])];
      let baseField = baseModeContents.fields[getFieldIndex(baseModeContents.fields, fieldName)];

      for (let i = 1; i < selectedModeNames.length; i++) {
        if (selectedModeNames[i] === '') {
          return false;
        }

        let modeContents = allModes[getFormModeIndex(allModes, selectedModeNames[i])];
        let fieldtoCompare = modeContents.fields[getFieldIndex(modeContents.fields, fieldName)];
        if (baseField && fieldtoCompare) {
          return deepEqual(JSON.parse(JSON.stringify(baseField)), JSON.parse(JSON.stringify(fieldtoCompare)))
        } else {
          return false;
        }
      }

      return fieldEqual;
    }

    // Check if field is equal across all modes
    function isFormulaEqual(formula: string) {
      let formulaEqual = true;

      let baseModeContents = allModes[getFormModeIndex(allModes, selectedModeNames[0])];
      let baseFormula = baseModeContents[formula as keyof Mode];

      for (let i = 1; i < selectedModeNames.length; i++) {
        if (selectedModeNames[i] === '') {
          return false;
        }

        let modeContents = allModes[getFormModeIndex(allModes, selectedModeNames[i])];
        let formulatoCompare = modeContents[formula as keyof Mode];
        return deepEqual(JSON.parse(JSON.stringify(baseFormula)), JSON.parse(JSON.stringify(formulatoCompare)))
      }

      return formulaEqual
    }

    function getFieldKeys(selectedModes: Array<string>, fieldName: string) {
      let fieldKeys: any[];
      fieldKeys = [];

      allModes.forEach((mode: any) => {
        if (selectedModes.includes(mode.modeName) && mode.fields.length > 0) {
          mode.fields.forEach((field: Field) => {
            // Get the field keys
            let currentFieldKeys = Object.keys(field);
            fieldKeys = fieldKeys.concat(currentFieldKeys);
          });
        }
      });

      return Array.from(new Set(fieldKeys));
    }

    // Check if field type/key is equal across all modes
    function isKeyEqual(fieldName: string, fieldKey: string) {
      let keyEqual = true;

      let baseModeContents = allModes[getFormModeIndex(allModes, selectedModeNames[0])];

      if (getFieldIndex(baseModeContents.fields, fieldName) < 0) {
        return false;
      }
      let baseField = baseModeContents.fields[getFieldIndex(baseModeContents.fields, fieldName)];

      if (!Object.keys(baseField).includes(fieldKey)) {
        return false;
      }

      for (let i = 1; i < selectedModeNames.length; i++) {
        if (selectedModeNames[i] === '') {
          return false;
        }

        let modeContents = allModes[getFormModeIndex(allModes, selectedModeNames[i])];
        if (getFieldIndex(modeContents.fields, fieldName) < 0) {
          return false;
        }
        let field = modeContents.fields[getFieldIndex(modeContents.fields, fieldName)];
        if (
          Object.keys(baseField).includes(fieldKey) &&
          field[fieldKey as keyof typeof field] === baseField[fieldKey as keyof typeof field]
        ) {
          keyEqual = true;
        } else {
          return false;
        }
      }

      return keyEqual;
    }

    if (selectedModeNames.length >= 2) {
      let fieldNames = getFieldNames(selectedModeNames); // contains all field names across all modes
      setAllFieldNames(fieldNames);
      let diffFieldsBuffer = {}; // will contain an object containing all the differences in all modes and fields

      fieldNames.forEach((fieldName: any) => {
        if (!isFieldEqual(fieldName)) {
          let diffKeys: Array<string | null>;
          diffKeys = [];

          let fieldKeys = getFieldKeys(selectedModeNames, fieldName);

          fieldKeys.forEach((fieldKey: string) => {
            if (!(fieldKey === 'name') && !(fieldKey === 'externalName') && !isKeyEqual(fieldName, fieldKey)) {
              diffKeys.push(fieldKey);
            }
          });

          // Add the listed differences in diffFieldsBuffer
          Object.defineProperty(diffFieldsBuffer, fieldName, {
            value: diffKeys,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }

        setdiffFields(diffFieldsBuffer);
      });

      let diffFormulasBuffer: String[] = []
      formulas.forEach((formula: string) => {
        if (!isFormulaEqual(formula)) {
          diffFormulasBuffer.push(formula)
        }

        setDiffFormulas(diffFormulasBuffer);
      })
    }
  }, [selectedModeNames, allModes]);

  const handleModeChange = (event: any, currentModeName: string, index: number) => {
    let newMode = event.target.value;
    let selectedModesBuffer = selectedModeNames.map((mode: string, idx: number) => {
      if (idx === index) {
        return newMode;
      } else {
        return mode;
      }
    });
    setSelectedModeNames(selectedModesBuffer);
  };

  const handleShowDiff = () => {
    setShowDiffOnly(!showDiffOnly);
  };

  const handleSearchField = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value.length > 0) {
      setSearchInput(e.target.value);
    } else {
      setSearchInput('');
    }
  };

  const handleAddColumn = () => {
    let selectedModesBuffer = [...selectedModeNames, ''];
    setSelectedModeNames(selectedModesBuffer);
  };

  const handleRemoveMode = (idx: number) => {
    let selectedModesBuffer = [...selectedModeNames];
    selectedModesBuffer.splice(idx, 1);
    setSelectedModeNames(selectedModesBuffer);
  };

  function getValue(field: Field, key: string) {
    switch (key) {
      case 'name':
      case 'externalName':
        return null;
      default:
        if (typeof field[key as keyof typeof field] === 'object') {
          return JSON.stringify(field[key as keyof typeof field]);
        } else {
          return String(field[key as keyof typeof field]);
        }
    }
  }

  function getProperKey(key: string) {
    return key
      .replace(/([A-Z])/g, ' $1') // Insert space before each uppercase letter
      .replace(/^./, str => str.toUpperCase()) // Capitalize the first letter
      .trim(); // Remove any leading/trailing spaces
  }

  useEffect(() => {
    if (open) {
      ref.current?.showModal()
    } else {
      if (ref.current?.close) {
        ref.current?.close()
      }
    }
  }, [open])

  return (
    // <dialog className='mode-compare-dialog-container' open={open} onClose={handleClose}>
    <dialog ref={ref} className='dialog full-width'>
      {/* <Box className='mode-compare-container'> */}
        <FormDialogHeader title={`Mode Compare - ${formName} Form`} onClose={handleClose} />
        <div className="dialog-content">
          <div className='flex flex-col full-width justify-between items-center'>
            <div className="flex flex-row pb-10">
              <div className="flex items-center p-0 full-width mode-compare-search-bar">
                <SearchIcon color="primary" className="mode-compare-search-icon" />
                <SearchInput
                  onChange={handleSearchField}
                  type="text"
                  placeholder={`Search Field`}
                  className="transparent color-text-primary search-input"
                />
              </div>
              <div className="add-container">
                <LitButton onClick={handleAddColumn} src={`${IMG_DIR}/shoelace/plus.svg`}>
                  Add New Column
                </LitButton>
              </div>
            </div>
            <div className="toggle-container">
              Show only fields and formulas with differences
              <BlueSwitch size="small" checked={showDiffOnly} onChange={handleShowDiff} />
            </div>
          </div>
          {/* <div>test</div> */}
          <ModeCardsContainer>
            <Box className="row">
              {selectedModeNames.map((modeName: string, idx: number) => {
                if (modeName === '') {
                  return (
                    <Box draggable className="card-top" key={`${modeName}-${idx}`}>
                      <Box className='mode-compare-card-container'>
                        <div className='mode-compare-delete-container'>
                          <div className='mode-compare-delete-adjacent' />
                        </div>
                        {showRemove && (
                          <div className='empty-mode-card-container'>
                            <LitTooltip
                              content="Delete empty mode card"
                            >
                              <DeleteIcon
                                className="delete-icon"
                                onClick={() => {
                                  handleRemoveMode(idx);
                                }}></DeleteIcon>
                            </LitTooltip>
                          </div>
                        )}
                        {!showRemove && (
                          <div className='empty-mode-card-container' />
                        )}
                      </Box>
                      <Box className="summary-container">
                        <Select
                          value={modeName}
                          onChange={(event) => {
                            handleModeChange(event, modeName, idx);
                          }}
                          label="Select Mode"
                          variant="outlined"
                          className="mode-menu m-0 mt-10 mb-10 z-2"
                          MenuProps={{ disablePortal: true }}>
                          {allModeNames.map((modeName: string) => {
                            if (modeName === '') {
                              return <></>;
                            } else {
                              return (
                                <MenuItem key={modeName} value={modeName} className="relative z-2">
                                  {' '}
                                  {modeName}{' '}
                                </MenuItem>
                              );
                            }
                          })}
                        </Select>
                        <Box className="mode-details mode-compare-normal-font">{`Select a mode to compare.`}</Box>
                        <div className='mode-compare-divider' />
                        <Box className="fields-summary">
                          <Box className="summary-content">
                            <span className="total-fields">Total Fields:</span>
                            <span className="fields-number">N/A</span>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  );
                } else {
                  return (
                    <Box className="card-top">
                      <Box className='mode-compare-card-container'>
                        <div className='mode-compare-delete-container'>
                          <div className='mode-compare-delete-adjacent' />
                        </div>
                        {showRemove && (
                          <div className='empty-mode-card-container'>
                            <LitTooltip
                              content="Remove mode from comparison"
                            >
                              <DeleteIcon
                                className="delete-icon"
                                onClick={() => {
                                  handleRemoveMode(idx);
                                }}></DeleteIcon>
                            </LitTooltip>
                          </div>
                        )}
                        {!showRemove && (
                          <div className='empty-mode-card-container' />
                        )}
                      </Box>
                      <Box className="summary-container">
                        <Select
                          value={modeName}
                          onChange={(event) => {
                            handleModeChange(event, modeName, idx);
                          }}
                          label="Select Mode"
                          variant="outlined"
                          className="mode-menu m-0 mt-10 mb-10 z-2"
                          MenuProps={{ disablePortal: true }}>
                          {allModeNames.map((modeName: string) => {
                            return (
                              <MenuItem key={modeName} value={modeName} className="relative z-2">
                                {' '}
                                {modeName}{' '}
                              </MenuItem>
                            );
                          })}
                        </Select>
                        <Box className="mode-details">{`${
                          allModes[getFormModeIndex(allModes, modeName)].fields.length
                        } form field/s`}</Box>
                        <div className='mode-compare-divider' />
                        <Box className="fields-summary">
                          <Box className="summary-content">
                            <span className="total-fields">Total Fields:</span>
                            <span className="fields-number">{allModes[getFormModeIndex(allModes, modeName)].fields.length}</span>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                  );
                }
              })}
            </Box>
            <Box className={`field-row ${showDiffOnly && !(diffFormulas.length > 0) ? 'hidden' : ''}`}>
              {selectedModeNames.map((modeName: string, idx: number) => {
                if (modeName === '') {
                  return <Box className={`field-detail`} key={`${modeName}-${idx}`} />
                } else {
                  return (
                    <Box className={`field-detail ${diffFormulas.length > 0 ? 'diff' : ''}`} key={`${modeName}-${idx}`}>
                      <Box className="field-name">Formulas</Box>
                      {formulas.map((formula: string, formulaIdx: number) => {
                        return (
                          <Box className='mode-compare-formulas-container' key={`${formula}-${formulaIdx}`}>
                            <Box className='mode-compare-formulas-content'>
                              <Box className='diff-formulas-container'>
                                {diffFormulas.includes(
                                  formula
                                ) && (
                                  <svg
                                    width="9"
                                    height="8"
                                    viewBox="0 0 9 8"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    className='compare-diff-values-indicator'
                                  >
                                    <circle cx="4.07712" cy="4" r="4" fill="currentColor" />
                                  </svg>
                                )}
                              </Box>
                              <Box className='formula-name-container'>
                                <span className='mode-compare-formula-name small-text line-height-normal'>
                                  {`${getProperKey(formula)}:`}
                                </span>
                              </Box>
                              <Box className='formula-name-value-container'>
                                <span
                                  className={`key-text ${
                                    diffFormulas.includes(formula)
                                      ? 'key-diff'
                                      : ''
                                  } line-height-normal`}
                                >
                                  {`${JSON.stringify(allModes[getFormModeIndex(allModes, modeName)][formula as keyof Mode])}`}
                                </span>
                              </Box>
                            </Box>
                          </Box>
                        )
                      })}
                    </Box>
                  )
                }
              })}
            </Box>
            {filteredFields.map((fieldName: any, fieldIdx: number) => {
              return (
                <Box key={`${fieldName}-${fieldIdx}`} className={`field-row ${showDiffOnly && !Object.keys(diffFields).includes(fieldName) ? 'hidden' : ''}`}>
                  {selectedModeNames.map((modeName: string, modeIdx: number) => {
                    if (modeName === '') {
                      return <Box className={`field-detail`} key={`${modeName}-${modeIdx}`} />;
                    } else {
                      return (
                        <Box className={`field-detail ${Object.keys(diffFields).includes(fieldName) ? 'diff' : ''}`}>
                          {allModes[getFormModeIndex(allModes, modeName)].fields[
                            getFieldIndex(allModes[getFormModeIndex(allModes, modeName)].fields, fieldName)
                          ] ? (
                            <Box className='flex flex-col'>
                              <Box className="field-name">{fieldName}</Box>
                              <Box className="key-text">
                                {Object.keys(
                                  allModes[getFormModeIndex(allModes, modeName)].fields[
                                    getFieldIndex(allModes[getFormModeIndex(allModes, modeName)].fields, fieldName)
                                  ]
                                ).map((key: any, idx: number) => {
                                  return (
                                    <>
                                      {!(key === 'name' || key === 'externalName') && (
                                        <Box className='compare-filled-card-container'>
                                          <Box className='mode-compare-indicators-container'>
                                            {Array.from(new Set(diffFields[fieldName as keyof typeof diffFields])).includes(
                                              key
                                            ) && (
                                              <svg
                                                width="9"
                                                height="8"
                                                viewBox="0 0 9 8"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                                className='compare-diff-values-indicator'
                                              >
                                                <circle cx="4.07712" cy="4" r="4" fill="currentColor" />
                                              </svg>
                                            )}
                                          </Box>
                                          <Box className='formula-name-container'>
                                            <span className='mode-compare-formula-name small-text line-height-normal'>
                                              {`${getProperKey(key)}:`}
                                            </span>
                                          </Box>
                                          <Box className='formula-name-value-container'>
                                            <span
                                              className={`${
                                                Array.from(new Set(diffFields[fieldName as keyof typeof diffFields])).includes(key)
                                                  ? 'key-diff'
                                                  : ''
                                              }`}>
                                              {getValue(
                                                allModes[getFormModeIndex(allModes, modeName)].fields[
                                                  getFieldIndex(allModes[getFormModeIndex(allModes, modeName)].fields, fieldName)
                                                ],
                                                key
                                              )}
                                            </span>
                                          </Box>
                                        </Box>
                                      )}
                                    </>
                                  );
                                })}
                              </Box>
                            </Box>
                          ) : (
                            <Box className="diff">
                              <span className="field-name">*Field not existing</span>
                            </Box>
                          )}
                        </Box>
                      );
                    }
                  })}
                </Box>
              );
            })}
          </ModeCardsContainer>
        </div>
      {/* </Box> */}
    {/* </dialog> */}
    </dialog>
  );
};

export default ModeCompare;
