/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { styled } from '@linaria/react';
import ProfileMenuDialog from '../sidenav/ProfileMenuDialog';
import keepLogo from '../../assets/KeepNewIcon.png';

/**
 * The top bar, shown below `wa-page`'s mobile breakpoint only (#707).
 *
 * The hamburger that used to live here is gone: `wa-page` renders its own into the same
 * header region and wires it to the navigation drawer, so this component no longer owns —
 * or needs to be told about — the menu's open state.
 */

/*
 * The bar is 56px tall on purpose, not by accident of its contents.
 *
 * wa-page measures this region with a ResizeObserver and publishes the result as
 * `--header-height`, which `Views`' `ViewContainer` subtracts from the viewport — so
 * anything that inflates the bar silently shortens every page. `styles/app-shell.css`
 * pre-seeds the same variable with 56px for the frames before that observer first fires
 * (and zeroes the region's block padding so the two can agree); the numbers only line up
 * if the height is stated rather than inferred.
 *
 * 56px is also what this bar measured before #707, which is what keeps
 * `calc(100vh - 56px)` — now `calc(100vh - var(--header-height))` — the same page height.
 *
 * Stating it also caps the damage from anything inside the bar that measures wrong. The
 * first thing that did was `.profile-menu-dialog-user`'s 115px phantom bottom margin, which
 * made this region 168px of mostly empty white before #707 removed it.
 */
const MobileHeaderContainer = styled.header`
  display: flex;
  align-items: center;
  /* Fill the header region. Without this the bar is a shrink-to-fit flex item inside
     wa-page's slotted-header row, and its own two halves stack instead of sitting side
     by side. */
  flex: 1;
  min-width: 0;
  /* The hamburger is a sibling inside wa-page's header region and brings its own leading
     margin and padding, so this bar adds none of its own. */
  padding: 0;
  height: 56px;
`;

/*
 * Shrink-to-fit, not `flex: 1`. There used to be three equal thirds here — hamburger, logo,
 * profile — and the logo landed in the middle one. wa-page owns the hamburger now, so two
 * equal halves would centre the logo in the left half instead of on the bar.
 */
const Profile = styled.div`
  flex: 0 0 auto;
  display: flex;
  align-items: center;
`;

const MobileHeader = () => {
  return (
    <MobileHeaderContainer>
      <div className="flex-1 flex justify-center">
        <img className="keep-icon" src={keepLogo} alt="HCL Domino REST API Icon" />
      </div>
      <Profile>
        <ProfileMenuDialog />
      </Profile>
    </MobileHeaderContainer>
  );
};

export default MobileHeader;
