/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Drawer from '@material-ui/core/Drawer';
import { AppState } from '../../store';
import { toggleAppFilterDrawer, toggleConsentsDrawer } from '../../store/drawer/action';
import { BlueSwitch, ButtonNeutral, ButtonYes, DrawerFormContainer, HorizontalDivider } from '../../styles/CommonStyles';
import { Box, Checkbox, FormControlLabel, Radio, RadioGroup, RadioProps, Tooltip, Typography, makeStyles, withStyles } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import styled from 'styled-components';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { fetchMyApps } from '../../store/applications/action';

const FilterContainer = styled(Box)`
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 10px;

  .title {
    font-size: 18px;
    font-weight: 700;
  }
`

const Section = styled(Box)`
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .header {
    font-size: 18px;
  }

  .text {
    font-size: 16px;
  }

  .radio-group {
    display: flex;
    gap: 0;
    padding: 0;
  }

  .toggle-area {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }

  .scope-group {
    display: flex;
    flex-wrap: 1;
  }
`

const ButtonsContainer = styled(Box)`
  display: flex;
  justify-content: flex-end;
  padding-top: 20px;
  gap: 20px;
`

const StyledRadio = withStyles({
  root: {
    color: '#0E5FDC',
    '&$checked': {
      color: '#0E5FDC',
    },
  },
  label: {
    padding: 0,
    backgroundColor: 'yellow',
    fontSize: '14px',
  },
  checked: {},
})((props: RadioProps) => <Radio color="default" {...props} />)

const useStyles = makeStyles({
  label: {
    padding: 0,
    fontSize: '14px',
  },
  root: {
    padding: 0,
    backgroundColor: 'yellow',
  }
})

interface AppFilterContainerProps {
  status: string;
  setStatus: (status: string) => void;
  appSecret: string;
  setAppSecret: (status: string) => void;
//   showWithApps: boolean;
//   setShowWithApps: (show: boolean) => void;
//   exp: { expiration: string, date: Date };
//   setExp: (exp: { expiration: string, date: Date }) => void;
//   tokenExp: { expiration: string, date: Date };
//   setTokenExp: (tokenExp: { expiration: string, date: Date }) => void;
//   setReset: (reset: boolean) => void;
//   scopes: string[];
//   setScopes: (scopes: string[]) => void;
}

const AppFilterContainer: React.FC<AppFilterContainerProps> = ({
  status,
  setStatus,
  appSecret,
  setAppSecret,
//   showWithApps,
//   setShowWithApps,
//   exp,
//   setExp,
//   tokenExp,
//   setTokenExp,
//   setReset,
//   scopes,
//   setScopes,
}) => {
  const { appFilterDrawer } = useSelector((state: AppState) => state.drawer)
  const { consents } = useSelector((state: AppState) => state.consents)
  const dispatch = useDispatch();
  const descriptionElementRef = React.useRef<HTMLElement>(null);

  const [filterStatus, setFilterStatus] = useState(status)
  const [filterAppSecret, setFilterAppSecret] = useState(appSecret)

  const classes = useStyles()

  React.useEffect(() => {
    if (appFilterDrawer) {
      const { current: descriptionElement } = descriptionElementRef;
      if (descriptionElement !== null) {
        descriptionElement.focus();
      }
    }
  }, [appFilterDrawer]);

  const handleClickOpen = () => {
    dispatch(toggleAppFilterDrawer());
  };

  const handleClickShowResults = () => {
    dispatch(fetchMyApps() as any)
    setStatus(filterStatus)
    setAppSecret(filterAppSecret)
    // setShowWithApps(filterShow)
    // setExp(filterExp)
    // setTokenExp(filterTokenExp)
    // setScopes(filterScopes)
    dispatch(toggleAppFilterDrawer())
  }
  
  return (
    <Drawer anchor="right" open={appFilterDrawer} onClose={handleClickOpen}>
      <DrawerFormContainer style={{ width: '35vw' }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <FilterContainer>
            <Box width='100%' display='flex' justifyContent='flex-end'>
              <Tooltip arrow title="Close">
                <CloseIcon
                  cursor="pointer"
                  className="close-icon float-right"
                  onClick={() => dispatch(toggleAppFilterDrawer())}
                />
              </Tooltip>
            </Box>
            <Typography className='title'>Filter</Typography>
            <Section>
              <Typography className='header'>Status</Typography>
              <RadioGroup value={filterStatus} onChange={(e) => setFilterStatus(e.currentTarget.value)} className='radio-group'>
                <FormControlLabel value='All' control={<StyledRadio size='small' />} label='All' classes={{ label: classes.label }} />
                <FormControlLabel value='Active' control={<StyledRadio size='small' />} label='Active' classes={{ label: classes.label }} />
                <FormControlLabel value='Inactive' control={<StyledRadio size='small' />} label='Inactive' classes={{ label: classes.label }} />
              </RadioGroup>
            </Section>
            <HorizontalDivider />
            <Section>
              <Typography className='header'>App Secret</Typography>
              <RadioGroup value={filterAppSecret} onChange={(e) => setFilterAppSecret(e.currentTarget.value)} className='radio-group'>
                <FormControlLabel value='All' control={<StyledRadio size='small' />} label='All' classes={{ label: classes.label }} />
                <FormControlLabel value='Generated' control={<StyledRadio size='small' />} label='Generated' classes={{ label: classes.label }} />
                <FormControlLabel value='Not Generated' control={<StyledRadio size='small' />} label='Not Generated' classes={{ label: classes.label }} />
              </RadioGroup>
            </Section>
            <HorizontalDivider />
            <ButtonsContainer>
              <ButtonNeutral onClick={() => dispatch(toggleAppFilterDrawer())}>Cancel</ButtonNeutral>
              <ButtonYes onClick={handleClickShowResults}>Show Results</ButtonYes>
            </ButtonsContainer>
          </FilterContainer>
        </LocalizationProvider>
      </DrawerFormContainer>
    </Drawer>
  );
}

export default AppFilterContainer