/* ========================================================================== *
 * Copyright (C) 2019, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect, useRef, useState } from 'react';
import { styled } from '@linaria/react';
import { useSelector } from 'react-redux';
import { AppState } from '../../../store';
import { deleteConsent, toggleDeleteConsent } from '../../../store/consents/action';
import { toggleConsentsDrawer } from '../../../store/drawer/action';
import {
  KeepButton,
  KeepConsentsTable,
  KeepFormDialogHeader,
  KeepZeroResults,
} from '../../keep-elements/KeepElements';
import { KeepIcon } from '../../keep-elements/react/KeepIcon';
import { useAppDispatch } from '../../../store/hooks';
const ConsentsContainer = styled.div`
  display: flex;
  gap: 16px;
  flex-direction: column;
  z-index: 1;
  width: 90vw;
  padding: 30px 35px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
  align-items: center;

  .title {
    font-size: 18px;
    font-weight: 700;
    line-height: normal;
  }
`;

const OptionsBar = styled.div`
  display: flex;
  padding: 25px 16px 0 16px;
  width: 100%;
  align-items: center;
  gap: 10px;

  .option {
    display: flex;
    gap: 5px;
    align-items: center;
    border-radius: var(--wa-border-radius-m);
    padding: 5px 10px 5px 5px;
    background: none;

    &:hover {
      color: #fff;
      background-color: #0f5fdc;
    }
  }

  .text {
    font-size: 16px;
    font-weight: 400;
  }

  /*
   * The two rules between the three buttons are CSS now rather than glyphs: the
   * .short-vertical from styles.css that AppItem already draws, as in 72a0c1f. This bar is
   * a flex row with align-items:center, so a bare div lands in the same place the glyph
   * did and needs no inline-block. Only the height is restated, from the size="1.5em" the
   * glyph carried; the shared 31px belongs to a taller row. The colour deliberately
   * becomes the class's --wa-color-text-loud rather than the hardcoded #A0A0A0 that was
   * passed to the glyph, which was on no token ramp.
   */
  .short-vertical {
    height: 1.5em;
  }
`;

interface ConsentsProps {
  handleClose: () => void;
  dialog: boolean;
}

const Consents: React.FC<ConsentsProps> = ({ handleClose, dialog }) => {
  const [expand, setExpand] = useState(false);
  const [filtersOn, setFiltersOn] = useState(false);
  const [resetFilters, setResetFilters] = useState(false);
  const { deleteConsentDialog, deleteUnid, appName, username, scope, consents } = useSelector((state: AppState) => state.consents);

  const ref = useRef<HTMLDialogElement>(null);

  const dispatch = useAppDispatch();

  const handleCloseDialog = () => {
    dispatch(toggleDeleteConsent('', '', '', ''));
  };

  // Handle deleting/revoking consent
  const confirmDeleteConsent = () => {
    dispatch(deleteConsent(deleteUnid, handleCloseDialog));
  };

  const handleClickReset = () => {
    setResetFilters(true);
  };

  useEffect(() => {
    if (deleteConsentDialog) {
      ref.current?.showModal();
    } else {
      if (ref.current?.close) {
        ref.current?.close();
      }
    }
  }, [deleteConsentDialog])

  return (
    <ConsentsContainer>
      <Header>
        <span className="medium-text text-bold m-0 p-0">OAuth Consents</span>
        <button
          onClick={handleClose}
          className='no-background no-border cursor-pointer m-0 p-0'
        >
          {dialog && <KeepIcon name="xmark" label="Close" size="xl" />}
        </button>
      </Header>
      <OptionsBar>
        <button
          onClick={() => setExpand(true)}
          className="option no-border cursor-pointer color-text-primary"
        >
          <KeepIcon name="chevron-down" size="xl" className="p-0" />
          Expand all
        </button>
        <div className='short-vertical' />
        <button
          onClick={() => setExpand(false)}
          className="option no-border cursor-pointer color-text-primary"
        >
          <KeepIcon name="chevron-up" size="xl" />
          Collapse all
        </button>
        <div className='short-vertical' />
        <button
          onClick={() => dispatch(toggleConsentsDrawer())}
          className="option no-border cursor-pointer color-text-primary"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M1.5 1.5A.5.5 0 0 1 2 1h12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.128.334L10 8.692V13.5a.5.5 0 0 1-.342.474l-3 1A.5.5 0 0 1 6 14.5V8.692L1.628 3.834A.5.5 0 0 1 1.5 3.5zm1 .5v1.308l4.372 4.858A.5.5 0 0 1 7 8.5v5.306l2-.666V8.5a.5.5 0 0 1 .128-.334L13.5 3.308V2z"/>
          </svg>
          All filters
        </button>
        <button
          onClick={handleClickReset}
          className={`visible no-border cursor-pointer no-background color-text-primary`}
        >
          Reset
        </button>
      </OptionsBar>
      {consents.length > 0 ? <KeepConsentsTable
        expand={expand}
        filtersOn={filtersOn}
        onFiltersOnChange={(e) => setFiltersOn(e.detail.filtersOn)}
        reset={resetFilters}
        onResetChange={(e) => setResetFilters(e.detail.reset)}
      /> : <KeepZeroResults
            mainLabel="Sorry, no consents found"
            secondaryLabel={`What you search was unfortunately not found or doesn't exist.`}
          />}
      <dialog ref={ref} className='dialog'>
        <KeepFormDialogHeader
          heading={`Revoke consent?`}
          onClose={handleCloseDialog}
        />
        <div className='dialog-content'>
          <div id="reset-form-contents" className='dialog-content-text'>
            {appName
              ? `Are you sure you want to revoke consent for application ${appName} with user ${username} and scopes ${scope}?`
              : `Are you sure you want to revoke consent for user ${username} with scopes ${scope}?`}
          </div>
        </div>
        <div className='dialog-actions'>
          <KeepButton onClick={confirmDeleteConsent}>Yes</KeepButton>
          <KeepButton variant="neutral" appearance="outlined" onClick={handleCloseDialog}>No</KeepButton>
        </div>
      </dialog>
    </ConsentsContainer>
  );
};

export default Consents;
