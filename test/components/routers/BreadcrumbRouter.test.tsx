/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import BreadcrumbRouter from '../../../src/components/routers/BreadcrumbRouter';

/**
 * #877 — the breadcrumb, on `<wa-breadcrumb>` since MUI's was replaced.
 *
 * Written first as characterization, against the MUI version and with three defects
 * pinned as they were. The trail assertions carried over **unchanged** — that is what
 * makes this a like-for-like swap — and the three marked BUG are inverted below, each
 * next to what it used to do.
 *
 * The routes are not invented: they are the seven in `Views.tsx`'s route table.
 */

const guardedNavigate = vi.fn();

// The real provider reaches for history and a dirty-state ref; the breadcrumb only ever
// calls `guardedNavigate`, so the context is stubbed down to that.
vi.mock('../../../src/components/navigation/NavigationGuardContext', () => ({
  useNavigationGuard: () => ({ guardedNavigate }),
}));

/**
 * Render at a route and return the visible crumb labels, in order.
 *
 * The home page has no trail at all, so it is still read off its `<span>`; every other
 * route is `<wa-breadcrumb-item>`s.
 */
const crumbsAt = (route: string) => {
  const { container } = renderWithProviders(<BreadcrumbRouter />, { route });
  const items = [...container.querySelectorAll('wa-breadcrumb-item')];
  if (items.length > 0) return items.map((i) => i.textContent?.trim() ?? '');
  return [...container.querySelectorAll('span')]
    .map((s) => s.textContent?.trim() ?? '')
    .filter((t) => t.length > 0);
};

/**
 * Render at a route and let the elements settle.
 *
 * `wa-breadcrumb-item` renders its `<button>` on Lit's first update, and `wa-breadcrumb`
 * assigns `aria-current` from a `slotchange` handler — neither is synchronous with React's
 * render. The label and navigation assertions above do not need this, because those read
 * light DOM that React writes directly.
 */
const settledAt = async (route: string) => {
  let container!: HTMLElement;
  await act(async () => {
    ({ container } = renderWithProviders(<BreadcrumbRouter />, { route }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return [...container.querySelectorAll('wa-breadcrumb-item')];
};

/** Render at a route, click the crumb with this label, and report where it navigated. */
const clickCrumbAt = (route: string, label: string) => {
  renderWithProviders(<BreadcrumbRouter />, { route });
  fireEvent.click(screen.getAllByText(label)[0]);
  return guardedNavigate.mock.calls[0]?.[0];
};

describe('BreadcrumbRouter — the trail each route produces', () => {
  beforeEach(() => guardedNavigate.mockClear());
  afterEach(cleanup);

  it('shows the product name and no trail on the home page', () => {
    expect(crumbsAt('/')).toEqual(['HCL Domino REST API Administrator']);
  });

  it.each([
    ['/schema', ['Overview', 'Schemas']],
    ['/scope', ['Overview', 'Scopes']],
    ['/apps', ['Overview', 'Application Management']],
    ['/apps/consents', ['Overview', 'Application Management', 'Consents']],
    ['/schema/db.nsf/Demo', ['Overview', 'Schemas', 'Demo']],
    ['/schema/db.nsf/Demo/Person/access', ['Overview', 'Schemas', 'Demo', 'Person Access Mode']],
  ])('%s', (route, expected) => {
    expect(crumbsAt(route)).toEqual(expected);
  });

  it('capitalises the section it reads out of the path', () => {
    // `/apps/consents` -> "Consents". The label is derived, not looked up.
    expect(crumbsAt('/apps/consents')).toContain('Consents');
  });

  it('decodes an encoded form name in the access-mode crumb', () => {
    expect(crumbsAt('/schema/db.nsf/Demo/My%20Form/access')).toContain('My Form Access Mode');
  });
});

describe('BreadcrumbRouter — where each crumb navigates', () => {
  beforeEach(() => guardedNavigate.mockClear());
  afterEach(cleanup);

  it('Overview goes home', () => {
    expect(clickCrumbAt('/schema', 'Overview')).toBe('/');
  });

  it('the database crumb goes to that database’s forms', () => {
    expect(clickCrumbAt('/schema/db.nsf/Demo/Person/access', 'Demo')).toBe('/schema/db.nsf/Demo');
  });

  it('the Schemas crumb goes to the schema list', () => {
    expect(clickCrumbAt('/schema/db.nsf/Demo', 'Schemas')).toBe('/schema');
  });

  /**
   * Was the defect: `handleOnClick` hardcoded `guardedNavigate('/schema')` for every
   * section, so a crumb labelled "Scopes" or "Application Management" landed the user in
   * Schemas. Label and destination are one object now (`sectionOf`), which is what stops
   * the two drifting apart again.
   */
  describe('each section crumb goes to the section it names', () => {
    it('Scopes -> /scope, which used to be /schema', () => {
      expect(clickCrumbAt('/scope', 'Scopes')).toBe('/scope');
    });

    it('Application Management -> /apps, which used to be /schema', () => {
      expect(clickCrumbAt('/apps', 'Application Management')).toBe('/apps');
    });

    it('Application Management from a sub-page -> /apps, which used to be /schema', () => {
      expect(clickCrumbAt('/apps/consents', 'Application Management')).toBe('/apps');
    });
  });
});

describe('BreadcrumbRouter — markup', () => {
  afterEach(cleanup);

  /**
   * Was the third defect: every crumb was a `<span onClick>` — no role, no tabindex, not
   * reachable by keyboard, no focus ring. `wa-breadcrumb-item` renders a real `<button>`
   * in its shadow root, so the swap fixed this rather than needing separate work (#713).
   */
  it('renders every crumb as a real button', async () => {
    const items = await settledAt('/schema/db.nsf/Demo');

    expect(items).toHaveLength(3);
    for (const item of items) {
      expect(item.shadowRoot?.querySelector('button[type="button"]'), item.textContent ?? '').not.toBeNull();
    }
  });

  /**
   * No `href`, deliberately. `wa-breadcrumb-item` renders an `<a>` when given one, and
   * that anchor lives in the shadow root — where `NavigationGuardContext`'s
   * `(e.target).closest('a[href]')` cannot reach it, because `e.target` retargets to the
   * host. The unsaved-changes guard would stop firing for breadcrumb clicks, silently.
   */
  it('renders no anchor, which would bypass the unsaved-changes guard', async () => {
    for (const item of await settledAt('/schema/db.nsf/Demo')) {
      expect(item.shadowRoot?.querySelector('a')).toBeNull();
    }
  });

  /**
   * ⚠️ **`aria-current` cannot be asserted here, and this does not pretend to.**
   *
   * `wa-breadcrumb` assigns it from a `slotchange` handler, and jsdom does not fire
   * `slotchange` — the attribute is null in this environment however long the test waits.
   * Verified in Chrome instead; see the PR.
   *
   * What is asserted is the half that lives in this repo: the bold treatment keys off the
   * attribute Web Awesome sets, not off a class whose branch conditions would have to be
   * kept in step by hand. That is the property that used to be got wrong.
   */
  it('styles the current crumb from the attribute wa-breadcrumb sets, not from a class', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/routers/BreadcrumbRouter.tsx'),
      'utf8',
    );

    expect(source).toContain('wa-breadcrumb-item[aria-current]::part(label)');
    expect(source).not.toMatch(/className=\{[^}]*'current'/);
  });

  it('imports no MUI', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/components/routers/BreadcrumbRouter.tsx'),
      'utf8',
    );
    expect(source).not.toMatch(/from '@mui\//);
  });
});
