/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useEffect, useMemo, useRef } from 'react';

import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import Check from '@mui/icons-material/CheckCircle';
import False from '@mui/icons-material/Block';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import ChevronDown from '@mui/icons-material/KeyboardArrowDown';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { AppState } from '../../store';
import appIcons from '../../styles/app-icons';
import { checkIcon } from '../../styles/scripts';
import { Database } from '../../store/databases/types';
import Button from '@mui/material/Button';
import { updateSchema } from '../../store/databases/action';
import { BlueSwitch, InputContainer, InUseSymbol, NotInUseSymbol, SchemaIconStatus } from '../../styles/CommonStyles';
import { FiEdit } from 'react-icons/fi';
import { Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FormDialogHeader from '../dialogs/FormDialogHeader';
import { LitButtonNeutral, LitButtonYes, LitTooltip } from '../lit-elements/LitElements';

interface DetailsSectionProps {
  dbName: string;
  nsfPathProp: string;
  schemaData: Database;
  setSchemaData: (data: any) => void;
}

const Title = styled.div`
  .api-name {
    font-size: 20px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: bold;
    display: flex;
    width: 100%;
    align-items: center;
    gap: 5px;
  }
  .api-schema {
    max-width: 80%;
    text-overflow: ellipsis;
    overflow-x: hidden;
    white-space: nowrap;
  }
  @media screen and (max-width: 600px) {
    .api-schema {
      max-width: 30%;
      text-overflow: ellipsis;
      overflow-x: hidden;
      white-space: nowrap;
    }
  }
  .api-nsf {
    font-size: 14px;
  }
`;

const Information = styled(Box)`
  padding-top: 20px;
  x-overflow: ellipsis;
  width: 100%;
`;

const Heading = styled.div`
  margin: 10px 0;

  .heading {
    font-size: 20px;
    word-wrap: break-word;
  }

  .description {
    font-size: 14px;
    padding: 0 0 20px;
  }
`;

const FormulaBox = styled.div`
  display: flex;
  flex-direction: column;
  x-overflow: hidden;
  max-width: 100%;

  .title {
    font-size: 14px;
  }
  .subtitle {
    margin-top: 22px;
    font-size: 16px;
    width: 100%;
  }
  .description {
    font-size: 12px;
  }
  .formula {
    font-size: 14px;
    padding: 0 0 20px;
    word-wrap: break-word;
  }
`;

const ListConfig = styled.div`
  padding: 0 0 0 1px;
`;

const Config = styled.div`
  display: flex;
  margin: 0 0 2px;

  .title-container {
    display: flex;
    width: 95%;
    max-width: calc(100% - 12px);
    flex-wrap: wrap;
  }

  .title {
    margin-right: 10px;
  }

  svg {
    font-size: 14px;
  }

  .checkbox {
    color: #0fa068;
    right: 0;
    margin-top: 3px;
  }

  .unchecked {
    color: #8291a0;
    font-color: #8291a0;
  }
`;

const EditIcon = styled.div`
  .icon {
    cursor: pointer;
    left: 15vw;
    display: inline-block;
    color: blue;
  }
`;

const StatusIcon = styled.div`
  position: absolute;
  top: -5px;
  right: -15px;
  z-index: 2;
`;

const DialogContainer = styled.div`
  .title {
    font-size: 16px;
    font-weight: bold;
  }
`;

const ViewButtons = styled.div`
  margin-bottom: 30px;

  .text {
    font-size: 14px;
  }
`;

const Expander = styled.div`
  cursor: pointer;
  color: #6c7882;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ConfigContainer = styled(Box)`
  display: flex;
  width: 100%;
  margin-bottom: 40px;
  flex-wrap: wrap;
  gap: 10%;

  .row {
    display: flex;
    justify-content: space-between;
    width: 40%;
  }

  .two-columns {
    justify-content: space-between;
    background-color: yellow;
  }
`;

const DetailsSection: React.FC<DetailsSectionProps> = ({ dbName, nsfPathProp, schemaData, setSchemaData }) => {
  const { scopes } = useSelector((state: AppState) => state.databases);
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const {
    apiName,
    description,
    nsfPath,
    iconName,
    dqlAccess,
    openAccess,
    allowCode,
    allowDecryption,
    formulaEngine,
    dqlFormula,
    requireRevisionToUpdate,
    icon,
    isActive,
    forms,
    agents,
    views,
    schemaName,
    prohibitRefresh,
  } = schemaData;
  const [isInUse, setIsInUse] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [desc, setDesc] = useState(description);
  const formula = dqlFormula && dqlFormula.formula ? dqlFormula.formula : '@True';
  const [dqlFormulaValue, setDqlFormulaValue] = useState(formula);
  const [prohibitRefreshValue, setprohibitRefreshValue] = useState(prohibitRefresh === undefined ? true : prohibitRefresh);
  const detailsRef = useRef<HTMLDialogElement>(null);
  const discardRef = useRef<HTMLDialogElement>(null);
  const selectedDB = useMemo(
    () => ({
      apiName,
      description,
      nsfPath,
      iconName,
      dqlAccess,
      openAccess,
      allowCode,
      allowDecryption,
      formulaEngine,
      dqlFormula,
      requireRevisionToUpdate,
      icon,
      isActive,
      applicationAccessApprovers: undefined,
      configuredForms: [],
      excludedViews: undefined,
      owners: [],
      storedProcedures: [],
      prohibitRefresh: prohibitRefreshValue,
    }),
    [
      apiName,
      description,
      nsfPath,
      iconName,
      dqlAccess,
      openAccess,
      allowCode,
      allowDecryption,
      formulaEngine,
      dqlFormula,
      requireRevisionToUpdate,
      icon,
      isActive,
      prohibitRefresh,
    ]
  );
  const [dbContext, setDbContext] = useState(selectedDB);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(1);
  const [displayIconName, setDisplayIconName] = useState(checkIcon(iconName) ? iconName : 'beach');
  const [displayIcon, setDisplayIcon] = useState(checkIcon(iconName) ? icon : appIcons['beach']);
  const dispatch = useDispatch();
  const [editOpen, setEditOpen] = useState(false);
  const [discardDialog, setDiscardDialog] = useState(false);
  const [viewMore, setViewMore] = useState(false);

  const handleChange = (propName: any, status: any) => {
    if (propName === 'dqlFormula') {
      setDbContext({
        ...dbContext,
        [propName]: {
          formulaType: formulaEngine,
          formula: status
        }
      });
    } else {
      setDbContext({
        ...dbContext,
        [propName]: status
      });
    }
  };
  const handleDescriptionChange = (value: any) => {
    handleChange('description', value);
    setDesc(value);
  };
  const handleDQLFormulaChange = (value: any) => {
    handleChange('dqlFormula', value);
    setDqlFormulaValue(value);
  };
  const handleprohibitRefreshChange = () => {
    const newValue = prohibitRefresh === undefined ? false : !prohibitRefreshValue;
    setprohibitRefreshValue(newValue)
    setSchemaData({
      ...schemaData,
      prohibitRefresh: newValue,
    })
  }

  useEffect(() => {
    const schemasWithScopes = scopes.map((scope) => {
      return scope.nsfPath + ':' + scope.schemaName;
    });
    let inuse = schemasWithScopes.includes(nsfPath + ':' + schemaName);
    setIsInUse(inuse);
  }, [scopes, nsfPath, schemaName]);

  const apiStatus = isInUse ? '(Used by Scopes)' : '(Not used by Scopes)';

  const updateSchemaSetting = () => {
    const {
      apiName,
      nsfPath,
      description,
      isActive,
      formulaEngine,
      allowCode,
      dqlAccess,
      openAccess,
      allowDecryption,
      dqlFormula,
      requireRevisionToUpdate,
      excludedViews,
      owners,
    } = dbContext;
    const filterEmptyModeForms = forms ? forms.filter((form) => form.formModes.length > 0) : [];

    const formData = filterEmptyModeForms.map((form) => form);
    const updatedSchema = {
      apiName,
      schemaName: dbName,
      nsfPath,
      description,
      isActive,
      icon: displayIcon,
      iconName: displayIconName,
      formulaEngine,
      allowCode,
      dqlAccess,
      openAccess,
      allowDecryption,
      dqlFormula,
      requireRevisionToUpdate,
      agents,
      views,
      excludedViews,
      owners,
      forms: formData,
      prohibitRefresh: prohibitRefreshValue,
    };
    dispatch(updateSchema(updatedSchema, setSchemaData) as any);
  };

  useEffect(() => {
    if (
      openAccess !== null &&
      dqlAccess !== null &&
      allowCode !== null &&
      allowDecryption !== null &&
      dbContext.openAccess === null &&
      dbContext.dqlAccess === null &&
      dbContext.allowCode === null &&
      dbContext.allowDecryption === null
    ) {
      setDbContext(selectedDB);
      setIsConfigLoading(false);
    }
    if (openAccess !== null && dqlAccess !== null && allowCode !== null && allowDecryption !== null) {
      setIsConfigLoading(false);
    }
  }, [allowCode, allowDecryption, dqlAccess, openAccess, dbContext, selectedDB]);

  const handleSelectIcon = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMenuItemClick = (event: React.MouseEvent<HTMLElement>, index: number) => {
    setSelectedIndex(index);
    setAnchorEl(null);
    const _iconName = Object.keys(appIcons)[index];
    setDisplayIconName(_iconName);
    setDisplayIcon(appIcons[_iconName]);
  };


  const IconDropDown = (
    <InputContainer>
      <Button aria-controls="icons-menu" aria-haspopup="true" onClick={handleSelectIcon} className="icon-select">
        <img
          className="icon-image"
          src={`data:image/svg+xml;base64, ${appIcons[displayIconName]}`}
          alt="db-icon"
          style={{
            width: 90,
            height: 90,
            objectFit: 'contain',
            display: 'block',
          }}
        />
        <ChevronDown style={{ fontSize: 18 }} />
      </Button>
      <Menu id="lock-menu" anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={handleClose}>
        {Object.keys(appIcons).map((iconName, index) => (
          <MenuItem key={iconName} selected={index === selectedIndex} onClick={(event) => handleMenuItemClick(event, index)}>
            <>
              <img
                className="icon-image"
                src={`data:image/svg+xml;base64, ${appIcons[iconName]}`}
                alt="db-icon"
                style={{
                  width: 35,
                  height: 35,
                  objectFit: 'contain',
                  display: 'block',
                  marginRight: 10,
                }}
              />
              {iconName}
            </>
          </MenuItem>
        ))}
      </Menu>
    </InputContainer>
  );

  const SchemaIcon = (
    <img
      className="icon-image"
      src={`data:image/svg+xml;base64, ${appIcons[iconName]}`}
      alt="db-icon"
      style={{
        width: 90,
        height: 90,
        objectFit: 'contain',
        display: 'block',
      }}
    />
  );

  const handleClickSave = () => {
    updateSchemaSetting();
    setEditOpen(false);
  };

  const clearEdits = () => {
    setEditOpen(false);
    setDiscardDialog(false);
    setDbContext(selectedDB);
    setDqlFormulaValue(formula);
    setDesc(description);
    setDisplayIconName(checkIcon(iconName) ? iconName : 'beach');
  };

  const handleClickCloseDetails = () => {
    setDiscardDialog(true);
    setEditOpen(false);
  }

  useEffect(() => {
    if (editOpen) {
      detailsRef.current?.showModal()
    } else {
      if (detailsRef.current?.close) {
        detailsRef.current?.close()
      }
    }
  }, [editOpen])

  useEffect(() => {
    if (discardDialog) {
      discardRef.current?.showModal()
    } else {
      if (discardRef.current?.close) {
        discardRef.current?.close()
      }
    }
  }, [discardDialog])

  return (
    <div>
      <Title>
        <span style={{ position: 'relative', display: 'inline-block', width: 90, height: 90 }}>
          {SchemaIcon}
          <StatusIcon>
            <LitTooltip content={apiStatus.slice(1, apiStatus.length - 1)} placement='bottom' without-arrow>
              <SchemaIconStatus style={{ width: '14px', height: '14px', backgroundImage: isInUse ? InUseSymbol : NotInUseSymbol }} />
            </LitTooltip>
          </StatusIcon>
        </span>
        <span className="api-name">
          <div className="api-schema">{dbName}</div>
          <EditIcon
            onClick={() => {
              setEditOpen(true);
            }}>
            <FiEdit className="icon" />
          </EditIcon>
        </span>
        <span className="api-nsf">
          {nsfPath}
        </span>
      </Title>
      <hr color="#d1d1d1" />
      <Information>
        <Heading>
          <span className="heading">
            Description
          </span>
          <div className="description">
            {description.length > 180 && (viewMore ? description : `${description.slice(0, 180)}...`)}
            {description.length <= 180 && description}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {description.length > 180 &&
              (!viewMore ? (
                <Expander onClick={() => setViewMore(true)}>
                  View More
                  <ExpandMoreIcon />
                </Expander>
              ) : (
                <Expander onClick={() => setViewMore(false)}>
                  View Less
                  <ExpandLessIcon />
                </Expander>
              ))}
          </div>
          <ViewButtons></ViewButtons>
        </Heading>
        <Heading>
          <span className="heading">
            File Path
          </span>
          <span className="description">
            {nsfPath}
          </span>
        </Heading>
        <Heading>
          <span className="heading">
            Configuration
          </span>
          {isConfigLoading ? (
            <CircularProgress size={20} />
          ) : (
            <ListConfig>
              <Config>
                <div className='flex flex-row full-width flex-wrap'>
                  <div className="details-section-config-name">
                    <text className={`color-text-primary small-text ${dqlAccess ? '' : 'details-section-config-unchecked'}`}>
                      DQL Access
                    </text>
                  </div>
                  <div className='details-section-checkbox-container'>
                    {dqlAccess ? <Check className="checkbox" /> : <False className="checkbox unchecked" />}
                  </div>
                </div>
              </Config>
              <Config>
                <div className='flex flex-row full-width flex-wrap'>
                  <div className="details-section-config-name">
                    <LitTooltip content="Include this in $DATA scope" placement='bottom'>
                      <text className={`color-text-primary small-text ${dqlAccess ? '' : 'details-section-config-unchecked'}`}>
                        In $DATA Scope
                      </text>
                    </LitTooltip>
                  </div>
                  <div className='details-section-checkbox-container'>
                    {openAccess ? <Check className="checkbox" /> : <False className="checkbox unchecked" />}
                  </div>
                </div>
              </Config>
              <Config>
                <div className='flex flex-row full-width flex-wrap'>
                  <div className="details-section-config-name">
                    <text className={`color-text-primary small-text ${dqlAccess ? '' : 'details-section-config-unchecked'}`}>
                      Enable Code
                    </text>
                  </div>
                  <div className='details-section-checkbox-container'>
                    {allowCode ? <Check className="checkbox" /> : <False className="checkbox unchecked" />}
                  </div>
                </div>
              </Config>
              <Config>
                <div className='flex flex-row full-width flex-wrap'>
                  <div className="details-section-config-name">
                    <text className={`color-text-primary small-text ${requireRevisionToUpdate ? '' : 'details-section-config-unchecked'}`}>
                      Require Revision
                    </text>
                  </div>
                  <div className='details-section-checkbox-container'>
                    {requireRevisionToUpdate ? <Check className="checkbox" /> : <False className="checkbox unchecked" />}
                  </div>
                </div>
              </Config>
              <Config>
                <div className='flex flex-row full-width flex-wrap'>
                  <div className="details-section-config-name">
                    <text className={`color-text-primary small-text ${prohibitRefresh === undefined || prohibitRefresh === null ? '' : prohibitRefresh ? '' : 'details-section-config-unchecked'}`}>
                      Prevent Design Refresh
                    </text>
                  </div>
                  <div className='details-section-checkbox-container'>
                    {(prohibitRefresh === undefined || prohibitRefresh === null) ? <Check className="checkbox" /> : prohibitRefresh ? <Check className="checkbox" /> : <False className="checkbox unchecked" />}
                  </div>
                </div>
              </Config>
              <Config>
                <div className='flex flex-col details-section-formula-box'>
                  <text className='large-text color-text-primary'>
                    DQL Formula
                  </text>
                  <text className='small-text color-text-primary'>
                    {formula}
                  </text>
                </div>
              </Config>
            </ListConfig>
          )}
        </Heading>
      </Information>
      <dialog ref={detailsRef} className='dialog pl-0 pr-0'>
        <div className='pr-30 pl-30 full-width'>
          <FormDialogHeader
            title='Edit Schema'
            onClose={handleClickCloseDetails}
          />
        </div>
        <hr className='divider' />
        <div className='dialog-content pr-30 pl-30'>
          <div>
            <text className="text-bold color-text-primary">Icon</text>
            <div className='text-center'>{IconDropDown}</div>
          </div>
          <div>
            <text className="text-bold color-text-primary">Description</text>
            <textarea
              value={desc}
              className='details-section-textarea'
              onChange={(e) => handleDescriptionChange(e.target.value)}
            />
          </div>
          <div>
            <text className="text-bold color-text-primary">Configuration</text>
            <div className='details-section-config-container flex-row'>
              <div className="flex justify-between details-section-config-row">
                <text className="color-text-primary">DQL Access</text>
                <div>
                  <BlueSwitch
                    size="small"
                    checked={dbContext.dqlAccess}
                    onClick={() => {
                      handleChange('dqlAccess', !dbContext.dqlAccess);
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between details-section-config-row">
                <text className="color-text-primary">In $DATA Scope</text>
                <div>
                  <BlueSwitch
                    size="small"
                    checked={dbContext.openAccess}
                    onClick={() => handleChange('openAccess', !dbContext.openAccess)}
                  />
                </div>
              </div>
              <div className="flex justify-between details-section-config-row">
                <text className="color-text-primary">Enable Code</text>
                <div>
                  <BlueSwitch
                    size="small"
                    checked={dbContext.allowCode}
                    onClick={() => handleChange('allowCode', !dbContext.allowCode)}
                  />
                </div>
              </div>
              <div className="flex justify-between details-section-config-row">
                <text className="color-text-primary">Require Revision</text>
                <div>
                  <BlueSwitch
                    size="small"
                    checked={dbContext.requireRevisionToUpdate}
                    onClick={() => handleChange('requireRevisionToUpdate', !dbContext.requireRevisionToUpdate)}
                  />
                </div>
              </div>
              <div className="flex justify-between details-section-config-row">
                <text className="color-text-primary">Prevent Design Refresh</text>
                <div>
                  <BlueSwitch
                    size="small"
                    checked={prohibitRefreshValue}
                    onClick={handleprohibitRefreshChange}
                  />
                </div>
              </div>
            </div>
          </div>
          <TextField
            id="dql-formula"
            label="DQL Formula"
            variant="outlined"
            value={dqlFormulaValue}
            onChange={(e) => handleDQLFormulaChange(e.target.value)}
          />
        </div>
        <div className='dialog-actions pr-30 pl-30'>
          <LitButtonNeutral onClick={handleClickCloseDetails} text='Cancel' />
          <LitButtonYes onClick={handleClickSave} text='Save' />
        </div>
      </dialog>
      <dialog ref={discardRef} className='dialog'>
        <FormDialogHeader
          title='Discard Changes?'
          onClose={() => setDiscardDialog(false)}
        />
        <div className='dialog-content'>
          <text className='dialog-content-text'>Are you sure you want to discard the changes you made?</text>
        </div>
        <div className='dialog-actions'>
          <LitButtonNeutral text='No' onClick={() => {setDiscardDialog(false)}} />
          <LitButtonYes text='Yes' onClick={clearEdits} />
        </div>
      </dialog>
    </div>
  );
};

export default DetailsSection;
