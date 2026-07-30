/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React, { useEffect } from 'react';
import { styled } from '@linaria/react';
import { NavLink, useLocation } from '../../router/react';
import { useSelector } from 'react-redux';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import { fetchKeepDatabases } from '../../store/databases/action';
import { AppState } from '../../store';
import { appRoutes as routes, apps, databases, settings } from './Routes';
import { showPages } from '../../store/account/action';
import { toggleQuickConfigDrawer } from '../../store/drawer/action';
import { KeepTooltip } from '../keep-elements/react/KeepTooltip';
import { KeepIcon } from '../keep-elements/react/KeepIcon';
import { useAppDispatch } from '../../store/hooks';

/**
 * The route list for `wa-page`'s `navigation` slot (#707).
 *
 * Everything that used to make this a *panel* is gone: the 242px/57px width, the gradient,
 * the trailing border, `calc(100vh - 23px)` and the `.drawer/.open/.close` classes. The rail
 * width now belongs to `--menu-width` on `<wa-page>` and the paint to `::part(menu)`, both
 * in `styles/app-shell.css`; the mobile copy of this list (`MobileSidebar`) is deleted,
 * because `wa-page` re-projects these same nodes into its drawer below the breakpoint.
 *
 * `expanded` no longer drives any width. It survives only so the profile block and the
 * separator spacing can differ between the rail and the open menu; the labels themselves are
 * clipped by `::part(menu)`'s `overflow-x: hidden`, exactly as they were before.
 */
const NavList = styled(List)`
  padding-top: 10px !important;
  display: flex;
  flex-direction: column;
  /* Route labels must sit well outside the 57px rail so no glyph peeks through while the
     width animates. MUI v9 dropped the default ListItemIcon min-width from 56px to 36px,
     which with the 16px ListItemButton padding would start them at ~52px; force the v5
     spacing back. */
  .MuiListItemIcon-root {
    min-width: 56px;
  }
  a {
    display: block;
    text-decoration: none !important;
    .MuiTypography-colorTextPrimary {
      color: var(--keep-sidenav-on) !important;
    }
    /* Retargeted from svg (#718). The rail glyphs are wa-icon custom elements now and
       draw into a shadow root, so a descendant svg selector out here matches nothing.
       Colour has to reach the element itself: wa-icon paints from currentColor.
       This is the rule that makes the five route glyphs white on the gradient; it does
       not reach the Quick Config bolt below, which is not inside an anchor and keeps
       the color-text-primary it has always had. */
    wa-icon {
      color: var(--keep-sidenav-on) !important;
    }
    .MuiListItem-button:hover {
      background: var(--keep-sidenav-hover) !important;
    }
  }
  .active {
    .link-container,
    .quick-config,
    .consent-list {
      border-left: 3px solid var(--keep-sidenav-border);
      background: var(--keep-sidenav-active);
      /*
       * The nested svg rule here is deleted rather than retargeted to wa-icon, because it
       * has never fired and retargeting would only preserve a rule that cannot. Nothing in
       * this subtree carries the class "active": NavLink in router/react.tsx renders the
       * className it is handed verbatim and marks the current route with aria-current
       * instead, and the four call sites below hand it the string "route-active", which no
       * rule anywhere matches either. Confirmed against the compiled selector
       * ".nuqz37t .active .link-container svg" in the built stylesheet.
       *
       * Two of its four declarations were inert regardless: font-weight does nothing to an
       * SVG glyph, and cursor was already set by the enclosing button. The two that would
       * have mattered are the -4px nudge that pays for the 3px active border and the
       * sidenav-on colour, which the anchor rule above already applies.
       *
       * The border-left and background above are left alone. They are dead for the same
       * reason, but they are the rail's active-state paint rather than icon CSS, and
       * deleting them would hide a missing-active-class bug inside an icon codemod.
       */
    }
  }

  .MuiDivider-root {
    height: 0;
  }

  .expandSeparator {
    margin-top: 26px;
  }

  .collapseSeparator {
    margin-top: 50px;
  }
`;

const QuickConfigButton = styled.div``;

interface SidenavProps {
  /** True when the menu shows its labels; false for the 57px rail. */
  expanded: boolean;
}

