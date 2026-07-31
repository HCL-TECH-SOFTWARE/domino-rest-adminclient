/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanupLit, mountLit } from '../../test-utils/lit';
import { Router, memoryHistory } from '../../../src/router/router';
import { setRouterForTest } from '../../../src/router/instance';
import { store } from '../../../src/store/store';
import {
  allowNavigation,
  setNavigationDirty,
} from '../../../src/store/navigationGuard/reducer';
// The bare import is what registers the element: the default binding below is only ever used
// in type position, so on its own it is erased before the module can run.
import '../../../src/components/keep-elements/keep-breadcrumb-router';
import type BreadcrumbRouter from '../../../src/components/keep-elements/keep-breadcrumb-router';

/**
 * #877, converted to Lit in #806 wave 7.
 *
 * Every assertion the React suite made is carried over — the seven trails, the six
 * destinations, the real-button and no-anchor markup checks, and the two source scans — and
 * three groups are new:
 *
 * - **`aria-current` is asserted at runtime now.** The old file said jsdom does not fire
 *   `slotchange` and verified the attribute in Chrome instead. That diagnosis was wrong: the
 *   event fires here, and what it observed was the defect described on the element — a crumb
 *   wrapped in `<keep-tooltip>` is not a `wa-breadcrumb-item` as far as `wa-breadcrumb` is
 *   concerned, so the attribute landed on Overview and the wrapped crumbs had none.
 * - **The separators**, orphaned by the same defect.
 * - **The unsaved-changes guard**, which the React suite could only see as a mocked hook and
 *   which is now three lines of this element's own.
 *
 * The routes are not invented: they are the seven in `Views.tsx`'s route table.
 */

const TAG = 'keep-breadcrumb-router';
const ELEMENT = 'src/components/keep-elements/keep-breadcrumb-router.ts';

let router: Router;

/**
 * Mount at a route and let `wa-breadcrumb`'s slotchange handler run.
 *
 * The router is *installed as the singleton* rather than passed in as a property. #926 gave
 * this element a `RouterController` over `router/instance.ts`, so there is no property to set
 * — and installing it is what the controller will find. `setRouterForTest` disposes whatever
 * it replaces, and `setupTests.ts` resets between cases.
 */
const at = async (route: string) => {
  router = setRouterForTest(new Router({ history: memoryHistory([route]) }));
  const el = await mountLit<BreadcrumbRouter>(TAG);
  await new Promise((done) => setTimeout(done, 0));
  await el.updateComplete;
  return el;
};

const items = (el: BreadcrumbRouter) => [
  ...el.shadowRoot!.querySelectorAll<HTMLElement>('wa-breadcrumb-item'),
];

/**
 * The visible crumb labels, in order.
 *
 * The home page has no trail at all, so it is read off its heading; every other route is
 * `<wa-breadcrumb-item>`s.
 */
const crumbsAt = async (route: string) => {
  const el = await at(route);
  const trail = items(el);
  if (trail.length > 0) return trail.map((i) => i.textContent?.trim() ?? '');
  return [...el.shadowRoot!.querySelectorAll('h1')]
    .map((h) => h.textContent?.trim() ?? '')
    .filter((t) => t.length > 0);
};

/** Mount at a route, click the crumb with this label, and report where it navigated. */
const clickCrumbAt = async (route: string, label: string) => {
  const el = await at(route);
  const crumb = items(el).find((i) => i.textContent?.trim() === label)!;
  // The button inside the item's shadow root, i.e. what a user or the keyboard actually
  // activates — not the host, which would prove only that the handler is bound somewhere.
  crumb.shadowRoot!.querySelector('button')!.click();
  return router.location().pathname;
};

