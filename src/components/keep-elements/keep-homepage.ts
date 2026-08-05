/* ========================================================================== *
 * Copyright (C) 2023, 2026 HCL America Inc.                                  *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { html, css, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { KeepElement } from './keep-element';
import './keep-tip';
import { store } from '../../store/store';
import { showPages } from '../../store/account/action';
import { StoreController } from '../../store/StoreController';
import { databases, apps, type NavRoute } from '../sidenav/Routes';
import schemasImage from '../../assets/home/databasedev.jpg';
import scopesImage from '../../assets/home/appdev.jpg';
import appsImage from '../../assets/home/apps.jpg';
import consentsImage from '../../assets/home/consents.jpg';

/**
 * The `/` route: the overview page. Tag: `keep-homepage`.
 *
 * It was a scroll container with a slot, holding the still-React `home/sections/Section`,
 * which in turn rendered `home/sections/Tip` four times. #806 wave 8 converted both, and the
 * two files collapse into this one — a wrapper element whose whole job was to slot a single
 * child is indirection, not structure.
 *
 * ## The tiles are driven by `sidenav/Routes`, on purpose
 *
 * The homepage is a second, independent way into four of the seven routes; the rail is the
 * other. Both read the same table, so a route removed from `Routes.ts` cannot leave a tile
 * behind — which is exactly what happened to People and Groups, whose homepage tiles outlived
 * their routes by fifteen months (#770, and `test/people-groups-removed.test.ts` guards it).
 *
 * The copy for each tile lives in {@link TILES}, keyed by the route's label. The original
 * expressed this as three loops over the two arrays, two of them filtering to a single label
 * and one choosing between two sets of copy on `label === 'Schemas'` — so any *third* database
 * route would silently have rendered with the Scopes tile's image and wording. A label with no
 * entry here renders no tile instead.
 *
 * ## What the conversion changed, beyond the markup
 *
 * - The intro line is no longer clipped. Its `<section>` was the last light-DOM one in the
 *   app, so it picked up `keep-overrides.css`'s bare `section` rule — `overflow: hidden`,
 *   `text-overflow: ellipsis`, `white-space: nowrap` — which truncated the sentence rather
 *   than wrapping it on a narrow window. Its `margin: 5px 0` is restated below; the three
 *   clipping declarations deliberately are not. That rule now reaches nothing at all.
 * - The `section-title` rule went with it. It styled a class no element in this screen ever
 *   carried, so it has never rendered anything.
 * - The diagram link gets `rel="noopener noreferrer"` to go with its `target="_blank"`.
 */

/** What each tile says, keyed by the `sidenav/Routes` label it belongs to. */
const TILES: Record<string, { heading: string; description: string; image: string }> = {
  Schemas: {
    heading: 'Database Management - REST API',
    description: 'CREATE/UPDATE SCHEMA',
    image: schemasImage,
  },
  Scopes: {
    heading: 'Database Management - Activation',
    description: 'CREATE/MANAGE SCOPES',
    image: scopesImage,
  },
  Applications: {
    heading: 'Application Management - OAUTH',
    description: 'ADMIN',
    image: appsImage,
  },
  Consents: {
    heading: 'Consents Management - OAUTH',
    description: 'REVIEW/REVOKE CONSENTS',
    image: consentsImage,
  },
};

@customElement('keep-homepage')
export default class Homepage extends KeepElement {
  static readonly styles = css`
    /* The document's border-box reset does not cross a shadow boundary. */
    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    /* was HomepageContainer and Section.tsx's SectionContainer, both styled divs. */
    :host {
      display: block;
      overflow-y: auto;
      padding: 0 20px;
    }

    /* was TipContainer. */
    .tips {
      padding: 15px 0;
    }

    /*
     * The intro line. margin comes from the document sheet's bare section rule, which stops
     * at this boundary; the clipping declarations that came with it are dropped on purpose
     * -- see the note on the class.
     */
    .diagram {
      display: flex;
      flex: 1;
      width: 100%;
      justify-content: center;
      margin: 5px 0;
    }

    /*
     * The framework styles bare anchors from a document layer, which does not reach in here.
     * Restated with the same tokens, so this link still reads as a link in both appearances
     * -- and unlike the tiles, this one should.
     */
    .diagram a {
      color: var(--wa-color-text-link);
      text-decoration: var(--wa-link-decoration-default);
      text-decoration-thickness: 0.09375em;
      text-underline-offset: 0.125em;
    }

    .diagram a:hover {
      color: color-mix(in oklab, var(--wa-color-text-link), var(--wa-color-mix-hover));
      text-decoration: var(--wa-link-decoration-hover);
    }

    .diagram a:focus-visible {
      outline: var(--wa-focus-ring);
      outline-offset: var(--wa-focus-ring-offset);
    }

    /*
     * was FeatureContainer.
     *
     * NO BACKTICKS IN THIS BLOCK -- it sits inside a css tagged-template literal, so one
     * ends the template and the file stops parsing. Same warning as in keep-tip.ts.
     *
     * The gap is what separates the tiles (#963). It used to be two touching --wa-space-l
     * card margins inside keep-tip, so the real figure was 48px and no declaration anywhere
     * said so; one gap on the row states it once, at the level that lays the tiles out. The
     * tiles are flex: 1, so this comes out of their width rather than being distributed
     * around them -- which is also why justify-content had nothing left to distribute and
     * is gone.
     */
    .features {
      display: flex;
      gap: var(--wa-space-l);
      margin-bottom: 50px;
    }

    @media only screen and (max-width: 768px) {
      :host {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px 10%;
        margin-bottom: 100px;
      }

      .features {
        flex-direction: column;
        gap: 20px;
      }
    }
  `;

  /**
   * Which entries the deployment's `adminui.json` turns on. The element owns this — the
   * screen it replaced held the same `useSelector` and no parent has one.
   */
  private readonly navitems = new StoreController(this, (state) => state.account.navitems);

  /** Was Section.tsx's mount effect. Publishes which nav entries this deployment allows. */
  protected firstUpdated(): void {
    store.dispatch(showPages());
  }

  /** One tile, or nothing when this route has no copy — see the note on the class. */
  private renderTile(route: NavRoute) {
    const tile = TILES[route.label];
    if (!tile) return nothing;
    return html`
      <keep-tip
        uri=${route.uri}
        image=${tile.image}
        heading=${tile.heading}
        description=${tile.description}
      ></keep-tip>
    `;
  }

  render() {
    const navitems = this.navitems.value;
    return html`
      <div class="tips">
        <section class="diagram">
          Open the interactive
          <a href="./img/keepblockdiagram.svg" target="_blank" rel="noopener noreferrer"
            >&nbsp;DRAPI overview&nbsp;</a
          >
          diagram
        </section>
        <div class="features">
          ${navitems.databases ? databases.map((route) => this.renderTile(route)) : nothing}
          ${navitems.apps ? apps.map((route) => this.renderTile(route)) : nothing}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'keep-homepage': Homepage;
  }
}