const SideNav: React.FC<SidenavProps> = ({ expanded }) => {
  const location = useLocation();
  const { navitems } = useSelector((state: AppState) => state.account);
  const { databasePull } = useSelector((state: AppState) => state.databases);
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(showPages());
  }, [dispatch]);

  const handleQuickConfig = () => {
    if (!databasePull) {
      dispatch(fetchKeepDatabases());
    }
    dispatch(toggleQuickConfigDrawer());
  };

  return (
    <NavList>
      <ListItemButton className={expanded ? 'expandSeparator' : 'collapseSeparator'} />

      {/* Overview */}
      {routes.map((route) => {
        return (
          <NavLink
            key={route.label}
            className={`full-width /${location.pathname.split('/')[1]}` === `${route.uri}` ? 'route-active' : ''}
            to={route.uri}>
            <KeepTooltip placement="right" content={route.label} className='full-width'>
              <ListItemButton className="link-container medium-text" key={route.label}>
                <ListItemIcon className='tiny-text'>
                  {/*
                    The `const Icon = route.icon` indirection is gone with the component
                    values it dereferenced: `Routes.ts` stores a glyph name now, typed
                    against the bundled library, so the rail renders a string (#718).

                    `size='xl'`, holding the rail at the ~24px it draws today.

                    The agreed policy for this codemod is to honour the app's icon size
                    classes, which MUI's injected-last styles had been silently beating.
                    This is not one of those. `.tiny-text` is a 12px *text* utility sitting
                    on the parent `ListItemIcon`, so 12px would arrive by **inheritance**,
                    and any declaration on the icon itself outranks an inherited value —
                    layers decide contests between declarations on one element, not against
                    inheritance. So the glyphs are unsized in the sense that matters, which
                    is the case that takes the nearest token.

                    Honouring the inherited 12px instead would halve the rail. Nothing
                    suggests that was ever intended: the class is generic, it is on a
                    wrapper whose whole job is to hold an icon, and MUI has overridden it
                    since the day it was written.

                    `canvas='fixed'`. The component defaults to `auto`, where the box hugs
                    the glyph; a nav rail is the case fixed width is for. These six glyphs
                    differ in natural width (`list-ul` is a full em, `bolt` about 0.7), and
                    a common 1.25em box centres each one so the column lines up.

                    No `label`: every entry renders its route label in the `ListItemText`
                    beside the glyph, so the icon is decorative.
                  */}
                  <KeepIcon name={route.icon} size='xl' canvas='fixed' className='color-text-primary' />
                </ListItemIcon>
                <ListItemText>
                  <span className="side-nav-text-link color-text-primary">
                    {route.label}
                  </span>
                </ListItemText>
              </ListItemButton>
            </KeepTooltip>
          </NavLink>
        );
      })}

      {navitems.databases &&
        databases.map((route) => {
          return (
            <NavLink
              key={route.label}
              className={`/${location.pathname.split('/')[1]}` === `${route.uri}` ? 'route-active' : ''}
              to={route.uri}>
              <KeepTooltip placement="right" content={route.label} className='full-width' id={`here ${route.label}`}>
                <ListItemButton className="link-container medium-text" key={route.label}>
                  <ListItemIcon className='tiny-text'>
                    {/* Schemas and Scopes. Same reasoning as Overview above. */}
                    <KeepIcon name={route.icon} size='xl' canvas='fixed' className='color-text-primary' />
                  </ListItemIcon>
                  <ListItemText>
                    <span className="color-text-primary">
                      {route.label}
                    </span>
                  </ListItemText>
                </ListItemButton>
              </KeepTooltip>
            </NavLink>
          );
        })}

      <QuickConfigButton className="quick-config full-width">
        <KeepTooltip placement="right" content="Quick Config" className='full-width'>
          <ListItemButton className="link-container medium-text" key="Quick Config" onClick={handleQuickConfig}>
            <ListItemIcon className='tiny-text'>
              {/*
                Quick Config, the one rail glyph that is not route data. The module was
                FlashOn, whatever the alias said, so the Font Awesome equivalent is `bolt`.

                Sized and canvassed like the routes above so it sits in the same column.
                Its colour is not: this button is not inside an anchor, so the
                `a wa-icon` rule in `NavList` never reached it and it keeps the
                `.color-text-primary` it renders with today. The inventory said that rule
                covered this glyph as well; the compiled selector says otherwise.
              */}
              <KeepIcon name='bolt' size='xl' canvas='fixed' className='color-text-primary' />
            </ListItemIcon>
            <ListItemText>
            <span className="side-nav-text-link">
              Quick Config
            </span>
            </ListItemText>
          </ListItemButton>
        </KeepTooltip>
      </QuickConfigButton>

      {navitems.apps &&
        apps.map((route) => {
          return (
            <NavLink
              key={route.label}
              className={`/${location.pathname}` === `${route.uri}` ? 'route-active' : ''}
              to={route.uri}>
              <KeepTooltip placement="right" content={route.label} className='full-width'>
                <ListItemButton className={location.pathname === route.uri ? 'link-container medium-text' : 'medium-text'} key={route.label}>
                  <ListItemIcon className='tiny-text'>
                    {/* Applications and Consents. Same reasoning as Overview above. */}
                    <KeepIcon name={route.icon} size='xl' canvas='fixed' className='color-text-primary' />
                  </ListItemIcon>
                  <ListItemText>
                    <span className="side-nav-text-link">
                      {route.label}
                    </span>
                  </ListItemText>
                </ListItemButton>
              </KeepTooltip>
            </NavLink>
          );
        })}



      <Divider />

      {/* Mail is intentionally disabled pending LABS-1214 (see #698).
          The `false &&` is the feature switch; restore it to a real
          condition when the page is re-enabled. */}
      {/* eslint-disable-next-line no-constant-binary-expression */}
      {false &&
        settings.map((route) => {
          return (
            <NavLink
              key={route.label}
              className={`/${location.pathname.split('/')[1]}` === `${route.uri}` ? 'route-active' : ''}
              to={route.uri}>
              <KeepTooltip placement="right" content={route.label}>
                <ListItemButton className="link-container medium-text" key={route.label}>
                  <ListItemIcon className='tiny-text'>
                    {/*
                      Mail, behind the `false &&` switch above — this never renders, so
                      nothing here can be caught by looking at the running app. Converted
                      exactly like the three live branches so that re-enabling the page
                      needs no icon work: `settings` holds 'envelope' (the module was
                      Email, not whatever the old `Mail` alias suggested) and the field is
                      typed, so the name is checked by `tsc` even though the branch is dead.
                    */}
                    <KeepIcon name={route.icon} size='xl' canvas='fixed' className='color-text-primary' />
                  </ListItemIcon>
                  <ListItemText>
                    <span className="side-nav-text-link">
                      {route.label}
                    </span>
                  </ListItemText>
                </ListItemButton>
              </KeepTooltip>
            </NavLink>
          );
        })}
    </NavList>
  );
};

export default SideNav;
