/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Drawer from '@mui/material/Drawer';
import { AppState } from '../../store';
import { toggleConsentsDrawer } from '../../store/drawer/action';
import { BlueSwitch, DrawerFormContainer, StyledRadio } from '../../styles/CommonStyles';
import { Box, Checkbox, FormControlLabel, RadioGroup } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { styled } from '@linaria/react';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { LitButtonNeutral, LitButtonYes, LitTooltip } from '../lit-elements/LitElements';

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

interface ConsentFilterContainerProps {
  setStatus: (status: string) => void;
  showWithApps: boolean;
  setShowWithApps: (show: boolean) => void;
  exp: { expiration: string, date: Date };
  setExp: (exp: { expiration: string, date: Date }) => void;
  tokenExp: { expiration: string, date: Date };
  setTokenExp: (tokenExp: { expiration: string, date: Date }) => void;
  setReset: (reset: boolean) => void;
  scopes: string[];
  setScopes: (scopes: string[]) => void;
}

const ConsentFilterContainer: React.FC<ConsentFilterContainerProps> = ({
  setStatus,
  showWithApps,
  setShowWithApps,
  exp,
  setExp,
  tokenExp,
  setTokenExp,
  setReset,
  scopes,
  setScopes,
}) => {
  const { consentsDrawer } = useSelector((state: AppState) => state.drawer)
  const { consents } = useSelector((state: AppState) => state.consents)
  const dispatch = useDispatch();
  const descriptionElementRef = React.useRef<HTMLElement>(null);

  const [filterStatus, setFilterStatus] = useState("All")
  const [filterShow, setFilterShow] = useState(showWithApps)
  const [filterExp, setFilterExp] = useState(exp)
  const [filterTokenExp, setFilterTokenExp] = useState(tokenExp)
  const [filterScopes, setFilterScopes] = useState([""])

  React.useEffect(() => {
    if (consentsDrawer) {
      const { current: descriptionElement } = descriptionElementRef;
      if (descriptionElement !== null) {
        descriptionElement.focus();
      }
    }
  }, [consentsDrawer]);

  const handleClickOpen = () => {
    dispatch(toggleConsentsDrawer());
  };

  function collectScopes(consents: { scope: string }[]): string[] {
    let scopesMulti: Array<any> = []

    if (consents.length > 0) {
      scopesMulti = consents
        .map(consent => consent.scope.split(','))
        .reduce((acc, val) => acc.concat(val), []);
    }

    return Array.from(new Set(scopesMulti));
  }

  const handleClickShowResults = () => {
    setStatus(filterStatus)
    setShowWithApps(filterShow)
    setExp(filterExp)
    setTokenExp(filterTokenExp)
    setScopes(filterScopes)
    dispatch(toggleConsentsDrawer())
  }
  
  return (
    <Drawer anchor="right" open={consentsDrawer} onClose={handleClickOpen}>
      <DrawerFormContainer style={{ width: '35vw' }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <div className='flex flex-col p-20'>
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}>
              <LitTooltip content="Close" placement='bottom'>
                <CloseIcon
                  cursor="pointer"
                  className="close-icon float-right"
                  onClick={() => dispatch(toggleConsentsDrawer())}
                />
              </LitTooltip>
            </Box>
            <span className='text-bold big-text'>Filter</span>
            <Section>
              <span className='big-text m-0 p-0'>Status</span>
              <RadioGroup value={filterStatus} onChange={(e) => setFilterStatus(e.currentTarget.value)} className='radio-group'>
                <FormControlLabel
                  value='All'
                  control={<StyledRadio size='small' />}
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
                  control={<StyledRadio size='small' />}
                  label='Active'
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: '14px',
                      padding: 0,
                    }
                  }}
                />
              </RadioGroup>
            </Section>
            <hr className='divider m-10' />
            <Section>
              <span className='big-text m-0 p-0'>App name</span>
              <Box className='toggle-area'>
                Show only consents with application
                <BlueSwitch size='small' checked={filterShow} onChange={() => setFilterShow(!filterShow)} />
              </Box>
            </Section>
            <hr className='divider m-10' />
            <Section>
              <span className='big-text m-0 p-0'>Expiration</span>
              <RadioGroup value={filterExp.expiration} onChange={(e) => setFilterExp({ expiration: e.currentTarget.value, date: filterExp.date })} className='radio-group'>
                <FormControlLabel
                  value='All'
                  control={<StyledRadio size='small' />}
                  label='All'
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: '14px',
                      padding: 0,
                    }
                  }}
                />
                <FormControlLabel
                  value='None'
                  control={<StyledRadio size='small' />}
                  label='None'
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: '14px',
                      padding: 0,
                    }
                  }}
                />
                <FormControlLabel
                  value='Custom'
                  control={<StyledRadio size='small' />}
                  label='Custom'
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: '14px',
                      padding: 0,
                    }
                  }}
                />
              </RadioGroup>
              {filterExp.expiration !== "All" && filterExp.expiration !== "None" && <DatePicker defaultValue={dayjs(filterExp.date)} onChange={e => setFilterExp({ expiration: filterExp.expiration, date: e ? e.toDate() : filterExp.date})} />}
            </Section>
            <hr className='divider m-10' />
            <Section>
              <span className='big-text m-0 p-0'>Token Expiration</span>
              <RadioGroup value={filterTokenExp.expiration} onChange={(e) => setFilterTokenExp({ expiration: e.currentTarget.value, date: filterTokenExp.date })} className='radio-group'>
                <FormControlLabel
                  value='All'
                  control={<StyledRadio size='small' />}
                  label='All'
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: '14px',
                      padding: 0,
                    }
                  }}
                />
                <FormControlLabel
                  value='None'
                  control={<StyledRadio size='small' />}
                  label='None'
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: '14px',
                      padding: 0,
                    }
                  }}
                />
                <FormControlLabel
                  value='Custom'
                  control={<StyledRadio size='small' />}
                  label='Custom'
                  sx={{
                    '& .MuiFormControlLabel-label': {
                      fontSize: '14px',
                      padding: 0,
                    }
                  }}
                />
              </RadioGroup>
              {filterTokenExp.expiration !== "All" && filterTokenExp.expiration !== "None" && <DatePicker defaultValue={dayjs(filterTokenExp.date)} onChange={e => setFilterTokenExp({ expiration: filterTokenExp.expiration, date: e ? e.toDate() : filterTokenExp.date }) } />}
            </Section>
            <hr className='divider' />
            <Section>
              <span className='big-text m-0 p-0'>Scopes</span>
              <Box style={{ display: 'flex', flexFlow: 'row wrap', width: '100%' }}>
                {collectScopes(consents).length > 0 &&
                  collectScopes(consents).map(scope => (
                    <Box sx={{ width: '50%' }} key={scope}>
                      <FormControlLabel
                        key={scope}
                        control={<Checkbox style={{ color: '#0E5FDC' }} defaultChecked={scopes.includes(scope)} onChange={e => {
                          if (e.target.checked) setFilterScopes([...filterScopes, scope])
                          else setFilterScopes(filterScopes.filter(s => s !== scope))
                        }} />}
                        label={scope}
                      />
                    </Box>
                  ))
                }
              </Box>
            </Section>
            <ButtonsContainer>
              <LitButtonNeutral onClick={() => dispatch(toggleConsentsDrawer())} text='Cancel' />
              <LitButtonYes onClick={handleClickShowResults} text='Show Results' />
            </ButtonsContainer>
          </div>
        </LocalizationProvider>
      </DrawerFormContainer>
    </Drawer>
  );
}

export default ConsentFilterContainer