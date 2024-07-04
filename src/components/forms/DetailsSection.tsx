/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState, useEffect, useMemo } from 'react';
import Typography from '@material-ui/core/Typography';
import Tooltip from '@material-ui/core/Tooltip';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import Check from '@material-ui/icons/CheckCircle';
import False from '@material-ui/icons/Block';
import TextField from '@material-ui/core/TextField';
import CircularProgress from '@material-ui/core/CircularProgress';
import ChevronDown from '@material-ui/icons/KeyboardArrowDown';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import { AppState } from '../../store';
import { getTheme } from '../../store/styles/action';
import appIcons from '../../styles/app-icons';
import { checkIcon } from '../../styles/scripts';
import { Database } from '../../store/databases/types';
import Button from '@material-ui/core/Button';
import { updateSchema } from '../../store/databases/action';
import { BlueSwitch, Buttons, InputContainer, SchemaIconStatus } from '../../styles/CommonStyles';
import { FiEdit } from 'react-icons/fi';
import { Box, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@material-ui/core';
import { IoMdClose } from 'react-icons/io';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

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
    width: 130px;
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
  display: inline-block;
  position: relative;
  left: 15px;
  bottom: 70px;
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

  .row {
    display: flex;
    justify-content: space-around;
    width: 50%;
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
    schemaName
  } = schemaData;
  const [isInUse, setIsInUse] = useState(false);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [desc, setDesc] = useState(description);
  const formula = dqlFormula && dqlFormula.formula ? dqlFormula.formula : '@True';
  const [dqlFormulaValue, setDqlFormulaValue] = useState(formula);
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
      storedProcedures: []
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
      isActive
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
      owners
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
      forms: formData
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
            color: getTheme(themeMode).hoverColor,
            width: '98px',
            height: '89px'
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
                  color: getTheme(themeMode).hoverColor,
                  height: 35,
                  width: 35,
                  marginRight: 10
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
        color: getTheme(themeMode).hoverColor,
        width: '89px'
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

  return (
    <Box>
      <Title>
        {SchemaIcon}
        <StatusIcon>
          <Tooltip title={apiStatus.slice(1, apiStatus.length - 1)}>
            <SchemaIconStatus isActive={isInUse ? true : false} style={{ width: '14px', height: '14px' }} />
          </Tooltip>
        </StatusIcon>
        <Typography className="api-name" component="p" variant="h5">
          <Box className="api-schema">{dbName}</Box>
          <EditIcon
            onClick={() => {
              setEditOpen(true);
            }}>
            <FiEdit className="icon" />
          </EditIcon>
        </Typography>
        <Typography className="api-nsf" component="p" variant="body2">
          {nsfPath}
        </Typography>
      </Title>
      <hr color="#d1d1d1" />
      <Information>
        <Heading>
          <Typography className="heading" component="p" variant="h6">
            Description
          </Typography>
          <Typography className="description" component="div" variant="body2">
            {description.length > 180 && (viewMore ? description : `${description.slice(0, 180)}...`)}
            {description.length <= 180 && description}
          </Typography>
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
          <Typography className="heading" component="p" variant="h6">
            File Path
          </Typography>
          <Typography className="description" component="p" variant="body2">
            {nsfPath}
          </Typography>
        </Heading>
        <Heading>
          <Typography className="heading" component="p" variant="h6">
            Configuration
          </Typography>
          {isConfigLoading ? (
            <CircularProgress size={20} />
          ) : (
            <ListConfig>
              <Config>
                <Box style={{ display: 'flex', flexDirection: 'row', width: '100%', flexWrap: 'wrap' }}>
                  <Box className="title-container">
                    <Typography
                      color="textPrimary"
                      className={dqlAccess ? `title` : `title unchecked`}
                      component="p"
                      variant="body2"
                      noWrap={true}>
                      DQL Access
                    </Typography>
                  </Box>
                  <Box style={{ width: '5%' }}>
                    {dqlAccess ? <Check className="checkbox" /> : <False className="checkbox unchecked" />}
                  </Box>
                </Box>
              </Config>
              <Config>
                <Box style={{ display: 'flex', width: '100%', flexWrap: 'wrap' }}>
                  <Box className="title-container">
                    <Tooltip title="Include this in $DATA scope">
                      <Typography
                        color="textPrimary"
                        className={openAccess ? `title` : `title unchecked`}
                        component="p"
                        variant="body2"
                        noWrap={true}>
                        In $DATA Scope
                      </Typography>
                    </Tooltip>
                  </Box>
                  <Box style={{ width: '5%' }}>
                    {openAccess ? <Check className="checkbox" /> : <False className="checkbox unchecked" />}
                  </Box>
                </Box>
              </Config>
              <Config>
                <Box style={{ display: 'flex', width: '100%', flexWrap: 'wrap' }}>
                  <Box className="title-container">
                    <Typography
                      color="textPrimary"
                      className={allowCode ? `title` : `title unchecked`}
                      component="p"
                      variant="body2"
                      noWrap={true}>
                      Enable Code
                    </Typography>
                  </Box>
                  <Box style={{ width: '5%' }}>
                    {allowCode ? <Check className="checkbox" /> : <False className="checkbox unchecked" />}
                  </Box>
                </Box>
              </Config>
              <Config>
                <Box style={{ display: 'flex', width: '100%', flexWrap: 'wrap' }}>
                  <Box className="title-container">
                    <Typography
                      color="textPrimary"
                      className={allowDecryption ? `title` : `title unchecked`}
                      component="p"
                      variant="body2"
                      noWrap={true}>
                      Allow Decryption
                    </Typography>
                  </Box>
                  <Box style={{ width: '5%' }}>
                    {allowDecryption ? <Check className="checkbox" /> : <False className="checkbox unchecked" />}
                  </Box>
                </Box>
              </Config>
              <Config>
                <Box style={{ display: 'flex', width: '100%', flexWrap: 'wrap' }}>
                  <Box className="title-container">
                    <Typography
                      color="textPrimary"
                      className={requireRevisionToUpdate ? `title` : `title unchecked`}
                      component="p"
                      variant="body2"
                      noWrap={true}>
                      Require Revision
                    </Typography>
                  </Box>
                  <Box style={{ width: '5%' }}>
                    {requireRevisionToUpdate ? <Check className="checkbox" /> : <False className="checkbox unchecked" />}
                  </Box>
                </Box>
              </Config>
              <Config>
                <FormulaBox>
                  <Typography className="subtitle" component="p" variant="body2">
                    DQL Formula
                  </Typography>
                  <Typography className="formula" component="div" variant="body2">
                    {formula}
                  </Typography>
                </FormulaBox>
              </Config>
            </ListConfig>
          )}
        </Heading>
      </Information>
      <Dialog
        open={editOpen}
        fullScreen
        style={{ height: '70vh', width: '40vw', position: 'absolute', left: '30vw', top: '15vh' }}
        PaperProps={{ style: { borderRadius: '10px' } }}
        onClose={() => setDiscardDialog(true)}>
        <DialogTitle style={{ padding: '0 0' }}>
          <div style={{ padding: '16px 24px 0 24px' }}>
            Edit Schema
            <IoMdClose
              onClick={() => setDiscardDialog(true)}
              style={{ position: 'absolute', left: '37vw', transform: 'translateY(10%)', cursor: 'pointer' }}
            />
          </div>
          <hr />
        </DialogTitle>
        <DialogContent>
          <DialogContainer>
            <DialogContentText color="textPrimary">
              <div className="title">Icon</div>
              <div style={{ textAlign: 'center', marginBottom: '30px' }}>{IconDropDown}</div>
              <div className="title">Description</div>
              <textarea
                value={desc}
                style={{
                  fontSize: '16px',
                  borderColor: '#b8b8b8',
                  borderRadius: '5px',
                  padding: '16px 14px',
                  width: '100%',
                  height: '20vh',
                  resize: 'none',
                  marginTop: '5px',
                  marginBottom: '30px'
                }}
                onChange={(e) => handleDescriptionChange(e.target.value)}
              />
              <Box className="title">Configuration</Box>
              <ConfigContainer style={{ display: 'flex', width: '100%', marginBottom: '40px', flexWrap: 'wrap' }}>
                <Box className="row">
                  <Box style={{ width: '50%' }}>DQL Access</Box>
                  <Box style={{ width: '50%' }}>
                    <BlueSwitch
                      size="small"
                      checked={dbContext.dqlAccess}
                      onClick={() => {
                        handleChange('dqlAccess', !dbContext.dqlAccess);
                      }}
                    />
                  </Box>
                </Box>
                <Box className="row">
                  <Box style={{ width: '50%' }}>In $DATA Scope</Box>
                  <Box style={{ width: '50%' }}>
                    <BlueSwitch
                      size="small"
                      checked={dbContext.openAccess}
                      onClick={() => handleChange('openAccess', !dbContext.openAccess)}
                    />
                  </Box>
                </Box>
                <Box className="row">
                  <Box style={{ width: '50%' }}>Enable Code</Box>
                  <Box style={{ width: '50%' }}>
                    <BlueSwitch
                      size="small"
                      checked={dbContext.allowCode}
                      onClick={() => handleChange('allowCode', !dbContext.allowCode)}
                    />
                  </Box>
                </Box>
                <Box className="row">
                  <Box style={{ width: '50%' }}>Allow Decryption</Box>
                  <Box style={{ width: '50%' }}>
                    <BlueSwitch
                      size="small"
                      checked={dbContext.allowDecryption}
                      onClick={() => handleChange('allowDecryption', !dbContext.allowDecryption)}
                    />
                  </Box>
                </Box>
                <Box className="row">
                  <Box style={{ width: '50%' }}>Require Revision</Box>
                  <Box style={{ width: '50%' }}>
                    <BlueSwitch
                      size="small"
                      checked={dbContext.requireRevisionToUpdate}
                      onClick={() => handleChange('requireRevisionToUpdate', !dbContext.requireRevisionToUpdate)}
                    />
                  </Box>
                </Box>
              </ConfigContainer>
              <TextField
                id="dql-formula"
                label="DQL Formula"
                variant="outlined"
                value={dqlFormulaValue}
                onChange={(e) => handleDQLFormulaChange(e.target.value)}
              />
            </DialogContentText>
          </DialogContainer>
        </DialogContent>
        <DialogActions>
          <Buttons>
            <Button
              className="cancel text"
              onClick={() => {
                setDiscardDialog(true);
              }}>
              Cancel
            </Button>
            <Button className="save text" onClick={handleClickSave}>
              Save
            </Button>
          </Buttons>
        </DialogActions>
      </Dialog>
      <Dialog open={discardDialog}>
        <DialogTitle>Discard Changes</DialogTitle>
        <DialogContent>
          <DialogContentText color="textPrimary">Are you sure you want to discard the changes you made?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Buttons>
            <Button
              className="cancel text"
              onClick={() => {
                setDiscardDialog(false);
              }}>
              No
            </Button>
            <Button className="save text" onClick={clearEdits}>
              Yes
            </Button>
          </Buttons>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DetailsSection;
