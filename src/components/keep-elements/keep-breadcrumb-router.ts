/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import '@awesome.me/webawesome/dist/components/breadcrumb/breadcrumb.js';
import '@awesome.me/webawesome/dist/components/breadcrumb-item/breadcrumb-item.js';
import '@awesome.me/webawesome/dist/components/icon/icon.js';
import { KeepElement } from './keep-element';
import './keep-tooltip';
import { FA_LIBRARY } from '../../services/icon-library';
import { store } from '../../store/store';
import { blockNavigation } from '../../store/navigationGuard/action';
import { selectIsDirty } from '../../store/navigationGuard/selectors';
import { RouterController } from '../../router/RouterController';

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
 * The breadcrumb trail in the top banner. Tag: `keep-breadcrumb-router`.
 *
 * Replaces `components/routers/BreadcrumbRouter.tsx`, deleted in the same wave. Built on
 * `<wa-breadcrumb>` since #877.
 *
 * ## It reads the router itself
 *
 * This element was first written taking `router` as a property, because the one live instance
 * was created in `App.tsx` and published through React context with nothing an element could
 * reach. **#926 landed in the same wave** and made the router a module singleton with a
 * `RouterController` over it, so the property, its `subscribe`/`unsubscribe` pair and the
 * `willUpdate` hook that existed only to notice the property arriving are all gone — and with
 * them the "no router in scope" branch, which is now unreachable rather than merely untested.
 *
 * That is the same collapse the four route wrappers went through, and it is why this
 * element's wrapper is a bare `createComponent`. `AppShell` still hands `router` down to
 * `keep-side-nav` as a property; that is the last instance of the old arrangement and is the
 * cheapest remaining #926 follow-up.
 *
 * ## The unsaved-changes guard, without the hook
 *
 * `useNavigationGuard().guardedNavigate` is three lines over the store and the router, and
 * both are reachable from here. It reads `selectIsDirty` from `store.getState()` rather than
 * subscribing, which is what the hook does too and for the same reason: the answer is only
 * wanted at the moment of the click, and a subscription would re-render this element every
 * time the access-mode editor went from clean to dirty and back.
 *
 * ## The tooltips used to sit outside the crumbs, and that broke the trail
 *
 * `wa-breadcrumb` walks `assignedElements({ flatten: true })` and keeps only children whose
 * tag is `wa-breadcrumb-item`. `flatten` expands nested `<slot>`s, **not** custom elements
 * with a shadow root — so a crumb wrapped in `<keep-tooltip>` was invisible to it. Two
 * things followed, both live on main today:
 *
 * - the wrapped crumbs got no separator, so `/schema/:nsf/:db` rendered as
 *   "Overview Schemas Demo" with no chevrons at all;
 * - `aria-current="page"` is assigned to the last crumb it *can* see, so on `/schema`,
 *   `/scope` and `/apps` it landed on **Overview** — the wrong crumb bolded, and the wrong
 *   one announced as the current page.
 *
 * The tooltip is inside the item here, which is what the component's contract wants. The
 * label's clipping rule is why the tooltip host is reset to an inline box below.
 *
 * ## The home banner is a heading, and no longer a click target
 *
 * It was a `span` with a click handler — no role, no tab stop, no focus ring: the same
 * defect #877 fixed for the crumbs themselves and missed here. The handler was also dead in
 * every reachable state: this branch only renders when the path is exactly the root, and it
 * navigated to the root. So it is an `h1` (the home screen had no heading at all) with no
 * handler, rather than a button that would take a tab stop and do nothing. #713.
 *
 * ## What the shadow boundary cost
 *
 * `ActionHeader`, `PageTitle` and `TopBanner` from `styles/layout.tsx` — this was the last
 * file importing that group, and all seven modules go with it — plus four global utilities
 * from `styles.css`: the float, the 24px size, the 10px top margin and the primary text
 * colour. The first three had no other consumer and their rules are deleted in this commit;
 * they are named in words rather than as literals so `test/styles/dead-selectors.test.ts`
 * can still see them die.
 *
 * Three declarations are dropped rather than moved, each provably inert where it stood:
 * `flex-direction` on a block box, `flex` on a child of a block box, and `vertical-align` on
 * a flex item. Reproducing them would only suggest they had ever done something.
 *
 * The colour is the one deliberate difference. `color-text-primary` sets `#000` and takes
 * its dark value from `body[data-theme="dark"] .color-text-primary`, a light-DOM descendant
 * selector that cannot reach into a shadow root — copying the light literal renders black on
 * near-black. The banner already declared `--wa-color-text-normal`, which is mode-aware and
 * inherits across the boundary, and every crumb part inherits from it, so the trail tracks
 * the banner with nothing to keep in step. In light mode that is `#383838` where it used to
 * be `#000`. Same call `keep-zero-results` and `keep-schemas-list` made.
 */
