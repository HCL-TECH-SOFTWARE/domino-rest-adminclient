/* ========================================================================== *
 * Copyright (C) 2023 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Typography from '@mui/material/Typography';
import UserIcon from '@mui/icons-material/AccountCircleOutlined';
import Tooltip from '@mui/material/Tooltip';
import Popper from '@mui/material/Popper';
import Paper from '@mui/material/Paper';
import Fade from '@mui/material/Fade';
import Collapse from '@mui/material/Collapse';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import styled from 'styled-components';
import OptionList from './OptionList';
import { AppState } from '../../store';
import { getTheme } from '../../store/styles/action';
import { TokenProps } from '../../store/account/types';

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
  border-radius: 10px;
  min-width: 220px;
`;

const PopperAvatarContainer = styled.div<{ theme: string }>`
  display: flex;
  margin-bottom: 24px;
  background: ${(props) => getTheme(props.theme).secondary};
`;

interface ProfileMenuProps {
  open: boolean;
}

const ProfileMenu: React.FC<ProfileMenuProps> = ({ open }) => {
  const { themeMode } = useSelector((state: AppState) => state.styles);
  const { idpLogin } = useSelector((state: AppState) => state.account);

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
        <Tooltip
          enterDelay={700}
          placement="right"
          title={open ? '' : 'Profile'}
          arrow
          disableHoverListener={open}
          disableFocusListener={open}
        >
          <IconWrapper
            open={open}
            ref={iconRef}
            onClick={handleIconClick}
            data-testid="profileIcon"
          >
            <UserIcon style={{ width: '36px', height: '36px' }} />
          </IconWrapper>
        </Tooltip>

        {/* Username / role - fades and collapses in sync with the
            sidenav width so partial letters never peek through the
            collapsed rail. */}
        <Collapse
          in={open}
          orientation="horizontal"
          timeout={open ? OPEN_TRANSITION_MS : CLOSE_TRANSITION_MS}
          unmountOnExit
          style={{ flex: 1, minWidth: 0 }}
        >
          <Fade in={open} timeout={open ? OPEN_TRANSITION_MS : CLOSE_TRANSITION_MS}>
            <ProfileInfo>
              <Typography
                color="textPrimary"
                noWrap
                style={{ fontWeight: 700, fontSize: 16 }}
              >
                {user}
              </Typography>
              <Typography color="textPrimary" style={{ fontSize: 13 }}>
                Administrator
              </Typography>
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
        style={{ width: '100%' }}
      >
        <Fade in={open} timeout={open ? OPEN_TRANSITION_MS : CLOSE_TRANSITION_MS}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <OptionList toggleMenu={() => undefined} theme={themeMode} />
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
        style={{ zIndex: 1300 }}
      >
        {({ TransitionProps }) => (
          <ClickAwayListener onClickAway={handlePopperClose}>
            <Fade {...TransitionProps} timeout={250}>
              <ProfileMenuCard>
                <PopperAvatarContainer theme={themeMode}>
                  <ProfileInfo style={{ marginLeft: 0 }}>
                    <Typography
                      color="textPrimary"
                      noWrap
                      style={{ fontWeight: 700, fontSize: 16 }}
                    >
                      {user}
                    </Typography>
                    <Typography color="textPrimary" style={{ fontSize: 13 }}>
                      Administrator
                    </Typography>
                  </ProfileInfo>
                </PopperAvatarContainer>
                <OptionList toggleMenu={setPopperOpen} theme={themeMode} />
              </ProfileMenuCard>
            </Fade>
          </ClickAwayListener>
        )}
      </Popper>
    </ProfileContainer>
  );
};

export default ProfileMenu;

