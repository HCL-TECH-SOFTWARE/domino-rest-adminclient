/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { AppState } from '../../store';
import { toggleAppFilterDrawer } from '../../store/drawer/action';
import { DrawerFormContainer, StyledRadio } from '../../styles/CommonStyles';
import { Box, FormControlLabel, RadioGroup } from '@mui/material';
import { styled } from '@linaria/react';
import { fetchMyApps } from '../../store/applications/action';
import { KeepButton, KeepDrawer } from '../keep-elements/KeepElements';
import { useAppDispatch } from '../../store/hooks';

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
  const dispatch = useAppDispatch();
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

  const handleClickShowResults = () => {
    dispatch(fetchMyApps())
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
    <KeepDrawer label="Filter" open={appFilterDrawer}>
      <DrawerFormContainer className='w-35vw'>
          <FilterContainer>
            <div className='full-width flex justify-end'>
            </div>
            <Section>
              <span className='big-text'>Status</span>
              <RadioGroup value={filterStatus} onChange={(e) => setFilterStatus(e.currentTarget.value)} className='radio-group'>
                <FormControlLabel
                  value='All'
                  control={<StyledRadio color='default' size='small' />}
                  label='All'
                  className='tiny-text p-0'
                />
                <FormControlLabel
                  value='Active'
                  control={<StyledRadio color='default' size='small' />}
                  label='Active'
                  className='tiny-text p-0'
                />
                <FormControlLabel
                  value='Inactive'
                  control={<StyledRadio color='default' size='small' />}
                  label='Inactive'
                  className='tiny-text p-0'
                />
              </RadioGroup>
            </Section>
            <hr className='divider pt-5 pb-10 mb-10 no-background' />
            <Section>
              <span className='big-text'>Authentication method</span>
              <RadioGroup value={filterAppSecret} onChange={(e) => setFilterAppSecret(e.currentTarget.value)} className='radio-group'>
                <FormControlLabel
                  value='All'
                  control={<StyledRadio color='default' size='small' />}
                  label='All'
                  className='tiny-text p-0'
                />
                <FormControlLabel
                  value='App secret'
                  control={<StyledRadio color='default' size='small' />}
                  label='App secret'
                  className='tiny-text p-0'
                />
                <FormControlLabel
                  value='App secret generated'
                  control={<StyledRadio color='default' size='small' />}
                  label='App secret generated'
                  className='tiny-text p-0'
                />
                <FormControlLabel
                  value='App secret not generated'
                  control={<StyledRadio color='default' size='small' />}
                  label='App secret not generated'
                  className='tiny-text p-0'
                />
                <FormControlLabel
                  value='PKCE'
                  control={<StyledRadio color='default' size='small' />}
                  label='PKCE'
                  className='tiny-text p-0'
                />
              </RadioGroup>
            </Section>
            <hr className='divider pt-5 pb-10 mb-10 no-background' />
            <ButtonsContainer>
              <KeepButton variant="neutral" appearance="outlined" onClick={handleClickReset}>Reset</KeepButton>
              <KeepButton variant="danger" onClick={() => dispatch(toggleAppFilterDrawer())}>Cancel</KeepButton>
              <KeepButton onClick={handleClickShowResults}>Show Results</KeepButton>
            </ButtonsContainer>
          </FilterContainer>
      </DrawerFormContainer>
    </KeepDrawer>
  );
}

export default AppFilterContainer