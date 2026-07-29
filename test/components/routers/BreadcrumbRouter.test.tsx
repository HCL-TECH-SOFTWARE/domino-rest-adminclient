/* ========================================================================== *
 * Copyright (C) 2026 HCL America Inc.                                        *
 * All rights reserved.                                                       *
 * Licensed under Apache 2 License.                                           *
 * ========================================================================== */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from '../../test-utils/renderWithProviders';
import BreadcrumbRouter from '../../../src/components/routers/BreadcrumbRouter';

/**
 * #877 — characterization of the breadcrumb before `<wa-breadcrumb>` replaces MUI's.
 *
 * The component had **no tests at all**, which is why three defects had gone unnoticed.
 * These pin what it does today — the wrong answers included and labelled — so the swap
 * that follows can be read as a like-for-like replacement everywhere it is one, and the
 * three fixes show up as inverted assertions rather than as silent changes.
 *
 * The routes are not invented: they are the seven in `Views.tsx`'s route table.
 */

const guardedNavigate = vi.fn();

// The real provider reaches for history and a dirty-state ref; the breadcrumb only ever
// calls `guardedNavigate`, so the context is stubbed down to that.
vi.mock('../../../src/components/navigation/NavigationGuardContext', () => ({
  useNavigationGuard: () => ({ guardedNavigate }),
}));

/** Render at a route and return the visible crumb labels, in order. */
const crumbsAt = (route: string) => {
  const { container } = renderWithProviders(<BreadcrumbRouter />, { route });
  return [...container.querySelectorAll('span')]
    .map((s) => s.textContent?.trim() ?? '')
    .filter((t) => t.length > 0 && t !== '/');
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
   * ⚠️ The defect (#877). `handleOnClick` hardcodes `guardedNavigate('/schema')` for every
   * section, so a crumb labelled "Scopes" or "Application Management" lands the user in
   * Schemas. Pinned as-is; the fix in the next commit inverts these three.
   */
  describe('BUG: every section crumb goes to /schema, whatever it is labelled', () => {
    it('Scopes -> /schema, not /scope', () => {
      expect(clickCrumbAt('/scope', 'Scopes')).toBe('/schema');
    });

    it('Application Management -> /schema, not /apps', () => {
      expect(clickCrumbAt('/apps', 'Application Management')).toBe('/schema');
    });

    it('Application Management from a sub-page -> /schema, not /apps', () => {
      expect(clickCrumbAt('/apps/consents', 'Application Management')).toBe('/schema');
    });
  });
});

describe('BreadcrumbRouter — the branch that can never render', () => {
  afterEach(cleanup);

  /**
   * ⚠️ The second defect. `:135-141` is guarded by `split('/').length === 5` and renders
   * `split('/')[5]` — index 5 of a five-element array, so always `undefined`. It is dead
   * twice over, because no route in `Views.tsx` produces a five-segment path either.
   */
  it('a five-segment path renders no crumb for its last segment', () => {
    // '/a/b/c/d' -> ['', 'a', 'b', 'c', 'd']. The trail stops at split[3].
    expect(crumbsAt('/a/b/c/d')).toEqual(['Overview', 'HCL Domino REST API Administrator', 'c']);
  });
});

describe('BreadcrumbRouter — markup', () => {
  afterEach(cleanup);

  /**
   * ⚠️ The third defect. Every crumb is a `<span onClick>`: no role, no tabindex, not
   * reachable by keyboard, no focus ring. `wa-breadcrumb-item` renders a real control, so
   * the swap fixes this rather than needing separate work. Counts toward #713.
   */
  it('offers no keyboard-reachable control', () => {
    const { container } = renderWithProviders(<BreadcrumbRouter />, { route: '/schema' });
    expect(container.querySelectorAll('button, a[href], [tabindex]')).toHaveLength(0);
  });

  it('is built on MUI today', () => {
    const { container } = renderWithProviders(<BreadcrumbRouter />, { route: '/schema' });
    expect(container.querySelector('.MuiBreadcrumbs-root')).not.toBeNull();
  });
});
