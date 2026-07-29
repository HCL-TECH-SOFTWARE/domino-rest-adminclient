/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import React from 'react';
import { styled } from '@linaria/react';
import WaBreadcrumb from '@awesome.me/webawesome/dist/react/breadcrumb/index.js';
import WaBreadcrumbItem from '@awesome.me/webawesome/dist/react/breadcrumb-item/index.js';
import WaIcon from '@awesome.me/webawesome/dist/react/icon/index.js';
import { useLocation } from '../../router/react';
import { useNavigationGuard } from '../navigation/NavigationGuardContext';
import { FA_LIBRARY } from '../../services/icon-library';
import { ActionHeader, PageTitle, TopBanner } from '../../styles/CommonStyles';
import { KeepTooltip } from '../keep-elements/react/KeepTooltip';

/**
 * Colour is inherited, not restated.
 *
 * Web Awesome gives a crumb `--wa-color-text-link` and the last one, the separator and the
 * `start` slot `--wa-color-text-quiet`, none of which is what the banner uses. Restating a
 * literal here is how the tier-A contrast regressions happened, so the host is set to
 * `inherit` and each part follows it — which means the trail tracks whatever
 * `.color-text-primary` and `TopBanner` resolve to, in both colour modes, with nothing to
 * keep in step.
 *
 * Through `::part()`, not a custom property: `wa-breadcrumb` exposes no `--separator-color`
 * or equivalent, and inventing one is the failure this codebase keeps hitting — the
 * declaration is dropped and the default quietly wins while the code looks token-driven.
 */
const BreadcrumbRouterContainer = styled.div`
  /* Beats the element's own :host rule, so the parts below have something to inherit. */
  wa-breadcrumb-item {
    color: inherit;
  }

  wa-breadcrumb-item::part(label),
  wa-breadcrumb-item::part(separator),
  wa-breadcrumb-item::part(start) {
    color: inherit;
  }

  wa-breadcrumb-item::part(label) {
    font-size: 16px;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 200px;
  }

  /* aria-current="page" is set by wa-breadcrumb itself, on whichever item is last. The
     current crumb used to be marked with a hand-maintained class that had to be kept in
     step with the branch conditions; this cannot drift.
     No backticks in here, in a styled template they terminate the literal. */
  wa-breadcrumb-item[aria-current]::part(label) {
    font-weight: 600;
    white-space: nowrap;
  }
`;

/** Path segments, with the leading empty one from the root slash dropped. */
const segmentsOf = (pathname: string) => pathname.split('/').filter(Boolean);

const titleCase = (segment: string) => segment.charAt(0).toUpperCase() + segment.slice(1);

/**
 * The section a path belongs to: its label, and where its crumb goes.
 *
 * The destination used to be hardcoded to `/schema` for every section (#877), so the
 * crumb labelled "Application Management" navigated to Schemas. Label and destination are
 * one object now precisely so the two cannot drift apart again.
 */
const sectionOf = (pathname: string): { label: string; path: string } => {
  if (pathname.startsWith('/schema')) return { label: 'Schemas', path: '/schema' };
  if (pathname.startsWith('/scope')) return { label: 'Scopes', path: '/scope' };
  if (pathname.startsWith('/apps')) return { label: 'Application Management', path: '/apps' };
  return { label: 'HCL Domino REST API Administrator', path: '/' };
};

/**
 * The breadcrumb trail in the top banner, on `<wa-breadcrumb>` since #877.
 *
 * **The items carry no `href`, deliberately.** `wa-breadcrumb-item` renders an `<a>` when
 * given one and a `<button>` without, and the `<a>` would break the unsaved-changes guard
 * *silently*: `NavigationGuardContext` intercepts link clicks with
 * `(e.target).closest('a[href]')`, but that anchor lives in the item's shadow root, so
 * `e.target` retargets to the host and `closest()` walks light-DOM ancestors that contain
 * no anchor. Buttons plus `guardedNavigate` are the path that file documents for
 * programmatic navigation, and they are keyboard-reachable, which the `<span onClick>`
 * these replaced was not.
 *
 * Giving the items real URLs is worth doing — ⌘-click, open in new tab, copy link — but
 * it means teaching the shared guard to walk `event.composedPath()`, which affects every
 * `<Link>` in the app. That is its own change, not a side effect of this one.
 */
const BreadcrumbRouter: React.FC = () => {
  const { pathname } = useLocation();
  const { guardedNavigate } = useNavigationGuard();

  const segments = segmentsOf(pathname);
  const section = sectionOf(pathname);

  if (pathname === '/') {
    return (
      <BreadcrumbRouterContainer>
        <ActionHeader>
          <PageTitle>
            <TopBanner>
              <span
                className="float-left huge-text color-text-primary"
                onClick={() => guardedNavigate(section.path)}
              >
                {section.label}
              </span>
            </TopBanner>
          </PageTitle>
        </ActionHeader>
      </BreadcrumbRouterContainer>
    );
  }

  // `/schema/:nsfPath/:dbName` and `/schema/:nsfPath/:dbName/:formName/access` — the only
  // routes that go deeper than a section. The database crumb returns to that database's
  // forms; the access-mode crumb is the current page and does not navigate.
  const [, nsfPath, dbName, formName] = segments;
  const isAccessMode = segments.length === 5;
  const hasDatabase = segments.length >= 3;
  // A section sub-page such as `/apps/consents`, whose second segment names the page.
  const subPage = segments.length === 2 ? titleCase(segments[1]) : undefined;

  return (
    <BreadcrumbRouterContainer>
      <ActionHeader>
        <PageTitle>
          <TopBanner>
            <WaBreadcrumb label="breadcrumb" className="color-text-primary mt-10">
              <WaBreadcrumbItem data-testid="overview" onClick={() => guardedNavigate('/')}>
                <WaIcon slot="start" library={FA_LIBRARY} name="house" />
                Overview
              </WaBreadcrumbItem>

              <KeepTooltip placement="bottom" content={`Back to ${section.label} Page`}>
                <WaBreadcrumbItem onClick={() => guardedNavigate(section.path)}>
                  {section.label}
                </WaBreadcrumbItem>
              </KeepTooltip>

              {subPage && <WaBreadcrumbItem>{subPage}</WaBreadcrumbItem>}

              {hasDatabase && (
                <KeepTooltip placement="bottom" content={`Go to ${dbName} Forms`}>
                  <WaBreadcrumbItem onClick={() => guardedNavigate(`/schema/${nsfPath}/${dbName}`)}>
                    {dbName}
                  </WaBreadcrumbItem>
                </KeepTooltip>
              )}

              {isAccessMode && (
                <WaBreadcrumbItem>{`${decodeURIComponent(formName)} Access Mode`}</WaBreadcrumbItem>
              )}
            </WaBreadcrumb>
          </TopBanner>
        </PageTitle>
      </ActionHeader>
    </BreadcrumbRouterContainer>
  );
};

export default BreadcrumbRouter;
