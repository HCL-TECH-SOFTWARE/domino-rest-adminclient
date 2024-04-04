/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Drawer from '@material-ui/core/Drawer';
import { AppState } from '../../store';
import { toggleConsentsDrawer } from '../../store/drawer/action';
import { BlueSwitch, ButtonNeutral, ButtonYes, DrawerFormContainer, HorizontalDivider } from '../../styles/CommonStyles';
import { Box, Checkbox, FormControlLabel, Radio, RadioGroup, RadioProps, Tooltip, Typography, makeStyles, withStyles } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import styled from 'styled-components';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

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

  const classes = useStyles()

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
    const scopesMulti = consents
        .map(consent => consent.scope.split(','))
        .reduce((acc, val) => acc.concat(val), []);

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
          <FilterContainer>
            <Box width='100%' display='flex' justifyContent='flex-end'>
              <Tooltip arrow title="Close">
                <CloseIcon
                  cursor="pointer"
                  className="close-icon float-right"
                  onClick={() => dispatch(toggleConsentsDrawer())}
                />
              </Tooltip>
            </Box>
            <Typography className='title'>Filter</Typography>
            <Section>
              <Typography className='header'>Status</Typography>
              <RadioGroup value={filterStatus} onChange={(e) => setFilterStatus(e.currentTarget.value)} className='radio-group'>
                <FormControlLabel value='All' control={<StyledRadio size='small' />} label='All' classes={{ label: classes.label }} />
                <FormControlLabel value='Active' control={<StyledRadio size='small' />} label='Active' classes={{ label: classes.label }} />
              </RadioGroup>
            </Section>
            <HorizontalDivider />
            <Section>
              <Typography className='header'>App name</Typography>
              <Box className='toggle-area'>
                Show only consents with application
                <BlueSwitch size='small' checked={filterShow} onChange={() => setFilterShow(!filterShow)} />
              </Box>
            </Section>
            <HorizontalDivider />
            <Section>
              <Typography className='header'>Expiration</Typography>
              <RadioGroup value={filterExp.expiration} onChange={(e) => setFilterExp({ expiration: e.currentTarget.value, date: filterExp.date })} className='radio-group'>
                <FormControlLabel value='All' control={<StyledRadio size='small' />} label='All' classes={{ label: classes.label }} />
                <FormControlLabel value='None' control={<StyledRadio size='small' />} label='None' classes={{ label: classes.label }} />
                <FormControlLabel value='Custom' control={<StyledRadio size='small' />} label='Custom' classes={{ label: classes.label }} />
              </RadioGroup>
              {filterExp.expiration !== "All" && filterExp.expiration !== "None" && <DatePicker defaultValue={dayjs(filterExp.date)} onChange={e => setFilterExp({ expiration: filterExp.expiration, date: e ? e.toDate() : filterExp.date})} />}
            </Section>
            <HorizontalDivider />
            <Section>
              <Typography className='header'>Token Expiration</Typography>
              <RadioGroup value={filterTokenExp.expiration} onChange={(e) => setFilterTokenExp({ expiration: e.currentTarget.value, date: filterTokenExp.date })} className='radio-group'>
                <FormControlLabel value='All' control={<StyledRadio size='small' />} label='All' classes={{ label: classes.label }} />
                <FormControlLabel value='None' control={<StyledRadio size='small' />} label='None' classes={{ label: classes.label }} />
                <FormControlLabel value='Custom' control={<StyledRadio size='small' />} label='Custom' classes={{ label: classes.label }} />
              </RadioGroup>
              {filterTokenExp.expiration !== "All" && filterTokenExp.expiration !== "None" && <DatePicker defaultValue={dayjs(filterTokenExp.date)} onChange={e => setFilterTokenExp({ expiration: filterTokenExp.expiration, date: e ? e.toDate() : filterTokenExp.date }) } />}
            </Section>
            <HorizontalDivider />
            <Section>
              <Typography className='header'>Scopes</Typography>
              <Box style={{ display: 'flex', flexFlow: 'row wrap', width: '100%' }}>
                {
                  collectScopes(consents).map(scope => (
                    <Box width='50%'>
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
              <ButtonNeutral onClick={() => dispatch(toggleConsentsDrawer())}>Cancel</ButtonNeutral>
              <ButtonYes onClick={handleClickShowResults}>Show Results</ButtonYes>
            </ButtonsContainer>
          </FilterContainer>
        </LocalizationProvider>
      </DrawerFormContainer>
    </Drawer>
  );
}

export default ConsentFilterContainer