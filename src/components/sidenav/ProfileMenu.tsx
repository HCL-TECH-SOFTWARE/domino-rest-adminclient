/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Popper from '@mui/material/Popper';
import Paper from '@mui/material/Paper';
import Fade from '@mui/material/Fade';
import Collapse from '@mui/material/Collapse';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import { styled } from '@linaria/react';
import { AppState } from '../../store';
import { TokenProps } from '../../store/account/types';
import { useNavigate } from '../../router/react';
import { KeepTooltip } from '../keep-elements/react/KeepTooltip';
import { KeepIcon } from '../keep-elements/react/KeepIcon';
import { KeepOptionList } from '../keep-elements/react/KeepOptionList';

/**
 * Profile section rendered in the sidenav.
 *
 * A single component is used for both the expanded and collapsed states
 * so that the user icon stays mounted in a stable position and the
 * username / "Administrator" label / Sign Out button can fade and
 * collapse smoothly in sync with the sidenav width transition. This
 * avoids the jump that previously happened when conditionally swapping
 * between two separate components (icon disappearing/reappearing,
 * Sign Out button popping in, partial letters peeking out during the
 * width animation).
 */

// Sidenav width transition timings (kept in sync with SideNavContainer
// in src/styles/CommonStyles.tsx).
const OPEN_TRANSITION_MS = 225;
const CLOSE_TRANSITION_MS = 195;

