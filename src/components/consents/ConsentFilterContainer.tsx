/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Drawer from '@material-ui/core/Drawer';
import { AppState } from '../../store';
import { toggleConsentsDrawer } from '../../store/drawer/action';
import { BlueSwitch, DrawerFormContainer, HorizontalDivider } from '../../styles/CommonStyles';
import { Box, FormControlLabel, Radio, RadioGroup, RadioProps, Tooltip, Typography, makeStyles, withStyles } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import styled from 'styled-components';
import { blue } from '@material-ui/core/colors';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

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
`

const StyledRadio = withStyles({
  root: {
    color: blue[400],
    '&$checked': {
      color: blue[600],
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
  exp: string;
  setExp: (exp: string) => void;
  tokenExp: string;
  setTokenExp: (tokenExp: string) => void;
}

const ConsentFilterContainer: React.FC<ConsentFilterContainerProps> = ({ setStatus, showWithApps, setShowWithApps, exp, setExp, tokenExp, setTokenExp }) => {
  const { consentsDrawer } = useSelector((state: AppState) => state.drawer);
  const dispatch = useDispatch();
  const descriptionElementRef = React.useRef<HTMLElement>(null);

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
              <RadioGroup defaultValue='All' onChange={(e) => setStatus(e.currentTarget.value)} className='radio-group'>
                <FormControlLabel value='All' control={<StyledRadio size='small' />} label='All' classes={{ label: classes.label }} />
                <FormControlLabel value='Active' control={<StyledRadio size='small' />} label='Active' classes={{ label: classes.label }} />
                {/* <FormControlLabel value='Revoked' control={<StyledRadio size='small' />} label='Revoked' classes={{ label: classes.label }} /> */}
              </RadioGroup>
            </Section>
            <HorizontalDivider />
            <Section>
              <Typography className='header'>App name</Typography>
              <Box className='toggle-area'>
                Show only consents with application
                <BlueSwitch size='small' value={showWithApps} onChange={e => setShowWithApps(!showWithApps)} />
              </Box>
            </Section>
            <HorizontalDivider />
            <Section>
              <Typography className='header'>Expiration</Typography>
              <RadioGroup defaultValue='All' onChange={(e) => setExp(e.currentTarget.value)} className='radio-group'>
                <FormControlLabel value='All' control={<StyledRadio size='small' />} label='All' classes={{ label: classes.label }} />
                <FormControlLabel value='None' control={<StyledRadio size='small' />} label='None' classes={{ label: classes.label }} />
                <FormControlLabel value='Custom' control={<StyledRadio size='small' />} label='Custom' classes={{ label: classes.label }} />
              </RadioGroup>
              {exp !== "All" && exp !== "None" && <DatePicker onChange={e => { if (e) setExp(e.toString()) }} />}
            </Section>
            <HorizontalDivider />
            <Section>
              <Typography className='header'>Token Expiration</Typography>
              <RadioGroup defaultValue='All' onChange={(e) => setTokenExp(e.currentTarget.value)} className='radio-group'>
                <FormControlLabel value='All' control={<StyledRadio size='small' />} label='All' classes={{ label: classes.label }} />
                <FormControlLabel value='None' control={<StyledRadio size='small' />} label='None' classes={{ label: classes.label }} />
                <FormControlLabel value='Custom' control={<StyledRadio size='small' />} label='Custom' classes={{ label: classes.label }} />
              </RadioGroup>
              {exp !== "All" && exp !== "None" && <DatePicker onChange={e => { if (e) setTokenExp(e.toString()) }} />}
            </Section>
          </FilterContainer>
        </LocalizationProvider>
      </DrawerFormContainer>
    </Drawer>
  );
}

export default ConsentFilterContainer