const source = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('keep-breadcrumb-router', () => {
  beforeEach(() => {
    store.dispatch(setNavigationDirty(false));
    store.dispatch(allowNavigation());
  });

  afterEach(() => {
    cleanupLit();
    router?.dispose();
    vi.restoreAllMocks();
  });

  it('registers the custom element', () => {
    expect(customElements.get(TAG)).toBeTruthy();
  });

  describe('the trail each route produces', () => {
    it('shows the product name and no trail on the home page', async () => {
      expect(await crumbsAt('/')).toEqual(['HCL Domino REST API Administrator']);
    });

    it.each([
      ['/schema', ['Overview', 'Schemas']],
      ['/scope', ['Overview', 'Scopes']],
      ['/apps', ['Overview', 'Application Management']],
      ['/apps/consents', ['Overview', 'Application Management', 'Consents']],
      ['/schema/db.nsf/Demo', ['Overview', 'Schemas', 'Demo']],
      ['/schema/db.nsf/Demo/Person/access', ['Overview', 'Schemas', 'Demo', 'Person Access Mode']],
    ])('%s', async (route, expected) => {
      expect(await crumbsAt(route)).toEqual(expected);
    });

    it('capitalises the section it reads out of the path', async () => {
      // `/apps/consents` -> "Consents". The label is derived, not looked up.
      expect(await crumbsAt('/apps/consents')).toContain('Consents');
    });

    it('decodes an encoded form name in the access-mode crumb', async () => {
      expect(await crumbsAt('/schema/db.nsf/Demo/My%20Form/access')).toContain(
        'My Form Access Mode',
      );
    });

    /**
     * Characterization, carried over as it behaves rather than as it reads: only the form
     * name is decoded. The database crumb prints its segment raw because the same value is
     * spliced back into the path it navigates to, and decoding one without the other would
     * send the user somewhere else. It is a real inconsistency — an encoded database name
     * shows encoded — and it predates this conversion.
     */
    it('leaves the database crumb encoded, because its label is also its destination', async () => {
      expect(await crumbsAt('/schema/db.nsf/My%20Db')).toContain('My%20Db');
    });

    it('follows the router when navigation happens elsewhere', async () => {
      const el = await at('/schema');
      router.navigate('/scope');
      await el.updateComplete;
      await new Promise((done) => setTimeout(done, 0));
      expect(items(el).map((i) => i.textContent?.trim())).toEqual(['Overview', 'Scopes']);
    });

    it('stops following the router once it leaves the document', async () => {
      const el = await at('/schema');
      el.remove();
      router.navigate('/scope');
      await el.updateComplete;
      expect(items(el).map((i) => i.textContent?.trim())).toEqual(['Overview', 'Schemas']);
    });

    /*
     * Was "shows the product name when it has no router at all", asserting the fallback for a
     * null `router` property. #926 removed that state: the element reads a module singleton,
     * so there is no route on which it has no router, and the old test would now pass merely
     * because the installed router happens to sit at `/` — restating the home-page case above
     * under a name that claims something stronger.
     *
     * Replaced with the contract that actually took its place: the element finds the router
     * for itself, with nothing passed in. That is the whole point of the controller, and it is
     * what would break if someone reintroduced a property and forgot a call site.
     */
    it('reads the URL for itself, with no property passed in', async () => {
      setRouterForTest(new Router({ history: memoryHistory(['/apps/consents']) }));
      const el = await mountLit<BreadcrumbRouter>(TAG);
      await new Promise((done) => setTimeout(done, 0));
      await el.updateComplete;

      expect(items(el).map((i) => i.textContent?.trim())).toEqual([
        'Overview',
        'Application Management',
        'Consents',
      ]);
    });
  });

  describe('where each crumb navigates', () => {
    it('Overview goes home', async () => {
      expect(await clickCrumbAt('/schema', 'Overview')).toBe('/');
    });

    it('the database crumb goes to that database’s forms', async () => {
      expect(await clickCrumbAt('/schema/db.nsf/Demo/Person/access', 'Demo')).toBe(
        '/schema/db.nsf/Demo',
      );
    });

    it('the Schemas crumb goes to the schema list', async () => {
      expect(await clickCrumbAt('/schema/db.nsf/Demo', 'Schemas')).toBe('/schema');
    });

    /**
     * Was the defect: `handleOnClick` hardcoded `guardedNavigate('/schema')` for every
     * section, so a crumb labelled "Scopes" or "Application Management" landed the user in
     * Schemas. Label and destination are one object now (`sectionOf`), which is what stops
     * the two drifting apart again.
     */
    describe('each section crumb goes to the section it names', () => {
      it('Scopes -> /scope, which used to be /schema', async () => {
        expect(await clickCrumbAt('/scope', 'Scopes')).toBe('/scope');
      });

      it('Application Management -> /apps, which used to be /schema', async () => {
        expect(await clickCrumbAt('/apps', 'Application Management')).toBe('/apps');
      });

      it('Application Management from a sub-page -> /apps, which used to be /schema', async () => {
        expect(await clickCrumbAt('/apps/consents', 'Application Management')).toBe('/apps');
      });
    });

    it('the access-mode crumb is the current page and navigates nowhere', async () => {
      const route = '/schema/db.nsf/Demo/Person/access';
      const el = await at(route);
      const last = items(el).at(-1)!;
      last.shadowRoot!.querySelector('button')!.click();
      expect(router.location().pathname).toBe(route);
    });
  });

  describe('the unsaved-changes guard', () => {
    it('holds the navigation and raises the dialog when the screen is dirty', async () => {
      store.dispatch(setNavigationDirty(true));
      const el = await at('/schema/db.nsf/Demo');
      items(el)[0].shadowRoot!.querySelector('button')!.click();

      // Held, not performed: the router has not moved, and the guard now has a pending path
      // for its dialog to offer.
      expect(router.location().pathname).toBe('/schema/db.nsf/Demo');
      expect(store.getState().navigationGuard.pendingPath).toBe('/');
    });

    it('navigates straight through when nothing is dirty', async () => {
      const el = await at('/schema/db.nsf/Demo');
      items(el)[0].shadowRoot!.querySelector('button')!.click();
      expect(router.location().pathname).toBe('/');
      expect(store.getState().navigationGuard.pendingPath).toBeNull();
    });
  });

  describe('markup', () => {
    /**
     * Was the third defect of #877: every crumb was a `<span onClick>` — no role, no
     * tabindex, not reachable by keyboard, no focus ring. `wa-breadcrumb-item` renders a real
     * `<button>` in its shadow root, so the swap fixed this rather than needing separate work
     * (#713).
     */
    it('renders every crumb as a real button', async () => {
      const el = await at('/schema/db.nsf/Demo');
      const trail = items(el);

      expect(trail).toHaveLength(3);
      for (const item of trail) {
        expect(
          item.shadowRoot?.querySelector('button[type="button"]'),
          item.textContent ?? '',
        ).not.toBeNull();
      }
    });

    /**
     * No `href`. `wa-breadcrumb-item` renders an `<a>` when given one, and that anchor lives
     * in the shadow root — where the guard's original `(e.target).closest('a[href]')` could
     * not reach it, because `e.target` retargets to the host, so the unsaved-changes guard
     * stopped firing for breadcrumb clicks, silently.
     *
     * #901 fixed that traversal, so an `href` no longer bypasses the guard and #877's
     * follow-up is unblocked. Until it lands the markup is what it is, and this pins it.
     */
    it('renders no anchor, which would bypass the unsaved-changes guard', async () => {
      for (const item of items(await at('/schema/db.nsf/Demo'))) {
        expect(item.shadowRoot?.querySelector('a')).toBeNull();
      }
    });

    /**
     * The half of #877 the React suite could not reach.
     *
     * `wa-breadcrumb` marks the last crumb it can see, and it can only see children whose tag
     * is `wa-breadcrumb-item` — so while the tooltips wrapped the crumbs, the mark landed on
     * Overview on every section route. Both halves are asserted: the attribute, and that the
     * bold treatment keys off it rather than off a hand-maintained class.
     */
    it('marks the last crumb as the current page, and only that one', async () => {
      for (const route of ['/schema', '/apps/consents', '/schema/db.nsf/Demo']) {
        const el = await at(route);
        const marked = items(el).filter((i) => i.getAttribute('aria-current') === 'page');
        expect(marked, route).toHaveLength(1);
        expect(marked[0], route).toBe(items(el).at(-1));
      }
    });

    it('gives every crumb a separator, which the component hides on the last', async () => {
      const trail = items(await at('/schema/db.nsf/Demo'));
      expect(trail.map((i) => !!i.querySelector('[slot="separator"]'))).toEqual([
        true,
        true,
        true,
      ]);
    });

    /**
     * The tooltips moved inside the crumbs, so this pins what they are attached to and what
     * they say — the half of the restructure the trail assertions cannot see.
     */
    it('keeps a tooltip on the two crumbs whose destination is not their label', async () => {
      const trail = items(await at('/schema/db.nsf/Demo'));
      const tip = (i: number) => trail[i].querySelector('keep-tooltip');

      expect(tip(0), 'Overview needs no explaining').toBeNull();
      expect(tip(1)?.getAttribute('content')).toBe('Back to Schemas Page');
      expect(tip(2)?.getAttribute('content')).toBe('Go to Demo Forms');
    });

    it('navigates when the click starts on the tooltip rather than the crumb', async () => {
      // The visible text is inside the tooltip now, so this is the node a pointer actually
      // lands on. It has to reach the handler bound on the crumb.
      const el = await at('/schema/db.nsf/Demo');
      items(el)[1].querySelector('keep-tooltip')!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, composed: true }),
      );
      expect(router.location().pathname).toBe('/schema');
    });

    it('styles the current crumb from the attribute wa-breadcrumb sets, not from a class', () => {
      expect(source(ELEMENT)).toContain('wa-breadcrumb-item[aria-current]::part(label)');
      expect(source(ELEMENT)).not.toMatch(/class="[^"]*\bcurrent\b/);
    });

    /**
     * The home banner was a `span` with a click handler: no role, no tab stop, no focus ring,
     * and the navigation it offered was to the route it was already on. It is a heading now,
     * and the home screen had none before.
     */
    it('renders the product name as a heading with no click target', async () => {
      const el = await at('/');
      const heading = el.shadowRoot!.querySelector('h1')!;
      expect(heading.textContent?.trim()).toBe('HCL Domino REST API Administrator');
      expect(el.shadowRoot!.querySelector('button')).toBeNull();
      expect(el.shadowRoot!.querySelector('[tabindex]')).toBeNull();
    });

    it('labels the navigation region', async () => {
      const el = await at('/schema');
      const nav = el.shadowRoot!.querySelector('wa-breadcrumb')!.shadowRoot!.querySelector('nav')!;
      expect(nav.getAttribute('aria-label')).toBe('breadcrumb');
    });

    it('imports nothing from the frameworks this pass is removing', () => {
      // The per-file gate from the wave brief, as a test rather than a grep someone has to
      // remember to run. Named in a regex so the literals are not spelled out in prose.
      expect(source(ELEMENT)).not.toMatch(/from '(react|react-redux|formik)'|from '@mui\//);
    });
  });
});