const ProfileContainer = styled.div<{ open: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${(props) => (props.open ? 'center' : 'flex-start')};
  margin: 0 0 30px 0;
  padding: ${(props) => (props.open ? '0 20px' : '0')};
  /* Animate horizontal padding/alignment changes so the icon glides
     into place rather than jumping. */
  transition: padding ${OPEN_TRANSITION_MS}ms ease-in;
  overflow: hidden;
`;

const AvatarRow = styled.div<{ open: boolean }>`
  display: flex;
  align-items: center;
  width: 100%;
  margin-bottom: ${(props) => (props.open ? '20px' : '0')};
  transition: margin-bottom ${OPEN_TRANSITION_MS}ms ease-in;
`;

const IconWrapper = styled.div<{ open: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  /* When collapsed, mirror the spacing previously used by
     ProfileMenuDialog (8px from the left edge of the 57px rail) so the
     icon doesn't jump as the sidenav opens/closes. */
  margin-left: ${(props) => (props.open ? '0' : '8px')};
  transition: margin-left ${OPEN_TRANSITION_MS}ms ease-in;
  cursor: ${(props) => (props.open ? 'default' : 'pointer')};
`;

const ProfileInfo = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  flex-direction: column;
  margin-left: 16px;
  min-width: 0;
  overflow: hidden;
`;

const ProfileMenuCard = styled(Paper)`
  padding: 24px;
  box-sizing: border-box !important;
  border-radius: var(--wa-border-radius-l);
  min-width: 220px;
`;

const PopperAvatarContainer = styled.div`
  display: flex;
  margin-bottom: 24px;
  background: var(--wa-color-surface-raised);
`;

interface ProfileMenuProps {
  open: boolean;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({ open }) => {
  const { idpLogin } = useSelector((state: AppState) => state.account);
  const navigate = useNavigate();

  /**
   * `keep-option-list` dispatches the logout thunk itself and then emits `logout`. The
   * redirect stays here because the router is only reachable through React context — an
   * element has no way to get at it (same shape as `keep-schemas-multi-view`). The element
   * emits synchronously right after its dispatch, so the dispatch-then-navigate order the
   * old inline `OptionList` had is unchanged.
   */
  const handleLogout = () => {
    navigate('/');
  };

  // Popper state - used only when the sidenav is collapsed. Clicking
  // the user icon reveals the Sign Out button in a floating menu.
  const [popperOpen, setPopperOpen] = useState(false);
  const iconRef = useRef<HTMLDivElement | null>(null);

  const handleIconClick = () => {
    if (!open) {
      setPopperOpen((prev) => !prev);
    }
  };

  const handlePopperClose = () => {
    setPopperOpen(false);
  };

  // Get the current user from the auth token
  let user: string = '';
  const token = localStorage.getItem('user_token') as string;
  if (token) {
    try {
      if (idpLogin) {
        const accessToken = JSON.parse(
          atob(JSON.parse(token).access_token.split('.')[1])
        );
        if (accessToken.email) {
          user = accessToken.email;
        } else if (accessToken.CN) {
          user = accessToken.CN;
        }
      } else {
        const jsonToken = JSON.parse(token) as TokenProps;
        if (
          jsonToken != null &&
          jsonToken.claims != null &&
          jsonToken.claims.sub != null
        ) {
          const currentUser = jsonToken.claims.sub;
          user = currentUser.split('/')[0].split('=')[1];
        }
      }
    } catch {
      user = '';
    }
  }

  return (
    <ProfileContainer open={open}>
      <AvatarRow open={open}>
        <KeepTooltip
          placement="right"
          content={open ? '' : 'Profile'}
        >
          <IconWrapper
            open={open}
            ref={iconRef}
            onClick={handleIconClick}
            data-testid="profileIcon"
          >
            {/*
              The glyph is the AccountCircleOutlined module, solid here because the bundled
              library carries one weight per name.

              `.profile-menu-user-icon` is dropped from the element rather than carried
              over. It declares `width: 36px; height: 36px`, which MUI's own `width: 1em`
              on `.MuiSvgIcon-root` outranked by injection order, so this icon has always
              drawn 24px and the 36px has never applied. On a wa-icon it would apply — as a
              36px canvas centred on a glyph still sized by font-size, i.e. empty space
              rather than a bigger icon. `size='xl'` is what reproduces the 24px. The rule
              moved into `keep-option-list`'s own styles as `.icon-box`, where the class sat
              on a real wrapper div and the box was genuine; the copy left in `styles.css`
              now has no consumer.

              `label`: the icon is the whole of `IconWrapper`'s content and the wrapper is
              what handles the click, so without one the control has no accessible name.
            */}
            <KeepIcon name='circle-user' label='Profile' size='xl' />
          </IconWrapper>
        </KeepTooltip>

        {/* Username / role - fades and collapses in sync with the
            sidenav width so partial letters never peek through the
            collapsed rail. */}
        <Collapse
          in={open}
          orientation="horizontal"
          timeout={open ? OPEN_TRANSITION_MS : CLOSE_TRANSITION_MS}
          unmountOnExit
          className='flex-1 no-min-width'
        >
          <Fade in={open} timeout={open ? OPEN_TRANSITION_MS : CLOSE_TRANSITION_MS}>
            <ProfileInfo>
              <span className="color-text-primary weight-700 medium-text nowrap">
                {user}
              </span>
              <span className="color-text-primary text-13">
                Administrator
              </span>
            </ProfileInfo>
          </Fade>
        </Collapse>
      </AvatarRow>

      {/* Sign Out button shown inline when the sidenav is open. Fades
          in/out so it doesn't pop into existence. Collapse handles the
          vertical space so it doesn't overlap other content while
          animating. */}
      <Collapse
        in={open}
        timeout={open ? OPEN_TRANSITION_MS : CLOSE_TRANSITION_MS}
        unmountOnExit
        className='full-width'
      >
        <Fade in={open} timeout={open ? OPEN_TRANSITION_MS : CLOSE_TRANSITION_MS}>
          <div className='flex justify-center'>
            <KeepOptionList onLogout={handleLogout} />
          </div>
        </Fade>
      </Collapse>

      {/* When collapsed, clicking the user icon opens a floating menu
          containing the Sign Out button (legacy ProfileMenuDialog
          behaviour). */}
      <Popper
        open={!open && popperOpen}
        anchorEl={iconRef.current}
        placement="right-end"
        transition
        className='z-1300'
      >
        {({ TransitionProps }) => (
          <ClickAwayListener onClickAway={handlePopperClose}>
            <Fade {...TransitionProps} timeout={250}>
              <ProfileMenuCard>
                <PopperAvatarContainer>
                  <ProfileInfo className='ml-0'>
                    <span className="color-text-primary weight-700 medium-text nowrap">
                      {user}
                    </span>
                    <span className="color-text-primary text-13">
                      Administrator
                    </span>
                  </ProfileInfo>
                </PopperAvatarContainer>
                <KeepOptionList onLogout={handleLogout} />
              </ProfileMenuCard>
            </Fade>
          </ClickAwayListener>
        )}
      </Popper>
    </ProfileContainer>
  );
};

export default ProfileMenu;

