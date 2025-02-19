/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Drawer from '@mui/material/Drawer';
import { AppState } from '../../store';
import { toggleAppFilterDrawer } from '../../store/drawer/action';
import { ButtonNeutral, ButtonNo, ButtonYes, DrawerFormContainer, HorizontalDivider, StyledRadio } from '../../styles/CommonStyles';
import { Box, FormControlLabel, Radio, RadioGroup, RadioProps, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
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

interface AppFilterContainerProps {
  status: string;
  setStatus: (status: string) => void;
  appSecret: string;
  setAppSecret: (status: string) => void;
}

const AppFilterContainer: React.FC<AppFilterContainerProps> = ({
  status,
  setStatus,
  appSecret,
  setAppSecret,
}) => {
  const { appFilterDrawer } = useSelector((state: AppState) => state.drawer)
  const dispatch = useDispatch();
  const descriptionElementRef = React.useRef<HTMLElement>(null);

  const [filterStatus, setFilterStatus] = useState(status)
  const [filterAppSecret, setFilterAppSecret] = useState(appSecret)

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
    dispatch(toggleAppFilterDrawer())
  }

  const handleClickReset = () => {
    setFilterStatus("All")
    setFilterAppSecret("All")
    setStatus("All")
    setAppSecret("All")
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
                <FormControlLabel
                  value='All'
                  control={<StyledRadio color='default' size='small' />}
                  label='All'
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: '14px',
                      padding: 0,
                    }
                  }}
                />
                <FormControlLabel
                  value='Active'
                  control={<StyledRadio color='default' size='small' />}
                  label='Active'
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: '14px',
                      padding: 0,
                    }
                  }}
                />
                <FormControlLabel
                  value='Inactive'
                  control={<StyledRadio color='default' size='small' />}
                  label='Inactive'
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: '14px',
                      padding: 0,
                    }
                  }}
                />
              </RadioGroup>
            </Section>
            <HorizontalDivider />
            <Section>
              <Typography className='header'>Authentication method</Typography>
              <RadioGroup value={filterAppSecret} onChange={(e) => setFilterAppSecret(e.currentTarget.value)} className='radio-group'>
                <FormControlLabel
                  value='All'
                  control={<StyledRadio color='default' size='small' />}
                  label='All'
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: '14px',
                      padding: 0,
                    }
                  }}
                />
                <FormControlLabel
                  value='App secret'
                  control={<StyledRadio color='default' size='small' />}
                  label='App secret'
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: '14px',
                      padding: 0,
                    }
                  }}
                />
                <FormControlLabel
                  value='App secret generated'
                  control={<StyledRadio color='default' size='small' />}
                  label='App secret generated'
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: '14px',
                      padding: 0,
                    }
                  }}
                />
                <FormControlLabel
                  value='App secret not generated'
                  control={<StyledRadio color='default' size='small' />}
                  label='App secret not generated'
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: '14px',
                      padding: 0,
                    }
                  }}
                />
                <FormControlLabel
                  value='PKCE'
                  control={<StyledRadio color='default' size='small' />}
                  label='PKCE'
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: '14px',
                      padding: 0,
                    }
                  }}
                />
              </RadioGroup>
            </Section>
            <HorizontalDivider />
            <ButtonsContainer>
              <ButtonNeutral onClick={handleClickReset}>Reset</ButtonNeutral>
              <ButtonNo onClick={() => dispatch(toggleAppFilterDrawer())}>Cancel</ButtonNo>
              <ButtonYes onClick={handleClickShowResults}>Show Results</ButtonYes>
            </ButtonsContainer>
          </FilterContainer>
        </LocalizationProvider>
      </DrawerFormContainer>
    </Drawer>
  );
}

export default AppFilterContainer