@customElement('keep-breadcrumb-router')
export default class BreadcrumbRouter extends KeepElement {
  static styles = css`
    /* The document reset stops at the boundary; the banner's width plus padding needs it. */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    :host {
      display: block;
      box-sizing: border-box;
    }

    /* was ActionHeader, styles/layout.tsx */
    .action-header {
      margin-top: 20px;
      display: block;
      width: 100%;
    }

    /* was PageTitle, styles/layout.tsx. Its nested heading rule is dropped: no node here
       ever carried that class. */
    .page-title {
      display: flex;
      align-items: center;
    }

    /* was TopBanner, styles/layout.tsx. Every crumb part below inherits this colour. */
    .top-banner {
      width: 100%;
      height: 100px;
      padding: 20px 20px 0px 0px;
      font-size: 16px;
      color: var(--wa-color-text-normal);
    }

    /* The product name on the home page: the float and the 24px size utilities, plus the
       heading defaults the user-agent sheet would otherwise apply to an h1. */
    .product-name {
      float: left;
      margin: 0;
      font-size: 24px;
      font-weight: 400;
    }

    /* the 10px top-margin utility */
    .trail {
      margin-top: 10px;
    }

    /*
     * Colour is inherited, not restated.
     *
     * Web Awesome gives a crumb the link colour and the last one, the separator and the
     * start slot the quiet colour, none of which is what the banner uses. Restating a
     * literal here is how the tier-A contrast regressions happened, so each part follows
     * the banner in both colour modes.
     *
     * Through part selectors, not a custom property: wa-breadcrumb exposes no separator
     * colour property, and inventing one is the failure this codebase keeps hitting — the
     * declaration is dropped and the default quietly wins while the code looks token-driven.
     */
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

    /*
     * The tooltip is an inline box, not an inline-block one, so the label's ellipsis still
     * governs the text it wraps: an overflowing inline-block is clipped without one.
     */
    wa-breadcrumb-item keep-tooltip {
      display: inline;
    }

    /* aria-current="page" is set by wa-breadcrumb itself, on whichever item is last. The
       current crumb used to be marked with a hand-maintained class that had to be kept in
       step with the branch conditions; this cannot drift.
       No backticks in here, in a css template they terminate the literal. */
    wa-breadcrumb-item[aria-current]::part(label) {
      font-weight: 600;
      white-space: nowrap;
    }
  `;

  /**
   * The path the trail is drawn from.
   *
   * Selected down to `pathname` on purpose: the trail is a function of the path alone, so a
   * sibling writing `?view=cards` must not redraw it. This is the same narrowing every other
   * screen's controller uses, and it is what `RouterController`'s equality check is for.
   */
  private readonly route = new RouterController(this, (location) => location.pathname);

  /**
   * Navigate, unless the screen has unsaved changes — in which case the guard's dialog is
   * raised instead and the navigation is held until the user answers it.
   *
   * `selectIsDirty` is read point-in-time rather than through a `StoreController`: the trail
   * does not re-render when the dirty flag moves, it only asks at the moment of a click.
   */
  private guardedNavigate(path: string): void {
    if (selectIsDirty(store.getState())) {
      store.dispatch(blockNavigation(path));
      return;
    }
    this.route.navigate(path);
  }

  render() {
    const pathname = this.route.value;
    const section = sectionOf(pathname);

    if (pathname === '/') {
      return html`
        <div class="action-header">
          <div class="page-title">
            <div class="top-banner">
              <h1 class="product-name">${section.label}</h1>
            </div>
          </div>
        </div>
      `;
    }

    // `/schema/:nsfPath/:dbName` and `/schema/:nsfPath/:dbName/:formName/access` — the only
    // routes that go deeper than a section. The database crumb returns to that database's
    // forms; the access-mode crumb is the current page and does not navigate.
    const segments = segmentsOf(pathname);
    const [, nsfPath, dbName, formName] = segments;
    const isAccessMode = segments.length === 5;
    const hasDatabase = segments.length >= 3;
    // A section sub-page such as `/apps/consents`, whose second segment names the page.
    const subPage = segments.length === 2 ? titleCase(segments[1]) : undefined;

    return html`
      <div class="action-header">
        <div class="page-title">
          <div class="top-banner">
            <wa-breadcrumb class="trail" label="breadcrumb">
              <wa-breadcrumb-item @click=${() => this.guardedNavigate('/')}>
                <wa-icon slot="start" library=${FA_LIBRARY} name="house"></wa-icon>
                Overview
              </wa-breadcrumb-item>

              <wa-breadcrumb-item @click=${() => this.guardedNavigate(section.path)}>
                <keep-tooltip placement="bottom" content="Back to ${section.label} Page"
                  >${section.label}</keep-tooltip
                >
              </wa-breadcrumb-item>

              ${subPage ? html`<wa-breadcrumb-item>${subPage}</wa-breadcrumb-item>` : nothing}
              ${hasDatabase
                ? html`
                    <wa-breadcrumb-item
                      @click=${() => this.guardedNavigate(`/schema/${nsfPath}/${dbName}`)}
                    >
                      <keep-tooltip placement="bottom" content="Go to ${dbName} Forms"
                        >${dbName}</keep-tooltip
                      >
                    </wa-breadcrumb-item>
                  `
                : nothing}
              ${isAccessMode
                ? html`<wa-breadcrumb-item
                    >${decodeURIComponent(formName)} Access Mode</wa-breadcrumb-item
                  >`
                : nothing}
            </wa-breadcrumb>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-breadcrumb-router': BreadcrumbRouter;
  }
}
