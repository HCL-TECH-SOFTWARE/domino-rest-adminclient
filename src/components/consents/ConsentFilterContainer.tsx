/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Drawer from '@mui/material/Drawer';
import { AppState } from '../../store';
import { toggleConsentsDrawer } from '../../store/drawer/action';
import { BlueSwitch, DrawerFormContainer, StyledRadio } from '../../styles/CommonStyles';
import { Box, FormControlLabel, RadioGroup } from '@mui/material';
import { styled } from '@linaria/react';
import { KeepButton, KeepCheckbox, KeepInputDate, KeepTooltip } from '../keep-elements/KeepElements';
import { KeepIcon } from '../keep-elements/react/KeepIcon';
import { useAppDispatch } from '../../store/hooks';

/**
 * `<input type="date">` speaks ISO `YYYY-MM-DD` in *local* time, but `new Date('...')`
 * parses that same string as **UTC** — which lands on the previous day anywhere west of
 * Greenwich. Both helpers therefore go through the local Y/M/D components rather than
 * through `toISOString()` or the `Date` string constructor.
 */
const dateValue = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const parseDateValue = (value: string, fallback: Date) => {
  const [y, m, d] = value.split('-').map(Number);
  return y && m && d ? new Date(y, m - 1, d) : fallback;
};

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
  scopes,
  setScopes,
}) => {
  const { consentsDrawer } = useSelector((state: AppState) => state.drawer)
  const { consents } = useSelector((state: AppState) => state.consents)
  const dispatch = useAppDispatch();
  const descriptionElementRef = React.useRef<HTMLElement>(null);

  const [filterStatus, setFilterStatus] = useState("All")
  const [filterShow, setFilterShow] = useState(showWithApps)
  const [filterExp, setFilterExp] = useState(exp)
  const [filterTokenExp, setFilterTokenExp] = useState(tokenExp)
  const [filterScopes, setFilterScopes] = useState<string[]>(scopes)

  React.useEffect(() => {
    if (consentsDrawer) {
      setFilterScopes(scopes);
    }
  }, [consentsDrawer]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (consentsDrawer) {
      setFilterScopes(scopes);
    }
  }, [consentsDrawer]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleClickScopeCheckbox = (e: any, scope: string) => {
    if (e.target.checked) {
      setFilterScopes(prev => Array.from(new Set([...prev, scope])))
    } else {
      setFilterScopes(prev => prev.filter(s => s !== scope))
    }
  }
  
  return (
    <Drawer anchor="right" open={consentsDrawer} onClose={handleClickOpen}>
      <DrawerFormContainer className='w-35vw'>
          <div className='flex flex-col p-20'>
            <div className='full-width flex justify-end'>
              <KeepTooltip content="Close" placement='bottom'>
                {/* size='xl': nothing sizes this glyph. .close-icon has no rule inside
                    DrawerFormContainer, so it kept MUI's 24px default. The icon is the
                    whole control, hence the label. cursor="pointer" was an SVG
                    presentation attribute and is now a declaration on .close-icon. */}
                <KeepIcon
                  name="xmark"
                  label="Close"
                  size="xl"
                  className="close-icon float-right"
                  onClick={() => dispatch(toggleConsentsDrawer())}
                />
              </KeepTooltip>
            </div>
            <span className='text-bold big-text'>Filter</span>
            <Section>
              <span className='big-text m-0 p-0'>Status</span>
              <RadioGroup value={filterStatus} onChange={(e) => setFilterStatus(e.currentTarget.value)} className='radio-group'>
                <FormControlLabel
                  value='All'
                  control={<StyledRadio size='small' />}
                  label='All'
                  className='small-text p-0'
                />
                <FormControlLabel
                  value='Active'
                  control={<StyledRadio size='small' />}
                  label='Active'
                  className='small-text p-0'
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
                  className='small-text p-0'
                />
                <FormControlLabel
                  value='None'
                  control={<StyledRadio size='small' />}
                  label='None'
                  className='small-text p-0'
                />
                <FormControlLabel
                  value='Custom'
                  control={<StyledRadio size='small' />}
                  label='Custom'
                  className='small-text p-0'
                />
              </RadioGroup>
              {filterExp.expiration !== "All" && filterExp.expiration !== "None" && <KeepInputDate value={dateValue(filterExp.date)} onDateChange={(e: Event) => setFilterExp({ expiration: filterExp.expiration, date: parseDateValue((e as CustomEvent<{ value: string }>).detail.value, filterExp.date) })} />}
            </Section>
            <hr className='divider m-10' />
            <Section>
              <span className='big-text m-0 p-0'>Token Expiration</span>
              <RadioGroup value={filterTokenExp.expiration} onChange={(e) => setFilterTokenExp({ expiration: e.currentTarget.value, date: filterTokenExp.date })} className='radio-group'>
                <FormControlLabel
                  value='All'
                  control={<StyledRadio size='small' />}
                  label='All'
                  className='small-text p-0'
                />
                <FormControlLabel
                  value='None'
                  control={<StyledRadio size='small' />}
                  label='None'
                  className='small-text p-0'
                />
                <FormControlLabel
                  value='Custom'
                  control={<StyledRadio size='small' />}
                  label='Custom'
                  className='small-text p-0'
                />
              </RadioGroup>
              {filterTokenExp.expiration !== "All" && filterTokenExp.expiration !== "None" && <KeepInputDate value={dateValue(filterTokenExp.date)} onDateChange={(e: Event) => setFilterTokenExp({ expiration: filterTokenExp.expiration, date: parseDateValue((e as CustomEvent<{ value: string }>).detail.value, filterTokenExp.date) })} />}
            </Section>
            <hr className='divider' />
            <Section>
              <span className='big-text m-0 p-0'>Scopes</span>
              <div className='flex flex-flow-row-wrap full-width'>
                {collectScopes(consents).length > 0 &&
                  collectScopes(consents).map(scope => (
                    <div className='half-width' key={scope}>
                      <KeepCheckbox
                        checked={filterScopes.includes(scope)}
                        size='m'
                        onChange={(e) => handleClickScopeCheckbox(e, scope)}
                      />
                      <span>{scope}</span>
                    </div>
                  ))
                }
              </div>
            </Section>
            <ButtonsContainer>
              <KeepButton variant="neutral" appearance="outlined"
                onClick={() => dispatch(toggleConsentsDrawer())}
              >Cancel</KeepButton>
              <KeepButton onClick={handleClickShowResults}>Show Results</KeepButton>
            </ButtonsContainer>
          </div>
      </DrawerFormContainer>
    </Drawer>
  );
}

export default ConsentFilterContainer