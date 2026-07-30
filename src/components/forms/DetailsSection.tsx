/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useEffect, useMemo, useRef } from 'react';

import { useSelector } from 'react-redux';
import { styled } from '@linaria/react';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { AppState } from '../../store';
import { APP_ICON_NAMES, DEFAULT_APP_ICON_NAME, appIconPayload, useAppIcons } from '../../services/app-icons';
import { AppIcon } from '../commons/AppIcon';
import { checkIcon } from '../../styles/scripts';
import { Database } from '../../store/databases/types';
import Button from '@mui/material/Button';
import { updateSchema } from '../../store/databases/action';
import { BlueSwitch, InputContainer, SchemaIconStatus } from '../../styles/CommonStyles';
import { Box } from '@mui/material';
import { KeepButton, KeepFormDialogHeader, KeepTooltip } from '../keep-elements/KeepElements';
import { KeepIcon } from '../keep-elements/react/KeepIcon';
import { useAppDispatch } from '../../store/hooks';

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
    font-size: var(--wa-font-size-m);
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
    font-size: var(--wa-font-size-m);
    padding: 0 0 20px;
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

  /*
   * The selector was svg, which reached the graphic MUI drew straight into the light DOM.
   * wa-icon draws its graphic inside a shadow root, so an svg selector out here matches
   * nothing any more and every checkbox glyph would have fallen back to the ambient type.
   *
   * It is a descendant selector, so it outranks MuiSvgIcon's 24px default — unlike the bare
   * app classes elsewhere in this migration, these glyphs have always rendered at the size
   * written here. They keep it and take no size prop; a wa-size-* token would sit in
   * @layer wa-utilities and lose to this rule regardless.
   *
   * Scope note: this reaches only the ten CheckCircle/Block glyphs, because every one of
   * them sits inside a Config. The inventory read it as covering all fourteen icons in the
   * file; the chevron, the two expanders and the edit pencil are outside every Config and
   * are sized by their own call sites.
   */
  wa-icon {
    font-size: var(--wa-font-size-m);
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
  /*
   * display: inline-block is dropped rather than carried over, as .status-icon's was in
   * 72a0c1f: an outer class outranks wa-icon's own :host rule, so it would have replaced
   * the element's inline-flex / align-items:center and its tuned vertical-align of
   * -0.125em, decentring the glyph inside the .api-name flex row.
   *
   * No font-size here and no size prop at the call site: the Feather glyph this replaces
   * drew at 1em and .api-name above sets 20px, so the inherited value already reproduces
   * what shipped.
   *
   * cursor, left and color are untouched. left is dead (nothing sets position) and blue is
   * off the token ramp, but both predate this codemod and changing either would be a
   * visual edit smuggled in under an icon conversion.
   */
  .icon {
    cursor: pointer;
    left: 15vw;
    color: blue;
  }
`;

const StatusIcon = styled.div`
  position: absolute;
  top: -5px;
  right: -15px;
  z-index: 2;
`;

const ViewButtons = styled.div`
  margin-bottom: 30px;

  .text {
    font-size: var(--wa-font-size-m);
  }
`;

const Expander = styled.div`
  cursor: pointer;
  color: #6c7882;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const DetailsSection: React.FC<DetailsSectionProps> = ({ dbName, schemaData, setSchemaData }) => {
  const { scopes } = useSelector((state: AppState) => state.databases);
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
      // The memo body reads the `prohibitRefreshValue` state, not the
      // `prohibitRefresh` prop, so it must depend on the state or toggling the
      // checkbox leaves this memo stale.
      prohibitRefreshValue,
    ]
  );
  const [dbContext, setDbContext] = useState(selectedDB);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(1);
  const [displayIconName, setDisplayIconName] = useState(checkIcon(iconName) ? iconName : DEFAULT_APP_ICON_NAME);
  // The payload is derived from the name rather than tracked alongside it: the two used to
  // be separate state that had to be set in lockstep, and only the name is authoritative
  // (the backend persists `iconName`; `icon` is a cache of the same choice).
  const appIcons = useAppIcons();
  const displayIcon = appIconPayload(displayIconName, appIcons) || icon;
  const dispatch = useAppDispatch();
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
    dispatch(updateSchema(updatedSchema, setSchemaData));
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

  const handleMenuItemClick = (_event: React.MouseEvent<HTMLElement>, index: number) => {
    setSelectedIndex(index);
    setAnchorEl(null);
    setDisplayIconName(APP_ICON_NAMES[index]);
  };


  const IconDropDown = (
    <InputContainer>
      <Button aria-controls="icons-menu" aria-haspopup="true" onClick={handleSelectIcon} className="icon-select">
        <AppIcon
          name={displayIconName}
          className="details-section-icon-dropdown"
          alt="db-icon"
        />
        {/* No size: .big-text sets font-size 18px, which is what this class always meant
            and what a wa-size-* token could not override from @layer wa-utilities. */}
        <KeepIcon name='chevron-down' className='big-text color-text-primary' />
      </Button>
      <Menu id="lock-menu" anchorEl={anchorEl} keepMounted open={Boolean(anchorEl)} onClose={handleClose} disablePortal>
        {APP_ICON_NAMES.map((iconName, index) => (
          <MenuItem key={iconName} selected={index === selectedIndex} onClick={(event) => handleMenuItemClick(event, index)}>
            <div className='flex gap-5 items-center'>
              <AppIcon
                name={iconName}
                className="quick-config-icon-image"
                alt="db-icon"
              />
              {iconName}
            </div>
          </MenuItem>
        ))}
      </Menu>
    </InputContainer>
  );

  const SchemaIcon = (
    <AppIcon
      name={iconName}
      className="details-section-icon-dropdown"
      alt="db-icon"
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
    // Open discard dialog first so it enters the top layer after the edit dialog,
    // then close the edit dialog so the discard dialog is the only top-layer entry.
    setDiscardDialog(true);
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
      // Close the edit dialog after the discard dialog enters the top layer
      detailsRef.current?.close()
      setEditOpen(false)
    } else {
      if (discardRef.current?.close) {
        discardRef.current?.close()
      }
    }
  }, [discardDialog])

  return (
    <div>
      <Title>
        <span className='details-section-icon-container'>
          {SchemaIcon}
          <StatusIcon>
            <KeepTooltip content={apiStatus.slice(1, apiStatus.length - 1)} placement='bottom' without-arrow>
              <SchemaIconStatus className={isInUse ? 'schema-icon-in-use' : 'schema-icon-not-in-use'} />
            </KeepTooltip>
          </StatusIcon>
        </span>
        <span className="api-name">
          <div className="api-schema">{dbName}</div>
          <EditIcon
            onClick={() => {
              setEditOpen(true);
            }}>
            <KeepIcon name="pen-to-square" label="Edit Schema" className="icon" />
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
          <div className='flex justify-center'>
            {description.length > 180 &&
              (!viewMore ? (
                <Expander onClick={() => setViewMore(true)}>
                  View More
                  <KeepIcon name="chevron-down" size="xl" />
                </Expander>
              ) : (
                <Expander onClick={() => setViewMore(false)}>
                  View Less
                  <KeepIcon name="chevron-up" size="xl" />
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
                    {/* The two glyphs come from the module paths, not the old local names:
                        Check was CheckCircle and False was Block, so circle-check and ban.
                        No label on any of the five pairs — MUI rendered them aria-hidden
                        and nothing here is a control, so adding an accessible name would be
                        an a11y change riding along inside an icon codemod. */}
                    {dqlAccess ? <KeepIcon name="circle-check" className="checkbox" /> : <KeepIcon name="ban" className="checkbox unchecked" />}
                  </div>
                </div>
              </Config>
              <Config>
                <div className='flex flex-row full-width flex-wrap'>
                  <div className="details-section-config-name">
                    <KeepTooltip content="Include this in $DATA scope" placement='bottom'>
                      <text className={`color-text-primary small-text ${dqlAccess ? '' : 'details-section-config-unchecked'}`}>
                        In $DATA Scope
                      </text>
                    </KeepTooltip>
                  </div>
                  <div className='details-section-checkbox-container'>
                    {openAccess ? <KeepIcon name="circle-check" className="checkbox" /> : <KeepIcon name="ban" className="checkbox unchecked" />}
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
                    {allowCode ? <KeepIcon name="circle-check" className="checkbox" /> : <KeepIcon name="ban" className="checkbox unchecked" />}
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
                    {requireRevisionToUpdate ? <KeepIcon name="circle-check" className="checkbox" /> : <KeepIcon name="ban" className="checkbox unchecked" />}
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
                    {(prohibitRefresh === undefined || prohibitRefresh === null) ? <KeepIcon name="circle-check" className="checkbox" /> : prohibitRefresh ? <KeepIcon name="circle-check" className="checkbox" /> : <KeepIcon name="ban" className="checkbox unchecked" />}
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
          <KeepFormDialogHeader
            heading='Edit Schema'
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
              className='details-section-textarea color-text-primary'
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
          <KeepButton variant="neutral" appearance="outlined" onClick={handleClickCloseDetails}>Cancel</KeepButton>
          <KeepButton onClick={handleClickSave}>Save</KeepButton>
        </div>
      </dialog>
      <dialog ref={discardRef} className='dialog'>
        <KeepFormDialogHeader
          heading='Discard Changes?'
          onClose={() => setDiscardDialog(false)}
        />
        <div className='dialog-content'>
          <text className='dialog-content-text'>Are you sure you want to discard the changes you made?</text>
        </div>
        <div className='dialog-actions'>
          <KeepButton variant="neutral" appearance="outlined"
            onClick={() => {setDiscardDialog(false)}}
          >No</KeepButton>
          <KeepButton onClick={clearEdits}>Yes</KeepButton>
        </div>
      </dialog>
    </div>
  );
};

export default DetailsSection;
